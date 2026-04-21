import mysql.connector
import csv
import time
import os

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        port=3307,
        user="root",
        password="password",
        database="supplypro"
    )

def execute_deletion(conn, table, ids):
    cursor = conn.cursor()
    id_list = ",".join(ids)
    query = f"DELETE FROM {table} WHERE id IN ({id_list})"
    cursor.execute(query)
    return cursor.rowcount

def main():
    input_file = 'scripts/data_cleanup/validated_deletion_list.csv'
    log_file = 'scripts/data_cleanup/deletion_log.txt'
    
    if not os.path.exists(input_file):
        print(f"Input file {input_file} not found. Run validation first.")
        return

    conn = None
    try:
        conn = get_db_connection()
        conn.autocommit = False # Use transactions
        
        # Group by table
        to_delete = {}
        
        with open(input_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['action'] == 'DELETE':
                    table = row['table']
                    if table not in to_delete:
                        to_delete[table] = []
                    to_delete[table].append(row['id'])
        
        total_deleted = 0
        batch_size = 500
        
        with open(log_file, 'w') as log:
            for table, ids in to_delete.items():
                print(f"Deleting from {table}...")
                log.write(f"Starting deletion for {table}, total count: {len(ids)}\n")
                
                for i in range(0, len(ids), batch_size):
                    batch_ids = ids[i:i + batch_size]
                    try:
                        deleted_count = execute_deletion(conn, table, batch_ids)
                        conn.commit()
                        total_deleted += deleted_count
                        print(f"Deleted {deleted_count} rows from {table} (Batch {i//batch_size + 1})")
                        log.write(f"Deleted {deleted_count} rows from {table}\n")
                        
                        # Sleep to reduce load
                        time.sleep(0.05) 
                        
                    except mysql.connector.Error as err:
                        conn.rollback()
                        print(f"Error deleting batch from {table}: {err}")
                        log.write(f"Error deleting batch from {table}: {err}\n")
        
        print(f"Deletion completed. Total deleted: {total_deleted}. Log: {log_file}")
        
    except mysql.connector.Error as err:
        print(f"Database Error: {err}")
    finally:
        if conn and conn.is_connected():
            conn.close()

if __name__ == "__main__":
    main()
