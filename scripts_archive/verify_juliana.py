import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\جليانة.xlsx'
    df = pd.read_excel(file_path, sheet_name='Data')
    print("Columns:", df.columns.tolist())
    print("\nFirst 10 rows:")
    print(df.head(10).to_string())
    print("\nTotal rows in 'Data' sheet:", len(df))
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
