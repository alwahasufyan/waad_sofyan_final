
import pdfplumber
import psycopg2
import os
import sys
import re
from datetime import datetime

# ─────────────────────────────────────────────────────────────
# 1. إعدادات قاعدة البيانات والتصنيفات
# ─────────────────────────────────────────────────────────────

DB_CONFIG = {
    'dbname': os.getenv('POSTGRES_DB', 'tba_waad_system'),
    'user': os.getenv('POSTGRES_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', '12345'),
    'host': 'localhost'
}

# خريطة الكلمات المفتاحية للربط التلقائي بالتصنيفات العربية
CATEGORY_KEYWORDS = {
    'ROOT-OP': ['خارج المستشفى', 'العيادات الخارجيه', 'خارج المصحة', 'خارج المصطلح'],
    'ROOT-IP': ['داخل المستشفى', 'الإيواء والعمليات', 'داخل المصحة', 'إقامة'],
    'ROOT-DENT': ['الأسنان', 'اسنان'],
    'ROOT-VIS': ['العيون والنظارات', 'بصريات'],
    'ROOT-MAT': ['الأمومة والولادة', 'ولادة'],
    'ROOT-CHR': ['الأمراض المزمنة', 'مزمنة'],
    'ROOT-EMER': ['الطوارئ والإسعاف', 'طوارئ'],
    'ROOT-PHYSIO': ['العلاج الطبيعي', 'طبيعي'],
    'SUB-CONSULT': ['الكشوفات', 'استشارات'],
    'SUB-LAB': ['التحاليل', 'مختبرات', 'المخبرية'],
    'SUB-RAD': ['الأشعة', 'رنين', 'مقطعية'],
    'SUB-PHARMA': ['الأدوية', 'صيدلية'],
    'SUB-VISION': ['النظارات'],
    'SUB-MATERNITY': ['الحمل والولادة'],
    'SUB-SURGERY': ['العمليات الجراحية'],
}

def extract_numbers(text):
    """يستخرج الأرقام المالية والنسب المئوية من النص"""
    # البحث عن نسبة مئوية (مثلاً 75%)
    pct_match = re.search(r'(\d+)%', text)
    pct = int(pct_match.group(1)) if pct_match else 75
    
    # البحث عن مبالغ مالية (أرقام كبيرة فوق 100)
    amounts = re.findall(r'(\d{3,})\b', text.replace(',', ''))
    limit = float(amounts[0]) if amounts else None
    
    return pct, limit

def process_policy_pdf(pdf_path, policy_id):
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # جلب أكواد ومعرفات التصنيفات من القاعدة
    cur.execute("SELECT id, code, name_ar FROM medical_categories")
    cat_map = {row[1]: (row[0], row[2]) for row in cur.fetchall()}
    
    print(f"📄 جاري معالجة الملف: {pdf_path} للوثيقة رقم {policy_id}...")
    
    rules_found = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text: continue
            
            lines = text.split('\n')
            for line in lines:
                # محاولة مطابقة السطر مع التصنيفات
                for code, keywords in CATEGORY_KEYWORDS.items():
                    if any(kw in line for kw in keywords):
                        if code in cat_map:
                            pct, limit = extract_numbers(line)
                            rules_found.append({
                                'cat_id': cat_map[code][0],
                                'cat_name': cat_map[code][1],
                                'pct': pct,
                                'limit': limit,
                                'notes': line.strip()[:200]
                            })
                            print(f"✅ تم رصد قاعدة: {cat_map[code][1]} | تغطية {pct}% | سقف {limit or 'غير محدود'}")
                            break

    if not rules_found:
        print("⚠️ لم يتم العثور على قواعد واضحة، سأحاول استخراج الجداول...")
        # هنا يمكن إضافة منطق معالجة الجداول (page.extract_tables()) إذا فشل النص المباشر
    
    if rules_found:
        print(f"\n💾 جاري حفظ {len(rules_found)} قاعدة في قاعدة البيانات...")
        # تنظيف القواعد القديمة
        cur.execute("DELETE FROM benefit_policy_rules WHERE benefit_policy_id = %s", (policy_id,))
        
        for rule in rules_found:
            cur.execute("""
                INSERT INTO benefit_policy_rules 
                (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, notes, active, created_at, requires_pre_approval)
                VALUES (%s, %s, %s, %s, %s, true, %s, false)
            """, (policy_id, rule['cat_id'], rule['pct'], rule['limit'], rule['notes'], datetime.now()))
        
        conn.commit()
        print("✨ تم تحديث وثيقة المنافع بنجاح!")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("الاستخدام: python parse_policy_pdf.py <path_to_pdf> <policy_id>")
    else:
        process_policy_pdf(sys.argv[1], sys.argv[2])
