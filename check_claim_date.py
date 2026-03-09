import psycopg2

def check_date():
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        
        cur.execute("SELECT id, service_date FROM claims WHERE id = 14")
        print(cur.fetchone())
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_date()
