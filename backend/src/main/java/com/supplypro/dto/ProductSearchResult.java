package com.supplypro.dto;

import com.supplypro.entity.Product;

public class ProductSearchResult {
    private Long id;
    private String name;
    private String skuCode;
    private Product.Status status;
    private double relevanceScore;

    public ProductSearchResult() {}

    public ProductSearchResult(Long id, String name, String skuCode, Product.Status status, double relevanceScore) {
        this.id = id;
        this.name = name;
        this.skuCode = skuCode;
        this.status = status;
        this.relevanceScore = relevanceScore;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSkuCode() {
        return skuCode;
    }

    public void setSkuCode(String skuCode) {
        this.skuCode = skuCode;
    }

    public Product.Status getStatus() {
        return status;
    }

    public void setStatus(Product.Status status) {
        this.status = status;
    }

    public double getRelevanceScore() {
        return relevanceScore;
    }

    public void setRelevanceScore(double relevanceScore) {
        this.relevanceScore = relevanceScore;
    }
}
