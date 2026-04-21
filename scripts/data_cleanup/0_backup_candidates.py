import mysql.connector
import csv
import os
import datetime

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        port=3307,
        user="root",
        password="password",
        database="supplypro"
    )

def backup_data(conn, input_file):
    if not os.path.exists(input_file):
        print(f"Input file {input_file} not found.")
        return

    cursor = conn.cursor()
    
    # Group by table
    to_backup = {}
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['action'] == 'DELETE':
                table = row['table']
                if table not in to_backup:
                    to_backup[table] = []
                to_backup[table].append(row['id'])
    
    backup_file = f"scripts/data_cleanup/backup_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.sql"
    
    with open(backup_file, 'w', encoding='utf-8') as f:
        f.write(f"-- Backup generated at {datetime.datetime.now()}\n")
        f.write("SET FOREIGN_KEY_CHECKS=0;\n")
        
        for table, ids in to_backup.items():
            print(f"Backing up {len(ids)} rows from {table}...")
            if not ids: continue
            
            # Fetch full rows
            id_list = ",".join(ids)
            cursor.execute(f"SELECT * FROM {table} WHERE id IN ({id_list})")
            
            columns = [col[0] for col in cursor.description]
            
            for row in cursor:
                # Create INSERT statement
                values = []
                for val in row:
                    if val is None:
                        values.append("NULL")
                    elif isinstance(val, (int, float)):
                        values.append(str(val))
                    elif isinstance(val, datetime.datetime):
                        values.append(f"'{val.strftime('%Y-%m-%d %H:%M:%S')}'")
                    elif isinstance(val, datetime.date):
                        values.append(f"'{val.strftime('%Y-%m-%d')}'")
                    else:
                        # Escape single quotes
                        safe_val = str(val).replace("'", "''").replace("\\", "\\\\")
                        values.append(f"'{safe_val}'")
                
                sql = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(values)});\n"
                f.write(sql)
        
        f.write("SET FOREIGN_KEY_CHECKS=1;\n")
    
    print(f"Backup completed. File: {backup_file}")

def main():
    conn = None
    try:
        conn = get_db_connection()
        backup_data(conn, 'scripts/data_cleanup/validated_deletion_list.csv')
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        if conn and conn.is_connected():
            conn.close()

if __name__ == "__main__":
    main()
