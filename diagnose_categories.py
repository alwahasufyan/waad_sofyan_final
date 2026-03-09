import psycopg2
import os

conn = psycopg2.connect(
    dbname=os.getenv('POSTGRES_DB', 'tba_waad_system'),
    user=os.getenv('POSTGRES_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', '12345'),
    host='localhost'
)
cur = conn.cursor()

print("--- عينة من بيانات الخدمات في العقد 6 ---")
cur.execute("""
    SELECT 
        pcpi.id,
        pcpi.service_name,
        pcpi.category_name,
        pcpi.medical_category_id,
        mc.code as cat_code,
        mc.name_ar as cat_name_ar
    FROM provider_contract_pricing_items pcpi
    LEFT JOIN medical_categories mc ON mc.id = pcpi.medical_category_id
    WHERE pcpi.contract_id = 6
    LIMIT 10
""")
rows = cur.fetchall()
for r in rows:
    print(f"id={r[0]} | service={r[1][:30] if r[1] else '-':<30} | category_name={r[2]} | cat_id={r[3]} | cat_code={r[4]} | cat_ar={r[5]}")

print("\n--- عدد الخدمات بدون medical_category_id ---")
cur.execute("SELECT COUNT(*) FROM provider_contract_pricing_items WHERE contract_id=6 AND medical_category_id IS NULL")
print(f"بدون تصنيف مرتبط: {cur.fetchone()[0]}")

print("\n--- عدد الخدمات بـ category_name فقط ---")
cur.execute("SELECT COUNT(*) FROM provider_contract_pricing_items WHERE contract_id=6 AND medical_category_id IS NULL AND category_name IS NOT NULL")
print(f"لها category_name نصي فقط: {cur.fetchone()[0]}")

print("\n--- قيم category_name الموجودة (أول 10) ---")
cur.execute("SELECT DISTINCT category_name FROM provider_contract_pricing_items WHERE contract_id=6 AND category_name IS NOT NULL LIMIT 10")
for r in cur.fetchall():
    print(f"  '{r[0]}'")

cur.close()
conn.close()
