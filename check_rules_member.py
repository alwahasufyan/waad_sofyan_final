import psycopg2

def check_rules():
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        
        print("--- Rules Check ---")
        cur.execute("SELECT id, medical_category_id, medical_service_id, amount_limit, times_limit FROM benefit_policy_rules WHERE benefit_policy_id = (SELECT benefit_policy_id FROM members WHERE id = 83673)")
        for res in cur.fetchall():
            print(res)
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_rules()
