"""
=============================================================
 clear_contract_items.py

 هدفه: تفريغ جميع خدمات عقد مزود خدمة محدد

 الاستخدام:
   python clear_contract_items.py              <- يعرض قائمة العقود
   python clear_contract_items.py <contract_id> <- يحذف خدمات العقد
   python clear_contract_items.py <contract_id> --force  <- بدون تأكيد

 مثال:
   python clear_contract_items.py 6
   python clear_contract_items.py 6 --force
=============================================================
"""

import psycopg2
import os
import sys

# ─────────────────────────────────────────────────────────────
# الاتصال بقاعدة البيانات
# ─────────────────────────────────────────────────────────────

def get_conn():
    return psycopg2.connect(
        dbname=os.getenv('POSTGRES_DB', 'tba_waad_system'),
        user=os.getenv('POSTGRES_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', '12345'),
        host='localhost'
    )

# ─────────────────────────────────────────────────────────────
# عرض قائمة العقود
# ─────────────────────────────────────────────────────────────

def list_contracts():
    conn = get_conn()
    cur  = conn.cursor()
    cur.execute("""
        SELECT 
            pc.id,
            pr.name AS provider,
            pc.status,
            COUNT(pcpi.id) AS items_count
        FROM provider_contracts pc
        LEFT JOIN providers pr ON pr.id = pc.provider_id
        LEFT JOIN provider_contract_pricing_items pcpi ON pcpi.contract_id = pc.id
        GROUP BY pc.id, pr.name, pc.status
        ORDER BY items_count DESC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    print(f"\n{'ID':<6} {'مزود الخدمة':<40} {'الحالة':<12} {'عدد الخدمات'}")
    print("─" * 72)
    for r in rows:
        print(f"{r[0]:<6} {str(r[1]):<40} {str(r[2]):<12} {r[3]}")
    print()

# ─────────────────────────────────────────────────────────────
# حذف خدمات عقد معين
# ─────────────────────────────────────────────────────────────

def clear_contract(contract_id: int, force: bool = False):
    conn = get_conn()
    cur  = conn.cursor()

    # التحقق من وجود العقد
    cur.execute("""
        SELECT pc.id, pr.name, COUNT(pcpi.id)
        FROM provider_contracts pc
        LEFT JOIN providers pr ON pr.id = pc.provider_id
        LEFT JOIN provider_contract_pricing_items pcpi ON pcpi.contract_id = pc.id
        WHERE pc.id = %s
        GROUP BY pc.id, pr.name
    """, (contract_id,))
    row = cur.fetchone()

    if not row:
        print(f"❌ لا يوجد عقد بالرقم {contract_id}")
        cur.close()
        conn.close()
        return

    cid, provider_name, count = row
    print(f"\n📋 العقد: [{cid}] {provider_name}")
    print(f"   عدد الخدمات الحالية: {count}")

    if count == 0:
        print("   ✔ العقد فارغ بالفعل. لا شيء للحذف.")
        cur.close()
        conn.close()
        return

    if not force:
        confirm = input(f"\n⚠️  هل تريد حذف جميع الـ {count} خدمة من عقد [{provider_name}]؟ (نعم/لا): ").strip()
        if confirm not in ['نعم', 'yes', 'y']:
            print("❌ تم الإلغاء.")
            cur.close()
            conn.close()
            return

    cur.execute(
        "DELETE FROM provider_contract_pricing_items WHERE contract_id = %s",
        (contract_id,)
    )
    deleted = cur.rowcount
    conn.commit()

    print(f"\n✅ تم حذف {deleted} خدمة من عقد [{provider_name}] بنجاح.")
    cur.close()
    conn.close()

# ─────────────────────────────────────────────────────────────
# نقطة الدخول
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("عرض العقود المتاحة:")
        list_contracts()
        print("لحذف خدمات عقد معين:")
        print("  python clear_contract_items.py <contract_id>")
        print("  python clear_contract_items.py <contract_id> --force")
    else:
        cid   = int(sys.argv[1])
        force = '--force' in sys.argv
        clear_contract(cid, force=force)
