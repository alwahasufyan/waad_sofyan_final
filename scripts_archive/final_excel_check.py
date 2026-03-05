import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\جليانة.xlsx'
    df = pd.read_excel(file_path, sheet_name='Data')
    print("COLUMNS:", df.columns.tolist())
    print("\nFIRST 20 ROWS:")
    # Print Name, Relationship, Principal Card, Card Number
    cols = df.columns
    print(df.iloc[:20, [0, 3, 2, 4]].to_string())
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
