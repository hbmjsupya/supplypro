package com.supplypro.service;

import com.supplypro.entity.TaxCategory;
import java.util.List;

public interface TaxCategoryService {
    List<TaxCategory> search(String keyword);
    void syncTaxData();
}
