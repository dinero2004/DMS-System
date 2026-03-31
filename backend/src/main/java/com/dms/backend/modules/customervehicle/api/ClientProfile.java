package com.dms.backend.modules.customervehicle.api;

import java.time.LocalDate;

public record ClientProfile(
    String id, String displayName, String firstName, String lastName,
    String phone, String email, String addressLine, String zipCode, String city,
    LocalDate birthday
) {}
