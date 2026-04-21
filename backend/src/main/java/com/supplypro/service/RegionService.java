package com.supplypro.service;

import com.supplypro.entity.Region;
import com.supplypro.repository.RegionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.Cacheable;

import java.util.Optional;

@Service
public class RegionService {

    @Autowired
    private RegionRepository regionRepository;

    @Cacheable("regions")
    public String getNameByCode(String code) {
        if (code == null || code.isEmpty()) {
            return code;
        }
        // If code is numeric (regex check), look it up. Otherwise assume it's already a name.
        if (code.matches("\\d+")) {
            Optional<Region> region = regionRepository.findByCode(code);
            return region.map(Region::getName).orElse(code);
        }
        return code;
    }
}
