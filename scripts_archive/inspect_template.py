import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\members_template (3).xlsx'
    # Try to read the first sheet and look at headers
    df = pd.read_excel(file_path, nrows=5)
    print("TEMPLATE_COLUMNS_START")
    for col in df.columns:
        print(col)
    print("TEMPLATE_COLUMNS_END")
    print("\nFirst row sample:")
    print(df.head(1).to_string())
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
