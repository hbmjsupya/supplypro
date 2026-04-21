package com.supplypro.converter;

import com.supplypro.entity.Product;
import javax.persistence.AttributeConverter;
import javax.persistence.Converter;

@Converter(autoApply = true)
public class ProductStatusConverter implements AttributeConverter<Product.Status, String> {

    @Override
    public String convertToDatabaseColumn(Product.Status status) {
        if (status == null) {
            return null;
        }
        return status.name();
    }

    @Override
    public Product.Status convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return null;
        }
        try {
            // Use the custom fromString method in Status enum which handles case-insensitivity
            return Product.Status.fromString(dbData);
        } catch (IllegalArgumentException e) {
            // Log warning? Or return null? Or default?
            // Returning null might be safer than crashing
            System.err.println("Unknown status value in DB: " + dbData);
            return null;
        }
    }
}
