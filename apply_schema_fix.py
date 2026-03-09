import psycopg2

def apply_fix():
    try:
        conn = psycopg2.connect(dbname='tba_waad_system', user='postgres', password='12345', host='localhost')
        cur = conn.cursor()
        print("Adding missing columns to claim_lines...")
        cur.execute("""
            ALTER TABLE claim_lines 
            ADD COLUMN IF NOT EXISTS benefit_limit NUMERIC(15,2), 
            ADD COLUMN IF NOT EXISTS used_amount_snapshot NUMERIC(15,2), 
            ADD COLUMN IF NOT EXISTS remaining_amount_snapshot NUMERIC(15,2)
        """)
        
        # Also let's check if there are any other missing columns in claims table just in case
        print("Checking claims table version column...")
        cur.execute("ALTER TABLE claims ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0")
        
        conn.commit()
        print("Successfully applied schema updates.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    apply_fix()
