import mysql.connector
import csv
import os

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        port=3307,
        user="root",
        password="password",
        database="supplypro"
    )

def check_associations(cursor, table, record_id):
    associations = []
    count = 0
    
    if table == 'products':
        # Check Purchase Order Items
        cursor.execute("SELECT COUNT(*) FROM purchase_order_items WHERE product_id = %s", (record_id,))
        c = cursor.fetchone()[0]
        if c > 0: associations.append(f"PurchaseOrderItems({c})"); count += c
        
        # Check Sales Order Items
        cursor.execute("SELECT COUNT(*) FROM sales_order_items WHERE product_id = %s", (record_id,))
        c = cursor.fetchone()[0]
        if c > 0: associations.append(f"SalesOrderItems({c})"); count += c
        
        # Check Stock Batches
        cursor.execute("SELECT COUNT(*) FROM stock_batches WHERE product_id = %s", (record_id,))
        c = cursor.fetchone()[0]
        if c > 0: associations.append(f"StockBatches({c})"); count += c

        # Check Stock Flows
        cursor.execute("SELECT COUNT(*) FROM stock_flows WHERE product_id = %s", (record_id,))
        c = cursor.fetchone()[0]
        if c > 0: associations.append(f"StockFlows({c})"); count += c
        
        # Check Inbound Order Items
        cursor.execute("SELECT COUNT(*) FROM inbound_order_items WHERE product_id = %s", (record_id,))
        c = cursor.fetchone()[0]
        if c > 0: associations.append(f"InboundOrderItems({c})"); count += c

    elif table == 'brands':
        # Check Products
        cursor.execute("SELECT COUNT(*) FROM products WHERE brand_id = %s", (record_id,))
        c = cursor.fetchone()[0]
        if c > 0: associations.append(f"Products({c})"); count += c
        
        # Check Brand Supplier
        cursor.execute("SELECT COUNT(*) FROM brand_supplier WHERE brand_id = %s", (record_id,))
        c = cursor.fetchone()[0]
        if c > 0: associations.append(f"BrandSupplier({c})"); count += c

    elif table == 'suppliers':
        # Check Purchase Orders
        cursor.execute("SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = %s", (record_id,))
        c = cursor.fetchone()[0]
        if c > 0: associations.append(f"PurchaseOrders({c})"); count += c
        
        # Check Products (Default Supplier)
        cursor.execute("SELECT COUNT(*) FROM products WHERE default_supplier_id = %s", (record_id,))
        c = cursor.fetchone()[0]
        if c > 0: associations.append(f"Products({c})"); count += c
        
        # Check Brand Supplier
        cursor.execute("SELECT COUNT(*) FROM brand_supplier WHERE supplier_id = %s", (record_id,))
        c = cursor.fetchone()[0]
        if c > 0: associations.append(f"BrandSupplier({c})"); count += c

    elif table == 'warehouses':
        # Check Purchase Orders
        cursor.execute("SELECT COUNT(*) FROM purchase_orders WHERE warehouse_id = %s", (record_id,))
        c = cursor.fetchone()[0]
        if c > 0: associations.append(f"PurchaseOrders({c})"); count += c
        
        # Check Sales Orders
        cursor.execute("SELECT COUNT(*) FROM sales_orders WHERE warehouse_id = %s", (record_id,))
        c = cursor.fetchone()[0]
        if c > 0: associations.append(f"SalesOrders({c})"); count += c
        
        # Check Stock Batches
        cursor.execute("SELECT COUNT(*) FROM stock_batches WHERE warehouse_id = %s", (record_id,))
        c = cursor.fetchone()[0]
        if c > 0: associations.append(f"StockBatches({c})"); count += c
        
        # Check Stock Flows
        cursor.execute("SELECT COUNT(*) FROM stock_flows WHERE warehouse_id = %s", (record_id,))
        c = cursor.fetchone()[0]
        if c > 0: associations.append(f"StockFlows({c})"); count += c

    return count, "; ".join(associations)

def main():
    input_file = 'scripts/data_cleanup/cleanup_candidates.csv'
    output_file = 'scripts/data_cleanup/validated_deletion_list.csv'
    
    if not os.path.exists(input_file):
        print(f"Input file {input_file} not found. Run scan first.")
        return

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        validated_records = []
        
        with open(input_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            print("Validating associations...")
            
            for row in reader:
                table = row['table']
                record_id = row['id']
                
                count, details = check_associations(cursor, table, record_id)
                
                row['association_count'] = count
                row['association_details'] = details
                row['action'] = 'DELETE' if count == 0 else 'SKIP'
                
                validated_records.append(row)
        
        headers = list(validated_records[0].keys()) if validated_records else []
        
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(validated_records)
            
        print(f"Validation completed. Report saved to {output_file}")
        
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        if conn and conn.is_connected():
            conn.close()

if __name__ == "__main__":
    main()
