import psycopg2
import os

conn = psycopg2.connect(
    dbname=os.getenv('POSTGRES_DB', 'tba_waad_system'),
    user=os.getenv('POSTGRES_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', '12345'),
    host='localhost'
)
cur = conn.cursor()

cur.execute("""
    SELECT 
        pc.id as contract_id,
        pr.name as provider_name,
        COUNT(pcpi.id) as items_count
    FROM provider_contracts pc
    LEFT JOIN providers pr ON pr.id = pc.provider_id
    LEFT JOIN provider_contract_pricing_items pcpi ON pcpi.contract_id = pc.id
    GROUP BY pc.id, pr.name
    ORDER BY items_count DESC;
""")

rows = cur.fetchall()
print(f"{'ID':<6} {'اسم المزود':<40} {'عدد الخدمات'}")
print("-" * 60)
for row in rows:
    print(f"{row[0]:<6} {str(row[1]):<40} {row[2]}")

cur.close()
conn.close()
