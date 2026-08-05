package com.example.dms.service;

import com.example.dms.dto.VehicleValuationDtos.ValuationSuggestionResponse;
import com.example.dms.entity.ManufacturerProtocol;
import com.example.dms.entity.MarketReference;
import com.example.dms.entity.ServiceRecord;
import com.example.dms.entity.Vehicle;
import com.example.dms.exception.ResourceNotFoundException;
import com.example.dms.repository.ManufacturerProtocolRepository;
import com.example.dms.repository.MarketReferenceRepository;
import com.example.dms.repository.ServiceRecordRepository;
import com.example.dms.repository.VehicleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class ValuationService {

    private static final BigDecimal DEFAULT_PRICE = new BigDecimal("10000.00");
    private static final BigDecimal MILEAGE_ADJUSTMENT_PER_10000_KM = new BigDecimal("0.03");
    private static final BigDecimal MAX_MILEAGE_ADJUSTMENT = new BigDecimal("0.15");

    private final VehicleRepository vehicleRepository;
    private final ManufacturerProtocolRepository manufacturerProtocolRepository;
    private final ServiceRecordRepository serviceRecordRepository;
    private final MarketReferenceRepository marketReferenceRepository;

    public ValuationService(VehicleRepository vehicleRepository,
                            ManufacturerProtocolRepository manufacturerProtocolRepository,
                            ServiceRecordRepository serviceRecordRepository,
                            MarketReferenceRepository marketReferenceRepository) {
        this.vehicleRepository = vehicleRepository;
        this.manufacturerProtocolRepository = manufacturerProtocolRepository;
        this.serviceRecordRepository = serviceRecordRepository;
        this.marketReferenceRepository = marketReferenceRepository;
    }

    public ValuationSuggestionResponse suggestValuation(Long vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle %d was not found".formatted(vehicleId)));

        List<String> positiveFactors = new ArrayList<>();
        List<String> negativeFactors = new ArrayList<>();
        List<String> missingDataWarnings = collectMissingVehicleData(vehicle);

        ManufacturerProtocol protocol = findProtocol(vehicle, positiveFactors, missingDataWarnings);
        List<ServiceRecord> serviceRecords = serviceRecordRepository.findByVehicleId(vehicle.getId());
        List<MarketReference> marketReferences = findMarketReferences(vehicle, positiveFactors, missingDataWarnings);

        BigDecimal basePrice = calculateBasePrice(vehicle, marketReferences, positiveFactors, missingDataWarnings);
        BigDecimal adjustedPrice = basePrice;

        adjustedPrice = adjustedPrice.add(calculateMileageAdjustment(vehicle, marketReferences, basePrice, positiveFactors, negativeFactors, missingDataWarnings));
        adjustedPrice = adjustedPrice.add(calculateServiceHistoryAdjustment(vehicle, serviceRecords, basePrice, positiveFactors, negativeFactors, missingDataWarnings));
        adjustedPrice = adjustedPrice.add(calculateAskingPriceSignal(vehicle, basePrice, positiveFactors, negativeFactors));

        BigDecimal suggestedPrice = roundToNearestHundred(adjustedPrice.max(BigDecimal.ZERO));
        int confidenceScore = calculateConfidenceScore(vehicle, protocol, serviceRecords, marketReferences, missingDataWarnings);
        String explanation = buildExplanation(vehicle, basePrice, suggestedPrice, confidenceScore, marketReferences, serviceRecords, protocol);

        return new ValuationSuggestionResponse(
                vehicle.getId(),
                vehicle.getVin(),
                vehicle.getManufacturer(),
                vehicle.getModel(),
                vehicle.getModelYear(),
                vehicle.getMileageKm(),
                protocol == null ? null : protocol.getId(),
                marketReferences.stream().map(MarketReference::getId).toList(),
                serviceRecords.size(),
                suggestedPrice,
                confidenceScore,
                positiveFactors,
                negativeFactors,
                missingDataWarnings,
                explanation
        );
    }

    private List<String> collectMissingVehicleData(Vehicle vehicle) {
        List<String> warnings = new ArrayList<>();
        addIfBlank(warnings, vehicle.getVin(), "VIN is missing.");
        addIfBlank(warnings, vehicle.getManufacturer(), "Manufacturer is missing.");
        addIfBlank(warnings, vehicle.getModel(), "Model is missing.");
        addIfNull(warnings, vehicle.getModelYear(), "Model year is missing.");
        addIfNull(warnings, vehicle.getMileageKm(), "Mileage is missing.");
        addIfBlank(warnings, vehicle.getFuelType(), "Fuel type is missing.");
        addIfBlank(warnings, vehicle.getTransmission(), "Transmission is missing.");
        addIfNull(warnings, vehicle.getFirstRegistrationDate(), "First registration date is missing.");
        return warnings;
    }

    private ManufacturerProtocol findProtocol(Vehicle vehicle, List<String> positiveFactors, List<String> missingDataWarnings) {
        if (isBlank(vehicle.getManufacturer()) || isBlank(vehicle.getModel())) {
            missingDataWarnings.add("Manufacturer protocol could not be matched because manufacturer or model is missing.");
            return null;
        }

        List<ManufacturerProtocol> protocols = manufacturerProtocolRepository
                .findByManufacturerIgnoreCaseAndModelIgnoreCase(vehicle.getManufacturer(), vehicle.getModel());
        if (protocols.isEmpty()) {
            missingDataWarnings.add("No manufacturer/model protocol found for %s %s.".formatted(vehicle.getManufacturer(), vehicle.getModel()));
            return null;
        }

        ManufacturerProtocol protocol = protocols.getFirst();
        positiveFactors.add("Matched manufacturer protocol: %s %s%s.".formatted(
                protocol.getManufacturer(),
                protocol.getModel(),
                isBlank(protocol.getGeneration()) ? "" : " (" + protocol.getGeneration() + ")"
        ));
        return protocol;
    }

    private List<MarketReference> findMarketReferences(Vehicle vehicle, List<String> positiveFactors, List<String> missingDataWarnings) {
        if (isBlank(vehicle.getManufacturer()) || isBlank(vehicle.getModel())) {
            missingDataWarnings.add("Market references could not be matched because manufacturer or model is missing.");
            return List.of();
        }

        List<MarketReference> references = marketReferenceRepository
                .findByManufacturerIgnoreCaseAndModelIgnoreCase(vehicle.getManufacturer(), vehicle.getModel());
        if (references.isEmpty()) {
            missingDataWarnings.add("No internal market reference data found for %s %s.".formatted(vehicle.getManufacturer(), vehicle.getModel()));
            return references;
        }

        long exactYearMatches = references.stream()
                .filter(reference -> Objects.equals(reference.getModelYear(), vehicle.getModelYear()))
                .count();
        if (exactYearMatches > 0) {
            positiveFactors.add("Found %d internal market reference(s) for the same model year.".formatted(exactYearMatches));
        } else {
            positiveFactors.add("Found internal market references for this manufacturer/model, but not the exact model year.");
        }
        return references;
    }

    private BigDecimal calculateBasePrice(Vehicle vehicle, List<MarketReference> references,
                                          List<String> positiveFactors, List<String> missingDataWarnings) {
        if (!references.isEmpty()) {
            List<MarketReference> exactYearReferences = references.stream()
                    .filter(reference -> Objects.equals(reference.getModelYear(), vehicle.getModelYear()))
                    .toList();
            List<MarketReference> selectedReferences = exactYearReferences.isEmpty() ? references : exactYearReferences;

            BigDecimal averagePrice = averageReferencePrice(selectedReferences);
            if (exactYearReferences.isEmpty() && vehicle.getModelYear() != null) {
                int averageReferenceYear = (int) Math.round(selectedReferences.stream()
                        .mapToInt(MarketReference::getModelYear)
                        .average()
                        .orElse(vehicle.getModelYear()));
                int yearDelta = vehicle.getModelYear() - averageReferenceYear;
                BigDecimal yearAdjustment = averagePrice.multiply(new BigDecimal("0.05")).multiply(BigDecimal.valueOf(yearDelta));
                averagePrice = averagePrice.add(yearAdjustment);
            }
            return averagePrice;
        }

        if (vehicle.getAskingPrice() != null) {
            missingDataWarnings.add("Suggested price uses asking price as fallback because no market reference was available.");
            return vehicle.getAskingPrice();
        }

        missingDataWarnings.add("Suggested price uses a conservative default because both market reference and asking price are missing.");
        return DEFAULT_PRICE;
    }

    private BigDecimal calculateMileageAdjustment(Vehicle vehicle, List<MarketReference> references, BigDecimal basePrice,
                                                  List<String> positiveFactors, List<String> negativeFactors,
                                                  List<String> missingDataWarnings) {
        if (vehicle.getMileageKm() == null) {
            missingDataWarnings.add("Mileage adjustment skipped because mileage is missing.");
            return BigDecimal.ZERO;
        }

        Integer referenceMileage = estimateReferenceMileage(references);
        if (referenceMileage == null) {
            referenceMileage = expectedMileageForAge(vehicle);
        }
        if (referenceMileage == null || referenceMileage <= 0) {
            missingDataWarnings.add("Mileage adjustment skipped because no reliable mileage benchmark is available.");
            return BigDecimal.ZERO;
        }

        int mileageDelta = referenceMileage - vehicle.getMileageKm();
        BigDecimal adjustmentRate = BigDecimal.valueOf(mileageDelta)
                .divide(new BigDecimal("10000"), 6, RoundingMode.HALF_UP)
                .multiply(MILEAGE_ADJUSTMENT_PER_10000_KM);
        adjustmentRate = clamp(adjustmentRate, MAX_MILEAGE_ADJUSTMENT.negate(), MAX_MILEAGE_ADJUSTMENT);
        BigDecimal adjustment = basePrice.multiply(adjustmentRate);

        if (adjustment.signum() > 0) {
            positiveFactors.add("Mileage is below the benchmark by about %d km.".formatted(Math.abs(mileageDelta)));
        } else if (adjustment.signum() < 0) {
            negativeFactors.add("Mileage is above the benchmark by about %d km.".formatted(Math.abs(mileageDelta)));
        }
        return adjustment;
    }

    private BigDecimal calculateServiceHistoryAdjustment(Vehicle vehicle, List<ServiceRecord> serviceRecords, BigDecimal basePrice,
                                                        List<String> positiveFactors, List<String> negativeFactors,
                                                        List<String> missingDataWarnings) {
        if (serviceRecords.isEmpty()) {
            missingDataWarnings.add("No service history records found.");
            negativeFactors.add("Service history is missing, reducing confidence and value.");
            return basePrice.multiply(new BigDecimal("-0.05"));
        }

        ServiceRecord latestRecord = serviceRecords.stream()
                .max(Comparator.comparing(ServiceRecord::getServiceDate))
                .orElseThrow();
        long monthsSinceService = ChronoUnit.MONTHS.between(latestRecord.getServiceDate(), LocalDate.now());
        BigDecimal adjustment = BigDecimal.ZERO;

        if (monthsSinceService <= 12) {
            positiveFactors.add("Recent service record found on %s.".formatted(latestRecord.getServiceDate()));
            adjustment = adjustment.add(basePrice.multiply(new BigDecimal("0.03")));
        } else if (monthsSinceService > 24) {
            negativeFactors.add("Last recorded service is older than 24 months.");
            adjustment = adjustment.add(basePrice.multiply(new BigDecimal("-0.04")));
        }

        boolean serviceMileageLooksConsistent = serviceRecords.stream()
                .map(ServiceRecord::getMileageKm)
                .filter(Objects::nonNull)
                .max(Integer::compareTo)
                .map(maxServiceMileage -> vehicle.getMileageKm() == null || maxServiceMileage <= vehicle.getMileageKm() + 1000)
                .orElse(false);
        if (serviceMileageLooksConsistent) {
            positiveFactors.add("Service mileage is consistent with current vehicle mileage.");
        } else {
            negativeFactors.add("Service mileage data is incomplete or inconsistent.");
            adjustment = adjustment.add(basePrice.multiply(new BigDecimal("-0.02")));
        }

        return adjustment;
    }

    private BigDecimal calculateAskingPriceSignal(Vehicle vehicle, BigDecimal basePrice,
                                                  List<String> positiveFactors, List<String> negativeFactors) {
        if (vehicle.getAskingPrice() == null || basePrice.signum() <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal differenceRatio = vehicle.getAskingPrice().subtract(basePrice)
                .divide(basePrice, 4, RoundingMode.HALF_UP);
        if (differenceRatio.abs().compareTo(new BigDecimal("0.20")) > 0) {
            negativeFactors.add("Asking price differs from internal market baseline by more than 20%.");
            return BigDecimal.ZERO;
        }

        positiveFactors.add("Asking price is broadly aligned with the internal market baseline.");
        return vehicle.getAskingPrice().subtract(basePrice).multiply(new BigDecimal("0.20"));
    }

    private int calculateConfidenceScore(Vehicle vehicle, ManufacturerProtocol protocol, List<ServiceRecord> serviceRecords,
                                         List<MarketReference> marketReferences, List<String> missingDataWarnings) {
        int score = 45;

        if (!marketReferences.isEmpty()) {
            score += 15;
            boolean exactYearMatch = marketReferences.stream()
                    .anyMatch(reference -> Objects.equals(reference.getModelYear(), vehicle.getModelYear()));
            if (exactYearMatch) {
                score += 10;
            }
        }
        if (protocol != null) {
            score += 10;
        }
        if (!serviceRecords.isEmpty()) {
            score += 10;
        }
        if (vehicle.getAskingPrice() != null) {
            score += 5;
        }

        score -= Math.min(25, missingDataWarnings.size() * 5);
        return Math.max(15, Math.min(95, score));
    }

    private String buildExplanation(Vehicle vehicle, BigDecimal basePrice, BigDecimal suggestedPrice, int confidenceScore,
                                    List<MarketReference> marketReferences, List<ServiceRecord> serviceRecords,
                                    ManufacturerProtocol protocol) {
        String marketReferenceSummary = marketReferences.isEmpty()
                ? "no internal market references"
                : "%d internal market reference(s)".formatted(marketReferences.size());
        String protocolSummary = protocol == null ? "no matched protocol" : "matched protocol #%d".formatted(protocol.getId());
        return "Rule-based valuation for %s %s %s starts from a baseline of %s using %s, then adjusts for mileage, service history, and asking-price alignment. The final suggested price is %s with confidence %d/100. Inputs used: %s, %d service record(s), and %s."
                .formatted(
                        vehicle.getModelYear(),
                        vehicle.getManufacturer(),
                        vehicle.getModel(),
                        formatMoney(basePrice),
                        marketReferenceSummary,
                        formatMoney(suggestedPrice),
                        confidenceScore,
                        marketReferenceSummary,
                        serviceRecords.size(),
                        protocolSummary
                );
    }

    private BigDecimal averageReferencePrice(List<MarketReference> references) {
        BigDecimal total = references.stream()
                .map(MarketReference::getReferencePrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.divide(BigDecimal.valueOf(references.size()), 2, RoundingMode.HALF_UP);
    }

    private Integer estimateReferenceMileage(List<MarketReference> references) {
        List<Integer> midpoints = references.stream()
                .map(reference -> {
                    if (reference.getMileageMinKm() == null || reference.getMileageMaxKm() == null) {
                        return null;
                    }
                    return (reference.getMileageMinKm() + reference.getMileageMaxKm()) / 2;
                })
                .filter(Objects::nonNull)
                .toList();
        if (midpoints.isEmpty()) {
            return null;
        }
        return (int) Math.round(midpoints.stream().mapToInt(Integer::intValue).average().orElse(0));
    }

    private Integer expectedMileageForAge(Vehicle vehicle) {
        if (vehicle.getModelYear() == null) {
            return null;
        }
        int age = Math.max(1, LocalDate.now().getYear() - vehicle.getModelYear());
        return age * 15000;
    }

    private BigDecimal roundToNearestHundred(BigDecimal value) {
        return value.divide(new BigDecimal("100"), 0, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal clamp(BigDecimal value, BigDecimal min, BigDecimal max) {
        if (value.compareTo(min) < 0) {
            return min;
        }
        if (value.compareTo(max) > 0) {
            return max;
        }
        return value;
    }

    private String formatMoney(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private void addIfNull(List<String> warnings, Object value, String warning) {
        if (value == null) {
            warnings.add(warning);
        }
    }

    private void addIfBlank(List<String> warnings, String value, String warning) {
        if (isBlank(value)) {
            warnings.add(warning);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
