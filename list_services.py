
import psycopg2
import os

conn = psycopg2.connect(
    dbname='tba_waad_system',
    user='postgres',
    password='12345',
    host='localhost'
)
cur = conn.cursor()
cur.execute("SELECT id, code, name, category_id FROM medical_services LIMIT 50;")
rows = cur.fetchall()
for row in rows:
    print(row)
cur.close()
conn.close()
