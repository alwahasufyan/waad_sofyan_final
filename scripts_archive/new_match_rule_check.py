import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\القائمة_الموحدة_جليانة_جاهزة_للرفع_دقيقة_100.xlsx'
    df = pd.read_excel(file_path)
    
    # Check rule: Is card == parent card?
    df['card'] = df['رقم_بطاقة_المعالج'].astype(str).str.replace('.0', '', regex=False).str.strip().str.upper()
    df['parent'] = df['رقم_البطاقة_التأمينية'].astype(str).str.replace('.0', '', regex=False).str.strip().str.upper()
    
    match = df[df['card'] == df['parent']]
    print(f"Rows where Card matches Parent Card: {len(match)}")
    
    # Sample matches
    if not match.empty:
        print(match[['الاسم', 'الصلة', 'card', 'parent']].head(10).to_string())
        
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
