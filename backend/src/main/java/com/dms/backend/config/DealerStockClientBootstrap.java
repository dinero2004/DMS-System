package com.dms.backend.config;

import com.dms.backend.modules.customervehicle.persistence.ClientEntity;
import com.dms.backend.modules.customervehicle.persistence.ClientRepository;
import com.dms.backend.shared.DmsConstants;
import java.time.OffsetDateTime;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * FOR_SALE_INVENTORY cars use this synthetic client; must exist for inventory APIs.
 */
@Component
@Order(0)
public class DealerStockClientBootstrap implements ApplicationRunner {
    private final ClientRepository clientRepository;

    public DealerStockClientBootstrap(ClientRepository clientRepository) {
        this.clientRepository = clientRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (clientRepository.existsById(DmsConstants.DEALER_STOCK_CLIENT_ID)) return;
        ClientEntity c = new ClientEntity();
        c.setId(DmsConstants.DEALER_STOCK_CLIENT_ID);
        c.setName("Dealer stock");
        c.setFirstName("Dealer");
        c.setLastName("Stock");
        c.setCreatedAt(OffsetDateTime.now());
        clientRepository.save(c);
    }
}
