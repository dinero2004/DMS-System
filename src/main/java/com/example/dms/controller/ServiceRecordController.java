package com.example.dms.controller;

import com.example.dms.dto.ServiceRecordDtos.CreateServiceRecordRequest;
import com.example.dms.dto.ServiceRecordDtos.ServiceRecordResponse;
import com.example.dms.entity.ServiceRecord;
import com.example.dms.entity.Vehicle;
import com.example.dms.exception.ResourceNotFoundException;
import com.example.dms.repository.ServiceRecordRepository;
import com.example.dms.repository.VehicleRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/service-records")
@Transactional(readOnly = true)
public class ServiceRecordController {

    private final ServiceRecordRepository serviceRecordRepository;
    private final VehicleRepository vehicleRepository;

    public ServiceRecordController(ServiceRecordRepository serviceRecordRepository, VehicleRepository vehicleRepository) {
        this.serviceRecordRepository = serviceRecordRepository;
        this.vehicleRepository = vehicleRepository;
    }

    @GetMapping
    public List<ServiceRecordResponse> list(@RequestParam(required = false) Long vehicleId) {
        List<ServiceRecord> records = vehicleId == null
                ? serviceRecordRepository.findAll()
                : serviceRecordRepository.findByVehicleId(vehicleId);
        return records.stream()
                .map(ServiceRecordResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public ServiceRecordResponse get(@PathVariable Long id) {
        return serviceRecordRepository.findById(id)
                .map(ServiceRecordResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Service record %d was not found".formatted(id)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ServiceRecordResponse create(@Valid @RequestBody CreateServiceRecordRequest request) {
        Vehicle vehicle = vehicleRepository.findById(request.vehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle %d was not found".formatted(request.vehicleId())));
        ServiceRecord record = new ServiceRecord(
                vehicle,
                request.serviceDate(),
                request.mileageKm(),
                request.description(),
                request.performedBy(),
                request.cost()
        );
        return ServiceRecordResponse.from(serviceRecordRepository.save(record));
    }
}
