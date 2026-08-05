package com.example.dms.config;

import com.example.dms.entity.Customer;
import com.example.dms.entity.ManufacturerProtocol;
import com.example.dms.entity.MarketReference;
import com.example.dms.entity.ServiceRecord;
import com.example.dms.entity.Vehicle;
import com.example.dms.entity.VehicleValuation;
import com.example.dms.repository.CustomerRepository;
import com.example.dms.repository.ManufacturerProtocolRepository;
import com.example.dms.repository.MarketReferenceRepository;
import com.example.dms.repository.ServiceRecordRepository;
import com.example.dms.repository.VehicleRepository;
import com.example.dms.repository.VehicleValuationRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Configuration
public class SeedDataConfig {

    @Bean
    CommandLineRunner seedData(SeedDataLoader loader) {
        return args -> loader.load();
    }

    @Bean
    SeedDataLoader seedDataLoader(CustomerRepository customerRepository,
                                  VehicleRepository vehicleRepository,
                                  ServiceRecordRepository serviceRecordRepository,
                                  ManufacturerProtocolRepository protocolRepository,
                                  MarketReferenceRepository marketReferenceRepository,
                                  VehicleValuationRepository valuationRepository) {
        return new SeedDataLoader(
                customerRepository,
                vehicleRepository,
                serviceRecordRepository,
                protocolRepository,
                marketReferenceRepository,
                valuationRepository
        );
    }

    static class SeedDataLoader {
        private final CustomerRepository customerRepository;
        private final VehicleRepository vehicleRepository;
        private final ServiceRecordRepository serviceRecordRepository;
        private final ManufacturerProtocolRepository protocolRepository;
        private final MarketReferenceRepository marketReferenceRepository;
        private final VehicleValuationRepository valuationRepository;

        SeedDataLoader(CustomerRepository customerRepository,
                       VehicleRepository vehicleRepository,
                       ServiceRecordRepository serviceRecordRepository,
                       ManufacturerProtocolRepository protocolRepository,
                       MarketReferenceRepository marketReferenceRepository,
                       VehicleValuationRepository valuationRepository) {
            this.customerRepository = customerRepository;
            this.vehicleRepository = vehicleRepository;
            this.serviceRecordRepository = serviceRecordRepository;
            this.protocolRepository = protocolRepository;
            this.marketReferenceRepository = marketReferenceRepository;
            this.valuationRepository = valuationRepository;
        }

        @Transactional
        void load() {
            Customer bmwOwner = customerRepository.findByEmail("anna.keller@example.com")
                    .orElseGet(() -> customerRepository.save(new Customer("Anna", "Keller", "anna.keller@example.com", "+41 44 555 0101")));
            Customer teslaOwner = customerRepository.findByEmail("marco.steiner@example.com")
                    .orElseGet(() -> customerRepository.save(new Customer("Marco", "Steiner", "marco.steiner@example.com", "+41 44 555 0102")));
            Customer toyotaOwner = customerRepository.findByEmail("sofia.romano@example.com")
                    .orElseGet(() -> customerRepository.save(new Customer("Sofia", "Romano", "sofia.romano@example.com", "+41 44 555 0103")));

            Vehicle bmw = vehicleRepository.findByVin("WBA8E9G50JNU12345")
                    .orElseGet(() -> vehicleRepository.save(new Vehicle(
                            "WBA8E9G50JNU12345",
                            "BMW",
                            "3 Series",
                            2018,
                            82000,
                            "Petrol",
                            "Automatic",
                            LocalDate.of(2018, 6, 12),
                            new BigDecimal("24500.00"),
                            bmwOwner
                    )));
            Vehicle tesla = vehicleRepository.findByVin("5YJ3E1EA7KF123456")
                    .orElseGet(() -> vehicleRepository.save(new Vehicle(
                            "5YJ3E1EA7KF123456",
                            "Tesla",
                            "Model 3",
                            2019,
                            64000,
                            "Electric",
                            "Automatic",
                            LocalDate.of(2019, 9, 3),
                            new BigDecimal("28500.00"),
                            teslaOwner
                    )));
            Vehicle toyota = vehicleRepository.findByVin("JTDBR32E720123456")
                    .orElseGet(() -> vehicleRepository.save(new Vehicle(
                            "JTDBR32E720123456",
                            "Toyota",
                            "Corolla",
                            2020,
                            51000,
                            "Hybrid",
                            "Automatic",
                            LocalDate.of(2020, 4, 21),
                            new BigDecimal("19800.00"),
                            toyotaOwner
                    )));

            ManufacturerProtocol bmwProtocol = seedProtocol(
                    "BMW",
                    "3 Series",
                    "G20/F30 market comparison",
                    "Check service history, oil leaks, suspension wear, brake condition, tyre match, infotainment, and option packages.",
                    "Inspect timing chain history on older engines, cooling system leaks, electronic parking brake, and worn control arm bushings.",
                    "Value improves with full dealer service history, M Sport trim, desirable options, low mileage, and clean bodywork."
            );
            ManufacturerProtocol teslaProtocol = seedProtocol(
                    "Tesla",
                    "Model 3",
                    "Model 3 first generation",
                    "Check battery health, charging port, software status, glass roof, suspension noises, tyre wear, and Autopilot package.",
                    "Look for uneven tyre wear, control arm noise, panel alignment, paint defects, and charging hardware issues.",
                    "Battery condition, remaining warranty, software options, and charging history should strongly influence valuation."
            );
            ManufacturerProtocol toyotaProtocol = seedProtocol(
                    "Toyota",
                    "Corolla",
                    "E210 hybrid/petrol",
                    "Check hybrid system report, service intervals, brake wear, underbody condition, tyres, infotainment, and safety systems.",
                    "Watch for weak auxiliary batteries, worn interiors on fleet cars, and incomplete service records.",
                    "Strong reliability supports residual value; adjust for fleet usage, trim level, accident history, and verified maintenance."
            );

            MarketReference bmwReference = seedMarketReference("BMW", "3 Series", 2018, 70000, 95000, "23500.00",
                    "Internal MVP sample", "Comparable dealer listings for 2018 BMW 3 Series automatic petrol models.");
            MarketReference teslaReference = seedMarketReference("Tesla", "Model 3", 2019, 50000, 80000, "29500.00",
                    "Internal MVP sample", "Comparable dealer listings for standard-range 2019 Tesla Model 3 vehicles.");
            MarketReference toyotaReference = seedMarketReference("Toyota", "Corolla", 2020, 40000, 65000, "20500.00",
                    "Internal MVP sample", "Comparable dealer listings for 2020 Toyota Corolla hybrid models.");

            seedServiceRecord(bmw, LocalDate.of(2024, 5, 10), 71000, "Oil service, brake fluid, cabin filter", "BMW Partner Workshop", "780.00");
            seedServiceRecord(tesla, LocalDate.of(2025, 1, 15), 59000, "Tyre replacement, brake inspection, software check", "Tesla Service", "920.00");
            seedServiceRecord(toyota, LocalDate.of(2025, 3, 2), 47000, "Hybrid system check, annual service, brake inspection", "Toyota Service Center", "640.00");

            seedValuation(bmw, bmwProtocol, bmwReference, "23800.00", 78,
                    "Sample MVP valuation based on mileage, service history, protocol risks, and internal market reference.");
            seedValuation(tesla, teslaProtocol, teslaReference, "29200.00", 74,
                    "Sample MVP valuation weighted toward battery/software condition and matching internal market reference.");
            seedValuation(toyota, toyotaProtocol, toyotaReference, "20200.00", 82,
                    "Sample MVP valuation based on strong service history, hybrid protocol checks, and internal market reference.");
        }

        private ManufacturerProtocol seedProtocol(String manufacturer, String model, String generation,
                                                  String checklist, String knownIssues, String guidance) {
            return protocolRepository.findByManufacturerIgnoreCaseAndModelIgnoreCase(manufacturer, model).stream()
                    .findFirst()
                    .orElseGet(() -> protocolRepository.save(new ManufacturerProtocol(
                            manufacturer,
                            model,
                            generation,
                            checklist,
                            knownIssues,
                            guidance
                    )));
        }

        private MarketReference seedMarketReference(String manufacturer, String model, Integer modelYear,
                                                    Integer mileageMinKm, Integer mileageMaxKm, String price,
                                                    String source, String notes) {
            boolean exists = marketReferenceRepository.existsByManufacturerIgnoreCaseAndModelIgnoreCaseAndModelYearAndSource(
                    manufacturer,
                    model,
                    modelYear,
                    source
            );
            if (exists) {
                return marketReferenceRepository.findByManufacturerIgnoreCaseAndModelIgnoreCase(manufacturer, model).stream()
                        .filter(reference -> modelYear.equals(reference.getModelYear()) && source.equals(reference.getSource()))
                        .findFirst()
                        .orElseThrow();
            }
            return marketReferenceRepository.save(new MarketReference(
                    manufacturer,
                    model,
                    modelYear,
                    mileageMinKm,
                    mileageMaxKm,
                    new BigDecimal(price),
                    source,
                    LocalDate.of(2026, 5, 1),
                    notes
            ));
        }

        private void seedServiceRecord(Vehicle vehicle, LocalDate serviceDate, Integer mileageKm, String description,
                                       String performedBy, String cost) {
            boolean exists = serviceRecordRepository.findByVehicleId(vehicle.getId()).stream()
                    .anyMatch(record -> record.getServiceDate().equals(serviceDate)
                            && record.getMileageKm().equals(mileageKm)
                            && record.getDescription().equals(description));
            if (!exists) {
                serviceRecordRepository.save(new ServiceRecord(
                        vehicle,
                        serviceDate,
                        mileageKm,
                        description,
                        performedBy,
                        new BigDecimal(cost)
                ));
            }
        }

        private void seedValuation(Vehicle vehicle, ManufacturerProtocol protocol, MarketReference reference,
                                   String estimatedValue, Integer confidenceScore, String rationale) {
            if (valuationRepository.findByVehicleId(vehicle.getId()).isEmpty()) {
                valuationRepository.save(new VehicleValuation(
                        vehicle,
                        protocol,
                        reference,
                        new BigDecimal(estimatedValue),
                        confidenceScore,
                        rationale
                ));
            }
        }
    }
}
