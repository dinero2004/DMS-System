package com.example.dms.dto;

import com.example.dms.entity.Customer;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

public final class CustomerDtos {
    private CustomerDtos() {
    }

    public record CreateCustomerRequest(
            @NotBlank String firstName,
            @NotBlank String lastName,
            @Email @NotBlank String email,
            String phone
    ) {
    }

    public record CustomerResponse(
            Long id,
            String firstName,
            String lastName,
            String email,
            String phone,
            Instant createdAt
    ) {
        public static CustomerResponse from(Customer customer) {
            return new CustomerResponse(
                    customer.getId(),
                    customer.getFirstName(),
                    customer.getLastName(),
                    customer.getEmail(),
                    customer.getPhone(),
                    customer.getCreatedAt()
            );
        }
    }
}
