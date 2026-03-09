import psycopg2
import os

def delete_contract_items(contract_id):
    conn = psycopg2.connect(
        dbname=os.getenv('POSTGRES_DB', 'tba_waad_system'),
        user=os.getenv('POSTGRES_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', '12345'),
        host='localhost'
    )
    cur = conn.cursor()

    try:
        # Count before
        cur.execute("SELECT COUNT(*) FROM provider_contract_pricing_items WHERE contract_id = %s", (contract_id,))
        count_before = cur.fetchone()[0]
        print(f"عدد الخدمات في العقد {contract_id} قبل الحذف: {count_before}")

        if count_before == 0:
            print("لا توجد خدمات لحذفها.")
            return

        confirm = input(f"هل أنت متأكد من حذف {count_before} خدمة من العقد رقم {contract_id}؟ (نعم/لا): ").strip()
        if confirm not in ['نعم', 'yes', 'y', 'Y']:
            print("تم الإلغاء.")
            return

        cur.execute("DELETE FROM provider_contract_pricing_items WHERE contract_id = %s", (contract_id,))
        conn.commit()

        print(f"✅ تم حذف {cur.rowcount} خدمة من العقد رقم {contract_id} بنجاح.")

    except Exception as e:
        conn.rollback()
        print(f"❌ خطأ: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    import sys
    cid = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    delete_contract_items(cid)
