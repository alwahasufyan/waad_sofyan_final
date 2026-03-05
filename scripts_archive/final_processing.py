import pandas as pd
import sys
import os

def normalize_name(name):
    if not isinstance(name, str): return ""
    # Remove digits and special chars if they are just placeholders
    name = str(name)
    if name.lower() in ['الاسم', 'اسم الموظف', 'الرقم الوظيفي', 'nan', 'none']: 
        return ""
    return " ".join(name.strip().split())

def map_relationship(rel):
    rel = str(rel).strip()
    if rel in ['موظف', 'nan', 'Principal', 'نفسه'] or not rel or rel == 'None' or rel == 'الصلة':
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
    
    # 1. Basic Cleaning
    # Remove rows that are entirely empty
    df = df.dropna(how='all')
    
    # Normalize names
    df['الاسم'] = df['الاسم'].apply(normalize_name)
    df = df[df['الاسم'] != ''] # Remove rows with empty names (headers or blanks)
    
    df['اسم_الموظف'] = df['اسم_الموظف'].apply(normalize_name)
    df['الرقم_الوطني'] = df['الرقم_الوطني'].fillna('').astype(str).str.replace('.0', '', regex=False).str.strip()
    
    # 2. Identify Principal vs Dependent
    # Improved logic: If relationship is clearly a dependent one, it's a dependent.
    # Otherwise, if it's 'موظف' or same as employee name or employee name is missing, it's a principal.
    dependent_rels = ['ابن', 'ابنة', 'بنت', 'زوج', 'زوجة', 'زوجه', 'أب', 'اب', 'أم', 'ام', 'أخ', 'اخ', 'أخت', 'اخت']
    df['is_principal'] = df.apply(lambda row: str(row['الصلة']).strip() not in dependent_rels, axis=1)
    
    # 3. Intelligent Deduplication
    df['has_national_id'] = (df['الرقم_الوطني'] != '') & (df['الرقم_الوطني'] != 'nan') & (df['الرقم_الوطني'] != '0')
    
    with_id = df[df['has_national_id']]
    without_id = df[~df['has_national_id']]
    
    with_id = with_id.drop_duplicates(subset=['الرقم_الوطني'])
    without_id = without_id.drop_duplicates(subset=['الاسم', 'اسم_الموظف', 'الصلة'])
    
    df_clean = pd.concat([with_id, without_id])
    df_clean = df_clean.drop_duplicates(subset=['الاسم', 'اسم_الموظف'])
    
    # 4. Map to Template
    template_df = pd.DataFrame()
    template_df['full_name'] = df_clean['الاسم']
    template_df['employer'] = df_clean.apply(lambda x: 'جليانة' if x['is_principal'] else '', axis=1)
    template_df['principal_card_number'] = ''
    template_df['relationship'] = df_clean['الصلة'].apply(map_relationship)
    
    # Add helper columns for the user to review
    template_df['(الاسم الكامل)'] = df_clean['الاسم']
    template_df['(النوع)'] = df_clean['is_principal'].map({True: 'رئيسي', False: 'تابع'})
    template_df['(القرابة بالعربي)'] = df_clean['الصلة']
    template_df['(الرقم الوطني)'] = df_clean['الرقم_الوطني']
    template_df['(الموظف)'] = df_clean['اسم_الموظف']
    
    # Sort
    template_df = template_df.sort_values(by=['(الموظف)', '(النوع)'], ascending=[True, False])
    
    # 5. Save final version
    output_path = r'd:\tba_waad_system-main\tba_waad_system-main\القائمة_الموحدة_جليانة_جاهزة_للاستيراد_v3.xlsx'
    
    # Also rename columns to exact template requirement for first 4
    template_df.rename(columns={
        'full_name': 'الاسم الكامل',
        'employer': 'جهة العمل',
        'principal_card_number': 'رقم بطاقة الرئيسي',
        'relationship': 'القرابة'
    }, inplace=True)
    
    template_df.to_excel(output_path, index=False)
    
    print(f"Initial rows: {len(df)}")
    print(f"Final rows: {len(df_clean)}")
    print(f"Processed file saved to: {output_path}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
