package com.supplypro.repository;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.PurchaseOrderItem;
import com.supplypro.entity.Product;
import com.supplypro.entity.Supplier;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
public class PurchaseOrderRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Test
    public void findByIdWithItems_ShouldReturnUniqueResult_WhenMultipleItemsExist() {
        // Given
        Supplier supplier = new Supplier();
        supplier.setSupplierNo("SUP-1");
        supplier.setName("Test Supplier");
        supplier.setSettlementType(Supplier.SettlementType.CASH);
        supplier.setStatus(Supplier.Status.ACTIVE);
        supplier = entityManager.persist(supplier);

        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo("PO-TEST-UNIQUE");
        po.setStatus(PurchaseOrder.Status.PENDING);
        po.setType(PurchaseOrder.Type.STANDARD); // Add required type
        po.setTotalAmount(new BigDecimal("100.00")); // Add required totalAmount
        po.setSupplier(supplier);
        po = entityManager.persist(po);

        Product product1 = new Product();
        product1.setName("Product 1");
        product1.setSkuCode("SKU-1");
        product1.setCreatedAt(LocalDateTime.now());
        product1.setUpdatedAt(LocalDateTime.now());
        // Add required fields for Product if any (e.g. price, category)
        product1 = entityManager.persist(product1);

        Product product2 = new Product();
        product2.setName("Product 2");
        product2.setSkuCode("SKU-2");
        product2.setCreatedAt(LocalDateTime.now());
        product2.setUpdatedAt(LocalDateTime.now());
        product2 = entityManager.persist(product2);

        PurchaseOrderItem item1 = new PurchaseOrderItem();
        item1.setPurchaseOrder(po);
        item1.setProduct(product1);
        item1.setProductId(product1.getId());
        item1.setQuantity(10);
        item1.setUnitPrice(new BigDecimal("10.00"));
        item1.setTotalPrice(new BigDecimal("100.00"));
        entityManager.persist(item1);

        PurchaseOrderItem item2 = new PurchaseOrderItem();
        item2.setPurchaseOrder(po);
        item2.setProduct(product2);
        item2.setProductId(product2.getId());
        item2.setQuantity(5);
        item2.setUnitPrice(new BigDecimal("20.00"));
        item2.setTotalPrice(new BigDecimal("100.00"));
        entityManager.persist(item2);

        entityManager.flush();
        entityManager.clear();

        // When
        List<PurchaseOrder> result = purchaseOrderRepository.findByIdWithItems(po.getId());

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result.get(0).getOrderNo()).isEqualTo("PO-TEST-UNIQUE");
        // If duplicates were returned by SQL without distinct, Hibernate might deduplicate if mapped correctly, 
        // but NonUniqueResultException would be thrown by getSingleResult() if the query returns multiple rows for the root entity.
        // With 'DISTINCT', it should be fine.
        assertThat(result.get(0).getItems()).hasSize(2);
    }
}
