import pandas as pd
import sys

def normalize_name(name):
    if not isinstance(name, str): return ""
    return " ".join(name.strip().split())

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\القائمة_الموحدة_جليانة_جاهزة_للرفع_دقيقة_100.xlsx'
    df = pd.read_excel(file_path)
    
    df['normalized_name'] = df['الاسم'].apply(normalize_name)
    
    # Check for direct duplicates
    duplicates = df[df.duplicated(['normalized_name'], keep=False)]
    print(f"Total duplicates by name: {len(duplicates)}")
    if len(duplicates) > 0:
        print("Sample duplicates:")
        print(duplicates[['الاسم', 'الصلة', 'اسم_الموظف']].head(10))
        
    # Check for duplicates by name + national ID
    if 'الرقم_الوطني' in df.columns:
        df['national_id'] = df['الرقم_الوطني'].astype(str).str.strip()
        duplicates_id = df[(df['national_id'] != 'nan') & (df['national_id'] != '')].duplicated(['national_id'], keep=False)
        print(f"Total duplicates by National ID: {df[df.duplicated(['national_id'], keep=False) & (df['national_id'] != 'nan') & (df['national_id'] != '')].shape[0]}")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
