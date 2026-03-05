import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\جليانة.xlsx'
    df = pd.read_excel(file_path, sheet_name='Data', skiprows=2, header=None)
    df.columns = ['name', 'emp', 'parent', 'rel', 'card']
    
    # Check for JFZ202531060 as card or parent
    p = df[df['card'] == 'JFZ202531060']
    print(f"Principal found:\n{p.to_string()}")
    
    d = df[df['parent'] == 'JFZ202531060']
    print(f"\nDependents for JFZ202531060:\n{d.to_string()}")
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
