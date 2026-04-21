
import pymysql
import os

def check_snapshot():
    conn = pymysql.connect(
        host='localhost',
        port=3307,
        user='root',
        password='rootpassword',
        database='supply_chain_db',
        cursorclass=pymysql.cursors.DictCursor
    )
    
    try:
        with conn.cursor() as cursor:
            # Check PO
            cursor.execute("SELECT id, order_no, created_at FROM purchase_orders WHERE id = 51")
            po = cursor.fetchone()
            print(f"PO 51: {po}")
            
            # Check Snapshot
            cursor.execute("SELECT id, purchase_order_id, version, is_latest, created_at FROM purchase_order_snapshots WHERE purchase_order_id = 51")
            snapshots = cursor.fetchall()
            print(f"Snapshots for PO 51: {snapshots}")
            
            # Check Inbound Order
            cursor.execute("SELECT id, purchase_order_id, inbound_no FROM inbound_orders WHERE purchase_order_id = 51")
            io = cursor.fetchone()
            print(f"Inbound Order for PO 51: {io}")

    finally:
        conn.close()

if __name__ == "__main__":
    check_snapshot()
