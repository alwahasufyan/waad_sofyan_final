import psycopg2

def fix_data():
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        
        # 1. Link pricing item SV-0006 to medical service WE-007 (id 3632)
        print("Linking SV-0006 to WE-007...")
        cur.execute("UPDATE provider_contract_pricing_items SET medical_service_id = 3632 WHERE service_code = 'SV-0006'")
        
        # 2. Update claim lines for member 83673
        # Category 120 is 'العلاج الطبيعي'
        print("Updating claim lines for member 83673...")
        cur.execute("""
            UPDATE claim_lines 
            SET applied_category_id = 120, applied_category_name = 'العلاج الطبيعي'
            WHERE id IN (6, 7, 8)
        """)
        
        # 3. Update claims for member 83673 to set context
        print("Updating claims for member 83673...")
        cur.execute("""
            UPDATE claims 
            SET primary_category_code = 'CAT-OUTPAT'
            WHERE id IN (10, 11, 14)
        """)
        
        conn.commit()
        print("Data fix applied successfully.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_data()
