import pandas as pd
import sys
import os

def normalize_name(name):
    if not isinstance(name, str): return ""
    return " ".join(name.strip().split())

def map_relationship(rel):
    rel = str(rel).strip()
    if rel in ['موظف', 'nan', 'Principal', 'نفسه'] or not rel or rel == 'None':
        return ""
    
    mapping = {
        'ابن': 'SON',
        'ابنة': 'DAUGHTER',
        'بنت': 'DAUGHTER',
        'زوج': 'HUSBAND',
        'زوجة': 'WIFE',
        'زوجه': 'WIFE',
        'أب': 'FATHER',
        'اب': 'FATHER',
        'أم': 'MOTHER',
        'ام': 'MOTHER',
        'أخ': 'BROTHER',
        'اخ': 'BROTHER',
        'أخت': 'SISTER',
        'اخت': 'SISTER'
    }
    return mapping.get(rel, rel)

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\القائمة_الموحدة_جليانة_جاهزة_للرفع_دقيقة_100.xlsx'
    df = pd.read_excel(file_path)
    
    # 1. Normalize
    df['الاسم'] = df['الاسم'].apply(normalize_name)
    df['اسم_الموظف'] = df['اسم_الموظف'].apply(normalize_name)
    
    # 2. Identify Principal vs Dependent
    # A row is a principal if the relationship is 'موظف' or empty, or if name matches employee name
    df['is_principal'] = df.apply(lambda row: str(row['الصلة']) in ['موظف', 'nan'] or pd.isna(row['الصلة']) or row['الاسم'] == row['اسم_الموظف'], axis=1)
    
    # 3. Check for duplicates
    # Remove exact duplicates (same name, same employee, same relation)
    initial_count = len(df)
    df = df.drop_duplicates(subset=['الاسم', 'اسم_الموظف', 'الصلة', 'الرقم_الوطني'])
    after_dedup = len(df)
    
    # Remove name-only duplicates (keep first)
    df = df.drop_duplicates(subset=['الاسم'])
    final_count = len(df)
    
    print(f"Initial rows: {initial_count}")
    print(f"Rows after strict deduplication: {after_dedup}")
    print(f"Final rows after name-only deduplication: {final_count}")
    
    # 4. Map to Template
    template_df = pd.DataFrame()
    template_df['الاسم الكامل'] = df['الاسم']
    template_df['جهة العمل'] = df.apply(lambda x: 'جليانة' if x['is_principal'] else '', axis=1)
    template_df['رقم بطاقة الرئيسي'] = '' # System requires this to be pre-existing card number
    template_df['القرابة'] = df['الصلة'].apply(map_relationship)
    
    # Add helper columns for user verification (can be removed before import if needed)
    template_df['التوع'] = df['is_principal'].map({True: 'رئيسي', False: 'تابع'})
    template_df['الرقم الوطني'] = df['الرقم_الوطني']
    template_df['اسم الموظف المسجل'] = df['اسم_الموظف']
    
    # 5. Save the output
    output_path = r'd:\tba_waad_system-main\tba_waad_system-main\القائمة_الموحدة_جليانة_جاهزة_للاستيراد.xlsx'
    template_df.to_excel(output_path, index=False)
    
    print(f"Processed file saved to: {output_path}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
