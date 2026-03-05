import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\جليانة.xlsx'
    df = pd.read_excel(file_path)
    print("Sample check for dependents:")
    dependents = df[df['القرابة\nrelationship'].notna()]
    if not dependents.empty:
        print(dependents[['الاسم الكامل\nfull_name', 'القرابة\nrelationship', 'رقم بطاقة الرئيسي\nprincipal_card_number']].head(10).to_string())
    else:
        print("No dependents found relative to current headers!")
        print("Columns found:", df.columns.tolist())
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
