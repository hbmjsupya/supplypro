# Warehouse Search Optimization & Database Indexing Scheme

## 1. Current State Analysis
The warehouse search currently involves joining `Warehouse`, `StockBatch`, `Product`, and `User` (managers) tables.
Queries can be complex, e.g., searching for "Manager Name" + "Product Name" + "Warehouse Name".

## 2. Optimization Strategy

### 2.1 Database Indexing
Based on the query patterns in `WarehouseSearch.tsx`, we recommend the following indexes:

**Table: warehouses**
- `INDEX idx_warehouse_name (name)`: For direct name search.
- `INDEX idx_warehouse_location (province, city, district)`: For region filtering.

**Table: stock_batches**
- `INDEX idx_stock_product_warehouse (product_id, warehouse_id)`: Optimize join between product and warehouse.
- `INDEX idx_stock_warehouse (warehouse_id)`: Fast retrieval of stocks for a warehouse.

**Table: users**
- `INDEX idx_user_name (username)`: For manager name search.
- `INDEX idx_user_phone (phone)`: For contact search.

**Table: warehouse_managers (Join Table)**
- `INDEX idx_wm_user_warehouse (user_id, warehouse_id)`: Optimize manager lookup.

### 2.2 Query Optimization (JPA Specification)
- Use `JoinType.LEFT` only when necessary (e.g., nullable relationships).
- Use `CriteriaBuilder.exists` for Many-To-Many relationships (Managers) instead of heavy joins if only checking existence.
- Fetch only required fields in listing (avoid fetching large text fields).

### 2.3 Caching
- **Level 2 Cache**: Enable Hibernate L2 cache for `Warehouse` entity (read-write) as warehouse data changes infrequently.
- **Query Cache**: Cache results for common search combinations (e.g., "Active" status).

### 2.4 Frontend Optimization
- **Debounce**: Search input is debounced (500ms) to reduce API calls.
- **Saved Schemes**: Allow users to save complex filter sets to avoid reconstructing queries.

## 3. Implementation Plan
1. Apply Flyway migration for indexes.
2. Configure Hibernate Ehcache/Redis.
3. Monitor slow query logs.
