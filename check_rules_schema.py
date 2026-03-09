import psycopg2

def check_rules_schema():
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'benefit_policy_rules'")
        cols = cur.fetchall()
        print("--- benefit_policy_rules columns ---")
        for col in cols:
            print(col[0])
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_rules_schema()
