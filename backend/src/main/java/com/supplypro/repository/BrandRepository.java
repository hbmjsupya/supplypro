package com.supplypro.repository;

import com.supplypro.entity.Brand;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BrandRepository extends JpaRepository<Brand, Long> {
    
    // Fuzzy search with status filter and permission control
    @Query("SELECT b FROM Brand b WHERE " +
           "(:keyword IS NULL OR b.name LIKE %:keyword% OR b.trademarkNo LIKE %:keyword% OR b.firstLetter = :keyword) " +
           "AND (:status IS NULL OR b.status = :status) " +
           "AND (coalesce(:ids, null) IS NULL OR b.id IN :ids)")
    Page<Brand> search(@Param("keyword") String keyword, 
                       @Param("status") Brand.Status status, 
                       @Param("ids") List<Long> ids,
                       Pageable pageable);

    // For checking valid brands
    boolean existsByIdAndStatus(Long id, Brand.Status status);

    List<Brand> findBySuppliers_Id(Long supplierId);
    
    @Query("SELECT b.id FROM Brand b JOIN b.suppliers s WHERE s.purchaser.username = :username")
    List<Long> findBrandIdsByPurchaser(@Param("username") String username);



    Brand findByName(String name);

    @Query("SELECT COUNT(b) > 0 FROM Brand b JOIN b.suppliers s WHERE b.id = :id AND s.purchaser.username = :username")
    boolean hasPermission(@Param("id") long id, @Param("username") String username);
}
