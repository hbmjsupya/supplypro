package com.supplypro.service;

import com.supplypro.entity.Product;
import com.supplypro.entity.ProductBundle;
import com.supplypro.repository.ProductBundleRepository;
import com.supplypro.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ProductBundleService {
    @Autowired
    private ProductBundleRepository productBundleRepository;

    @Autowired
    private ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<ProductBundle> getBundleItems(Long parentProductId) {
        return productBundleRepository.findByParentProductId(parentProductId);
    }

    @Transactional
    public void updateBundleItems(Long parentProductId, List<Map<String, Object>> items) {
        Product parent = productRepository.findById(parentProductId)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        
        if (!Boolean.TRUE.equals(parent.getIsBundle())) {
            throw new RuntimeException("Product is not a bundle");
        }

        // Clear existing
        productBundleRepository.deleteByParentProductId(parentProductId);

        // Add new
        List<ProductBundle> bundles = new ArrayList<>();
        for (Map<String, Object> item : items) {
            Long childId = Long.valueOf(item.get("childProductId").toString());
            Integer qty = Integer.valueOf(item.get("quantity").toString());
            
            Product child = productRepository.findById(childId)
                    .orElseThrow(() -> new RuntimeException("Child product not found: " + childId));

            ProductBundle bundle = new ProductBundle();
            bundle.setParentProduct(parent);
            bundle.setChildProduct(child);
            bundle.setQuantity(qty);
            bundles.add(bundle);
        }
        productBundleRepository.saveAll(bundles);
    }

    /**
     * Resolves a product to its atomic components.
     * If it's a bundle, returns its children (multiplied by qty).
     * If it's a single product, returns itself.
     */
    @Transactional(readOnly = true)
    public List<ResolvedProductItem> resolveProduct(Long productId, Integer quantity) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        List<ResolvedProductItem> result = new ArrayList<>();

        if (Boolean.TRUE.equals(product.getIsBundle())) {
            List<ProductBundle> children = productBundleRepository.findByParentProductId(productId);
            for (ProductBundle child : children) {
                // Recursively resolve? For V2.0 let's assume only 1 level depth for simplicity
                // Or handle recursion if needed. Let's do 1 level for now.
                result.add(new ResolvedProductItem(
                        child.getChildProduct(),
                        child.getQuantity() * quantity
                ));
            }
        } else {
            result.add(new ResolvedProductItem(product, quantity));
        }
        return result;
    }

    public static class ResolvedProductItem {
        private Product product;
        private Integer quantity;

        public ResolvedProductItem(Product product, Integer quantity) {
            this.product = product;
            this.quantity = quantity;
        }

        public Product getProduct() { return product; }
        public Integer getQuantity() { return quantity; }
    }
}
