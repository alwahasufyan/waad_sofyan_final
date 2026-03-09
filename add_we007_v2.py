import psycopg2

def add_service():
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        
        # Category 120 is SUB-PHYSIO (العلاج الطبيعي)
        print("Adding WE-007 to medical_services...")
        cur.execute("""
            INSERT INTO medical_services 
            (code, name, category_id, active, created_at, updated_at, status, requires_pa, is_master, deleted) 
            VALUES ('WE-007', 'جلسة علاج طبيعي (Physiotherapy)', 120, true, now(), now(), 'ACTIVE', false, true, false)
            ON CONFLICT (code) DO NOTHING
        """)
        
        conn.commit()
        print("Successfully added WE-007.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_service()
