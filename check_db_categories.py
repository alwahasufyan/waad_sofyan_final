
import psycopg2
import os

conn = psycopg2.connect(
    dbname=os.getenv('POSTGRES_DB', 'tba_waad_system'),
    user=os.getenv('POSTGRES_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', '12345'),
    host='localhost'
)
cur = conn.cursor()
cur.execute("SELECT id, code, name, name_ar FROM medical_categories WHERE code LIKE '%PHYSIO%';")
rows = cur.fetchall()
for row in rows:
    print(row)
cur.close()
conn.close()
