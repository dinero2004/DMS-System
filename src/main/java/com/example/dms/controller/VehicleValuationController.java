package com.example.dms.controller;

import com.example.dms.dto.VehicleValuationDtos.CreateVehicleValuationRequest;
import com.example.dms.dto.VehicleValuationDtos.CreateValuationSuggestionRequest;
import com.example.dms.dto.VehicleValuationDtos.ValuationSuggestionResponse;
import com.example.dms.dto.VehicleValuationDtos.VehicleValuationResponse;
import com.example.dms.entity.ManufacturerProtocol;
import com.example.dms.entity.MarketReference;
import com.example.dms.entity.Vehicle;
import com.example.dms.entity.VehicleValuation;
import com.example.dms.exception.ResourceNotFoundException;
import com.example.dms.repository.ManufacturerProtocolRepository;
import com.example.dms.repository.MarketReferenceRepository;
import com.example.dms.repository.VehicleRepository;
import com.example.dms.repository.VehicleValuationRepository;
import com.example.dms.service.ValuationService;
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
@RequestMapping("/api/vehicle-valuations")
@Transactional(readOnly = true)
public class VehicleValuationController {

    private final VehicleValuationRepository vehicleValuationRepository;
    private final VehicleRepository vehicleRepository;
    private final ManufacturerProtocolRepository manufacturerProtocolRepository;
    private final MarketReferenceRepository marketReferenceRepository;
    private final ValuationService valuationService;

    public VehicleValuationController(VehicleValuationRepository vehicleValuationRepository,
                                      VehicleRepository vehicleRepository,
                                      ManufacturerProtocolRepository manufacturerProtocolRepository,
                                      MarketReferenceRepository marketReferenceRepository,
                                      ValuationService valuationService) {
        this.vehicleValuationRepository = vehicleValuationRepository;
        this.vehicleRepository = vehicleRepository;
        this.manufacturerProtocolRepository = manufacturerProtocolRepository;
        this.marketReferenceRepository = marketReferenceRepository;
        this.valuationService = valuationService;
    }

    @GetMapping
    public List<VehicleValuationResponse> list(@RequestParam(required = false) Long vehicleId) {
        List<VehicleValuation> valuations = vehicleId == null
                ? vehicleValuationRepository.findAll()
                : vehicleValuationRepository.findByVehicleId(vehicleId);
        return valuations.stream()
                .map(VehicleValuationResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public VehicleValuationResponse get(@PathVariable Long id) {
        return vehicleValuationRepository.findById(id)
                .map(VehicleValuationResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle valuation %d was not found".formatted(id)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public VehicleValuationResponse create(@Valid @RequestBody CreateVehicleValuationRequest request) {
        Vehicle vehicle = vehicleRepository.findById(request.vehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle %d was not found".formatted(request.vehicleId())));
        ManufacturerProtocol protocol = request.manufacturerProtocolId() == null
                ? null
                : manufacturerProtocolRepository.findById(request.manufacturerProtocolId())
                .orElseThrow(() -> new ResourceNotFoundException("Manufacturer protocol %d was not found".formatted(request.manufacturerProtocolId())));
        MarketReference reference = request.marketReferenceId() == null
                ? null
                : marketReferenceRepository.findById(request.marketReferenceId())
                .orElseThrow(() -> new ResourceNotFoundException("Market reference %d was not found".formatted(request.marketReferenceId())));
        VehicleValuation valuation = new VehicleValuation(
                vehicle,
                protocol,
                reference,
                request.estimatedValue(),
                request.confidenceScore(),
                request.rationale()
        );
        return VehicleValuationResponse.from(vehicleValuationRepository.save(valuation));
    }

    @PostMapping("/suggest")
    public ValuationSuggestionResponse suggest(@Valid @RequestBody CreateValuationSuggestionRequest request) {
        return valuationService.suggestValuation(request.vehicleId());
    }
}
