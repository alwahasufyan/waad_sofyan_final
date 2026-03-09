import pandas as pd
import sys

# Ensure UTF-8 output for Arabic text
sys.stdout.reconfigure(encoding='utf-8')

try:
    df = pd.read_excel('Dar_Shifa_Import_Ready.xlsx')
    print(df.head(20).to_string())
except Exception as e:
    print(f"Error: {e}")
