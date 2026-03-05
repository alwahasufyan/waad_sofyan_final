import pandas as pd
import sys

try:
    file_path = r'd:\tba_waad_system-main\tba_waad_system-main\members_template (3).xlsx'
    # Read more rows to find the header
    df = pd.read_excel(file_path, header=None, nrows=20)
    print("TEMPLATE_CONTENT_START")
    print(df.to_string())
    print("TEMPLATE_CONTENT_END")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
