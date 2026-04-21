package com.supplypro.service;

import com.supplypro.dto.ProductSearchResult;
import com.supplypro.entity.Product;
import com.supplypro.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ProductSearchService {

    private static final Logger logger = LoggerFactory.getLogger(ProductSearchService.class);
    
    private static final int MAX_RESULTS = 1000;
    private static final double EXACT_MATCH_BOOST = 100.0;
    private static final double PREFIX_MATCH_BOOST = 80.0;
    private static final double CONTAINS_MATCH_BOOST = 60.0;
    private static final double SKU_MATCH_BOOST = 50.0;

    @Autowired
    private ProductRepository productRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public Page<ProductSearchResult> searchProducts(String keyword, int page, int size, Product.Status status) {
        long startTime = System.currentTimeMillis();
        
        if (keyword == null || keyword.trim().isEmpty()) {
            return searchWithoutKeyword(page, size, status);
        }

        String normalizedKeyword = normalizeKeyword(keyword.trim());
        logger.debug("Searching products with keyword: '{}', normalized: '{}'", keyword, normalizedKeyword);

        List<ProductSearchResult> results = performFuzzySearch(normalizedKeyword, status);
        
        results = sortAndPaginateResults(results, page, size);
        
        long duration = System.currentTimeMillis() - startTime;
        logger.debug("Search completed in {}ms, found {} results", duration, results.size());
        
        return new PageImpl<>(results, PageRequest.of(page, size), results.size());
    }

    private String normalizeKeyword(String keyword) {
        return keyword.toLowerCase()
                .replaceAll("[\\s\\-\\_]+", " ")
                .replaceAll("[^a-z0-9\\u4e00-\\u9fa5\\s]", "")
                .trim();
    }
    private List<ProductSearchResult> performFuzzySearch(String keyword, Product.Status status) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT p.id, p.name, p.sku_code, p.status, ");
        sql.append("CASE ");
        sql.append("  WHEN LOWER(p.name) = :exactKeyword THEN :exactBoost ");
        sql.append("  WHEN LOWER(p.name) LIKE :prefixKeyword THEN :prefixBoost ");
        sql.append("  WHEN LOWER(p.name) LIKE :containsKeyword THEN :containsBoost ");
        sql.append("  WHEN LOWER(p.sku_code) LIKE :containsKeyword THEN :skuBoost ");
        sql.append("  ELSE 0 END AS relevance_score ");
        sql.append("FROM products p ");
        
        if (status != null) {
            sql.append("WHERE p.status = :status ");
        }
        
        sql.append("ORDER BY relevance_score DESC, p.id DESC ");
        sql.append("LIMIT :limit");

        Query query = entityManager.createNativeQuery(sql.toString());
        query.setParameter("exactKeyword", keyword);
        query.setParameter("prefixKeyword", keyword + "%");
        query.setParameter("containsKeyword", "%" + keyword + "%");
        query.setParameter("exactBoost", EXACT_MATCH_BOOST);
        query.setParameter("prefixBoost", PREFIX_MATCH_BOOST);
        query.setParameter("containsBoost", CONTAINS_MATCH_BOOST);
        query.setParameter("skuBoost", SKU_MATCH_BOOST);
        if (status != null) {
            query.setParameter("status", status.name());
        }
        query.setParameter("limit", MAX_RESULTS);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        
        return rows.stream()
                .map(row -> {
                    ProductSearchResult result = new ProductSearchResult();
                    result.setId(((Number) row[0]).longValue());
                    result.setName((String) row[1]);
                    result.setSkuCode((String) row[2]);
                    result.setStatus(Product.Status.valueOf((String) row[3]));
                    result.setRelevanceScore(((Number) row[4]).doubleValue());
                    return result;
                })
                .collect(Collectors.toList());
    }
    private Page<ProductSearchResult> searchWithoutKeyword(int page, int size, Product.Status status) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        
        Page<Product> products;
        if (status != null) {
            products = productRepository.findByStatus(status, pageRequest);
        } else {
            products = productRepository.findAll(pageRequest);
        }
        
        List<ProductSearchResult> results = products.getContent().stream()
                .map(this::convertToSearchResult)
                .collect(Collectors.toList());
        
        return new PageImpl<>(results, pageRequest, products.getTotalElements());
    }
    private ProductSearchResult convertToSearchResult(Product product) {
        ProductSearchResult result = new ProductSearchResult();
        result.setId(product.getId());
        result.setName(product.getName());
        result.setSkuCode(product.getSkuCode());
        result.setStatus(product.getStatus());
        result.setRelevanceScore(0);
        return result;
    }
    private List<ProductSearchResult> sortAndPaginateResults(List<ProductSearchResult> results, int page, int size) {
        results.sort((a, b) -> Double.compare(b.getRelevanceScore(), a.getRelevanceScore()));
        
        int start = page * size;
        int end = Math.min(start + size, results.size());
        
        if (start >= results.size()) {
            return Collections.emptyList();
        }
        
        return results.subList(start, end);
    }
}
