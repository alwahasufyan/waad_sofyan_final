import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\القائمة_الموحدة_جليانة_جاهزة_للرفع_دقيقة_100.xlsx'
    df = pd.read_excel(file_path)
    
    dep_rels = ['ابن', 'ابنة', 'بنت', 'زوج', 'زوجة', 'زوجه', 'أب', 'اب', 'أم', 'ام', 'أخ', 'اخ', 'أخت', 'اخت']
    principals = df[~df['الصلة'].isin(dep_rels)]
    dependents = df[df['الصلة'].isin(dep_rels)]
    
    print(f"Total rows: {len(df)}")
    print(f"Principals: {len(principals)}")
    print(f"Dependents: {len(dependents)}")
    
    print("\nUnique relationships in Principals:")
    print(principals['الصلة'].unique())
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
