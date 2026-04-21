import mysql.connector
import csv
import os
from datetime import datetime

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        port=3307,
        user="root",
        password="password",
        database="supplypro"
    )

def scan_module(cursor, table, module_name, id_col, name_col):
    query = f"""
        SELECT {id_col}, {name_col}, created_type, created_at, updated_at 
        FROM {table} 
        WHERE created_type != 'manual'
    """
    cursor.execute(query)
    results = []
    for (id_val, name_val, c_type, c_at, u_at) in cursor:
        results.append({
            'module': module_name,
            'table': table,
            'id': id_val,
            'name': name_val,
            'created_type': c_type,
            'created_at': c_at,
            'updated_at': u_at,
            'association_count': 0 # To be filled in validation step
        })
    return results

def main():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        all_records = []
        
        # 1. Products
        print("Scanning Products...")
        all_records.extend(scan_module(cursor, 'products', 'Product Pool', 'id', 'name'))
        
        # 2. Brands
        print("Scanning Brands...")
        all_records.extend(scan_module(cursor, 'brands', 'Brand Management', 'id', 'name'))
        
        # 3. Suppliers
        print("Scanning Suppliers...")
        all_records.extend(scan_module(cursor, 'suppliers', 'Supplier Management', 'id', 'name'))
        
        # 4. Warehouses
        print("Scanning Warehouses...")
        all_records.extend(scan_module(cursor, 'warehouses', 'Warehouse Management', 'id', 'name'))
        
        # Output to CSV
        output_file = 'scripts/data_cleanup/cleanup_candidates.csv'
        headers = ['module', 'table', 'id', 'name', 'created_type', 'created_at', 'updated_at', 'association_count']
        
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(all_records)
            
        print(f"Scan completed. Found {len(all_records)} records. Report saved to {output_file}")
        
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        if conn and conn.is_connected():
            conn.close()

if __name__ == "__main__":
    main()
