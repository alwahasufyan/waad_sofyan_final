import psycopg2
import os

"""
This script fixes provider_contract_pricing_items that were imported with
a raw category code string (e.g. 'ROOT-OP') instead of a proper medical_category_id FK.

It maps code strings -> actual medical_category id and updates the rows.
"""

conn = psycopg2.connect(
    dbname=os.getenv('POSTGRES_DB', 'tba_waad_system'),
    user=os.getenv('POSTGRES_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', '12345'),
    host='localhost'
)
cur = conn.cursor()

print("Building category code -> id map from DB...")
cur.execute("SELECT id, code, name_ar FROM medical_categories")
db_cats = cur.fetchall()
code_to_id = {row[1]: row[0] for row in db_cats}
code_to_name = {row[1]: row[2] for row in db_cats}

print(f"Found {len(code_to_id)} categories in DB:")
for code, cid in code_to_id.items():
    print(f"  {code} -> id={cid}, name={code_to_name.get(code)}")

print("\nFetching items without medical_category_id that have raw code in category_name...")
cur.execute("""
    SELECT id, category_name 
    FROM provider_contract_pricing_items
    WHERE medical_category_id IS NULL 
      AND category_name IS NOT NULL
      AND contract_id = 6
""")
items = cur.fetchall()
print(f"Found {len(items)} items to fix.")

updated = 0
skipped = 0
for item_id, cat_name in items:
    # cat_name might be 'ROOT-OP', 'ROOT-IP', 'SUB-LAB', etc.
    cat_id = code_to_id.get(cat_name)
    cat_display_name = code_to_name.get(cat_name)

    if cat_id:
        cur.execute("""
            UPDATE provider_contract_pricing_items
            SET medical_category_id = %s,
                category_name = %s
            WHERE id = %s
        """, (cat_id, cat_display_name, item_id))
        updated += 1
    else:
        skipped += 1

conn.commit()
print(f"\n✅ Updated: {updated} items")
print(f"⚠️  Skipped (no matching code): {skipped} items")

# Verify
cur.execute("""
    SELECT pcpi.id, pcpi.service_name, mc.name_ar, mc.code
    FROM provider_contract_pricing_items pcpi
    JOIN medical_categories mc ON mc.id = pcpi.medical_category_id
    WHERE pcpi.contract_id = 6
    LIMIT 5
""")
print("\n--- Sample after fix ---")
for r in cur.fetchall():
    print(f"  id={r[0]} | {r[1][:30] if r[1] else '-':<30} | cat={r[2]} ({r[3]})")

cur.close()
conn.close()
