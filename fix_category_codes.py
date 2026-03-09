import psycopg2

def fix_categories():
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        
        print("Renaming ROOT-OP to CAT-OUTPAT...")
        cur.execute("UPDATE medical_categories SET code = 'CAT-OUTPAT' WHERE code = 'ROOT-OP'")
        
        print("Renaming ROOT-IP to CAT-INPAT...")
        cur.execute("UPDATE medical_categories SET code = 'CAT-INPAT' WHERE code = 'ROOT-IP'")
        
        # Verify
        cur.execute("SELECT code, name FROM medical_categories WHERE code IN ('CAT-OUTPAT', 'CAT-INPAT')")
        for row in cur.fetchall():
            print(f"Verified category: {row[0]} - {row[1]}")
            
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_categories()
