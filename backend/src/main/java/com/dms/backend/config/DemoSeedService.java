package com.dms.backend.config;

import com.dms.backend.modules.customervehicle.domain.VehicleRole;
import com.dms.backend.modules.customervehicle.persistence.CarEntity;
import com.dms.backend.modules.customervehicle.persistence.CarRepository;
import com.dms.backend.modules.customervehicle.persistence.ClientEntity;
import com.dms.backend.modules.customervehicle.persistence.ClientRepository;
import com.dms.backend.modules.finance.service.InvoiceService;
import com.dms.backend.modules.sales.api.FinancingController;
import com.dms.backend.modules.sales.persistence.FinancingOfferEntity;
import com.dms.backend.modules.sales.persistence.FinancingOfferRepository;
import com.dms.backend.modules.sales.persistence.SalesContractEntity;
import com.dms.backend.modules.sales.persistence.SalesContractRepository;
import com.dms.backend.modules.sales.persistence.SalesLeadEntity;
import com.dms.backend.modules.sales.persistence.SalesLeadRepository;
import com.dms.backend.modules.workshop.persistence.WorkshopJobEntity;
import com.dms.backend.modules.workshop.persistence.WorkshopJobItemEntity;
import com.dms.backend.modules.workshop.persistence.WorkshopJobItemRepository;
import com.dms.backend.modules.workshop.persistence.WorkshopJobRepository;
import com.dms.backend.shared.DmsConstants;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DemoSeedService {

    private static final Logger log = LoggerFactory.getLogger(DemoSeedService.class);
    private static final double SWISS_VAT_FACTOR = 1.081;

    private static final String C1 = "11111111-1111-1111-1111-111111111101";
    private static final String C2 = "11111111-1111-1111-1111-111111111102";
    private static final String C3 = "11111111-1111-1111-1111-111111111103";

    /** First three clients keep stable UUIDs; remainder deterministic from seed string. */
    private static String clientId(int i) {
        if (i == 0) return C1;
        if (i == 1) return C2;
        if (i == 2) return C3;
        return UUID.nameUUIDFromBytes(("dms-seed-client-" + i).getBytes(StandardCharsets.UTF_8)).toString();
    }

    private static String vehicleId(int i) {
        return UUID.nameUUIDFromBytes(("dms-seed-vehicle-" + i).getBytes(StandardCharsets.UTF_8)).toString();
    }

    private static String jobId(int i) {
        return UUID.nameUUIDFromBytes(("dms-seed-job-" + i).getBytes(StandardCharsets.UTF_8)).toString();
    }

    private static String leadId(int i) {
        return UUID.nameUUIDFromBytes(("dms-seed-lead-" + i).getBytes(StandardCharsets.UTF_8)).toString();
    }

    private static String contractId(int i) {
        return UUID.nameUUIDFromBytes(("dms-seed-contract-" + i).getBytes(StandardCharsets.UTF_8)).toString();
    }

    private static String finId(int i) {
        return UUID.nameUUIDFromBytes(("dms-seed-fin-" + i).getBytes(StandardCharsets.UTF_8)).toString();
    }

    private static String vin(int n) {
        return String.format("%017d", 10_000_000_000_000_000L + n);
    }

    /** { first, last, phone, email, street, zip, city, birthdayIso or "" } */
    private static final String[][] CLIENT_ROWS = {
        {"Anna", "Müller", "+41 79 111 22 33", "anna.mueller@example.ch", "Bahnhofstrasse 12", "3011", "Bern", "1988-03-15"},
        {"Bruno", "Schneider", "+41 78 222 33 44", "bruno.s@example.ch", "Seefeldstrasse 5", "8008", "Zürich", "1992-07-22"},
        {"Claire", "Wyss", "+41 77 333 44 55", "claire.wyss@example.ch", "Rue du Rhône 9", "1204", "Genève", ""},
        {"Marco", "Rossi", "+41 91 444 55 66", "marco.rossi@example.ch", "Via Nassa 3", "6900", "Lugano", "1984-11-08"},
        {"Sophie", "Dubois", "+41 22 555 66 77", "sophie.dubois@example.ch", "Rue de Lausanne 40", "1201", "Genève", "1990-05-19"},
        {"Lukas", "Huber", "+41 31 666 77 88", "lukas.huber@example.ch", "Marktgasse 7", "3011", "Bern", "1987-01-30"},
        {"Elena", "Fischer", "+41 61 777 88 99", "elena.fischer@example.ch", "Freie Strasse 15", "4051", "Basel", "1995-09-12"},
        {"Jonas", "Meier", "+41 81 888 99 00", "jonas.meier@example.ch", "Bahnhofplatz 2", "7000", "Chur", "1991-04-25"},
        {"Nina", "Keller", "+41 56 234 56 78", "nina.keller@example.ch", "Zugerstrasse 22", "6340", "Baar", "1989-12-03"},
        {"David", "Steiner", "+41 44 345 67 89", "david.steiner@example.ch", "Bahnhofstrasse 88", "8001", "Zürich", "1983-06-17"},
        {"Laura", "Baumann", "+41 31 456 78 90", "laura.baumann@example.ch", "Laubengasse 4", "3000", "Bern", "1993-02-28"},
        {"Felix", "Gerber", "+41 21 567 89 01", "felix.gerber@example.ch", "Place de la Palud 6", "1003", "Lausanne", "1986-08-14"},
        {"Mia", "Schmid", "+41 62 678 90 12", "mia.schmid@example.ch", "Ringstrasse 11", "5000", "Aarau", "1994-10-01"},
        {"Noah", "Widmer", "+41 71 789 01 23", "noah.widmer@example.ch", "Neugasse 9", "9000", "St. Gallen", "1992-03-22"},
        {"Lea", "Zimmermann", "+41 41 890 12 34", "lea.zimmermann@example.ch", "Hertensteinstrasse 30", "6004", "Luzern", "1990-07-07"},
        {"Tim", "Frei", "+41 32 901 23 45", "tim.frei@example.ch", "Ring 5", "2502", "Biel/Bienne", "1988-11-29"},
        {"Sarah", "Moser", "+41 55 012 34 56", "sarah.moser@example.ch", "Poststrasse 14", "8280", "Kreuzlingen", "1996-05-16"},
        {"Jan", "Wolf", "+41 24 123 45 67", "jan.wolf@example.ch", "Bahnhofstrasse 1", "3600", "Thun", "1985-09-09"},
        {"Alina", "Brunner", "+41 27 234 56 78", "alina.brunner@example.ch", "Bahnhofplatz 3", "3900", "Brig", "1991-12-24"},
        {"Simon", "Kaufmann", "+41 33 345 67 89", "simon.kaufmann@example.ch", "Spitalgasse 8", "3600", "Thun", "1987-04-11"},
    };

    /** { clientIndex, make, model, plate, vinSerial, year, km, color, trim, fuel, firstRegIso } */
    private static final Object[][] CUSTOMER_CARS = {
        {0, "BMW", "330i Touring M Sport", "BE 123456", 101, 2021, 42000, "Black", "Black", "PETROL", "2021-02-01"},
        {1, "Volkswagen", "Golf GTI Performance", "ZH 888999", 102, 2023, 18500, "Pure white", "Black", "PETROL", "2023-05-10"},
        {2, "Mercedes-Benz", "C 220 d Estate AMG Line", "GE 556677", 103, 2022, 31000, "Silver", "Black", "Diesel", "2022-03-15"},
        {3, "Audi", "Q5 45 TFSI quattro S line", "TI 334455", 104, 2024, 8200, "Navarra blue", "Grey", "PETROL", "2024-01-20"},
        {4, "Porsche", "Macan S", "VD 112233", 105, 2023, 12000, "White", "Red", "PETROL", "2023-06-01"},
        {5, "Tesla", "Model Y Long Range", "BS 998877", 106, 2024, 15000, "Midnight silver", "Black", "Electric", "2024-02-14"},
        {6, "Volvo", "XC60 B5 AWD Ultimate", "BL 445566", 107, 2023, 22000, "Denim blue", "Blond", "Hybrid (Petrol)", "2023-04-08"},
        {7, "Toyota", "RAV4 Plug-in Hybrid", "GR 778899", 108, 2022, 28000, "Grey", "Black", "Plug-in Hybrid (PHEV)", "2022-09-12"},
        {8, "Škoda", "Octavia Combi RS", "ZG 223344", 109, 2023, 19500, "Mamba green", "Black", "PETROL", "2023-07-22"},
        {9, "Hyundai", "Ioniq 5 AWD", "ZH 667788", 110, 2024, 9000, "Digital teal", "Grey", "Electric", "2024-03-01"},
        {10, "Ford", "Kuga ST-Line X PHEV", "BE 334455", 111, 2022, 35000, "Agate black", "Black", "Plug-in Hybrid (PHEV)", "2022-11-05"},
        {11, "Peugeot", "3008 GT Hybrid4", "VD 556677", 112, 2023, 16000, "Pearl white", "Brown", "Plug-in Hybrid (PHEV)", "2023-08-18"},
        {12, "Kia", "EV6 GT-Line", "GE 889900", 113, 2024, 6000, "Yacht blue", "Black", "Electric", "2024-04-10"},
        {13, "Land Rover", "Defender 110 X-Dynamic SE", "TI 112233", 114, 2023, 14000, "Eiger grey", "Ebony", "Diesel", "2023-05-25"},
        {14, "Mazda", "CX-60 Homura PHEV", "LU 445566", 115, 2024, 11000, "Soul red", "Black", "Plug-in Hybrid (PHEV)", "2024-02-28"},
        {15, "Nissan", "X-Trail e-4ORCE Tekna", "FR 778899", 116, 2023, 21000, "Champagne", "Beige", "Hybrid (Petrol)", "2023-10-12"},
        {0, "Mini", "Cooper S 5-door", "BE 990011", 117, 2020, 48000, "British racing green", "Tan", "PETROL", "2020-04-04"},
        {3, "Fiat", "500e La Prima", "TI 121212", 118, 2024, 5000, "Rose gold", "White", "Electric", "2024-05-01"},
        {7, "Subaru", "Outback Platinum", "GR 131313", 119, 2022, 33000, "Crimson red", "Black", "PETROL", "2022-07-19"},
        {11, "Cupra", "Formentor VZ e-Hybrid", "VD 141414", 120, 2023, 17500, "Magnetic tech", "Petrol blue", "Plug-in Hybrid (PHEV)", "2023-09-09"},
    };

    /** { make, model, plateOrNull, vinSerial, year, km, color, trim, purchase, catalog, sell, prep, fuel } — 40 dealer stock units */
    private static final Object[][] INVENTORY = {
        {"Porsche", "911 Carrera S", null, 201, 2022, 5200, "GT silver", "Black", 6_500_000L, 6_850_000L, 6_850_000L, 150_00L, "PETROL"},
        {"MINI", "Cooper S 3-door", null, 202, 2024, 3100, "British racing green", "Tan", 36_500_00L, 38_900_00L, 38_900_00L, 150_00L, "PETROL"},
        {"Lucid", "Air Touring", null, 203, 2024, 4200, "Stellar white", "Mojave", 72_000_00L, 78_500_00L, 78_500_00L, 200_00L, "Electric"},
        {"Rivian", "R1S Adventure", null, 204, 2024, 8900, "Forest green", "Black mountain", 89_000_00L, 94_900_00L, 94_900_00L, 250_00L, "Electric"},
        {"Ineos", "Grenadier Utility Wagon", "LU 900001", 205, 2023, 18500, "Scottish white", "Black", 58_000_00L, 62_500_00L, 62_500_00L, 180_00L, "Diesel"},
        {"Mercedes-Benz", "EQE 350+ SUV", null, 206, 2024, 6500, "High-tech silver", "Black", 71_000_00L, 76_900_00L, 76_900_00L, 200_00L, "Electric"},
        {"Audi", "e-tron GT quattro", null, 207, 2023, 9800, "Daytona grey", "Black", 95_000_00L, 99_800_00L, 99_800_00L, 220_00L, "Electric"},
        {"BMW", "iX xDrive50", null, 208, 2023, 14200, "Mineral white", "Castanea", 82_000_00L, 87_500_00L, 87_500_00L, 200_00L, "Electric"},
        {"Volkswagen", "ID.7 Pro S", null, 209, 2024, 7200, "Moonstone grey", "Black", 48_000_00L, 52_900_00L, 52_900_00L, 150_00L, "Electric"},
        {"Toyota", "Land Cruiser GR Sport", "ZH 800001", 210, 2024, 4100, "Precious white", "Black", 98_000_00L, 105_000_00L, 105_000_00L, 280_00L, "Diesel"},
        {"Ferrari", "Roma Spider", null, 211, 2024, 1200, "Rosso corsa", "Cuoio", 245_000_00L, 268_000_00L, 268_000_00L, 400_00L, "PETROL"},
        {"Lamborghini", "Urus S", null, 212, 2023, 5600, "Nero noctis", "Rosso", 198_000_00L, 215_000_00L, 215_000_00L, 350_00L, "PETROL"},
        {"Aston Martin", "DBX707", null, 213, 2023, 7800, "Ultramarine black", "Black", 215_000_00L, 232_000_00L, 232_000_00L, 380_00L, "PETROL"},
        {"Bentley", "Continental GT Speed", null, 214, 2022, 9200, "Anthracite", "Hotspur", 185_000_00L, 198_000_00L, 198_000_00L, 320_00L, "PETROL"},
        {"Volkswagen", "Golf R", "BE 801002", 215, 2023, 22000, "Lapiz blue", "Black", 48_000_00L, 51_900_00L, 51_900_00L, 150_00L, "PETROL"},
        {"Audi", "A4 Avant 45 TFSI quattro", "ZH 801003", 216, 2022, 34000, "Floret silver", "Black", 38_500_00L, 42_500_00L, 42_500_00L, 140_00L, "PETROL"},
        {"BMW", "320d Touring M Sport", "BS 801004", 217, 2021, 48000, "Mineral grey", "Oyster", 32_000_00L, 35_900_00L, 35_900_00L, 130_00L, "Diesel"},
        {"Mercedes-Benz", "C 200 AMG Line", "GE 801005", 218, 2023, 19000, "Obsidian black", "Black", 41_000_00L, 44_800_00L, 44_800_00L, 150_00L, "PETROL"},
        {"Škoda", "Octavia Combi 2.0 TSI RS", "ZG 801006", 219, 2022, 41000, "Velvet red", "Black", 28_500_00L, 31_500_00L, 31_500_00L, 120_00L, "PETROL"},
        {"Seat", "Leon FR 1.5 eTSI", "VD 801007", 220, 2023, 27000, "Magnetic tech", "Grey", 24_000_00L, 26_900_00L, 26_900_00L, 110_00L, "Hybrid (Petrol)"},
        {"Toyota", "Corolla Touring Sports 2.0 Hybrid", "LU 801008", 221, 2024, 12000, "Pearl white", "Black", 31_500_00L, 34_200_00L, 34_200_00L, 125_00L, "Hybrid (Petrol)"},
        {"Honda", "Civic e:HEV Advance", "TI 801009", 222, 2023, 23000, "Crystal black", "Grey", 29_000_00L, 31_800_00L, 31_800_00L, 120_00L, "Hybrid (Petrol)"},
        {"Mazda", "CX-5 2.5 AWD Exclusive-Line", "FR 801010", 223, 2022, 36000, "Soul red", "Black", 33_000_00L, 36_400_00L, 36_400_00L, 135_00L, "PETROL"},
        {"Nissan", "Qashqai e-Power Tekna+", "NE 801011", 224, 2024, 8000, "Ceramic grey", "Light grey", 35_000_00L, 38_500_00L, 38_500_00L, 130_00L, "Hybrid (Petrol)"},
        {"Hyundai", "Tucson 1.6 T-GDI PHEV", "SG 801012", 225, 2023, 16000, "Cyber grey", "Black", 39_000_00L, 42_900_00L, 42_900_00L, 140_00L, "Plug-in Hybrid (PHEV)"},
        {"Kia", "Sportage 1.6 T-GDI GT-Line", "AR 801013", 226, 2023, 21000, "Yacht blue", "Black", 36_500_00L, 39_800_00L, 39_800_00L, 135_00L, "PETROL"},
        {"Ford", "Puma ST-Line X", "BE 801014", 227, 2022, 29000, "Desert island blue", "Black", 22_500_00L, 24_900_00L, 24_900_00L, 100_00L, "PETROL"},
        {"Peugeot", "3008 GT 1.2 PureTech", "VD 801015", 228, 2023, 18000, "Pearl white", "Brown", 32_000_00L, 34_500_00L, 34_500_00L, 125_00L, "PETROL"},
        {"Volvo", "XC40 B4 Ultimate Dark", "ZH 801016", 229, 2024, 9500, "Onyx black", "Charcoal", 44_000_00L, 47_500_00L, 47_500_00L, 160_00L, "Hybrid (Petrol)"},
        {"Subaru", "Outback 2.5i Platinum", "GR 801017", 230, 2022, 39000, "Crimson red", "Black", 36_000_00L, 38_900_00L, 38_900_00L, 130_00L, "PETROL"},
        {"Dacia", "Duster Extreme TCe 150 4x4", null, 231, 2023, 25000, "Dust khaki", "Black", 21_000_00L, 23_500_00L, 23_500_00L, 95_00L, "PETROL"},
        {"Suzuki", "Vitara 1.4 Boosterjet Allgrip", "TI 801018", 232, 2022, 32000, "Atlantis turquoise", "Black", 23_500_00L, 25_900_00L, 25_900_00L, 105_00L, "PETROL"},
        {"Opel", "Mokka-e GS Line", "BS 801019", 233, 2024, 6000, "Jade white", "Grey", 35_000_00L, 37_800_00L, 37_800_00L, 130_00L, "Electric"},
        {"Fiat", "500e La Prima", "GE 801020", 234, 2024, 4000, "Rose gold", "White", 28_000_00L, 30_500_00L, 30_500_00L, 110_00L, "Electric"},
        {"Tesla", "Model 3 Long Range", "ZH 801021", 235, 2023, 28000, "Midnight silver", "Black", 42_000_00L, 45_900_00L, 45_900_00L, 150_00L, "Electric"},
        {"MG", "4 Electric Trophy Extended Range", "LU 801022", 236, 2024, 11000, "Hunter green", "Black", 38_000_00L, 41_200_00L, 41_200_00L, 125_00L, "Electric"},
        {"Cupra", "Born VZ", "VD 801023", 237, 2024, 7000, "Midnight black", "Petrol blue", 40_500_00L, 43_800_00L, 43_800_00L, 135_00L, "Electric"},
        {"Jeep", "Avenger Summit e-Hybrid", "FR 801024", 238, 2024, 5000, "Sun yellow", "Black", 34_000_00L, 36_900_00L, 36_900_00L, 125_00L, "Hybrid (Petrol)"},
        {"Land Rover", "Range Rover Evoque P250", "ZH 801025", 239, 2023, 17000, "Carpathian grey", "Ebony", 52_000_00L, 56_500_00L, 56_500_00L, 175_00L, "PETROL"},
        {"Alpine", "A110 S", null, 240, 2023, 4500, "Bleu alpine", "Black", 62_000_00L, 67_900_00L, 67_900_00L, 200_00L, "PETROL"},
    };

    private final ClientRepository clientRepository;
    private final CarRepository carRepository;
    private final WorkshopJobRepository jobRepository;
    private final WorkshopJobItemRepository jobItemRepository;
    private final SalesLeadRepository leadRepository;
    private final SalesContractRepository contractRepository;
    private final FinancingOfferRepository financingRepository;
    private final InvoiceService invoiceService;

    public DemoSeedService(ClientRepository clientRepository, CarRepository carRepository,
            WorkshopJobRepository jobRepository, WorkshopJobItemRepository jobItemRepository,
            SalesLeadRepository leadRepository, SalesContractRepository contractRepository,
            FinancingOfferRepository financingRepository, InvoiceService invoiceService) {
        this.clientRepository = clientRepository;
        this.carRepository = carRepository;
        this.jobRepository = jobRepository;
        this.jobItemRepository = jobItemRepository;
        this.leadRepository = leadRepository;
        this.contractRepository = contractRepository;
        this.financingRepository = financingRepository;
        this.invoiceService = invoiceService;
    }

    @Transactional
    public void seedIfNeeded() {
        if (clientRepository.existsById(C1)) {
            log.debug("Demo seed skipped (already present).");
            return;
        }
        log.info("Loading advanced demo seed data…");
        OffsetDateTime t0 = OffsetDateTime.now().minusDays(21);

        List<String> clientIds = new ArrayList<>();
        for (int i = 0; i < CLIENT_ROWS.length; i++) {
            String[] r = CLIENT_ROWS[i];
            ClientEntity c = new ClientEntity();
            c.setId(clientId(i));
            c.setFirstName(r[0]);
            c.setLastName(r[1]);
            c.setName((r[0] + " " + r[1]).trim());
            c.setPhone(r[2]);
            c.setEmail(r[3]);
            c.setAddressLine(r[4]);
            c.setZipCode(r[5]);
            c.setCity(r[6]);
            c.setContactInfo(r[2] + " | " + r[3]);
            if (r[7] != null && !r[7].isBlank()) c.setBirthday(LocalDate.parse(r[7]));
            c.setCreatedAt(t0.plusHours(i));
            clientRepository.save(c);
            clientIds.add(c.getId());
        }

        List<String> custCarIds = new ArrayList<>();
        for (int i = 0; i < CUSTOMER_CARS.length; i++) {
            Object[] r = CUSTOMER_CARS[i];
            int ci = (Integer) r[0];
            CarEntity car = new CarEntity();
            car.setId(vehicleId(i));
            car.setClientId(clientIds.get(ci));
            car.setVehicleRole(VehicleRole.CUSTOMER_OWNED);
            car.setMake((String) r[1]);
            car.setModel((String) r[2]);
            car.setPlate((String) r[3]);
            car.setVin(vin((Integer) r[4]));
            car.setModelYear((Integer) r[5]);
            car.setMileageKm((Integer) r[6]);
            car.setColor((String) r[7]);
            car.setTrimColor((String) r[8]);
            car.setFuelType((String) r[9]);
            car.setFirstRegistrationDate(LocalDate.parse((String) r[10]));
            car.setNotes("Demo seed customer vehicle.");
            car.setCreatedAt(t0.plusDays(1).plusHours(i));
            carRepository.save(car);
            custCarIds.add(car.getId());
        }

        for (int i = 0; i < INVENTORY.length; i++) {
            Object[] r = INVENTORY[i];
            CarEntity car = new CarEntity();
            car.setId(vehicleId(100 + i));
            car.setClientId(DmsConstants.DEALER_STOCK_CLIENT_ID);
            car.setVehicleRole(VehicleRole.FOR_SALE_INVENTORY);
            car.setMake((String) r[0]);
            car.setModel((String) r[1]);
            car.setPlate((String) r[2]);
            car.setVin(vin((Integer) r[3]));
            car.setModelYear((Integer) r[4]);
            car.setMileageKm((Integer) r[5]);
            car.setColor((String) r[6]);
            car.setTrimColor((String) r[7]);
            car.setPurchasePriceCents((Long) r[8]);
            car.setCatalogPriceCents((Long) r[9]);
            car.setSellingPriceCents((Long) r[10]);
            car.setPrepFeeCents((Long) r[11]);
            car.setFuelType((String) r[12]);
            car.setArrivalDate(LocalDate.now().minusWeeks(1 + (i % 5)));
            car.setNotes("Dealer inventory (demo seed).");
            car.setCreatedAt(t0.plusDays(2).plusHours(i));
            carRepository.save(car);
        }

        String[] jobTitles = {
            "Annual service + brake discs", "Winter tyre package + storage", "MFK preparation", "AC service & pollen filter",
            "Timing belt kit replacement", "PDR + paint touch-up", "Battery test & replacement", "Windshield replacement",
            "Suspension overhaul (shocks)", "Software update + diagnostics",
        };
        String[] jobDescs = {
            "Oil, filters, front axle brakes.", "4 wheels mount & balance.", "Lights, brakes, emissions check prep.",
            "Recharge R134a, cabin filter.", "OEM kit incl. water pump.", "Hail dents + bumper blend.", "12V AGM 80Ah.",
            "OEM glass incl. calibration.", "Bilstein B4 all round.", "Latest ECU maps + fault scan.",
        };
        for (int j = 0; j < jobTitles.length; j++) {
            String jid = jobId(j);
            String cid = clientIds.get(j % clientIds.size());
            String carId = custCarIds.get(j % custCarIds.size());
            WorkshopJobEntity job = new WorkshopJobEntity();
            job.setId(jid);
            job.setClientId(cid);
            job.setCarId(carId);
            job.setTitle(jobTitles[j]);
            job.setDescription(jobDescs[j]);
            job.setStatus(j % 3 == 0 ? "OPEN" : j % 3 == 1 ? "IN_PROGRESS" : "DONE");
            OffsetDateTime jc = t0.plusDays(5 + j);
            job.setCreatedAt(jc);
            job.setUpdatedAt(jc);
            jobRepository.save(job);
            jobItemRepository.save(line(jid, "SERVICE", "LAB", "Labour", new BigDecimal("4"), "h", 195_00L, BigDecimal.ZERO, jc));
            jobItemRepository.save(line(jid, "PARTS", "KIT", "Parts kit", BigDecimal.ONE, "kit", 420_00L + j * 50_00L, new BigDecimal("3"), jc));
        }

        String[] leadStatuses = {"NEW", "CONTACTED", "NEGOTIATION", "WON", "LOST", "NEW", "CONTACTED", "NEGOTIATION"};
        String[] interests = {
            "911 / sports coupe", "EQS SUV", "R1T delivery timeline", "Defender 110", "Macan Electric",
            "Used XC90", "Financing 48m", "Taycan Cross Turismo",
        };
        for (int i = 0; i < leadStatuses.length; i++) {
            SalesLeadEntity lead = new SalesLeadEntity();
            lead.setId(leadId(i));
            lead.setClientId(clientIds.get((i + 3) % clientIds.size()));
            lead.setCarId(i % 2 == 0 ? null : vehicleId(100 + (i % INVENTORY.length)));
            lead.setStatus(leadStatuses[i]);
            lead.setInterestModel(interests[i]);
            lead.setNotes("Seeded lead #" + (i + 1));
            lead.setLeadSource(i % 2 == 0 ? "Walk-in" : "Web form");
            OffsetDateTime lc = t0.plusDays(8 + i);
            lead.setCreatedAt(lc);
            lead.setUpdatedAt(lc);
            leadRepository.save(lead);
        }

        for (int c = 0; c < 5; c++) {
            SalesContractEntity ct = new SalesContractEntity();
            ct.setId(contractId(c));
            ct.setLeadId(c < 3 ? leadId(c) : null);
            ct.setClientId(clientIds.get(c));
            ct.setCarId(vehicleId(100 + (c % INVENTORY.length)));
            ct.setSellingPriceCents(25_000_00L + c * 500_00L);
            ct.setPrepFeeCents(150_00L);
            ct.setAdditionalCostsText(c % 2 == 0 ? "Ceramic coating" : null);
            ct.setAdditionalCostsCents(c % 2 == 0 ? 890_00L : 0L);
            ct.setInsuranceCompany("Helvetia");
            ct.setRegistrationPlate("BE " + (100000 + c));
            ct.setContractDate(LocalDate.now().minusDays(10 - c));
            ct.setNotes("Demo contract " + (c + 1));
            OffsetDateTime cc = t0.plusDays(12 + c);
            ct.setCreatedAt(cc);
            ct.setUpdatedAt(cc);
            contractRepository.save(ct);
        }

        long[] fv = {6_850_000L, 38_900_00L, 78_500_00L, 94_900_00L, 52_900_00L, 62_500_00L, 99_800_00L, 105_000_00L};
        for (int f = 0; f < fv.length; f++) {
            boolean lease = f % 2 == 0;
            long vv = fv[f];
            long down = Math.round(vv * 0.12);
            FinancingOfferEntity fo = new FinancingOfferEntity();
            fo.setId(finId(f));
            fo.setCarId(vehicleId(100 + (f % INVENTORY.length)));
            fo.setClientId(clientIds.get((f + 5) % clientIds.size()));
            fo.setOfferType(lease ? "LEASING" : "LOAN");
            fo.setVehicleValueCents(vv);
            fo.setDownPaymentCents(down);
            if (lease) {
                long res = Math.round(vv * 0.32);
                fo.setResidualValueCents(res);
                fo.setResidualPct(new BigDecimal("32.0"));
            } else {
                fo.setResidualValueCents(null);
                fo.setResidualPct(null);
            }
            fo.setDurationMonths(lease ? 36 : 48);
            double rate = lease ? 3.65 : 4.15;
            fo.setInterestRatePct(new BigDecimal(Double.toString(rate)));
            fo.setMonthlyPaymentCents(FinancingController.calcMonthly(fo.getOfferType(), vv, down, fo.getResidualValueCents(),
                fo.getDurationMonths(), rate));
            fo.setCreatedAt(t0.plusDays(14 + f));
            financingRepository.save(fo);
        }

        WorkshopJobEntity j0 = jobRepository.findById(jobId(0)).orElseThrow();
        long sub0 = Math.round(195_00L * 4) + Math.round(420_00L * 0.97);
        invoiceService.create(j0.getClientId(), "WORKSHOP_JOB", j0.getId(), Math.round(sub0 * SWISS_VAT_FACTOR), "CHF");
        SalesContractEntity ct0 = contractRepository.findById(contractId(0)).orElseThrow();
        long ctTot = ct0.getSellingPriceCents() + (ct0.getPrepFeeCents() != null ? ct0.getPrepFeeCents() : 0)
            + (ct0.getAdditionalCostsCents() != null ? ct0.getAdditionalCostsCents() : 0);
        invoiceService.create(ct0.getClientId(), "SALES_CONTRACT", ct0.getId(), ctTot, "CHF");
        invoiceService.create(clientIds.get(7), "SALES_LEAD", leadId(2), 750_00L, "CHF");

        log.info("Advanced demo seed loaded: {} clients, {} customer cars, {} stock units, jobs, leads, contracts, financing, invoices.",
            CLIENT_ROWS.length, CUSTOMER_CARS.length, INVENTORY.length);
    }

    private static WorkshopJobItemEntity line(String jobId, String type, String art, String name, BigDecimal qty, String unit,
            long unitCents, BigDecimal disc, OffsetDateTime created) {
        WorkshopJobItemEntity i = new WorkshopJobItemEntity();
        i.setId(UUID.randomUUID().toString());
        i.setJobId(jobId);
        i.setItemType(type);
        i.setArtNr(art);
        i.setName(name);
        i.setQuantity(qty);
        i.setUnit(unit);
        i.setUnitPriceCents(unitCents);
        i.setDiscountPct(disc);
        i.setCreatedAt(created);
        return i;
    }
}
