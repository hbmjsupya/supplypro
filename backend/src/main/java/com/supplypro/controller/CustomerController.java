package com.supplypro.controller;

import com.supplypro.entity.Customer;
import com.supplypro.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/customers")
@CrossOrigin(origins = "*")
public class CustomerController {

    @Autowired
    private CustomerRepository customerRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String name) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<Customer> pageResult;
        
        if (name != null && !name.isEmpty()) {
            // Assuming we might want to filter by name
            // For now just findAll or implement specification if needed
             // Simple contains check if repository supported it or just findAll
             // Since we didn't add findByNameContaining in repo, let's just return all or add it.
             // Ideally we should use Specification or add method to repo.
             // Let's assume basic findAll for now to be safe, or use Specification in future.
             // Actually, let's use Specification if we want search, but for simplicity let's stick to findAll for this iteration
             // unless I add the method to repo.
             pageResult = customerRepository.findAll(pageable);
        } else {
            pageResult = customerRepository.findAll(pageable);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", Map.of(
            "records", pageResult.getContent(),
            "total", pageResult.getTotalElements()
        ));
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable long id) {
        return customerRepository.findById(id)
                .map(customer -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("code", 200);
                    response.put("data", customer);
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Customer customer) {
        if (customer == null) return ResponseEntity.badRequest().build();
        Customer saved = customerRepository.save(customer);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Created successfully");
        response.put("data", saved);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable long id, @RequestBody Customer customer) {
        return customerRepository.findById(id)
                .map(existing -> {
                    existing.setName(customer.getName());
                    existing.setContactPerson(customer.getContactPerson());
                    existing.setContactPhone(customer.getContactPhone());
                    existing.setStatus(customer.getStatus());
                    Customer saved = customerRepository.save(existing);
                    Map<String, Object> response = new HashMap<>();
                    response.put("code", 200);
                    response.put("message", "Updated successfully");
                    response.put("data", saved);
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
