import psycopg2

def check_claim_14():
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        
        print("--- Claim 14 ---")
        cur.execute("SELECT id, status, member_id, requested_amount, approved_amount FROM claims WHERE id = 14")
        claim = cur.fetchone()
        if claim:
            print(f"ID={claim[0]}, Status={claim[1]}, MemberID={claim[2]}, Requested={claim[3]}, Approved={claim[4]}")
            
            print("\n--- Claim 14 Lines ---")
            cur.execute("SELECT id, service_code, service_name, applied_category_id, approved_unit_price, approved_quantity, total_price, status FROM claim_lines WHERE claim_id = 14")
            for line in cur.fetchall():
                print(line)
        else:
            print("Claim 14 not found.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_claim_14()
