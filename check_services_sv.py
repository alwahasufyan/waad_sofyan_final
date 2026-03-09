import psycopg2

def check_services():
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        
        print("--- Services Check ---")
        cur.execute("SELECT id, code, name, category_id FROM medical_services WHERE code IN ('SV-0006', 'WE-007')")
        for res in cur.fetchall():
            print(res)
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_services()
