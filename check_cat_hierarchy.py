import psycopg2

def check_hierarchy():
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        
        cur.execute("SELECT id, name, parent_id FROM medical_categories WHERE id = 120 OR code = 'CAT-OUTPAT'")
        for res in cur.fetchall():
            print(res)
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_hierarchy()
