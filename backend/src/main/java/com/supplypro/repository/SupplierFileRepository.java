package com.supplypro.repository;

import com.supplypro.entity.SupplierFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SupplierFileRepository extends JpaRepository<SupplierFile, Long> {
    List<SupplierFile> findBySupplierIdAndIsDeletedFalse(Long supplierId);
    List<SupplierFile> findBySupplierIdAndIsDeletedFalseAndIsLatestTrue(Long supplierId);

    List<SupplierFile> findBySupplierIdAndCategoryAndIsDeletedFalse(Long supplierId, SupplierFile.FileCategory category);
    List<SupplierFile> findBySupplierIdAndCategoryAndIsDeletedFalseAndIsLatestTrue(Long supplierId, SupplierFile.FileCategory category);

    List<SupplierFile> findBySupplierIdAndIsDeletedTrue(Long supplierId);

    List<SupplierFile> findByGroupIdOrderByVersionDesc(String groupId);
}
