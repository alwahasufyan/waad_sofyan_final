import psycopg2
import os

"""
Fix: imported items are linked to ROOT (main) category only.
The getCategoryHierarchy function in frontend shows sub-category when
the linked category has a parentId, and parent becomes main.

Solution: Re-link items from ROOT code to their corresponding SUB code
based on the generate_shifa_import.py classification rules.
"""

conn = psycopg2.connect(
    dbname=os.getenv('POSTGRES_DB', 'tba_waad_system'),
    user=os.getenv('POSTGRES_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', '12345'),
    host='localhost'
)
cur = conn.cursor()

# Build code->id map
cur.execute("SELECT id, code, name_ar, parent_id FROM medical_categories")
db_cats = {row[1]: {'id': row[0], 'name_ar': row[2], 'parent_id': row[3]} for row in cur.fetchall()}

# Mapping: ROOT code -> best default SUB code for items that only have the ROOT
# This defines which SUB to use when a service belongs to a ROOT
ROOT_TO_DEFAULT_SUB = {
    'ROOT-OP':     'SUB-CONSULT',    # خارج المستشفى -> كشوفات واستشارات
    'ROOT-IP':     'SUB-STAY',       # داخل المستشفى -> إقامة 
    'ROOT-DENT':   'SUB-DENT-REG',   # أسنان -> وقائي
    'ROOT-VIS':    'SUB-VISION',     # عيون -> نظارات
    'ROOT-MAT':    'SUB-MATERNITY',  # أمومة -> حمل وولادة
    'ROOT-CHR':    'SUB-DIALYSIS',   # مزمنة -> غسيل كلى (default)
    'ROOT-EMER':   'SUB-EMERGENCY',  # طوارئ -> حالات طارئة
    'ROOT-PHYSIO': 'SUB-PHYSIO',     # علاج طبيعي -> علاج طبيعي (sub)
    'ROOT-OTH':    'SUB-SUPPLIES',   # أخرى -> مستلزمات
}

# More precise mapping based on keywords in service_name
KEYWORD_TO_SUB = [
    (['تحليل', 'أنزيم', 'كريات', 'بكتيري', 'بول', 'دم', 'فيروس', 'هرمون', 'كيمياء', 'عزل', 'صورة دم', 'گلوكوز'], 'SUB-LAB'),
    (['أشعة', 'رنين', 'مقطعية', 'إيكو', 'سونار', 'ملون', 'تلفزيون', 'اشعة', 'راسوند'], 'SUB-RAD'),
    (['كشف', 'استشارة', 'مراجعة', 'عيادة', 'زيارة'], 'SUB-CONSULT'),
    (['دواء', 'حبة', 'شراب', 'حقنة', 'إبرة', 'إبر', 'حقن'], 'SUB-PHARMA'),
    (['عملية', 'جراحة', 'تخدير', 'قطب', 'استئصال', 'إزالة', 'فتح', 'ربط', 'بتر', 'أوتار', 'فك'], 'SUB-SURGERY'),
    (['إقامة', 'غرفة', 'راحة', 'استراح', 'رعاية مركزة', 'طب رياضي'], 'SUB-STAY'),
    (['ICU', 'عناية مركزة', 'العناية الفائقة'], 'SUB-ICU'),
    (['علاج طبيعي', 'جلسة', 'تمرين', 'إعادة تأهيل'], 'SUB-PHYSIO'),
    (['أسنان', 'ضرس', 'لثة', 'حشو', 'خلع', 'طراز'], 'SUB-DENT-REG'),
    (['تركيبات أسنان', 'جسر', 'طاج', 'تقويم', 'تبييض أسنان', 'زراعة'], 'SUB-DENT-COS'),
    (['نظارة', 'عدسة', 'بصريات', 'رمد'], 'SUB-VISION'),
    (['ولادة', 'حمل', 'قيصرية', 'رعاية الأم'], 'SUB-MATERNITY'),
    (['إسعاف'], 'SUB-AMBULANCE'),
    (['طوارئ', 'إنعاش', 'حالة حرجة'], 'SUB-EMERGENCY'),
    (['كلى', 'غسيل'], 'SUB-DIALYSIS'),
    (['أورام', 'كيماوي', 'علاج إشعاعي'], 'SUB-ONCOLOGY'),
    (['مستلزمات', 'جبيرة', 'ضمادة', 'قسطرة', 'جهاز', 'أنبوب', 'كماشة', 'إبرة وخياطة'], 'SUB-SUPPLIES'),
]

def get_best_sub(service_name, root_code):
    if not service_name:
        return ROOT_TO_DEFAULT_SUB.get(root_code)
    
    name_lower = service_name.lower()
    for keywords, sub_code in KEYWORD_TO_SUB:
        if any(k in name_lower for k in keywords):
            sub_cat = db_cats.get(sub_code)
            if sub_cat:
                # Verify this sub belongs to the right root
                parent_id = sub_cat['parent_id']
                if parent_id:
                    parent = next((c for c in db_cats.values() if c['id'] == parent_id), None)
                    if parent:
                        return sub_code
                else:
                    return sub_code
    
    return ROOT_TO_DEFAULT_SUB.get(root_code)

# Get items linked to ROOT categories (parent_id IS NULL = root category)
cur.execute("""
    SELECT pcpi.id, pcpi.service_name, mc.code as current_code
    FROM provider_contract_pricing_items pcpi
    JOIN medical_categories mc ON mc.id = pcpi.medical_category_id
    WHERE pcpi.contract_id = 6
      AND mc.parent_id IS NULL  -- currently linked to a ROOT (main) category
""")
root_linked_items = cur.fetchall()
print(f"Items currently linked to ROOT (main) categories: {len(root_linked_items)}")

updated = 0
no_sub_found = 0

for item_id, svc_name, current_code in root_linked_items:
    best_sub_code = get_best_sub(svc_name, current_code)
    
    if best_sub_code and best_sub_code in db_cats:
        sub_cat = db_cats[best_sub_code]
        cur.execute("""
            UPDATE provider_contract_pricing_items
            SET medical_category_id = %s,
                category_name = %s
            WHERE id = %s
        """, (sub_cat['id'], sub_cat['name_ar'], item_id))
        updated += 1
    else:
        no_sub_found += 1

conn.commit()
print(f"✅ Updated to sub-categories: {updated}")
print(f"⚠️  No matching sub found: {no_sub_found}")

# Show sample
cur.execute("""
    SELECT 
        pcpi.service_name,
        sub_mc.code as sub_code,
        sub_mc.name_ar as sub_name,
        parent_mc.code as main_code,
        parent_mc.name_ar as main_name
    FROM provider_contract_pricing_items pcpi
    JOIN medical_categories sub_mc ON sub_mc.id = pcpi.medical_category_id
    LEFT JOIN medical_categories parent_mc ON parent_mc.id = sub_mc.parent_id
    WHERE pcpi.contract_id = 6
    LIMIT 8
""")
print("\n--- عينة النتيجة ---")
print(f"{'الخدمة':<35} {'البند الفرعي':<30} {'الرئيسي'}")
print("-" * 90)
for r in cur.fetchall():
    print(f"{str(r[0])[:35]:<35} {str(r[2] or '-'):<30} {str(r[4] or '-')}")

cur.close()
conn.close()
