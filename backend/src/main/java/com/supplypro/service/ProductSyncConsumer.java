package com.supplypro.service;

import com.supplypro.config.RabbitMQConfig;
import com.supplypro.document.ProductDocument;
import com.supplypro.entity.Product;
import com.supplypro.repository.ProductRepository;
import com.supplypro.repository.search.ProductSearchRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

@Service
@Profile("!dev && !local")
public class ProductSyncConsumer {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductSearchRepository productSearchRepository;

    @RabbitListener(queues = RabbitMQConfig.QUEUE_NAME)
    @Transactional(readOnly = true)
    public void handleSyncMessage(Long productId) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            // If product is deleted, remove from ES
            productSearchRepository.deleteById(productId);
            return;
        }

        // Convert Entity to Document
        ProductDocument doc = new ProductDocument();
        doc.setId(product.getId());
        doc.setSkuCode(product.getSkuCode());
        doc.setName(product.getName());
        doc.setStatus(product.getStatus().name());
        doc.setCategoryName(product.getCategoryName());
        doc.setBrandZhName(product.getBrandZhName());
        doc.setBrandEnName(product.getBrandEnName());
        
        if (product.getSkus() != null) {
            doc.setSkus(product.getSkus().stream().map(sku -> {
                ProductDocument.SkuInfo info = new ProductDocument.SkuInfo();
                info.setSkuCode(sku.getSkuCode());
                info.setName(sku.getName());
                info.setCostPrice(sku.getCostPrice());
                return info;
            }).collect(Collectors.toList()));
        }

        productSearchRepository.save(doc);
    }
}
