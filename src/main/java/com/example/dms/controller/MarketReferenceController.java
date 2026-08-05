package com.example.dms.controller;

import com.example.dms.dto.MarketReferenceDtos.CreateMarketReferenceRequest;
import com.example.dms.dto.MarketReferenceDtos.MarketReferenceResponse;
import com.example.dms.entity.MarketReference;
import com.example.dms.exception.ResourceNotFoundException;
import com.example.dms.repository.MarketReferenceRepository;
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
@RequestMapping("/api/market-references")
@Transactional(readOnly = true)
public class MarketReferenceController {

    private final MarketReferenceRepository marketReferenceRepository;

    public MarketReferenceController(MarketReferenceRepository marketReferenceRepository) {
        this.marketReferenceRepository = marketReferenceRepository;
    }

    @GetMapping
    public List<MarketReferenceResponse> list(@RequestParam(required = false) String manufacturer,
                                              @RequestParam(required = false) String model) {
        List<MarketReference> references = manufacturer != null && model != null
                ? marketReferenceRepository.findByManufacturerIgnoreCaseAndModelIgnoreCase(manufacturer, model)
                : marketReferenceRepository.findAll();
        return references.stream()
                .map(MarketReferenceResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public MarketReferenceResponse get(@PathVariable Long id) {
        return marketReferenceRepository.findById(id)
                .map(MarketReferenceResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Market reference %d was not found".formatted(id)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public MarketReferenceResponse create(@Valid @RequestBody CreateMarketReferenceRequest request) {
        MarketReference reference = new MarketReference(
                request.manufacturer(),
                request.model(),
                request.modelYear(),
                request.mileageMinKm(),
                request.mileageMaxKm(),
                request.referencePrice(),
                request.source(),
                request.observedAt(),
                request.notes()
        );
        return MarketReferenceResponse.from(marketReferenceRepository.save(reference));
    }
}
