import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\القائمة_الموحدة_جليانة_جاهزة_للرفع_دقيقة_100.xlsx'
    df = pd.read_excel(file_path)
    
    # Check if 'اسم_الموظف' matches 'الاسم' for 'موظف' or 'nan' relationship
    principals = df[df['الصلة'].isin(['موظف', 'nan']) | df['الصلة'].isna()]
    match_count = (principals['اسم_الموظف'].str.strip() == principals['الاسم'].str.strip()).sum()
    print(f"Principals where name matches employee name: {match_count}/{len(principals)}")
    
    # Check some dependents
    dependents = df[~df['الصلة'].isin(['موظف', 'nan']) & df['الصلة'].notna()]
    mismatch_count = (dependents['اسم_الموظف'].str.strip() == dependents['الاسم'].str.strip()).sum()
    print(f"Dependents where name matches employee name (unexpected): {mismatch_count}/{len(dependents)}")
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
