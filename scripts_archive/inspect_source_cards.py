import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\القائمة_الموحدة_جليانة_جاهزة_للرفع_دقيقة_100.xlsx'
    df = pd.read_excel(file_path)
    print(f"Total rows: {len(df)}")
    print("Columns:", df.columns.tolist())
    
    # Check 'الصلة' and 'رقم_البطاقة_التأمينية' for first 50 rows
    cols = ['الاسم', 'الصلة', 'رقم_البطاقة_التأمينية', 'اسم_الموظف']
    available = [c for c in cols if c in df.columns]
    print("\nSample rows:")
    print(df[available].head(50).to_string())
    
    # Check for empty principal cards where relationship is not principal
    dep_rels = ['ابن', 'ابنة', 'بنت', 'زوج', 'زوجة', 'زوجه', 'أب', 'اب', 'أم', 'ام', 'أخ', 'اخ', 'أخت', 'اخت']
    missing_card = df[df['الصلة'].isin(dep_rels) & df['رقم_البطاقة_التأمينية'].isna()]
    print(f"\nDependents missing principal card: {len(missing_card)}")
    if not missing_card.empty:
        print(missing_card[available].head(10).to_string())
        
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
