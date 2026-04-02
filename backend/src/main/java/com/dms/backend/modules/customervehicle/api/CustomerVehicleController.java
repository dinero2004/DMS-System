package com.dms.backend.modules.customervehicle.api;

import com.dms.backend.modules.customervehicle.domain.VehicleRole;
import com.dms.backend.modules.customervehicle.persistence.CarEntity;
import com.dms.backend.modules.customervehicle.persistence.CarRepository;
import com.dms.backend.modules.customervehicle.persistence.ClientEntity;
import com.dms.backend.modules.customervehicle.persistence.ClientRepository;
import com.dms.backend.modules.finance.persistence.InvoiceRepository;
import com.dms.backend.modules.sales.persistence.*;
import com.dms.backend.modules.workshop.persistence.*;
import com.dms.backend.shared.DmsConstants;
import com.dms.backend.shared.api.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController @Validated @RequestMapping("/api/v1")
public class CustomerVehicleController {

    private final ClientRepository clientRepository;
    private final CarRepository carRepository;
    private final WorkshopJobRepository jobRepo;
    private final WorkshopJobItemRepository jobItemRepo;
    private final InvoiceRepository invoiceRepo;
    private final SalesLeadRepository leadRepo;
    private final SalesContractRepository contractRepo;
    private final FinancingOfferRepository financingRepo;

    public CustomerVehicleController(ClientRepository cr, CarRepository car, WorkshopJobRepository jr,
            WorkshopJobItemRepository jir, InvoiceRepository ir, SalesLeadRepository lr,
            SalesContractRepository scr, FinancingOfferRepository fr) {
        clientRepository = cr; carRepository = car; jobRepo = jr; jobItemRepo = jir;
        invoiceRepo = ir; leadRepo = lr; contractRepo = scr; financingRepo = fr;
    }

    @PostMapping("/clients")
    public ApiResponse createClient(@RequestBody @Valid CreateClientRequest request) {
        String first = request.firstName();
        String last = request.lastName();
        if ((first == null || first.isBlank()) && StringUtils.hasText(request.name())) {
            String trimmed = request.name().trim();
            int space = trimmed.indexOf(' ');
            first = space > 0 ? trimmed.substring(0, space).trim() : trimmed;
            last = space > 0 ? trimmed.substring(space + 1).trim() : "";
        }
        if (first == null || first.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "First name is required");
        if (last == null) last = "";

        final String f = first.trim(), l = last.trim();
        if (f.length() < 2) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "First name must be at least 2 characters");

        boolean dup = clientRepository.findAll().stream().anyMatch(e ->
            f.equalsIgnoreCase(e.getFirstName()) && l.equalsIgnoreCase(e.getLastName()) && !l.isEmpty());
        if (dup) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Client '" + f + " " + l + "' already exists");

        if (StringUtils.hasText(request.email()) && !request.email().trim().contains("@"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid email address");

        String display = (f + " " + l).trim();
        String clientId = UUID.randomUUID().toString();
        ClientEntity client = new ClientEntity();
        client.setId(clientId); client.setName(display); client.setFirstName(f); client.setLastName(l);
        client.setPhone(blankToNull(request.phone())); client.setEmail(blankToNull(request.email()));
        client.setAddressLine(blankToNull(request.addressLine())); client.setZipCode(blankToNull(request.zipCode()));
        client.setCity(blankToNull(request.city()));
        client.setContactInfo(joinContact(blankToNull(request.phone()), blankToNull(request.email())));
        if (StringUtils.hasText(request.birthday())) client.setBirthday(LocalDate.parse(request.birthday().trim()));
        client.setCreatedAt(OffsetDateTime.now());
        clientRepository.save(client);
        return new ApiResponse(clientId, "CREATED", "Client created");
    }

    @GetMapping("/clients")
    public List<ClientProfile> listClients(@RequestParam(required = false) String q) {
        List<ClientEntity> entities = StringUtils.hasText(q) ? clientRepository.searchByQuery(q.trim()) : clientRepository.findAll();
        List<ClientProfile> out = new ArrayList<>();
        for (ClientEntity c : entities) out.add(CustomerVehicleMapper.toClientProfile(c));
        return out;
    }

    @PutMapping("/clients/{id}")
    public ApiResponse updateClient(@PathVariable String id, @RequestBody @Valid CreateClientRequest request) {
        ClientEntity c = clientRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found"));
        if (DmsConstants.DEALER_STOCK_CLIENT_ID.equals(id)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot edit dealer stock");
        if (StringUtils.hasText(request.firstName())) c.setFirstName(request.firstName().trim());
        if (StringUtils.hasText(request.lastName())) c.setLastName(request.lastName().trim());
        c.setName((c.getFirstName() + " " + c.getLastName()).trim());
        if (request.phone() != null) c.setPhone(blankToNull(request.phone()));
        if (request.email() != null) c.setEmail(blankToNull(request.email()));
        if (request.addressLine() != null) c.setAddressLine(blankToNull(request.addressLine()));
        if (request.zipCode() != null) c.setZipCode(blankToNull(request.zipCode()));
        if (request.city() != null) c.setCity(blankToNull(request.city()));
        if (request.birthday() != null) {
            c.setBirthday(request.birthday().isBlank() ? null : LocalDate.parse(request.birthday().trim()));
        }
        c.setContactInfo(joinContact(c.getPhone(), c.getEmail()));
        clientRepository.save(c);
        return new ApiResponse(id, "UPDATED", "Client updated");
    }

    @DeleteMapping("/clients/{id}") @Transactional
    public ApiResponse deleteClient(@PathVariable String id) {
        if (!clientRepository.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found");
        if (DmsConstants.DEALER_STOCK_CLIENT_ID.equals(id)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete dealer stock");
        List<WorkshopJobEntity> clientJobs = jobRepo.findAll().stream().filter(j -> id.equals(j.getClientId())).toList();
        for (WorkshopJobEntity j : clientJobs) { jobItemRepo.deleteByJobId(j.getId()); jobRepo.delete(j); }
        invoiceRepo.findAll().stream().filter(i -> id.equals(i.getClientId())).forEach(invoiceRepo::delete);
        contractRepo.findAll().stream().filter(c -> id.equals(c.getClientId())).forEach(contractRepo::delete);
        leadRepo.findAll().stream().filter(l -> id.equals(l.getClientId())).forEach(leadRepo::delete);
        financingRepo.findAll().stream().filter(f -> id.equals(f.getClientId())).forEach(financingRepo::delete);
        carRepository.findByClientId(id).forEach(carRepository::delete);
        clientRepository.deleteById(id);
        return new ApiResponse(id, "DELETED", "Client and all related data deleted");
    }

    @PostMapping("/cars")
    public ApiResponse registerCar(@RequestBody @Valid RegisterCarRequest request) {
        VehicleRole role = VehicleRole.CUSTOMER_OWNED;
        if (StringUtils.hasText(request.vehicleRole())) {
            try { role = VehicleRole.valueOf(request.vehicleRole().trim()); } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid vehicleRole");
            }
        }
        String clientId = request.clientId();
        if (role == VehicleRole.FOR_SALE_INVENTORY && (clientId == null || clientId.isBlank())) clientId = DmsConstants.DEALER_STOCK_CLIENT_ID;
        if (clientId == null || !clientRepository.existsById(clientId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown clientId");
        if (StringUtils.hasText(request.vin())) {
            if (request.vin().trim().length() != 17) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "VIN must be exactly 17 characters");
            carRepository.findByVin(request.vin().trim()).ifPresent(c -> { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "VIN already registered"); });
        }
        String carId = UUID.randomUUID().toString();
        CarEntity car = new CarEntity();
        car.setId(carId); car.setClientId(clientId); car.setBranchId(blankToNull(request.branchId()));
        car.setMake(blankToNull(request.make())); car.setModel(request.model().trim());
        car.setPlate(blankToNull(request.plate())); car.setVin(blankToNull(request.vin()));
        car.setStammnummer(blankToNull(request.stammnummer())); car.setVehicleRole(role);
        car.setModelYear(request.modelYear()); car.setColor(blankToNull(request.color()));
        car.setTrimColor(blankToNull(request.trimColor())); car.setMileageKm(request.mileageKm());
        car.setNotes(blankToNull(request.notes())); car.setPurchasePriceCents(request.purchasePriceCents());
        car.setCatalogPriceCents(request.catalogPriceCents()); car.setUsedValueCents(request.usedValueCents());
        car.setSellingPriceCents(request.sellingPriceCents()); car.setPrepFeeCents(request.prepFeeCents());
        car.setFuelType(blankToNull(request.fuelType()));
        if (StringUtils.hasText(request.arrivalDate())) car.setArrivalDate(LocalDate.parse(request.arrivalDate().trim()));
        if (StringUtils.hasText(request.firstRegistrationDate())) car.setFirstRegistrationDate(LocalDate.parse(request.firstRegistrationDate().trim()));
        car.setCreatedAt(OffsetDateTime.now());
        carRepository.save(car);
        return new ApiResponse(carId, "REGISTERED", "Car registered");
    }

    @GetMapping("/cars")
    public List<CarProfile> listCars(@RequestParam(required = false) String clientId) {
        List<CarEntity> cars = StringUtils.hasText(clientId) ? carRepository.findByClientId(clientId) : carRepository.findAll();
        List<CarProfile> out = new ArrayList<>();
        for (CarEntity c : cars) out.add(CustomerVehicleMapper.toCarProfile(c));
        return out;
    }

    @PutMapping("/cars/{id}")
    public ApiResponse updateCar(@PathVariable String id, @RequestBody @Valid RegisterCarRequest request) {
        CarEntity car = carRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Car not found"));
        if (StringUtils.hasText(request.make())) car.setMake(request.make().trim());
        if (StringUtils.hasText(request.model())) car.setModel(request.model().trim());
        if (request.plate() != null) car.setPlate(blankToNull(request.plate()));
        if (request.vin() != null) {
            String v = request.vin().trim();
            if (!v.isEmpty() && v.length() != 17) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "VIN must be exactly 17 characters");
            car.setVin(v.isEmpty() ? null : v);
        }
        if (request.stammnummer() != null) car.setStammnummer(blankToNull(request.stammnummer()));
        if (request.modelYear() != null) car.setModelYear(request.modelYear());
        if (request.color() != null) car.setColor(blankToNull(request.color()));
        if (request.trimColor() != null) car.setTrimColor(blankToNull(request.trimColor()));
        if (request.mileageKm() != null) car.setMileageKm(request.mileageKm());
        if (request.notes() != null) car.setNotes(blankToNull(request.notes()));
        if (request.purchasePriceCents() != null) car.setPurchasePriceCents(request.purchasePriceCents());
        if (request.catalogPriceCents() != null) car.setCatalogPriceCents(request.catalogPriceCents());
        if (request.usedValueCents() != null) car.setUsedValueCents(request.usedValueCents());
        if (request.sellingPriceCents() != null) car.setSellingPriceCents(request.sellingPriceCents());
        if (request.prepFeeCents() != null) car.setPrepFeeCents(request.prepFeeCents());
        if (request.fuelType() != null) car.setFuelType(blankToNull(request.fuelType()));
        if (request.arrivalDate() != null) car.setArrivalDate(request.arrivalDate().isBlank() ? null : LocalDate.parse(request.arrivalDate().trim()));
        if (request.firstRegistrationDate() != null) car.setFirstRegistrationDate(request.firstRegistrationDate().isBlank() ? null : LocalDate.parse(request.firstRegistrationDate().trim()));
        carRepository.save(car);
        return new ApiResponse(id, "UPDATED", "Car updated");
    }

    @DeleteMapping("/cars/{id}") @Transactional
    public ApiResponse deleteCar(@PathVariable String id) {
        if (!carRepository.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Car not found");
        List<WorkshopJobEntity> carJobs = jobRepo.findAll().stream().filter(j -> id.equals(j.getCarId())).toList();
        for (WorkshopJobEntity j : carJobs) { jobItemRepo.deleteByJobId(j.getId()); jobRepo.delete(j); }
        carRepository.deleteById(id);
        return new ApiResponse(id, "DELETED", "Car deleted");
    }

    private static String blankToNull(String v) { return StringUtils.hasText(v) ? v.trim() : null; }
    private static String joinContact(String phone, String email) {
        if (phone != null && email != null) return phone + " | " + email;
        return phone != null ? phone : email;
    }

    public record CreateClientRequest(String name, String firstName, String lastName,
        String phone, String email, String addressLine, String zipCode, String city,
        String contactInfo, String birthday) {}
    public record RegisterCarRequest(String clientId, String branchId, String make,
        @NotBlank String model, String plate, String vin, String stammnummer, String vehicleRole,
        Integer modelYear, String color, String trimColor, Integer mileageKm, String notes,
        Long purchasePriceCents, Long catalogPriceCents, Long usedValueCents,
        Long sellingPriceCents, Long prepFeeCents, String arrivalDate, String fuelType,
        String firstRegistrationDate) {}
}
