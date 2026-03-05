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
    
    initial_count = len(df)
    
    # 1. Normalize
    df['الاسم'] = df['الاسم'].apply(normalize_name)
    df['اسم_الموظف'] = df['اسم_الموظف'].apply(normalize_name)
    df['الرقم_الوطني'] = df['الرقم_الوطني'].fillna('').astype(str).str.strip()
    
    # 2. Identify Principal vs Dependent
    df['is_principal'] = df.apply(lambda row: str(row['الصلة']) in ['موظف', 'nan'] or pd.isna(row['الصلة']) or row['الاسم'] == row['اسم_الموظف'], axis=1)
    
    # 3. Intelligent Deduplication
    # We remove rows that have same Name, same Relationship, AND same Employee Name.
    # Also remove if same National ID (if not empty).
    
    df['has_national_id'] = (df['الرقم_الوطني'] != '') & (df['الرقم_الوطني'] != 'nan') & (df['الرقم_الوطني'] != '0.0') & (df['الرقم_الوطني'] != '0')
    
    # Separate rows with and without national ID
    with_id = df[df['has_national_id']]
    without_id = df[~df['has_national_id']]
    
    # Deduplicate rows with ID by ID
    with_id = with_id.drop_duplicates(subset=['الرقم_الوطني'])
    
    # Deduplicate rows without ID by Name + Employee + Relationship
    without_id = without_id.drop_duplicates(subset=['الالاسم', 'اسم_الموظف', 'الصلة' if 'الصلة' in df.columns else 'الاسم'])
    
    # Combine back
    df_clean = pd.concat([with_id, without_id])
    
    # One more pass on Name + Employee (General duplication check)
    df_clean = df_clean.drop_duplicates(subset=['الاسم', 'اسم_الموظف'])
    
    final_count = len(df_clean)
    
    print(f"Initial rows: {initial_count}")
    print(f"Final rows after intelligent deduplication: {final_count}")
    
    # 4. Map to Template
    template_df = pd.DataFrame()
    template_df['الاسم الكامل'] = df_clean['الاسم']
    template_df['جهة العمل'] = df_clean.apply(lambda x: 'جليانة' if x['is_principal'] else '', axis=1)
    template_df['رقم بطاقة الرئيسي'] = ''
    template_df['القرابة'] = df_clean['الصلة'].apply(map_relationship)
    
    # Add helper columns
    template_df['النوع'] = df_clean['is_principal'].map({True: 'رئيسي', False: 'تابع'})
    template_df['الرقم الوطني'] = df_clean['الرقم_الوطني']
    template_df['اسم الموظف المسجل'] = df_clean['اسم_الموظف']
    
    # Sort: Principals first, then their dependents (to make it easier for user)
    # Actually, grouping by employee name helps.
    template_df = template_df.sort_values(by=['اسم الموظف المسجل', 'النوع'], ascending=[True, False])
    
    # 5. Save
    output_path = r'd:\tba_waad_system-main\tba_waad_system-main\القائمة_الموحدة_جليانة_جاهزة_للاستيراد.xlsx'
    template_df.to_excel(output_path, index=False)
    
    print(f"Processed file saved to: {output_path}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
