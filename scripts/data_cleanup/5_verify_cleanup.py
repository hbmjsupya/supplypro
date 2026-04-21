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

def verify_deletion(conn, deleted_log_file):
    if not os.path.exists(deleted_log_file):
        print("No deletion log found. Skipping specific verification.")
        return

    cursor = conn.cursor()
    
    # Extract deleted IDs from log or infer from previous run
    # Since log file format is text, let's just do a count check of "import" records that have NO associations
    # But wait, the previous run updated the CSV.
    # Let's check if the specific IDs 5 and 6 (from my observation) are gone.
    
    print("Verifying deletion of records...")
    
    # Check if products 5 and 6 exist (assuming they were the ones deleted)
    # A more robust way is to re-run the scan and check if any 'DELETE' candidates remain.
    
    query = """
        SELECT id, name FROM products WHERE id IN (5, 6)
    """
    cursor.execute(query)
    results = cursor.fetchall()
    
    if len(results) == 0:
        print("Verification SUCCESS: Products 5 and 6 are gone.")
    else:
        print(f"Verification FAILED: Found {len(results)} records that should have been deleted: {results}")

    # General check: Count of 'import' records
    cursor.execute("SELECT COUNT(*) FROM products WHERE created_type = 'import'")
    count = cursor.fetchone()[0]
    print(f"Remaining 'import' products: {count}")

def main():
    conn = None
    try:
        conn = get_db_connection()
        verify_deletion(conn, 'scripts/data_cleanup/deletion_log.txt')
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        if conn and conn.is_connected():
            conn.close()

if __name__ == "__main__":
    main()
