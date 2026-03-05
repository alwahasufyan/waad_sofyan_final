import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\القائمة_الموحدة_جليانة_جاهزة_للاستيراد.xlsx'
    df = pd.read_excel(file_path)
    print("Columns:", df.columns.tolist())
    print("\nFirst 10 rows:")
    print(df.head(10).to_string())
    print("\nType statistics:")
    print(df['النوع'].value_counts())
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
