package com.dms.backend.modules.workshop.api;

import com.dms.backend.modules.customervehicle.api.CarProfile;
import com.dms.backend.modules.customervehicle.api.ClientProfile;
import com.dms.backend.modules.customervehicle.api.CustomerVehicleMapper;
import com.dms.backend.modules.customervehicle.persistence.CarEntity;
import com.dms.backend.modules.customervehicle.persistence.CarRepository;
import com.dms.backend.modules.customervehicle.persistence.ClientEntity;
import com.dms.backend.modules.customervehicle.persistence.ClientRepository;
import com.dms.backend.modules.workshop.persistence.WorkshopJobEntity;
import com.dms.backend.modules.workshop.persistence.WorkshopJobItemEntity;
import com.dms.backend.modules.workshop.persistence.WorkshopJobItemRepository;
import com.dms.backend.modules.workshop.persistence.WorkshopJobRepository;
import com.dms.backend.shared.api.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController @Validated @RequestMapping("/api/v1/workshop/jobs")
public class WorkshopJobController {
    private static final Set<String> VALID = Set.of("OPEN", "IN_PROGRESS", "DONE");
    private final WorkshopJobRepository jobRepo;
    private final WorkshopJobItemRepository itemRepo;
    private final ClientRepository clientRepo;
    private final CarRepository carRepo;

    public WorkshopJobController(WorkshopJobRepository jr, WorkshopJobItemRepository ir, ClientRepository cr, CarRepository ca) {
        jobRepo = jr; itemRepo = ir; clientRepo = cr; carRepo = ca;
    }

    @GetMapping public List<JobView> list() {
        List<JobView> out = new ArrayList<>();
        for (WorkshopJobEntity j : jobRepo.findAllByOrderByCreatedAtDesc()) out.add(toView(j));
        return out;
    }

    @PostMapping @Transactional public ApiResponse create(@RequestBody @Valid CreateJobRequest r) {
        ClientEntity cl = clientRepo.findById(r.clientId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown client"));
        CarEntity car = carRepo.findById(r.carId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown car"));
        if (!car.getClientId().equals(cl.getId())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Car does not belong to client");
        OffsetDateTime now = OffsetDateTime.now();
        WorkshopJobEntity j = new WorkshopJobEntity();
        j.setId(UUID.randomUUID().toString()); j.setClientId(cl.getId()); j.setCarId(car.getId());
        j.setTitle(r.title().trim()); j.setDescription(r.description() != null ? r.description().trim() : null);
        j.setStatus("OPEN"); j.setCreatedAt(now); j.setUpdatedAt(now);
        jobRepo.save(j);
        if (r.items() != null) {
            for (JobItemRequest ir2 : r.items()) saveItem(j.getId(), ir2, now);
        }
        return new ApiResponse(j.getId(), "OPEN", "Job created");
    }

    @PostMapping("/{id}/status") public ApiResponse setStatus(@PathVariable String id, @RequestBody @Valid SetStatusRequest r) {
        WorkshopJobEntity j = jobRepo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        String s = r.status().trim().toUpperCase();
        if (!VALID.contains(s)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status");
        j.setStatus(s); j.setUpdatedAt(OffsetDateTime.now()); jobRepo.save(j);
        return new ApiResponse(j.getId(), j.getStatus(), "Status updated");
    }

    @PostMapping("/{id}/items") public ApiResponse addItem(@PathVariable String id, @RequestBody @Valid JobItemRequest r) {
        jobRepo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        String itemId = saveItem(id, r, OffsetDateTime.now());
        return new ApiResponse(itemId, "ADDED", "Item added");
    }

    @DeleteMapping("/{jobId}/items/{itemId}") @Transactional public ApiResponse removeItem(@PathVariable String jobId, @PathVariable String itemId) {
        WorkshopJobItemEntity item = itemRepo.findById(itemId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found"));
        if (!item.getJobId().equals(jobId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Item does not belong to job");
        itemRepo.delete(item);
        return new ApiResponse(itemId, "REMOVED", "Item removed");
    }

    private String saveItem(String jobId, JobItemRequest r, OffsetDateTime now) {
        WorkshopJobItemEntity item = new WorkshopJobItemEntity();
        item.setId(UUID.randomUUID().toString());
        item.setJobId(jobId);
        item.setItemType(r.itemType() != null ? r.itemType().trim() : "SERVICE");
        item.setArtNr(r.artNr() != null ? r.artNr().trim() : null);
        item.setName(r.name().trim());
        item.setQuantity(r.quantity() != null ? r.quantity() : BigDecimal.ONE);
        item.setUnit(r.unit() != null ? r.unit().trim() : "Stk");
        item.setUnitPriceCents(r.unitPriceCents() != null ? r.unitPriceCents() : 0L);
        item.setDiscountPct(r.discountPct() != null ? r.discountPct() : BigDecimal.ZERO);
        item.setCreatedAt(now);
        itemRepo.save(item);
        return item.getId();
    }

    private JobView toView(WorkshopJobEntity j) {
        ClientEntity cl = clientRepo.findById(j.getClientId()).orElse(null);
        CarEntity car = carRepo.findById(j.getCarId()).orElse(null);
        List<WorkshopJobItemEntity> rawItems = itemRepo.findByJobIdOrderByCreatedAtAsc(j.getId());
        List<JobItemView> items = rawItems.stream().map(i -> new JobItemView(
            i.getId(), i.getItemType(), i.getArtNr(), i.getName(),
            i.getQuantity(), i.getUnit(), i.getUnitPriceCents(),
            i.getDiscountPct(), i.computeTotal()
        )).toList();
        long totalCents = items.stream().mapToLong(JobItemView::totalCents).sum();
        return new JobView(j.getId(), cl != null ? CustomerVehicleMapper.toClientProfile(cl) : null,
            car != null ? CustomerVehicleMapper.toCarProfile(car) : null,
            j.getTitle(), j.getDescription(), j.getStatus(), items, totalCents, j.getCreatedAt());
    }

    public record CreateJobRequest(@NotBlank String clientId, @NotBlank String carId, @NotBlank String title, String description, List<JobItemRequest> items) {}
    public record JobItemRequest(String itemType, String artNr, @NotBlank String name, BigDecimal quantity, String unit, Long unitPriceCents, BigDecimal discountPct) {}
    public record SetStatusRequest(@NotBlank String status) {}
    public record JobItemView(String id, String itemType, String artNr, String name, BigDecimal quantity, String unit, Long unitPriceCents, BigDecimal discountPct, long totalCents) {}
    public record JobView(String id, ClientProfile client, CarProfile car, String title, String description, String status, List<JobItemView> items, long totalCents, OffsetDateTime createdAt) {}
}
