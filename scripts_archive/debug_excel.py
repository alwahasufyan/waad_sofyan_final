import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\جليانة.xlsx'
    df = pd.read_excel(file_path)
    print("COLUMNS:")
    for i, col in enumerate(df.columns):
        print(f"{i}: '{col}'")
    
    # Try to find dependent rows
    # Relationship is usually in column 3 (index 3)
    rel_col = df.columns[3]
    principal_card_col = df.columns[2]
    
    dependents = df[df[rel_col].notna()]
    print(f"\nFiltered dependents: {len(dependents)}")
    if not dependents.empty:
        print(dependents.head(5).to_string())
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
