package com.example.dms.controller;

import com.example.dms.dto.VehicleDtos.CreateVehicleRequest;
import com.example.dms.dto.VehicleDtos.VehicleResponse;
import com.example.dms.entity.Customer;
import com.example.dms.entity.Vehicle;
import com.example.dms.exception.ResourceNotFoundException;
import com.example.dms.repository.CustomerRepository;
import com.example.dms.repository.VehicleRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@Transactional(readOnly = true)
public class VehicleController {

    private final VehicleRepository vehicleRepository;
    private final CustomerRepository customerRepository;

    public VehicleController(VehicleRepository vehicleRepository, CustomerRepository customerRepository) {
        this.vehicleRepository = vehicleRepository;
        this.customerRepository = customerRepository;
    }

    @GetMapping
    public List<VehicleResponse> list() {
        return vehicleRepository.findAll().stream()
                .map(VehicleResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public VehicleResponse get(@PathVariable Long id) {
        return vehicleRepository.findById(id)
                .map(VehicleResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle %d was not found".formatted(id)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public VehicleResponse create(@Valid @RequestBody CreateVehicleRequest request) {
        Customer owner = request.ownerId() == null
                ? null
                : customerRepository.findById(request.ownerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer %d was not found".formatted(request.ownerId())));

        Vehicle vehicle = new Vehicle(
                request.vin(),
                request.manufacturer(),
                request.model(),
                request.modelYear(),
                request.mileageKm(),
                request.fuelType(),
                request.transmission(),
                request.firstRegistrationDate(),
                request.askingPrice(),
                owner
        );
        return VehicleResponse.from(vehicleRepository.save(vehicle));
    }

    @PutMapping("/{id}")
    @Transactional
    public VehicleResponse update(@PathVariable Long id, @Valid @RequestBody CreateVehicleRequest request) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle %d was not found".formatted(id)));
        Customer owner = request.ownerId() == null
                ? null
                : customerRepository.findById(request.ownerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer %d was not found".formatted(request.ownerId())));

        vehicle.setVin(request.vin());
        vehicle.setManufacturer(request.manufacturer());
        vehicle.setModel(request.model());
        vehicle.setModelYear(request.modelYear());
        vehicle.setMileageKm(request.mileageKm());
        vehicle.setFuelType(request.fuelType());
        vehicle.setTransmission(request.transmission());
        vehicle.setFirstRegistrationDate(request.firstRegistrationDate());
        vehicle.setAskingPrice(request.askingPrice());
        vehicle.setOwner(owner);

        return VehicleResponse.from(vehicleRepository.save(vehicle));
    }
}
