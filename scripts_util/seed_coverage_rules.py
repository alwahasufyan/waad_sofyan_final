"""
=============================================================
 seed_coverage_rules.py

 هدفه: إنشاء أو تحديث قواعد التغطية (23 قاعدة) لوثيقة منافع
       بناءً على هيكل التصنيفات الطبية الموجودة في النظام

 الاستخدام:
   python seed_coverage_rules.py <policy_id> [annual_limit] [default_coverage_pct]

 أمثلة:
   python seed_coverage_rules.py 1
   python seed_coverage_rules.py 2 50000 80
   python seed_coverage_rules.py 3 75000 75
=============================================================
"""

import psycopg2
import os
import sys
from datetime import datetime

# ─────────────────────────────────────────────────────────────
# 1. المعاملات
# ─────────────────────────────────────────────────────────────

if len(sys.argv) < 2:
    print("الاستخدام: python seed_coverage_rules.py <policy_id> [annual_limit] [default_pct]")
    sys.exit(1)

POLICY_ID       = int(sys.argv[1])
ANNUAL_LIMIT    = float(sys.argv[2]) if len(sys.argv) > 2 else 60000.0
DEFAULT_PCT     = int(sys.argv[3])   if len(sys.argv) > 3 else 75

# ─────────────────────────────────────────────────────────────
# 2. تعريف القواعد (23 قاعدة مطابقة لوثيقة المنافع)
#
#  الحقول: (category_code, coverage_pct, amount_limit, times_limit, notes, requires_pre_approval)
# ─────────────────────────────────────────────────────────────

COVERAGE_RULES = [
    ('CAT-OUTPAT', DEFAULT_PCT, 3000.0, None, 'سقف العيادات الخارجية العام ويشمل الكشوفات والتحاليل الأساسية', False),
    ('CAT-INPAT', DEFAULT_PCT, None, None, 'الإيواء العام داخل المستشفى', True),
    ('SUB-INPAT-GENERAL', DEFAULT_PCT, None, None, 'الإيواء العام والخدمات التمريضية الأساسية', True),
    ('SUB-INPAT-HOME-NURSING', DEFAULT_PCT, 1500.0, None, 'التمريض المنزلي', True),
    ('SUB-INPAT-PHYSIO', DEFAULT_PCT, 10000.0, 20, 'العلاج الطبيعي أثناء الإيواء', False),
    ('SUB-INPAT-WORK-INJ', DEFAULT_PCT, 25000.0, None, 'إصابات العمل', False),
    ('SUB-INPAT-PSYCH', DEFAULT_PCT, 3000.0, None, 'الطب النفسي والجلسات', False),
    ('SUB-INPAT-DELIVERY', DEFAULT_PCT, 4000.0, None, 'الولادة الطبيعية والقيصرية', True),
    ('SUB-INPAT-PREG-COMP', DEFAULT_PCT, 4000.0, None, 'مضاعفات الحمل', True),
    ('SUB-OUTPAT-GENERAL', DEFAULT_PCT, None, None, 'العيادات الخارجية العامة', False),
    ('SUB-OUTPAT-RAD', DEFAULT_PCT, 1500.0, None, 'الأشعة', False),
    ('SUB-OUTPAT-MRI', DEFAULT_PCT, None, None, 'الرنين المغناطيسي والأشعة المتقدمة', False),
    ('SUB-OUTPAT-DRUGS', DEFAULT_PCT, 15000.0, None, 'العلاجات والأدوية', False),
    ('SUB-OUTPAT-DEVICES', DEFAULT_PCT, 1500.0, None, 'الأجهزة والمعدات الطبية', False),
    ('SUB-OUTPAT-PHYSIO', DEFAULT_PCT, 10000.0, 20, 'العلاج الطبيعي في العيادات الخارجية', False),
    ('SUB-OUTPAT-DENTAL-ROUTINE', DEFAULT_PCT, None, None, 'الأسنان الروتينية', False),
    ('SUB-OUTPAT-DENTAL-COSMETIC', 50, None, None, 'الأسنان التجميلية والتركيبات', False),
    ('SUB-OUTPAT-GLASSES', DEFAULT_PCT, 500.0, 1, 'النظارة الطبية مرة واحدة سنوياً', False),
]

# ─────────────────────────────────────────────────────────────
# 3. الاتصال بقاعدة البيانات
# ─────────────────────────────────────────────────────────────

conn = psycopg2.connect(
    dbname=os.getenv('POSTGRES_DB', 'tba_waad_system'),
    user=os.getenv('POSTGRES_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', '12345'),
    host='localhost'
)
cur = conn.cursor()

# ─────────────────────────────────────────────────────────────
# 4. التحقق من وجود الوثيقة
# ─────────────────────────────────────────────────────────────

cur.execute("SELECT id, name, status FROM benefit_policies WHERE id = %s", (POLICY_ID,))
policy = cur.fetchone()
if not policy:
    print(f"❌ لا توجد وثيقة منافع بالرقم {POLICY_ID}")
    cur.close()
    conn.close()
    sys.exit(1)

print(f"✔ الوثيقة: [{policy[0]}] {policy[1]} - الحالة: {policy[2]}")

# ─────────────────────────────────────────────────────────────
# 5. تحديث إعدادات الوثيقة
# ─────────────────────────────────────────────────────────────

cur.execute("""
    UPDATE benefit_policies 
    SET annual_limit = %s, default_coverage_percent = %s, status = 'ACTIVE' 
    WHERE id = %s
""", (ANNUAL_LIMIT, DEFAULT_PCT, POLICY_ID))
print(f"✔ تم تحديث الوثيقة: الحد السنوي={ANNUAL_LIMIT:,.0f} د.ل / نسبة التغطية={DEFAULT_PCT}%")

# ─────────────────────────────────────────────────────────────
# 6. حذف القواعد القديمة وإعادة البناء
# ─────────────────────────────────────────────────────────────

cur.execute("DELETE FROM benefit_policy_rules WHERE benefit_policy_id = %s", (POLICY_ID,))
print(f"✔ تم حذف القواعد القديمة")

# بناء خريطة الأكواد -> id من قاعدة البيانات
cur.execute("SELECT id, code FROM medical_categories")
code_map = {row[1]: row[0] for row in cur.fetchall()}

inserted   = 0
not_found  = []

for rule in COVERAGE_RULES:
    cat_code, cov_pct, amount_limit, times_limit, notes, pre_approval = rule
    cat_id = code_map.get(cat_code)

    if not cat_id:
        not_found.append(cat_code)
        continue

    cur.execute("""
        INSERT INTO benefit_policy_rules (
            benefit_policy_id, medical_category_id, coverage_percent,
            amount_limit, times_limit, notes, active,
            created_at, requires_pre_approval
        ) VALUES (%s, %s, %s, %s, %s, %s, true, %s, %s)
    """, (POLICY_ID, cat_id, cov_pct, amount_limit, times_limit,
          notes, datetime.now(), pre_approval))
    inserted += 1

conn.commit()

print(f"\n✅ تم إدراج {inserted} قاعدة تغطية للوثيقة رقم {POLICY_ID}")
if not_found:
    print(f"⚠️  أكواد تصنيف غير موجودة في قاعدة البيانات: {not_found}")
    print("   يرجى تشغيل final_category_setup.py أولاً لتأسيس التصنيفات")

cur.close()
conn.close()
