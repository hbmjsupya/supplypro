package com.supplypro.controller;

import com.supplypro.common.ApiResponse;
import com.supplypro.entity.Product;
import com.supplypro.entity.ProductBundle;
import com.supplypro.entity.ProductStatusChangeLog;
import com.supplypro.repository.ProductBundleRepository;
import com.supplypro.repository.ProductRepository;
import com.supplypro.repository.ProductStatusChangeLogRepository;
import com.supplypro.repository.StockBatchRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import javax.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/bundles")
public class BundleController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductBundleRepository productBundleRepository;

    @Autowired
    private StockBatchRepository stockBatchRepository;

    @Autowired
    private ProductStatusChangeLogRepository productStatusChangeLogRepository;

    // Get Bundles (Filter by Status)
    @GetMapping
    public ApiResponse<Page<Product>> getBundles(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @org.springframework.data.web.PageableDefault(sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {
        
        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("type"), Product.ProductType.BUNDLE));
            
            if (status != null && !status.isEmpty()) {
                try {
                    Product.Status s = Product.Status.fromString(status);
                    predicates.add(cb.equal(root.get("status"), s));
                } catch (IllegalArgumentException e) {
                    // Invalid status, maybe return empty or ignore
                }
            }
            
            if (keyword != null && !keyword.isEmpty()) {
                String likePattern = "%" + keyword + "%";
                predicates.add(cb.or(
                    cb.like(root.get("name"), likePattern),
                    cb.like(root.get("skuCode"), likePattern)
                ));
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        
        Page<Product> pageResult = productRepository.findAll(spec, pageable);
        
        // Populate bundle items (Lazy Loading Trigger)
        pageResult.getContent().forEach(p -> {
            try {
                List<ProductBundle> bundles = productBundleRepository.findByParentProductId(p.getId());
                for (ProductBundle bundle : bundles) {
                    try {
                        if (bundle.getChildProduct() != null) {
                            bundle.getChildProduct().getName(); // Trigger load
                            if (bundle.getChildProduct().getSkus() != null) {
                                bundle.getChildProduct().getSkus().size(); // Trigger SKU load
                            }
                            if (bundle.getChildProduct().getBrand() != null) {
                                bundle.getChildProduct().getBrand().getName(); // Trigger Brand load
                            }
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
                p.setBundleItems(bundles);
            } catch (Exception e) {
                e.printStackTrace();
                p.setBundleItems(new ArrayList<>());
            }
        });

        return ApiResponse.success(pageResult);
    }

    @PostMapping("/{id}/list")
    @Transactional
    public ApiResponse<Void> listBundle(@PathVariable Long id) {
        return updateBundleStatus(id, Product.Status.LISTED);
    }

    @PostMapping("/{id}/delist")
    @Transactional
    public ApiResponse<Void> delistBundle(@PathVariable Long id) {
        return updateBundleStatus(id, Product.Status.DELISTED);
    }

    private ApiResponse<Void> updateBundleStatus(Long id, Product.Status newStatus) {
        Optional<Product> optionalProduct = productRepository.findById(id);
        if (optionalProduct.isEmpty()) {
            throw new RuntimeException("Product not found: " + id);
        }
        Product product = optionalProduct.get();

        if (product.getType() != Product.ProductType.BUNDLE) {
            throw new RuntimeException("Product is not a bundle: " + id);
        }

        // Concurrency/Idempotency Control
        if (product.getStatus() == newStatus) {
            return ApiResponse.success(null);
        }

        Product.Status oldStatus = product.getStatus();

        // Validation
        if (newStatus == Product.Status.LISTED) {
            // Check validation rules: sub-products must exist
            List<ProductBundle> items = productBundleRepository.findByParentProductId(id);
            if (items == null || items.isEmpty()) {
                throw new RuntimeException("Cannot list bundle without sub-products: " + product.getName());
            }

            for (ProductBundle item : items) {
                Product child = item.getChildProduct();
                // 1. Check child status (Must be ON_SHELF or SELECTED or LISTED)
                if (child.getStatus() == Product.Status.OFF_SHELF || child.getStatus() == Product.Status.DELISTED || child.getStatus() == Product.Status.PENDING_SELECTION) {
                    throw new RuntimeException("Sub-product is not active: " + child.getName());
                }

                // 2. Check inventory
                Integer available = stockBatchRepository.sumAvailableQuantityByProductId(child.getId());
                if (available == null || available < item.getQuantity()) {
                    throw new RuntimeException("Insufficient inventory for sub-product: " + child.getName());
                }
            }
        }

        product.setStatus(newStatus);
        product.setUpdatedAt(LocalDateTime.now());
        productRepository.save(product);
        
        // Audit Log
        ProductStatusChangeLog log = new ProductStatusChangeLog();
        log.setProductId(product.getId());
        log.setOldStatus(oldStatus);
        log.setNewStatus(newStatus);
        log.setReason("手动状态变更");
        // log.setCreatedBy() is handled by @CreatedBy if Spring Security is set up
        productStatusChangeLogRepository.save(log);
        
        return ApiResponse.success(null);
    }
}
