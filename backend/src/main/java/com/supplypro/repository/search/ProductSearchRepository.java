package com.supplypro.repository.search;

import com.supplypro.document.ProductDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductSearchRepository extends ElasticsearchRepository<ProductDocument, Long> {
    Page<ProductDocument> findByNameContaining(String name, Pageable pageable);
    Page<ProductDocument> findByStatus(String status, Pageable pageable);
    Page<ProductDocument> findByNameContainingAndStatus(String name, String status, Pageable pageable);
}
