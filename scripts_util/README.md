# 🛠️ أدوات إدارة النظام (Scripts Utility)

يحتوي هذا المجلد على السكريبتات الأربعة الأساسية لإدارة بيانات العقود والسياسات والمستشفيات.

---

## 1️⃣ تصنيف ملفات Excel المستشفيات
**الملف:** `classify_hospital_excel.py`
يستخدم لتحويل أي ملف أسعار مشفى (Excel) إلى التنسيق المعتمد في النظام مع ربط الخدمات بالأكواد الصحيحة.
*   **الأمر:**
    ```bash
    python classify_hospital_excel.py "input_file.xlsx" "output_ready.xlsx"
    ```

---

## 2️⃣ تشكيل قواعد وثيقة المنافع (28 قاعدة)
**الملف:** `seed_coverage_rules.py`
يقوم بتأسيس جميع قواعد التغطية الطبية لوثيقة منافع محددة بضغطة واحدة، متوافق مع معايير وثيقة جليانة.
*   **الأمر:**
    ```bash
    python seed_coverage_rules.py <policy_id> <annual_limit> <coverage_pct>
    ```
    *مثال:* `python seed_coverage_rules.py 1 60000 75`

---

## 3️⃣ تفريغ خدمات عقد مزود الخدمة
**الملف:** `clear_contract_items.py`
يستخدم لحذف جميع بنود التسعير من عقد معين لتجهيزه لاستيراد جديد.
*   **الأمر:**
    ```bash
    python clear_contract_items.py <contract_id>
    ```
    *أو للحذف المباشر:* `python clear_contract_items.py <contract_id> --force`

---

## 4️⃣ تحويل PDF المنافع إلى قواعد
**الملف:** `parse_policy_pdf.py`
أداة ذكية لاستخراج جداول وقواعد المنافع من ملفات الـ PDF وربطها بالتصنيفات في قاعدة البيانات.
*   **الأمر:**
    ```bash
    python parse_policy_pdf.py "policy_document.pdf" <policy_id>
    ```

---

> **ملاحظة:** تأكد من تشغيل هذه السكريبتات من المجلد الرئيسي للمشروع أو تأكد من ضبط إعدادات الاتصال بقاعدة البيانات في البيئة.
