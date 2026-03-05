import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\جليانة.xlsx'
    # Read specifically from row 3 (header is row 1, skipping index 0,1)
    df = pd.read_excel(file_path, sheet_name='Data', skiprows=2, header=None)
    # Give names to columns 1-5
    df.columns = ['name', 'employer', 'parent_card', 'rel', 'card']
    
    print(f"Total data rows in v8: {len(df)}")
    print(f"Sample rows with parent cards:\n", df[['name', 'parent_card', 'rel', 'card']].head(20).to_string())
    
    print(f"\nRows with missing parent card (Dependents only):", len(df[(df['rel'].notna()) & (df['rel'] != '') & (df['parent_card'].isna())]))
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
