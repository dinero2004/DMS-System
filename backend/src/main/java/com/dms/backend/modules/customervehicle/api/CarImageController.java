package com.dms.backend.modules.customervehicle.api;

import com.dms.backend.modules.customervehicle.persistence.CarEntity;
import com.dms.backend.modules.customervehicle.persistence.CarRepository;
import com.dms.backend.modules.customervehicle.service.CarImageStorageService;
import com.dms.backend.shared.api.ApiResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/cars/{carId}/images")
public class CarImageController {

    private final CarRepository carRepository;
    private final CarImageStorageService storage;

    public CarImageController(CarRepository carRepository, CarImageStorageService storage) {
        this.carRepository = carRepository;
        this.storage = storage;
    }

    @GetMapping
    public List<CarImageInfo> list(@PathVariable String carId) throws IOException {
        CarEntity car = requireCar(carId);
        List<CarImageInfo> out = new ArrayList<>();
        for (String name : storage.listImageNames(car)) {
            out.add(new CarImageInfo(name, "/api/v1/cars/" + carId + "/images/" + name));
        }
        return out;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CarImageInfo upload(@PathVariable String carId, @RequestParam("file") MultipartFile file) throws IOException {
        CarEntity car = requireCar(carId);
        String name = storage.storeImage(car, file);
        return new CarImageInfo(name, "/api/v1/cars/" + carId + "/images/" + name);
    }

    @GetMapping("/{filename}")
    public ResponseEntity<Resource> get(@PathVariable String carId, @PathVariable String filename) throws IOException {
        CarEntity car = requireCar(carId);
        Path path = storage.resolveImagePath(car, filename);
        if (!Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Image not found");
        }
        String contentType = Files.probeContentType(path);
        MediaType mediaType = contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok()
            .contentType(mediaType)
            .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
            .body(new FileSystemResource(path));
    }

    @DeleteMapping("/{filename}")
    public ApiResponse delete(@PathVariable String carId, @PathVariable String filename) throws IOException {
        CarEntity car = requireCar(carId);
        storage.deleteImage(car, filename);
        return new ApiResponse(carId, "DELETED", "Image deleted");
    }

    private CarEntity requireCar(String carId) {
        return carRepository.findById(carId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Car not found"));
    }

    public record CarImageInfo(String filename, String url) {}
}
