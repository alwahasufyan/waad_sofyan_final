import psycopg2

def check_cat():
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        
        # 1. Check if CAT-OUTPAT exists
        cur.execute("SELECT id, name FROM medical_categories WHERE code = 'CAT-OUTPAT'")
        res = cur.fetchone()
        if res:
            print(f"CAT-OUTPAT exists: ID={res[0]}, Name={res[1]}")
        else:
            print("CAT-OUTPAT DOES NOT EXIST")
            
        # 2. Check if ROOT-OP exists
        cur.execute("SELECT id, name FROM medical_categories WHERE code = 'ROOT-OP'")
        res = cur.fetchone()
        if res:
            print(f"ROOT-OP exists: ID={res[0]}, Name={res[1]}")
            
        # 3. Check for any rules linked to missing/broken categories
        cur.execute("SELECT COUNT(*) FROM benefit_policy_rules WHERE category_id IS NULL")
        print(f"Rules with NULL category: {cur.fetchone()[0]}")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_cat()
