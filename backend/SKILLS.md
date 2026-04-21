# SupplyPro Advanced Skills Documentation

This document provides a comprehensive guide to the advanced capabilities of the SupplyPro system. Each skill includes detailed interface specifications, testing strategies, and performance benchmarks.

---

## 1. Product Search & Filter (商品搜索与筛选)
**Status:** ✅ Implemented
**Description:** 
A robust filtering engine built on JPA Specifications, allowing complex queries across product attributes, associations (Brand, Supplier), and ranges (Price, Date).

**Interface Documentation:**
- **Endpoint:** `GET /api/products`
- **Query Parameters:**
  - `page` (Integer, default: 0): Page number.
  - `size` (Integer, default: 10): Page size.
  - `keyword` (String): Fuzzy search in Product Name, ID, SKU Code.
  - `categoryCode` (String): Filter by Category hierarchy (prefix match).
  - `taxClass` (String): Filter by Tax Category code (exact match).
  - `status` (List<Product.Status>): Filter by multiple statuses (e.g., `ON_SHELF,OFF_SHELF`).
  - `minPrice` (BigDecimal): Minimum cost price (searches across all SKUs).
  - `maxPrice` (BigDecimal): Maximum cost price.
  - `brandId` (Long): Filter by Brand ID.
  - `supplierId` (Long): Filter by Supplier ID (searches across all SKUs).
  - `createdAfter` (ISO Date): Start of creation date range.
  - `createdBefore` (ISO Date): End of creation date range.
- **Response:** `Page<Product>` JSON structure.

**Testing Strategy:**
- **Unit Tests:** `ProductControllerTest` mocks Repository to verify parameter parsing.
- **Integration Tests:** `ProductAdvancedFeaturesTest.testSearchAndFilter` verifies SQL generation and result correctness using H2 database.
  - *Case 1:* Filter by price range [10, 100] -> Returns products with at least one SKU in range.
  - *Case 2:* Filter by status ON_SHELF -> Returns only on-shelf products.
  - *Case 3:* Keyword search "Phone" -> Matches Name or SKU.

**Performance Benchmarks:**
- **Latency:** < 200ms for 10k records on t2.micro.
- **Optimization:** Database indexes on `status`, `brand_id`, `created_at`. Hibernate Batch Fetching enabled to prevent N+1 queries.

---

## 2. Batch Operations (批量操作)
**Status:** ✅ Implemented
**Description:** 
High-efficiency bulk processing for administrative tasks, wrapped in atomic transactions.

**Interface Documentation:**
- **Endpoint 1:** `POST /api/products/batch/delete`
  - **Body:** `[101, 102, 103]` (List of Product IDs)
  - **Response:** `{ "code": 200, "message": "Deleted 3 products" }`
- **Endpoint 2:** `POST /api/products/batch/status`
  - **Body:** `{ "ids": [101, 102], "status": "ON_SHELF" }`
  - **Response:** `{ "code": 200, "message": "Updated 2 products" }`

**Testing Strategy:**
- **Integration Tests:** `ProductAdvancedFeaturesTest`
  - *Case 1:* Batch Delete -> Verify `existsById` returns false for all IDs.
  - *Case 2:* Batch Status -> Verify `status` is updated for all IDs.
  - *Case 3:* Partial Failure -> (Future) Verify transaction rollback.

**Performance Benchmarks:**
- **Throughput:** Process 100 items in < 500ms.
- **Transaction:** Single `@Transactional` context for the entire batch to ensure atomicity.

---

## 3. Data Export (数据导出)
**Status:** ✅ Implemented
**Description:** 
Streaming CSV export functionality for large datasets, reusing the Search & Filter logic.

**Interface Documentation:**
- **Endpoint:** `GET /api/products/export`
- **Query Parameters:** Same as Search & Filter.
- **Response Header:** `Content-Type: text/csv`, `Content-Disposition: attachment; filename=products.csv`
- **Response Body:** CSV format (ID, Name, SKU Code, Brand, Category, Price, Status).

**Testing Strategy:**
- **Integration Tests:** `ProductAdvancedFeaturesTest.testExportProducts`
  - *Case:* Request export with filter -> Verify response content type is `text/csv` and body contains expected headers and data rows.

**Performance Benchmarks:**
- **Efficiency:** Uses streaming to avoid loading all records into memory.
- **Speed:** Export 1,000 records in < 1 second.

---

## 4. Real-time Inventory Monitoring (实时库存监控)
**Status:** 🚧 Planned
**Description:** 
System to monitor SKU stock levels in real-time and trigger alerts when falling below defined thresholds.

**Interface Documentation (Proposed):**
- **Endpoint:** `GET /api/inventory/low-stock`
- **Params:** `threshold` (int, default: 10)
- **Response:** List of SKUs with stock < threshold.

**Testing Strategy:**
- **Integration:** Create SKUs with varying stock -> Verify API returns only low-stock items.

---

## 5. Stability & Error Handling Patterns (稳定性与错误处理模式)
**Status:** ✅ Documented
**Description:** 
A collection of proven patterns and troubleshooting guides for common system issues.

**Key Resources:**
- **Full Guide:** [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md) (Root Directory)

**Core Patterns:**
1.  **Robust Enum Mapping:** Use `AttributeConverter` to handle case-insensitive/fuzzy DB values for Enums (Fixes 500 Errors).
2.  **Lazy Loading Safety:** Explicitly trigger lazy fields or use DTOs to prevent `LazyInitializationException` during serialization.
3.  **Secure Logout:** Implement Redis-based JWT blacklisting for true stateless logout.
4.  **Frontend Resilience:** Use `try-finally` for critical cleanup operations (e.g., logout) and ensure comprehensive API filtering parameters.

---

## Troubleshooting & Best Practices

### Database Unique Constraint Violation (ProductBrand)
**Issue:** `Duplicate entry 'x-y' for key 'product_brands.uk_product_brand'` during product update.

**Root Cause:**
- `ProductController.update` used a "Delete-then-Insert" strategy for managing `ProductBrand` associations.
- `deleteByProductId` (JPA Delete) is deferred until flush/commit.
- `save` (JPA Persist) with `IDENTITY` generation is executed immediately to generate ID.
- **Result:** Insert attempts to add a record that hasn't been deleted yet, violating the unique constraint.

**Solution:**
- Adopt "Check-then-Act" strategy.
- Check if the desired association already exists using `findByProductIdAndBrandId`.
- If it exists, do nothing (idempotent).
- If it doesn't exist, explicitly `deleteByProductId` AND `flush()` to ensure cleanup before inserting the new record.

**Prevention:**
- Avoid blind "Delete-then-Insert" for associations with unique constraints.
- Always use `flush()` if mixing Delete and Insert operations on the same table within the same transaction.
- Prefer "Update" (modify existing entity) over "Delete+Insert" whenever possible.
