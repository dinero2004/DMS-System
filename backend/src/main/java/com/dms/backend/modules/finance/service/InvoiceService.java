package com.dms.backend.modules.finance.service;

import com.dms.backend.modules.finance.persistence.InvoiceEntity;
import com.dms.backend.modules.finance.persistence.InvoiceRepository;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvoiceService {
    private final InvoiceRepository repo;

    public InvoiceService(InvoiceRepository repo) { this.repo = repo; }

    @Transactional
    public InvoiceEntity create(String clientId, String refType, String refId, long amountCents, String currency) {
        long seq = repo.computeNextInvoiceSequenceValue();
        OffsetDateTime now = OffsetDateTime.now();
        InvoiceEntity inv = new InvoiceEntity();
        inv.setId(UUID.randomUUID().toString());
        inv.setInvoiceNumber("INV-" + String.format("%06d", seq));
        inv.setClientId(clientId); inv.setReferenceType(refType); inv.setReferenceId(refId);
        inv.setAmountCents(amountCents); inv.setCurrency(currency); inv.setStatus("DRAFT");
        inv.setCreatedAt(now); inv.setUpdatedAt(now);
        return repo.save(inv);
    }

    public InvoiceEntity save(InvoiceEntity e) { return repo.save(e); }
}
