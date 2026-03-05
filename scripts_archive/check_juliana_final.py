import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\جليانة.xlsx'
    xl = pd.ExcelFile(file_path)
    print(f"Sheets: {xl.sheet_names}")
    
    df = pd.read_excel(file_path, sheet_name='Data')
    print(f"Total rows in Data sheet: {len(df)}")
    print(f"Columns: {df.columns.tolist()}")
    
    # Check for empty rows at the end or start
    print("\nFirst 5 rows:")
    print(df.head(5).to_string())
    
    # Check for specific record count
    print(f"\nNon-null names: {df.iloc[:, 0].count()}")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
