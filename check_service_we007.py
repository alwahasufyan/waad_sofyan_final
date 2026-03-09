
import psycopg2
import os

conn = psycopg2.connect(
    dbname=os.getenv('POSTGRES_DB', 'tba_waad_system'),
    user=os.getenv('POSTGRES_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', '12345'),
    host='localhost'
)
cur = conn.cursor()
cur.execute("SELECT id, code, name, category_id, status FROM medical_services WHERE code = 'WE-007';")
row = cur.fetchone()
print(f"Service WE-007: {row}")

# Also check pricing item for this service in contract 1 (assuming contract 1)
cur.execute("SELECT id, contract_id, medical_service_id, price FROM provider_contract_pricing_items WHERE medical_service_id = %s;", (row[0] if row else None,))
pricing = cur.fetchall()
print(f"Pricing in contracts: {pricing}")

cur.close()
conn.close()
