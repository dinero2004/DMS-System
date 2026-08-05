package com.dms.backend.modules.customervehicle.service;

import com.dms.backend.config.DmsUploadProperties;
import com.dms.backend.modules.customervehicle.persistence.CarEntity;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CarImageStorageService {

    private static final Set<String> ALLOWED_EXT = Set.of("jpg", "jpeg", "png", "webp", "gif");

    private final Path carsRoot;

    public CarImageStorageService(DmsUploadProperties props) {
        this.carsRoot = Path.of(props.getBaseDir()).toAbsolutePath().normalize().resolve("cars");
    }

    public Path resolveCarDir(CarEntity car) {
        String make = sanitizeSegment(car.getMake() != null ? car.getMake() : "unknown");
        String model = sanitizeSegment(car.getModel() != null ? car.getModel() : "unknown");
        return carsRoot.resolve(make).resolve(model).resolve(car.getId());
    }

    public List<String> listImageNames(CarEntity car) throws IOException {
        Path dir = resolveCarDir(car);
        if (!Files.isDirectory(dir)) return List.of();
        try (Stream<Path> stream = Files.list(dir)) {
            return stream
                .filter(Files::isRegularFile)
                .map(p -> p.getFileName().toString())
                .sorted(Comparator.naturalOrder())
                .toList();
        }
    }

    public Path resolveImagePath(CarEntity car, String filename) {
        String safe = sanitizeFilename(filename);
        Path resolved = resolveCarDir(car).resolve(safe).normalize();
        if (!resolved.startsWith(carsRoot)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid filename");
        }
        return resolved;
    }

    public String storeImage(CarEntity car, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty file");
        }
        String ext = extension(file.getOriginalFilename());
        if (!ALLOWED_EXT.contains(ext)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported image type");
        }
        Path dir = resolveCarDir(car);
        Files.createDirectories(dir);
        String name = UUID.randomUUID() + "." + ext;
        Path target = dir.resolve(name);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        return name;
    }

    public void deleteImage(CarEntity car, String filename) throws IOException {
        Path path = resolveImagePath(car, filename);
        Files.deleteIfExists(path);
        cleanupEmptyParents(path.getParent());
    }

    public void deleteAllForCar(CarEntity car) throws IOException {
        Path dir = resolveCarDir(car);
        deleteDirectoryRecursive(dir);
        // Legacy flat folder by id only
        Path legacy = carsRoot.resolve(car.getId());
        deleteDirectoryRecursive(legacy);
    }

    public void relocateIfNeeded(CarEntity car, String oldMake, String oldModel) throws IOException {
        String om = sanitizeSegment(StringUtils.hasText(oldMake) ? oldMake : "unknown");
        String omdl = sanitizeSegment(StringUtils.hasText(oldModel) ? oldModel : "unknown");
        Path oldDir = carsRoot.resolve(om).resolve(omdl).resolve(car.getId());
        Path newDir = resolveCarDir(car);
        if (Files.isDirectory(oldDir) && !oldDir.equals(newDir)) {
            Files.createDirectories(newDir.getParent());
            if (Files.exists(newDir)) {
                try (Stream<Path> files = Files.list(oldDir)) {
                    for (Path f : files.filter(Files::isRegularFile).toList()) {
                        Files.move(f, newDir.resolve(f.getFileName()), StandardCopyOption.REPLACE_EXISTING);
                    }
                }
                deleteDirectoryRecursive(oldDir);
            } else {
                Files.move(oldDir, newDir, StandardCopyOption.ATOMIC_MOVE);
            }
        }
    }

    private void deleteDirectoryRecursive(Path dir) throws IOException {
        if (!Files.exists(dir)) return;
        try (Stream<Path> walk = Files.walk(dir)) {
            List<Path> paths = walk.sorted(Comparator.reverseOrder()).toList();
            for (Path p : paths) Files.deleteIfExists(p);
        }
    }

    private void cleanupEmptyParents(Path dir) throws IOException {
        if (dir == null || !dir.startsWith(carsRoot)) return;
        Path current = dir;
        while (current != null && current.startsWith(carsRoot) && !current.equals(carsRoot)) {
            try (Stream<Path> s = Files.list(current)) {
                if (s.findAny().isPresent()) break;
            }
            Files.deleteIfExists(current);
            current = current.getParent();
        }
    }

    static String sanitizeSegment(String value) {
        String s = value.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "_");
        if (s.isEmpty() || s.equals("_")) return "unknown";
        return s.length() > 60 ? s.substring(0, 60) : s;
    }

    static String sanitizeFilename(String name) {
        String base = Path.of(name).getFileName().toString();
        if (!StringUtils.hasText(base) || base.contains("..") || base.contains("/") || base.contains("\\")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid filename");
        }
        return base;
    }

    private static String extension(String filename) {
        if (!StringUtils.hasText(filename) || !filename.contains(".")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File must have an extension");
        }
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }
}
