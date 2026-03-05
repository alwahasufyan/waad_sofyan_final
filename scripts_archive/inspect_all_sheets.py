import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\members_template (3).xlsx'
    # Check all sheets
    xl = pd.ExcelFile(file_path)
    print("Sheets:", xl.sheet_names)
    
    for sheet in xl.sheet_names:
        print(f"\n--- Sheet: {sheet} ---")
        df = pd.read_excel(file_path, sheet_name=sheet, header=None, nrows=15)
        print(df.to_string())
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
