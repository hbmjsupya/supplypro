import mysql.connector
import csv
import os
import re

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        port=3307,
        user="root",
        password="password",
        database="supplypro"
    )

def check_products(cursor):
    issues = []
    print("Checking Products quality...")
    
    # Check 1: Empty SKU
    cursor.execute("SELECT id, name, sku_code FROM products WHERE sku_code IS NULL OR sku_code = ''")
    for row in cursor:
        issues.append({'table': 'products', 'id': row[0], 'issue': f"Empty SKU for product '{row[1]}'"})

    # Check 2: Invalid Default Supplier (if needed, but FK usually handles this)
    
    return issues

def check_suppliers(cursor):
    issues = []
    print("Checking Suppliers quality...")
    
    # Check 1: Invalid Email Format
    cursor.execute("SELECT id, name, email FROM suppliers WHERE email IS NOT NULL AND email != ''")
    email_regex = re.compile(r"[^@]+@[^@]+\.[^@]+")
    for row in cursor:
        if not email_regex.match(row[2]):
            issues.append({'table': 'suppliers', 'id': row[0], 'issue': f"Invalid email format: '{row[2]}'"})
            
    return issues

def check_purchase_orders(cursor):
    issues = []
    print("Checking Purchase Orders quality...")
    
    # Check 1: Check tables existence first
    cursor.execute("SHOW TABLES LIKE 'purchase_orders'")
    if cursor.fetchone():
        # Check negative total amount (assuming total_amount column exists, need to verify)
        # Let's check columns first
        cursor.execute("SHOW COLUMNS FROM purchase_orders LIKE 'total_amount'")
        if cursor.fetchone():
            cursor.execute("SELECT id, order_no, total_amount FROM purchase_orders WHERE total_amount < 0")
            for row in cursor:
                issues.append({'table': 'purchase_orders', 'id': row[0], 'issue': f"Negative total amount: {row[2]}"})
    
    return issues

def main():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        all_issues = []
        all_issues.extend(check_products(cursor))
        all_issues.extend(check_suppliers(cursor))
        all_issues.extend(check_purchase_orders(cursor))
        
        output_file = 'scripts/data_cleanup/data_quality_report.csv'
        headers = ['table', 'id', 'issue']
        
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(all_issues)
            
        print(f"Data Quality Check completed. Found {len(all_issues)} issues. Report saved to {output_file}")
        
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        if conn and conn.is_connected():
            conn.close()

if __name__ == "__main__":
    main()
