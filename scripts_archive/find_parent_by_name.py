import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\القائمة_الموحدة_جليانة_جاهزة_للرفع_دقيقة_100.xlsx'
    df = pd.read_excel(file_path)
    
    # Check for name
    p = df[df['الاسم'].str.contains('محمد عبدالحميد مفتاح المسمار', na=False)]
    print(f"Principals with similar name:\n{p[['الاسم', 'الصلة', 'رقم_بطاقة_المعالج', 'رقم_البطاقة_التأمينية']].to_string()}")
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
