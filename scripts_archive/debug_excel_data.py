import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\جليانة.xlsx'
    df = pd.read_excel(file_path, sheet_name='Data')
    print("COLUMNS IN DATA SHEET:")
    for i, col in enumerate(df.columns):
        print(f"{i}: '{col}'")
    
    # Relationship is in column index 3
    rel_col = df.columns[3]
    principal_card_col = df.columns[2]
    unique_card_col = df.columns[4]
    
    dependents = df[df[rel_col].notna()]
    print(f"\nTotal rows in Data: {len(df)}")
    print(f"Filtered dependents: {len(dependents)}")
    
    if not dependents.empty:
        print("\nSample Dependent Rows:")
        print(dependents.head(10).to_string())
        
    # Check if principals have unique card numbers
    principals = df[df[rel_col].isna()]
    print(f"\nFiltered principals: {len(principals)}")
    if not principals.empty:
        print("\nSample Principal Rows:")
        print(principals.head(10).to_string())

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
