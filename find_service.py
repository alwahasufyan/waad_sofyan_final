
import psycopg2
import os

conn = psycopg2.connect(
    dbname=os.getenv('POSTGRES_DB', 'tba_waad_system'),
    user=os.getenv('POSTGRES_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', '12345'),
    host='localhost'
)
cur = conn.cursor()
cur.execute("SELECT id, code, name, category_id, status FROM medical_services WHERE name LIKE '%علاج طبيعي%' OR code LIKE '%WE-007%';")
rows = cur.fetchall()
for row in rows:
    print(f"Service: {row}")

# Check column names for provider_contract_pricing_items
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'provider_contract_pricing_items';")
cols = cur.fetchall()
print(f"Columns in provider_contract_pricing_items: {[c[0] for c in cols]}")

cur.close()
conn.close()
