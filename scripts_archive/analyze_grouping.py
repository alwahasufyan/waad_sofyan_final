import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\القائمة_الموحدة_جليانة_جاهزة_للرفع_دقيقة_100.xlsx'
    df = pd.read_excel(file_path)
    
    unique_emp_names = df['اسم_الموظف'].dropna().unique()
    print(f"Unique Employee Names: {len(unique_emp_names)}")
    
    unique_parent_cards = df['رقم_البطاقة_التأمينية'].dropna().unique()
    print(f"Unique Parent Cards: {len(unique_parent_cards)}")
    
    import collections
    c = collections.Counter(df['الصلة'].astype(str))
    print(f"Relationship counts: {c}")
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
