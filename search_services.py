import psycopg2
import sys

def search_services():
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        
        # Search for any service code containing 'WE'
        print("Searching for service_code LIKE '%WE%' in provider_contract_pricing_items...")
        cur.execute("SELECT id, service_code, service_name, medical_service_id, medical_category_id FROM provider_contract_pricing_items WHERE service_code LIKE '%WE%' LIMIT 10")
        rows = cur.fetchall()
        for row in rows:
            print(row)
            
        # Search for any service name containing 'physio'
        print("\nSearching for service_name LIKE '%physio%' in provider_contract_pricing_items...")
        cur.execute("SELECT id, service_code, service_name, medical_service_id, medical_category_id FROM provider_contract_pricing_items WHERE LOWER(service_name) LIKE '%physio%' LIMIT 10")
        rows = cur.fetchall()
        for row in rows:
            print(row)

        # Check medical_services table too
        print("\nSearching for service_code LIKE '%WE%' in medical_services...")
        cur.execute("SELECT id, code, name FROM medical_services WHERE code LIKE '%WE%' LIMIT 10")
        rows = cur.fetchall()
        for row in rows:
            print(row)
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    search_services()
