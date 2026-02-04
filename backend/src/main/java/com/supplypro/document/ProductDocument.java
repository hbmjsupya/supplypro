package com.supplypro.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

import java.math.BigDecimal;
import java.util.List;

@Document(indexName = "products")
public class ProductDocument {

    @Id
    private Long id;

    @Field(type = FieldType.Keyword)
    private String skuCode;

    @Field(type = FieldType.Text, analyzer = "ik_max_word")
    private String name;

    @Field(type = FieldType.Keyword)
    private String status;

    @Field(type = FieldType.Keyword)
    private String categoryName;

    @Field(type = FieldType.Keyword)
    private String brandZhName;

    @Field(type = FieldType.Keyword)
    private String brandEnName;
    
    // Store simple sku info for search
    @Field(type = FieldType.Nested)
    private List<SkuInfo> skus;

    public static class SkuInfo {
        @Field(type = FieldType.Keyword)
        private String skuCode;
        @Field(type = FieldType.Text)
        private String name;
        @Field(type = FieldType.Double)
        private BigDecimal costPrice;
        
        // Getters and Setters
        public String getSkuCode() { return skuCode; }
        public void setSkuCode(String skuCode) { this.skuCode = skuCode; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public BigDecimal getCostPrice() { return costPrice; }
        public void setCostPrice(BigDecimal costPrice) { this.costPrice = costPrice; }
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSkuCode() { return skuCode; }
    public void setSkuCode(String skuCode) { this.skuCode = skuCode; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    public String getBrandZhName() { return brandZhName; }
    public void setBrandZhName(String brandZhName) { this.brandZhName = brandZhName; }
    public String getBrandEnName() { return brandEnName; }
    public void setBrandEnName(String brandEnName) { this.brandEnName = brandEnName; }
    public List<SkuInfo> getSkus() { return skus; }
    public void setSkus(List<SkuInfo> skus) { this.skus = skus; }
}
