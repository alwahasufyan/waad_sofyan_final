
import psycopg2
import os

conn = psycopg2.connect(
    dbname='tba_waad_system',
    user='postgres',
    password='12345',
    host='localhost'
)
cur = conn.cursor()
# Search for the service code "WE-007" or name containing "جلسة علاج طبيعي"
cur.execute("SELECT id, code, name, category_id FROM medical_services WHERE code LIKE '%WE-007%' OR name LIKE '%علاج طبيعي%';")
rows = cur.fetchall()
for row in rows:
    print(row)
cur.close()
conn.close()
