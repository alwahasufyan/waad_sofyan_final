import psycopg2
import sys

def check_schema():
    try:
        # Credentials from application.yml
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        
        # Check columns of provider_contract_pricing_items
        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'provider_contract_pricing_items'")
        cols = cur.fetchall()
        print("--- provider_contract_pricing_items ---")
        for col in cols:
            print(f"{col[0]}: {col[1]}")
            
        # Check one record for WE-007
        cur.execute("SELECT * FROM provider_contract_pricing_items WHERE service_code = 'WE-007' LIMIT 1")
        row = cur.fetchone()
        if row:
            print("\n--- Sample record (WE-007) ---")
            colnames = [desc[0] for desc in cur.description]
            for colname, val in zip(colnames, row):
                print(f"{colname}: {val}")
        else:
            print("\nNo record found for service_code 'WE-007'")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_schema()
