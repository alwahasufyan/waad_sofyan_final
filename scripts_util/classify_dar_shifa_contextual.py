"""
تصنيف خدمات دار الشفاء حسب:
1) السياق / التصنيف الرئيسي
2) التصنيف الفرعي
3) نطاق القاعدة: عام أو استثنائي
4) حالة الاستثناء (إن وجدت)

الاستخدام:
  C:/Python312/python.exe scripts_util/classify_dar_shifa_contextual.py "<ملف_الإدخال.xlsx>" "<ملف_الإخراج.xlsx>"
"""

import os
import re
import sys
from typing import Dict, List, Optional, Tuple

import pandas as pd


EXCEPTION_RULES: List[Tuple[str, List[str]]] = [
    (
        "التمريض في المنزل أو النقاهة (بعد الخروج من المستشفى أو بديل عن الإقامة)",
        [
            "تمريض",
            "التمريض",
            "منزل",
            "منزلي",
            "النقاهة",
            "بعد الخروج",
            "بديل عن الإقامة",
            "home care",
            "nursing",
        ],
    ),
    (
        "العلاج الطبيعي",
        ["علاج طبيعي", "جلسة علاج", "تأهيل", "physio", "physiotherapy"],
    ),
    (
        "إصابات العمل",
        ["إصابات العمل", "اصابات العمل", "حادث عمل", "work injury", "occupational"],
    ),
    (
        "الطب النفسي (أدوية وجلسات)",
        ["نفسي", "طب نفسي", "جلسة نفسية", "psychi", "psychiat"],
    ),
    (
        "الولادة الطبيعية والقيصرية",
        ["ولادة", "قيصرية", "توليد", "natural delivery", "c-section", "cesarean"],
    ),
    (
        "مضاعفات الحمل",
        ["مضاعفات الحمل", "حمل", "إجهاض", "نزيف حمل", "pregnancy complication"],
    ),
]

MAIN_CONTEXT_KEYWORDS: List[Tuple[str, List[str]]] = [
    ("إيواء", ["إيواء", "ايواء", "إقامة", "مبيت", "داخل المستشفى", "ip", "inpatient"]),
    ("عمليات", ["عملية", "عمليات", "جراحة", "or", "operating"]),
    ("عيادات خارجية", ["خارجي", "خارج المستشفى", "عيادة", "op", "outpatient"]),
    ("تحاليل", ["تحليل", "تحاليل", "مختبر", "lab"]),
    ("أشعة", ["اشعة", "أشعة", "رنين", "مقطعية", "xray", "ct", "mri"]),
    ("علاج طبيعي", ["علاج طبيعي", "تأهيل", "physio"]),
]


def norm(text: object) -> str:
    if text is None:
        return ""
    s = str(text).strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def detect_exception(service_name: str, specialty: str, raw_context: str) -> Optional[str]:
    text = f"{service_name} {specialty} {raw_context}".lower()
    for label, keywords in EXCEPTION_RULES:
        if any(k.lower() in text for k in keywords):
            return label
    return None


def detect_main_context(raw_context: str, service_name: str, specialty: str) -> str:
    text = f"{raw_context} {service_name} {specialty}".lower()
    for label, keywords in MAIN_CONTEXT_KEYWORDS:
        if any(k.lower() in text for k in keywords):
            return label
    return "غير محدد"


def is_probably_header(service_name: str, price_text: str) -> bool:
    header_tokens = ["الخدمة", "الخدمه", "السعر", "البيان", "اسم", "كود", "code"]
    service_n = norm(service_name)
    price_n = norm(price_text)
    return any(tok in service_n for tok in header_tokens) or any(tok in price_n for tok in header_tokens)


def parse_price(value: object) -> Optional[float]:
    if value is None:
        return None
    raw = str(value)
    cleaned = "".join(ch for ch in raw if ch.isdigit() or ch == ".")
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def row_value(row: pd.Series, idx: int) -> str:
    if idx in row.index and pd.notnull(row[idx]):
        return str(row[idx]).strip()
    return ""


def classify_file(source_file: str, output_file: str) -> None:
    if not os.path.exists(source_file):
        raise FileNotFoundError(f"الملف غير موجود: {source_file}")

    df_raw = pd.read_excel(source_file, header=None)

    out: List[Dict[str, object]] = []
    code_counter = 1
    skipped = 0

    for _, row in df_raw.iterrows():
        price_text = row_value(row, 2)
        service_name = row_value(row, 3)
        specialty = row_value(row, 4)
        raw_context = row_value(row, 5)

        if not service_name:
            skipped += 1
            continue

        if is_probably_header(service_name, price_text):
            skipped += 1
            continue

        price = parse_price(price_text)
        if price is None or price <= 0:
            skipped += 1
            continue

        main_context = detect_main_context(raw_context, service_name, specialty)
        exception_case = detect_exception(service_name, specialty, raw_context)

        if main_context == "إيواء" and exception_case:
            rule_scope = "استثنائي"
            sub_category = exception_case
        else:
            rule_scope = "عام"
            sub_category = "عام"

        out.append(
            {
                "service_code": f"DS-{code_counter:05d}",
                "service_name": service_name,
                "unit_price": price,
                "specialty": specialty,
                "raw_context": raw_context,
                "main_context": main_context,
                "sub_category": sub_category,
                "rule_scope": rule_scope,
                "exception_case": exception_case if exception_case else "",
            }
        )
        code_counter += 1

    df_out = pd.DataFrame(out)
    df_out.to_excel(output_file, index=False)

    print(f"✅ تم إنشاء الملف: {output_file}")
    print(f"✔ عدد الخدمات المصنفة: {len(df_out)}")
    print(f"✗ صفوف تم تجاهلها: {skipped}")

    if not df_out.empty:
        print("\n📊 توزيع النطاق (عام/استثنائي):")
        print(df_out.groupby("rule_scope")["service_code"].count().to_string())
        print("\n📊 توزيع الاستثناءات:")
        print(df_out.groupby("sub_category")["service_code"].count().sort_values(ascending=False).to_string())


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("الاستخدام: C:/Python312/python.exe scripts_util/classify_dar_shifa_contextual.py <input.xlsx> <output.xlsx>")
        sys.exit(1)

    src = sys.argv[1]
    out = sys.argv[2]
    classify_file(src, out)
