import psycopg2

def check_pricing_items():
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        
        print("--- Pricing Items Check ---")
        cur.execute("SELECT id, service_code, service_name, medical_service_id FROM provider_contract_pricing_items WHERE service_code = 'SV-0006'")
        for res in cur.fetchall():
            print(res)
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_pricing_items()
