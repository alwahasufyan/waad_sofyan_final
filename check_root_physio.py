
import psycopg2
import os

conn = psycopg2.connect(
    dbname='tba_waad_system',
    user='postgres',
    password='12345',
    host='localhost'
)
cur = conn.cursor()
cur.execute("SELECT id, code, parent_id FROM medical_categories WHERE code = 'ROOT-PHYSIO';")
print(cur.fetchone())
cur.close()
conn.close()
