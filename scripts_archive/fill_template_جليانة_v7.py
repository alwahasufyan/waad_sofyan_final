import pandas as pd
import sys
import os
from openpyxl import load_workbook

def normalize_name(name):
    if not isinstance(name, str): return ""
    name = str(name).strip()
    if name.lower() in ['الاسم', 'اسم الموظف', 'الرقم الوظيفي', 'nan', 'none', '']: 
        return ""
    return " ".join(name.split())

def map_relationship(rel):
    rel = str(rel).strip()
    if not rel or rel == 'nan' or rel == 'موظف' or rel == 'Principal' or rel == 'نفسه' or rel == 'None' or rel == 'الصلة':
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
    source_file = r'd:\tba_waad_system-main\tba_waad_system-main\القائمة_الموحدة_جليانة_جاهزة_للرفع_دقيقة_100.xlsx'
    df = pd.read_excel(source_file)
    print(f"Reading source... total rows: {len(df)}")
    
    df['الاسم_نرم'] = df['الاسم'].apply(normalize_name)
    df['الموظف_نرم'] = df['اسم_الموظف'].apply(normalize_name)
    
    dep_rels = ['ابن', 'ابنة', 'بنت', 'زوج', 'زوجة', 'زوجه', 'أب', 'اب', 'أم', 'ام', 'أخ', 'اخ', 'أخت', 'اخت']
    df['is_src_principal'] = df.apply(lambda row: str(row['الصلة']).strip() not in dep_rels, axis=1)
    
    df['card_clean'] = df['رقم_بطاقة_المعالج'].astype(str).str.replace('.0', '', regex=False).str.strip().replace('nan', '')
    df['parent_card_clean'] = df['رقم_البطاقة_التأمينية'].astype(str).str.replace('.0', '', regex=False).str.strip().replace('nan', '')
    
    principal_lookup = {}
    for _, row in df[df['is_src_principal']].iterrows():
        if row['الاسم_نرم']:
            principal_lookup[row['الاسم_نرم']] = row['card_clean']
            
    final_data = []
    for _, row in df.iterrows():
        if not row['الاسم_نرم']: continue
            
        is_principal = row['is_src_principal']
        rel = map_relationship(row['الصلة'])
        parent_card = row['parent_card_clean']
        if not is_principal and not parent_card:
            parent_card = principal_lookup.get(row['الموظف_نرم'], "")
            
        final_data.append({
            'full_name': row['الاسم_نرم'],
            'employer': 'المنطقة الحرة جليانة' if is_principal else '',
            'principal_card_number': parent_card if not is_principal else '',
            'relationship': rel,
            'card_number': row['card_clean'],
            'SORT_EMP': row['الموظف_نرم'],
            'SORT_TYPE': 1 if is_principal else 0
        })
        
    final_df = pd.DataFrame(final_data)
    final_df = final_df.sort_values(by=['card_number', 'SORT_TYPE'], ascending=[True, False])
    final_df = final_df.drop_duplicates(subset=['card_number'])
    final_df = final_df.sort_values(by=['SORT_EMP', 'SORT_TYPE'], ascending=[True, False])
    
    output_path = r'd:\tba_waad_system-main\tba_waad_system-main\جليانة.xlsx'
    
    # SYSTEM HEADERS (Specific strings to match keywords in MemberExcelTemplateService)
    # 0: الاسم الكامل (matches "الاسم الكامل")
    # 1: جهة العمل (matches "جهة العمل")
    # 2: رقم بطاقة الرئيسي (matches "رقم بطاقة الرئيسي")
    # 3: القرابة (matches "القرابة")
    # 4: رقم بطاقة العضو (matches "رقم البطاقة" or contains "بطاقة")
    
    column_mapping = {
        'full_name': 'الاسم الكامل\nfull_name',
        'employer': 'جهة العمل\nemployer',
        'principal_card_number': 'رقم بطاقة الرئيسي\nprincipal_card',
        'relationship': 'القرابة\nrelationship',
        'card_number': 'رقم بطاقة العضو\ncard_number'
    }
    
    mapped_df = final_df.rename(columns=column_mapping)
    final_cols = list(column_mapping.values())
    
    # Create DF with row 0 = Headers, row 1 = Empty
    headers_row = pd.DataFrame([final_cols], columns=final_cols)
    example_row = pd.DataFrame([[''] * len(final_cols)], columns=final_cols)
    data_content = mapped_df[final_cols]
    
    final_out = pd.concat([headers_row, example_row, data_content], ignore_index=True)
    
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        final_out.to_excel(writer, sheet_name='Data', index=False, header=False)

    print(f"SUCCESS: جليانة.xlsx V7 generated with {len(final_df)} rows and multi-line specific headers.")

except Exception as e:
    import traceback
    traceback.print_exc()
    sys.exit(1)
