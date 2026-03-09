
import psycopg2
import os

conn = psycopg2.connect(
    dbname='tba_waad_system',
    user='postgres',
    password='12345',
    host='localhost'
)
cur = conn.cursor()
cur.execute("SELECT id, service_code, service_name, medical_service_id, medical_category_id FROM provider_contract_pricing_items WHERE service_code LIKE '%WE-007%' OR service_name LIKE '%علاج طبيعي%';")
rows = cur.fetchall()
for row in rows:
    print(row)
cur.close()
conn.close()
