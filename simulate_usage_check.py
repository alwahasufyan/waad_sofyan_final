import psycopg2

def check_usage():
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        
        # This simulates the backend query in BenefitPolicyRuleService
        # category_id = 120, member_id = 83673
        cur.execute("""
            SELECT SUM(cl.quantity), SUM(cl.approved_unit_price * cl.approved_quantity) 
            FROM claim_lines cl 
            JOIN claims c ON cl.claim_id = c.id 
            WHERE c.member_id = 83673 
            AND cl.applied_category_id = 120 
            AND c.status NOT IN ('REJECTED', 'DRAFT')
            AND EXTRACT(YEAR FROM c.service_date) = 2026
        """)
        res = cur.fetchone()
        print(f"Usage for Cat 120: Count={res[0]}, Amount={res[1]}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_usage()
