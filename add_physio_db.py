import psycopg2
import os
from datetime import datetime

def add_physio():
    conn = psycopg2.connect(
        dbname=os.getenv('POSTGRES_DB', 'tba_waad_system'),
        user=os.getenv('POSTGRES_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', '12345'),
        host='localhost'
    )
    cur = conn.cursor()
    
    try:
        # Check if ROOT-PHYSIO exists
        cur.execute("SELECT id FROM medical_categories WHERE code = 'ROOT-PHYSIO'")
        physio = cur.fetchone()
        
        if not physio:
            print("Inserting ROOT-PHYSIO as a main category...")
            cur.execute("""
                INSERT INTO medical_categories (code, name, name_ar, name_en, active, deleted, created_at, updated_at)
                VALUES (%s, %s, %s, %s, true, false, %s, %s) RETURNING id;
            """, ('ROOT-PHYSIO', 'العلاج الطبيعي', 'العلاج الطبيعي', 'Physiotherapy', datetime.now(), datetime.now()))
            root_id = cur.fetchone()[0]
            print(f"Success! Inserted ROOT-PHYSIO with ID: {root_id}")
            
            # Check if SUB-PHYSIO exists, if it does, make sure we link it if needed
            cur.execute("SELECT id FROM medical_categories WHERE code = 'SUB-PHYSIO'")
            sub_id = cur.fetchone()
            if sub_id:
                print(f"SUB-PHYSIO exists with ID {sub_id[0]}")
                # We can also update its parent to be ROOT-PHYSIO instead of ROOT-OP if we wanted
                # cur.execute("UPDATE medical_categories SET parent_id = %s WHERE id = %s", (root_id, sub_id[0]))
                
                # Check if it's already linked in medical_category_roots
                cur.execute("SELECT * FROM medical_category_roots WHERE category_id = %s AND root_id = %s", (sub_id[0], root_id))
                if not cur.fetchone():
                    cur.execute("INSERT INTO medical_category_roots (category_id, root_id) VALUES (%s, %s);", (sub_id[0], root_id))
                    print("Linked SUB-PHYSIO to ROOT-PHYSIO in medical_category_roots.")
        else:
            print(f"ROOT-PHYSIO already exists with ID: {physio[0]}")
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    add_physio()
