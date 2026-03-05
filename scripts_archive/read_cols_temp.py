import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\القائمة_الموحدة_جليانة_جاهزة_للرفع_دقيقة_100.xlsx'
    df = pd.read_excel(file_path, nrows=1)
    print("COLUMNS_START")
    for col in df.columns:
        print(col)
    print("COLUMNS_END")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
