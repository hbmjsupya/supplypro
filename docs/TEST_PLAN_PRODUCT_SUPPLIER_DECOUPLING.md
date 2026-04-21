# Product-Supplier Decoupling Test Plan

## Objective
Verify that product selection is fully independent of supplier selection, and that the supplier field serves only as a default attribute without forcing constraints.

## Test Scenarios

### 1. Product Selection Independence
- **Step**: Open "Create Purchase Order" page. Do NOT select a supplier. Click "Add Product".
- **Expected Result**: Product selection modal opens and displays ALL on-shelf products.
- **Verification**: Check if `ProductPoolModal` fetches products without `supplierId` parameter. (Verified in code: `productService.getAll` call has no `supplierId`).

### 2. Switching Supplier Impact
- **Step**: Select a product (e.g., Product A). Then select Supplier X. Then change to Supplier Y.
- **Expected Result**: Product A remains in the item list. No warning or auto-clear occurs.
- **Verification**: `SupplierSelect` `onChange` handler in `PurchaseOrderCreate.tsx` does not interact with `items` form field. (Verified in code).

### 3. Independent Association Storage
- **Step**: Create a Purchase Order with Supplier X and Product B (where Product B's default supplier might be Supplier Z or null). Submit.
- **Expected Result**: 
    - PO is created with `supplierId` = X.
    - PO Item is created with `productId` = B.
    - No database error regarding foreign key constraints.
- **Verification**: 
    - Database schema `products` table has `default_supplier_id` without FK constraint.
    - `PurchaseOrderItem` does not enforce supplier match.

### 4. Default Supplier Auto-fill
- **Step**: Open "Create Purchase Order". Do NOT select supplier. Add Product C (which has default supplier set to Supplier W).
- **Expected Result**: The "Supplier" dropdown automatically selects Supplier W.
- **Verification**: `handleProductSelect` in `PurchaseOrderCreate.tsx` contains logic to set `supplier` field if empty.

## Technical Implementation Verification
- **Frontend**: `ProductPoolModal.tsx` props no longer include `supplierId`.
- **Backend**: `ProductController.java` `getAll` method removed `supplierId` parameter.
- **Database**: `V5.29__add_default_supplier_to_products.sql` executed successfully.
