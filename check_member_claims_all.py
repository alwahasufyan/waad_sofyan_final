import psycopg2

def check_member_claims():
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        
        member_id = 83673
        print(f"--- Claims for Member {member_id} ---")
        cur.execute("SELECT id, primary_category_code, status, approved_amount FROM claims WHERE member_id = %s", (member_id,))
        for res in cur.fetchall():
            print(res)
            
        print("\n--- Claim Lines for Member 83673 ---")
        cur.execute("""
            SELECT cl.id, cl.claim_id, cl.service_code, cl.applied_category_id, cl.applied_category_name 
            FROM claim_lines cl 
            JOIN claims c ON cl.claim_id = c.id 
            WHERE c.member_id = %s
        """, (member_id,))
        for res in cur.fetchall():
            print(res)
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_member_claims()
