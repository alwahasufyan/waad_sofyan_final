import psycopg2

def check_flyway():
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        cur.execute("SELECT version, description, success FROM flyway_schema_history ORDER BY version DESC LIMIT 10")
        rows = cur.fetchall()
        print("--- Flyway History ---")
        for row in rows:
            print(f"Version: {row[0]}, Desc: {row[1]}, Success: {row[2]}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_flyway()
