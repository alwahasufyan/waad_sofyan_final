import psycopg2

def check_claim_lines():
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'claim_lines'")
        cols = cur.fetchall()
        print("--- claim_lines columns ---")
        for col in cols:
            print(col[0])
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_claim_lines()
