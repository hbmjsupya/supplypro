import mysql.connector
import time

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        port=3307,
        user="root",
        password="password",
        database="supplypro"
    )

def add_column_if_not_exists(cursor, table, column_def):
    try:
        cursor.execute(f"SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'supplypro' AND TABLE_NAME = '{table}' AND COLUMN_NAME = 'created_type'")
        if cursor.fetchone()[0] == 0:
            print(f"Adding created_type column to {table}...")
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column_def}")
        else:
            print(f"Column created_type already exists in {table}.")
    except mysql.connector.Error as err:
        print(f"Error checking/adding column for {table}: {err}")

def backfill_data(cursor):
    # Backfill logic based on heuristics for mock data
    print("Backfilling created_type based on heuristics...")
    
    # 1. Products: Mock data usually has SKU starting with 'SKU' followed by digits, or Name like 'Product_'
    cursor.execute("""
        UPDATE products 
        SET created_type = CASE 
            WHEN sku_code REGEXP '^SKU[0-9]+$' OR name REGEXP '^Product_[0-9]+$' THEN 'import'
            ELSE 'manual'
        END
        WHERE created_type IS NULL
    """)
    print(f"Updated products: {cursor.rowcount} rows")

    # 2. Brands: Mock data usually has Name like 'Brand_'
    cursor.execute("""
        UPDATE brands 
        SET created_type = CASE 
            WHEN name REGEXP '^Brand_[0-9]+$' THEN 'import'
            ELSE 'manual'
        END
        WHERE created_type IS NULL
    """)
    print(f"Updated brands: {cursor.rowcount} rows")

    # 3. Warehouses: Mock data usually has Name like 'Warehouse_' or Code like 'WH-'
    cursor.execute("""
        UPDATE warehouses 
        SET created_type = CASE 
            WHEN name REGEXP '^Warehouse_[0-9]+$' OR code REGEXP '^WH-[0-9]+$' THEN 'import'
            ELSE 'manual'
        END
        WHERE created_type IS NULL
    """)
    print(f"Updated warehouses: {cursor.rowcount} rows")

    # 4. Suppliers: Mock data heuristic (Assuming Supplier_ or similar, or relying on manual default if no pattern found)
    # V1.3 mock data doesn't explicitly name suppliers in the snippet, but we'll assume a pattern or default to manual
    # If we want to clean up mock suppliers, we need a pattern. Let's assume 'Supplier_%' for safety if it exists.
    cursor.execute("""
        UPDATE suppliers 
        SET created_type = CASE 
            WHEN name REGEXP '^Supplier_[0-9]+$' THEN 'import'
            ELSE 'manual'
        END
        WHERE created_type IS NULL
    """)
    print(f"Updated suppliers: {cursor.rowcount} rows")

def main():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        tables = ['products', 'brands', 'suppliers', 'warehouses']
        column_def = "created_type ENUM('manual','import','sync','api') DEFAULT NULL"
        
        for table in tables:
            add_column_if_not_exists(cursor, table, column_def)
        
        backfill_data(cursor)
        
        conn.commit()
        print("Setup and backfill completed successfully.")
        
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        if conn:
            conn.rollback()
    finally:
        if conn and conn.is_connected():
            conn.close()

if __name__ == "__main__":
    main()
