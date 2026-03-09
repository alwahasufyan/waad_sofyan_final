import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def check_parents():
    conn = psycopg2.connect(
        dbname=os.getenv('POSTGRES_DB', 'tba_waad_system'),
        user=os.getenv('POSTGRES_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', '12345'),
        host='localhost'
    )
    cur = conn.cursor()
    
    # Use full schema names if needed, but here simple table name should work.
    cur.execute("""
        SELECT c.id, c.code, c.name, p.id as p_id, p.code as p_code, p.name as p_name
        FROM medical_categories c
        LEFT JOIN medical_categories p ON c.parent_id = p.id
        WHERE c.code LIKE 'SUB-%'
        ORDER BY c.id;
    """)
    rows = cur.fetchall()
    
    print(f"{'ID':<4} | {'Code':<15} | {'Name':<30} | {'Parent Code':<15} | {'Parent Name'}")
    print("-" * 100)
    for row in rows:
        print(f"{row[0]:<4} | {row[1]:<15} | {row[2]:<30} | {str(row[4]):<15} | {row[5] if row[5] else ''}")
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    check_parents()
