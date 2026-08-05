package com.example.dms.controller;

import com.example.dms.dto.CustomerDtos.CreateCustomerRequest;
import com.example.dms.dto.CustomerDtos.CustomerResponse;
import com.example.dms.entity.Customer;
import com.example.dms.exception.ResourceNotFoundException;
import com.example.dms.repository.CustomerRepository;
import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@Transactional(readOnly = true)
public class CustomerController {

    private final CustomerRepository customerRepository;

    public CustomerController(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @GetMapping
    public List<CustomerResponse> list() {
        return customerRepository.findAll().stream()
                .map(CustomerResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public CustomerResponse get(@PathVariable Long id) {
        return customerRepository.findById(id)
                .map(CustomerResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Customer %d was not found".formatted(id)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public CustomerResponse create(@Valid @RequestBody CreateCustomerRequest request) {
        Customer customer = new Customer(request.firstName(), request.lastName(), request.email(), request.phone());
        return CustomerResponse.from(customerRepository.save(customer));
    }
}
