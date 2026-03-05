import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\القائمة_الموحدة_جليانة_جاهزة_للرفع_دقيقة_100.xlsx'
    df = pd.read_excel(file_path)
    
    match = df[df['الصلة'] == 'موظف']
    p_cards = match['رقم_بطاقة_المعالج'].astype(str).str.replace('.0', '', regex=False).str.strip().str.upper().tolist()
    
    print(f"Total Principals in file: {len(p_cards)}")
    
    # Check daughter at row 2114
    daughter_parent = "JFZ202531060"
    if daughter_parent in p_cards:
        print(f"PARENT FOUND IN PRINCIPALS!")
    else:
        print(f"PARENT NOT FOUND!")
        
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
