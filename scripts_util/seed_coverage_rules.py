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
    # ══ تصنيفات رئيسية ══
    ('ROOT-OP',    DEFAULT_PCT, 3000.0,   None, 'سقف الكشوفات والتحاليل والأشعة خارج المستشفى',          False),
    ('ROOT-IP',    DEFAULT_PCT, None,     None, 'الإيواء والعلاج داخل المستشفى',                          True),
    ('ROOT-DENT',  DEFAULT_PCT, 2000.0,   None, 'خدمات الأسنان العامة',                                   False),
    ('ROOT-VIS',   DEFAULT_PCT, 500.0,    None, 'العيون والنظارات',                                        False),
    ('ROOT-MAT',   DEFAULT_PCT, 4000.0,   None, 'الأمومة والولادة',                                        True),
    ('ROOT-CHR',   DEFAULT_PCT, None,     None, 'الأمراض المزمنة',                                         False),
    ('ROOT-EMER',  DEFAULT_PCT, None,     None, 'الطوارئ والإسعاف',                                        False),
    ('ROOT-PHYSIO',DEFAULT_PCT, 2000.0,   20,   'العلاج الطبيعي (بحد أقصى 20 جلسة في السنة)',             False),
    ('ROOT-OTH',   DEFAULT_PCT, 1000.0,   None, 'منافع أخرى ومستلزمات',                                   False),
    # ══ تصنيفات فرعية ══
    ('SUB-CONSULT', DEFAULT_PCT, 3000.0,  None, 'الكشوفات والاستشارات الطبية - خارج المستشفى',            False),
    ('SUB-LAB',     DEFAULT_PCT, 3000.0,  None, 'التحاليل المخبرية والمختبرات',                           False),
    ('SUB-RAD',     DEFAULT_PCT, None,    None, 'الأشعة والتصوير الطبي',                                   False),
    ('SUB-PHARMA',  DEFAULT_PCT, 15000.0, None, 'الأدوية والصيدلية',                                       False),
    ('SUB-STAY',    DEFAULT_PCT, 1500.0,  None, 'الإقامة والتمريض',                                        True),
    ('SUB-SURGERY', DEFAULT_PCT, None,    None, 'العمليات الجراحية والتخدير',                               True),
    ('SUB-ICU',     DEFAULT_PCT, None,    None, 'العناية الفائقة ICU/CCU',                                  True),
    ('SUB-PHYSIO',  DEFAULT_PCT, 2000.0,  20,   'العلاج الطبيعي (بحد أقصى 20 جلسة)',                      False),
    ('SUB-DENT-REG',DEFAULT_PCT, None,    None, 'الأسنان - وقائي وعلاجي (خلع/حشو/تنظيف)',                 False),
    ('SUB-DENT-COS',50,          None,    None, 'الأسنان - تجميلي وتركيبات (50% تغطية)',                  False),
    ('SUB-VISION',  DEFAULT_PCT, 500.0,   1,    'النظارات الطبية (نظارة واحدة في السنة)',                  False),
    ('SUB-MATERNITY',DEFAULT_PCT, 4000.0, None, 'متابعة الحمل والولادة',                                   True),
    ('SUB-EMERGENCY',DEFAULT_PCT, None,   None, 'حالات الطوارئ',                                           False),
    ('SUB-AMBULANCE',DEFAULT_PCT, None,   None, 'الإسعاف المحلي',                                          False),
    ('SUB-SUPPLIES', DEFAULT_PCT, 1500.0, None, 'المستلزمات الطبية والأجهزة',                              False),
    ('SUB-PSYCH',    DEFAULT_PCT, 3000.0, None, 'الطب النفسي والجلسات',                                    False),
    ('SUB-DIALYSIS', DEFAULT_PCT, None,   None, 'غسيل الكلى',                                              False),
    ('SUB-ONCOLOGY', 100,         None,   None, 'علاج الأورام - تغطية كاملة 100%',                         True),
    ('SUB-WORK-INJ', DEFAULT_PCT, 25000.0,None, 'إصابات العمل',                                            False),
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
