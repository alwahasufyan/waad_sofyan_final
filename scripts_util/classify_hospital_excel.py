"""
=============================================================
 classify_hospital_excel.py
 
 هدفه: تحويل ملف أسعار أي مشفى إلى ملف Excel جاهز للاستيراد
 
 الاستخدام:
   python classify_hospital_excel.py "<مسار ملف المشفى>" "<اسم الملف الناتج>"
 
 مثال:
   python classify_hospital_excel.py "منارة المستقبل.xlsx" "Manara_Import_Ready.xlsx"
   
 هيكل ملف الإدخال المتوقع (أعمدة):
   - العمود 2 (index 2): السعر
   - العمود 3 (index 3): اسم الخدمة
   - العمود 4 (index 4): التخصص (اختياري)
   - العمود 5 (index 5): التصنيف الخام (اختياري)
=============================================================
"""

import pandas as pd
import sys
import os
import re

# ─────────────────────────────────────────────────────────────
# 1. قراءة المعاملات
# ─────────────────────────────────────────────────────────────

if len(sys.argv) < 3:
    print("الاستخدام: python classify_hospital_excel.py <ملف_المصدر> <ملف_الناتج>")
    print("مثال:     python classify_hospital_excel.py \"مشفى.xlsx\" \"Import_Ready.xlsx\"")
    sys.exit(1)

source_file = sys.argv[1]
output_file = sys.argv[2]

if not os.path.exists(source_file):
    print(f"❌ الملف غير موجود: {source_file}")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────
# 2. جدول التصنيف (كلمات مفتاحية -> كود تصنيف فرعي -> كود تصنيف رئيسي)
#
#  الأكواد تتطابق مع جدول medical_categories في قاعدة البيانات
#  الأولوية: أول تطابق يفوز
# ─────────────────────────────────────────────────────────────

CLASSIFICATION = [
    # كلمات مفتاحية                          تصنيف فرعي       تصنيف رئيسي
    (['تمريض منزلي', 'رعاية منزلية'],        'SUB-INPAT-HOME-NURSING', 'CAT-INPAT'),
    (['مضاعفات حمل', 'نزف حمل', 'تسمم حمل'], 'SUB-INPAT-PREG-COMP',    'CAT-INPAT'),
    (['ولادة', 'قيصرية', 'توليد', 'نفاس'],   'SUB-INPAT-DELIVERY',     'CAT-INPAT'),
    (['إصابة عمل', 'إصابات عمل', 'حادث عمل'],'SUB-INPAT-WORK-INJ',    'CAT-INPAT'),
    (['نفسي', 'طب نفسي', 'جلسة نفسية'],      'SUB-INPAT-PSYCH',        'CAT-INPAT'),
    (['رنين', 'mri', 'ct', 'مقطعية'],        'SUB-OUTPAT-MRI',         'CAT-OUTPAT'),
    (['علاج طبيعي', 'جلسة علاج', 'تأهيل'],   'SUB-OUTPAT-PHYSIO',      'CAT-OUTPAT'),
    (['تحاليل', 'تحليل', 'مختبر', 'بول',
      'دم', 'فيروس', 'هرمون', 'بكتيري',
      'أنزيم', 'كريات', 'مزرعة', 'مسحة'],    'SUB-OUTPAT-GENERAL',     'CAT-OUTPAT'),
    (['اشعة', 'أشعة', 'رنين', 'مقطعية',
      'إيكو', 'سونار', 'صوتية', 'تلفزيون',
      'صورة', 'سينا'],                        'SUB-OUTPAT-RAD',         'CAT-OUTPAT'),
    (['عيون', 'نظار', 'رمد', 'بصريات',
      'قرنية', 'شبكية', 'عدسة'],              'SUB-OUTPAT-GLASSES',     'CAT-OUTPAT'),
    (['أسنان وقائي', 'خلع', 'حشو', 'تنظيف',
      'لثة', 'جذر'],                          'SUB-OUTPAT-DENTAL-ROUTINE', 'CAT-OUTPAT'),
    (['تركيبات', 'أسنان تجميلي', 'تقويم',
      'زراعة', 'جسر', 'طاج', 'تبييض'],       'SUB-OUTPAT-DENTAL-COSMETIC', 'CAT-OUTPAT'),
    (['عملية', 'جراحة', 'تخدير', 'استئصال',
      'قطب', 'ربط', 'فتح', 'بتر'],           'SUB-INPAT-GENERAL',      'CAT-INPAT'),
    (['عناية مركزة', 'ICU', 'CCU',
      'العناية الفائقة'],                      'SUB-INPAT-GENERAL',      'CAT-INPAT'),
    (['إقامة', 'إيواء', 'غرفة', 'سرير',
      'رعاية', 'تمريض', 'مبيت'],             'SUB-INPAT-GENERAL',      'CAT-INPAT'),
    (['دواء', 'حبة', 'شراب', 'علبة',
      'أمبول', 'كبسول', 'محلول وريدي'],      'SUB-OUTPAT-DRUGS',       'CAT-OUTPAT'),
    (['كشف', 'استشارة', 'مراجعة',
      'عيادة', 'زيارة'],                      'SUB-OUTPAT-GENERAL',     'CAT-OUTPAT'),
    (['جبيرة', 'قسطرة', 'أنبوب', 'رباط',
      'ضمادة', 'مستلزمات', 'جهاز'],          'SUB-OUTPAT-DEVICES',     'CAT-OUTPAT'),
]

DEFAULT_SUB  = 'SUB-OUTPAT-GENERAL'
DEFAULT_ROOT = 'CAT-OUTPAT'

# ─────────────────────────────────────────────────────────────
# 3. دالة التصنيف
# ─────────────────────────────────────────────────────────────

def classify(name: str, specialty: str = '', raw_cat: str = '') -> tuple:
    """Returns (main_cat_code, sub_cat_code)"""
    text = f"{name} {specialty} {raw_cat}".lower()

    # أولاً: ابحث في التصنيف الخام المقدم (raw_cat) إن وجد
    if raw_cat and raw_cat.strip():
        for keywords, sub, root in CLASSIFICATION:
            if any(k in str(raw_cat).lower() for k in keywords):
                return root, sub

    # ثانياً: ابحث في النص الكامل
    for keywords, sub, root in CLASSIFICATION:
        if any(k in text for k in keywords):
            return root, sub

    return DEFAULT_ROOT, DEFAULT_SUB

# ─────────────────────────────────────────────────────────────
# 4. قراءة الملف
# ─────────────────────────────────────────────────────────────

print(f"📂 قراءة الملف: {source_file}")
try:
    df_raw = pd.read_excel(source_file, header=None)
except Exception as e:
    print(f"❌ خطأ في قراءة الملف: {e}")
    sys.exit(1)

print(f"   عدد الصفوف الخام: {len(df_raw)}")

# ─────────────────────────────────────────────────────────────
# 5. معالجة الصفوف
# ─────────────────────────────────────────────────────────────

import_data = []
svc_counter = 1
skipped = 0

for idx, row in df_raw.iterrows():
    # اسم الخدمة عمود 3
    raw_name = str(row[3]) if pd.notnull(row.get(3, None) if hasattr(row, 'get') else row[3] if len(row) > 3 else None) else ""
    
    # تجاهل صفوف الرأس أو الفارغة
    if not raw_name.strip():
        skipped += 1
        continue
    if any(h in raw_name for h in ['اسم الخدمة', 'الكود', 'البيان', 'الخدمة', 'خدمة', 'البند']):
        skipped += 1
        continue

    # السعر عمود 2
    try:
        raw_price = str(row[2]) if len(row) > 2 and pd.notnull(row[2]) else ""
        clean_price = "".join([c for c in raw_price if c.isdigit() or c == '.'])
        price_val = float(clean_price) if clean_price else 0.0
    except Exception:
        skipped += 1
        continue

    if price_val <= 0:
        skipped += 1
        continue

    svc_name    = raw_name.strip()
    specialty   = str(row[4]).strip() if len(row) > 4 and pd.notnull(row[4]) else ""
    raw_cat     = str(row[5]).strip() if len(row) > 5 and pd.notnull(row[5]) else ""

    root_code, sub_code = classify(svc_name, specialty, raw_cat)

    import_data.append({
        'service_code / الكود':                   f"SV-{svc_counter:04d}",
        'service_name / اسم الخدمة ★':            svc_name,
        'main_category / التصنيف الرئيسي':        root_code,
        'sub_category / البند (التصنيف الفرعي)':  sub_code,
        'unit_price / السعر':                      price_val,
        'specialty / التخصص':                     specialty,
        'notes / ملاحظات':                         '',
    })
    svc_counter += 1

# ─────────────────────────────────────────────────────────────
# 6. حفظ الملف
# ─────────────────────────────────────────────────────────────

df_out = pd.DataFrame(import_data)
try:
    df_out.to_excel(output_file, index=False)
    print(f"\n✅ تم إنشاء الملف: {output_file}")
    print(f"   ✔ عدد الخدمات الجاهزة: {len(df_out)}")
    print(f"   ✗ صفوف تم تجاهلها:    {skipped}")
    print(f"\n📊 توزيع التصنيفات:")
    print(df_out.groupby('main_category / التصنيف الرئيسي')['service_code / الكود'].count().to_string())
except Exception as e:
    print(f"❌ خطأ في حفظ الملف: {e}")
