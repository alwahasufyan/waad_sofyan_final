import pandas as pd
import sys
import os

# This script assumes you have extracted the PDF table to an Excel file first
# or want to generate rules from a structured Excel/CSV.

def convert_to_rules(input_file, output_file="Policy_Rules_Import.xlsx"):
    if not os.path.exists(input_file):
        print(f"Error: File {input_file} not found.")
        return

    try:
        # Load the document (PDF-to-Excel output)
        df = pd.read_excel(input_file)
        
        # Example mapping (Adapt to your document structure)
        rules = []
        for _, row in df.iterrows():
            category = str(row.get('المنفعة', ''))
            limit = row.get('السقف', 0)
            copay = row.get('نسبة التحمل', 0)
            
            rules.append({
                'Medical_Category': category,
                'Coverage_Percent': 100 - int(copay.replace('%', '')) if isinstance(copay, str) else 100,
                'Amount_Limit': limit,
                'Times_Limit': None,
                'Requires_PA': 'نعم' in str(row.get('موافقة مسبقة', ''))
            })
            
        result_df = pd.DataFrame(rules)
        result_df.to_excel(output_file, index=False)
        print(f"Generated {len(result_df)} rules in {output_file}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python convert_pdf_to_rules.py <excel_from_pdf>")
    else:
        convert_to_rules(sys.argv[1])
