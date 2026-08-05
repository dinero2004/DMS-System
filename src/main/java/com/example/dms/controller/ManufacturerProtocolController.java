package com.example.dms.controller;

import com.example.dms.dto.ManufacturerProtocolDtos.CreateManufacturerProtocolRequest;
import com.example.dms.dto.ManufacturerProtocolDtos.ManufacturerProtocolResponse;
import com.example.dms.entity.ManufacturerProtocol;
import com.example.dms.exception.ResourceNotFoundException;
import com.example.dms.repository.ManufacturerProtocolRepository;
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
@RequestMapping("/api/manufacturer-protocols")
@Transactional(readOnly = true)
public class ManufacturerProtocolController {

    private final ManufacturerProtocolRepository manufacturerProtocolRepository;

    public ManufacturerProtocolController(ManufacturerProtocolRepository manufacturerProtocolRepository) {
        this.manufacturerProtocolRepository = manufacturerProtocolRepository;
    }

    @GetMapping
    public List<ManufacturerProtocolResponse> list(@RequestParam(required = false) String manufacturer,
                                                   @RequestParam(required = false) String model) {
        List<ManufacturerProtocol> protocols = manufacturer != null && model != null
                ? manufacturerProtocolRepository.findByManufacturerIgnoreCaseAndModelIgnoreCase(manufacturer, model)
                : manufacturerProtocolRepository.findAll();
        return protocols.stream()
                .map(ManufacturerProtocolResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public ManufacturerProtocolResponse get(@PathVariable Long id) {
        return manufacturerProtocolRepository.findById(id)
                .map(ManufacturerProtocolResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Manufacturer protocol %d was not found".formatted(id)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ManufacturerProtocolResponse create(@Valid @RequestBody CreateManufacturerProtocolRequest request) {
        ManufacturerProtocol protocol = new ManufacturerProtocol(
                request.manufacturer(),
                request.model(),
                request.generation(),
                request.inspectionChecklist(),
                request.knownIssues(),
                request.valuationGuidance()
        );
        return ManufacturerProtocolResponse.from(manufacturerProtocolRepository.save(protocol));
    }
}
