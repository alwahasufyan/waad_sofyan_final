import psycopg2
import sys

def clear_contract(contract_id):
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        
        print(f"Clearing services for Contract ID: {contract_id}...")
        cur.execute("DELETE FROM provider_contract_pricing_items WHERE contract_id = %s", (contract_id,))
        
        count = cur.rowcount
        conn.commit()
        print(f"Successfully deleted {count} services from contract.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python clear_provider_contract.py <contract_id>")
    else:
        clear_contract(int(sys.argv[1]))
