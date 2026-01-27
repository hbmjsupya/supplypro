import random
import datetime

def generate_sql():
    sql = []
    
    # Constants
    STATUS_ACTIVE = 'ACTIVE'
    
    # 1. Suppliers (20)
    suppliers = []
    # V1.1 has SUP001-SUP005. Start from 6.
    for i in range(6, 26):
        s_no = f"SUP{i:03d}"
        s_name = f"Supplier_{i}_Co"
        s_contact = f"Contact_{i}"
        s_phone = f"138{random.randint(10000000, 99999999)}"
        s_type = random.choice(['PERIOD', 'CASH', 'PREPAYMENT'])
        s_period = 30 if s_type == 'PERIOD' else 0
        s_bal = 10000.00 if s_type == 'PREPAYMENT' else 0.00
        
        sql.append(f"INSERT INTO suppliers (supplier_no, name, contact_person, contact_phone, settlement_type, settlement_period, prepayment_balance, status) VALUES ('{s_no}', '{s_name}', '{s_contact}', '{s_phone}', '{s_type}', {s_period}, {s_bal}, '{STATUS_ACTIVE}');")
        suppliers.append(i)

    # 2. Customers (20)
    customers = []
    for i in range(1, 21):
        c_no = f"CUST{i:03d}"
        c_name = f"Customer_{i}_Ltd"
        c_contact = f"Client_{i}"
        c_phone = f"139{random.randint(10000000, 99999999)}"
        
        sql.append(f"INSERT INTO customers (customer_no, name, contact_person, contact_phone, status) VALUES ('{c_no}', '{c_name}', '{c_contact}', '{c_phone}', '{STATUS_ACTIVE}');")
        customers.append(i)

    # 3. Products (50)
    products = []
    categories = ['Electronics', 'Raw Materials', 'Office', 'Packaging', 'Machinery']
    # V1.1 has SKU001-SKU006 (IDs 1-6). Start from 7.
    for i in range(7, 57):
        sku = f"SKU{i:03d}"
        name = f"Product_{i}"
        brand = f"Brand_{random.randint(1, 10)}"
        cat = random.choice(categories)
        spec = f"Spec_{i}"
        cost = round(random.uniform(10, 1000), 2)
        supplier_id = random.choice(suppliers)
        
        sql.append(f"INSERT INTO products (sku_code, name, brand, category, spec, cost_price, status, default_supplier_id) VALUES ('{sku}', '{name}', '{brand}', '{cat}', '{spec}', {cost}, '{STATUS_ACTIVE}', {supplier_id});")
        products.append((i, cost)) # Store ID and Cost

    # 4. Warehouses (Already 4, add 6 more)
    warehouses = [1, 2, 3, 4] # Assuming IDs 1-4 exist from V1.1
    for i in range(5, 11):
        w_name = f"Warehouse_{i}"
        w_code = f"WH-{i:02d}"
        w_region = random.choice(['North', 'South', 'East', 'West'])
        w_addr = f"Address_{i}"
        w_mgr = f"Manager_{i}"
        
        sql.append(f"INSERT INTO warehouses (name, code, region, address, manager, status) VALUES ('{w_name}', '{w_code}', '{w_region}', '{w_addr}', '{w_mgr}', '{STATUS_ACTIVE}');")
        warehouses.append(i)

    # 5. Purchase Orders (30)
    for i in range(1, 31):
        po_no = f"PO{20240000 + i}"
        sup_id = random.choice(suppliers)
        wh_id = random.choice(warehouses)
        status = random.choice(['PENDING', 'CONFIRMED', 'RECEIVED'])
        total_amt = 0
        
        # PO Items
        items = []
        num_items = random.randint(1, 5)
        for _ in range(num_items):
            prod = random.choice(products)
            qty = random.randint(10, 100)
            unit_price = prod[1]
            total_price = round(qty * unit_price, 2)
            total_amt += total_price
            items.append((prod[0], qty, unit_price, total_price))
            
        sql.append(f"INSERT INTO purchase_orders (order_no, supplier_id, warehouse_id, type, status, total_amount, delivery_date, created_by) VALUES ('{po_no}', {sup_id}, {wh_id}, 'INBOUND', '{status}', {round(total_amt, 2)}, '2024-12-31', 'admin');")
        
        # We need the PO ID. Since we are appending, assuming auto-inc works sequentially after existing data. 
        # Existing data has 2 POs. So new IDs start at 3.
        po_id = 2 + i 
        
        for item in items:
            sql.append(f"INSERT INTO purchase_order_items (order_id, product_id, quantity, unit_price, total_price) VALUES ({po_id}, {item[0]}, {item[1]}, {item[2]}, {item[3]});")

    # 6. Sales Orders (30)
    for i in range(1, 31):
        so_no = f"SO{20240000 + i}"
        cust_id = random.choice(customers)
        wh_id = random.choice(warehouses)
        status = 'PENDING' # Simplified
        total_amt = 0
        
        items = []
        num_items = random.randint(1, 5)
        for _ in range(num_items):
            prod = random.choice(products)
            qty = random.randint(1, 20)
            unit_price = round(prod[1] * 1.5, 2) # Sales price markup
            total_price = round(qty * unit_price, 2)
            total_amt += total_price
            items.append((prod[0], qty, unit_price, total_price))
            
        sql.append(f"INSERT INTO sales_orders (order_no, customer_id, warehouse_id, status, total_amount, created_by) VALUES ('{so_no}', {cust_id}, {wh_id}, '{status}', {round(total_amt, 2)}, 'admin');")
        
        so_id = i # Assuming start at 1 if no existing SOs. Existing data check needed.
        # Checking V1.1, no sales_orders insert. So starts at 1.
        
        for item in items:
            sql.append(f"INSERT INTO sales_order_items (order_id, product_id, quantity, unit_price, total_price) VALUES ({so_id}, {item[0]}, {item[1]}, {item[2]}, {item[3]});")

    return "\n".join(sql)

if __name__ == "__main__":
    content = generate_sql()
    # Write to file directly to avoid shell encoding issues
    output_path = 'backend/src/main/resources/db/migration/V1.3__comprehensive_mock_data.sql'
    import os
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Generated SQL to {output_path}")
    print("First 500 chars:")
    print(content[:500])
