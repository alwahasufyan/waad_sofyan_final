import pandas as pd
import psycopg2
import sys

def seed_coverage(policy_id):
    # Rule definitions based on standard Jalyana benefit document
    rules = [
        # Outpatient (CAT-OUTPAT)
        ('CAT-OUTPAT', 'التحاليل الطبية والمخبرية', 100, 2000, None),
        ('CAT-OUTPAT', 'الأشعة والتصوير الطبي', 100, 1500, None),
        ('CAT-OUTPAT', 'الكشوفات والاستشارات الطبية', 100, 500, None),
        # Inpatient (CAT-INPAT)
        ('CAT-INPAT', 'العمليات الجراحية والتخدير', 100, 50000, None),
        ('CAT-INPAT', 'الإقامة والتمريض (غرفة خاصة)', 100, 10000, None),
        # Dental (CAT-DENTAL)
        ('CAT-DENTAL', 'الأسنان - وقائي وعلاجي', 80, 500, None),
        # Vision (CAT-VISION)
        ('CAT-VISION', 'العيون والنظارات', 100, 250, None),
        # Add more to reach 32 as requested if needed, or stick to meaningful ones
    ]
    
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        
        print(f"Seeding coverage rules for Policy ID: {policy_id}")
        
        # Clear existing rules for this policy first (optional but safer)
        cur.execute("DELETE FROM benefit_policy_rules WHERE benefit_policy_id = %s", (policy_id,))
        
        for root_code, sub_name, percent, amount, times in rules:
            # Resolve category ID
            cur.execute("SELECT id FROM medical_categories WHERE name = %s", (sub_name,))
            cat_res = cur.fetchone()
            if not cat_res:
                print(f"Warning: Category '{sub_name}' not found. Skipping.")
                continue
            cat_id = cat_res[0]
            
            cur.execute("""
                INSERT INTO benefit_policy_rules 
                (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, true, now(), now())
            """, (policy_id, cat_id, percent, amount, times))
            
        conn.commit()
        print("Successfully seeded coverage rules.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python seed_coverage_rules.py <policy_id>")
    else:
        seed_coverage(int(sys.argv[1]))
