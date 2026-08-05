package com.dms.backend.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Loads realistic demo rows once per database (idempotent). Enable with {@code dms.seed.enabled=true}
 * (enabled by default for the {@code demo} Spring profile).
 */
@Component
@Order(1)
@ConditionalOnProperty(name = "dms.seed.enabled", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {
    private final DemoSeedService demoSeedService;

    public DemoDataSeeder(DemoSeedService demoSeedService) {
        this.demoSeedService = demoSeedService;
    }

    @Override
    public void run(ApplicationArguments args) {
        demoSeedService.seedIfNeeded();
    }
}
