import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\القائمة_الموحدة_جليانة_جاهزة_للرفع_دقيقة_100.xlsx'
    df = pd.read_excel(file_path, nrows=20)
    print("Sample data with card related columns:")
    cols = ['الاسم', 'الصلة', 'رقم_البطاقة_التأمينية', 'رقم_بطاقة_المعالج']
    available_cols = [c for c in cols if c in df.columns]
    print(df[available_cols].to_string())
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
