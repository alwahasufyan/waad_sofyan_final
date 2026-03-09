import pandas as pd
import re
import sys

# Ensure UTF-8 output for Arabic text
sys.stdout.reconfigure(encoding='utf-8')

source_file = r"d:\tba_waad_system-main\tba_waad_system-main\قائمة اسعار خدمات دار الشفاء مصنفة.xlsx"
output_file = r"d:\tba_waad_system-main\tba_waad_system-main\Dar_Shifa_Import_Ready.xlsx"

try:
    df_raw = pd.read_excel(source_file, header=None)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

# Classification logic using ROOT and SUB codes
CAT_MAPPING = [
    # (Keywords, Root Code, Sub Code)
    (['أسنان وقائي', 'خلع', 'حشو'], 'ROOT-DENT', 'SUB-DENT-REG'),
    (['أسنان تجميلي', 'تقويم', 'زراعة', 'تركيبات'], 'ROOT-DENT', 'SUB-DENT-COS'),
    (['عيون', 'نظار', 'رمد', 'بصريات'], 'ROOT-VIS', 'SUB-VISION'),
    (['ولادة', 'قيصرية', 'حمل', 'توليد'], 'ROOT-MAT', 'SUB-MATERNITY'),
    (['طوارئ', 'إسعاف'], 'ROOT-EMER', 'SUB-EMERGENCY'),
    (['عمليات', 'عملية', 'جراحة', 'تخدير'], 'ROOT-IP', 'SUB-SURGERY'),
    (['إيواء', 'إقامة', 'عناية', 'غرفة', 'اقامة'], 'ROOT-IP', 'SUB-STAY'),
    (['تحاليل', 'تحليل', 'فحص دم', 'مختبر', 'بول', 'مخبرية'], 'ROOT-OP', 'SUB-LAB'),
    (['اشعة', 'أشعة', 'رنين', 'مقطعية', 'إيكو', 'صور'], 'ROOT-OP', 'SUB-RAD'),
    (['عيادات خارجية', 'كشف', 'استشارة', 'مراجعة', 'عيادة'], 'ROOT-OP', 'SUB-CONSULT'),
    (['علاج طبيعي', 'تمارين'], 'ROOT-PHYSIO', 'SUB-PHYSIO'),
    (['أورام', 'كيماوي'], 'ROOT-CHR', 'SUB-ONCOLOGY'),
    (['كلى', 'غسيل'], 'ROOT-CHR', 'SUB-DIALYSIS'),
]

# Code counter for SV-0001 format
svc_counter = 1

def classify_detailed(name, specialty, raw_cat):
    text = f"{name} {specialty} {raw_cat}".lower()
    
    # 1. First try checking exact raw_cat if exists
    for keywords, root, sub in CAT_MAPPING:
        if raw_cat and any(k in str(raw_cat).lower() for k in keywords):
            return root, sub

    # 2. Then check name and specialty
    for keywords, root, sub in CAT_MAPPING:
        if any(k in text for k in keywords):
            return root, sub
            
    return 'ROOT-OTH', 'SUB-SUPPLIES' # Default

import_data = []

for idx, row in df_raw.iterrows():
    # Price: Index 2, Name: Index 3, Specialty: Index 4, RawCat: Index 5
    raw_name_cell = str(row[3]) if pd.notnull(row[3]) else ""
    if not raw_name_cell.strip() or any(h in raw_name_cell for h in ['اسم الخدمة', 'الكود', 'البيان', 'الخدمة']):
        continue
    
    try:
        p_val = str(row[2])
        # Extract digits and decimal point
        clean_p = "".join([c for c in p_val if c.isdigit() or c == '.'])
        price_val = float(clean_p)
    except:
        continue
        
    svc_name = raw_name_cell.strip()
    
    # Generate Sequential Code: SV-0001, SV-0002...
    current_svc_code = f"SV-{svc_counter:04d}"
    svc_counter += 1
        
    raw_specialty = str(row[4]) if pd.notnull(row[4]) else ""
    raw_cat = str(row[5]) if pd.notnull(row[5]) else ""
    
    root_code, sub_code = classify_detailed(svc_name, raw_specialty, raw_cat)
    
    import_data.append({
        'service_code / الكود': current_svc_code,
        'service_name / اسم الخدمة ★': svc_name,
        'main_category / التصنيف الرئيسي': root_code,
        'sub_category / البند (التصنيف الفرعي)': sub_code,
        'unit_price / السعر': price_val,
        'specialty / التخصص': raw_specialty,
        'notes / ملاحظات': "Dar Al Shifa Imported"
    })

df_output = pd.DataFrame(import_data)
try:
    df_output.to_excel(output_file, index=False)
    print(f"Created file: {output_file}")
    print(f"Processed {len(df_output)} services.")
    print(f"Code Sample: {df_output.head(5)['service_code / الكود'].tolist()}")
except Exception as e:
    print(f"Error saving: {e}")

