package com.supplypro.repository;

import com.supplypro.entity.Region;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RegionRepository extends JpaRepository<Region, String> {
    Optional<Region> findByCode(String code);
    Optional<Region> findByName(String name);
}
