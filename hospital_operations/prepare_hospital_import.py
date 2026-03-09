import pandas as pd
import sys
import os

# Define Standard Categories and their Contexts
ROOT_CATEGORIES = {
    'CAT-OUTPAT': 'خارج المستشفى (العيادات)',
    'CAT-INPAT': 'داخل المستشفى (الإيواء والعمليات)',
    'CAT-DENTAL': 'خدمات الأسنان',
    'CAT-VISION': 'العيون والنظارات',
    'CAT-MATERNITY': 'الأمومة والولادة',
    'CAT-CHRONIC': 'الأمراض المزمنة',
    'CAT-EMERGENCY': 'الطوارئ والإسعاف',
    'CAT-OTHER': 'منافع أخرى ومستلزمات'
}

def classify_excel(input_file):
    if not os.path.exists(input_file):
        print(f"Error: File {input_file} not found.")
        return

    # User's hospital Excel files typically have 8 header rows to skip
    try:
        df = pd.read_excel(input_file, skiprows=8)
    except Exception as e:
        print(f"Error reading Excel: {e}")
        return
    
    mapping = []
    for index, row in df.iterrows():
        # Adjust indices based on the standard hospital format observed
        # Unnamed: 3 = Service Name
        # Unnamed: 4 = Specialty/Dept
        # Unnamed: 5 = General Category
        # Unnamed: 6 = Base Price
        
        service_name = str(row.get('Unnamed: 3', ''))
        specialty = str(row.get('Unnamed: 4', ''))
        generic_cat = str(row.get('Unnamed: 5', ''))
        price = row.get('Unnamed: 6', 0)
        
        main_cat = ROOT_CATEGORIES['CAT-OUTPAT'] # Default to outpatient
        sub_cat = 'غير مصنف'
        
        if 'أسنان' in specialty or 'الأسنان' in generic_cat:
            main_cat = ROOT_CATEGORIES['CAT-DENTAL']
            sub_cat = 'الأسنان - وقائي وعلاجي'
        elif 'العيون' in specialty:
            main_cat = ROOT_CATEGORIES['CAT-VISION']
            sub_cat = 'العيون والنظارات'
        elif 'إيواء' in generic_cat or 'الجراحة' in specialty or 'العمليات' in service_name:
            main_cat = ROOT_CATEGORIES['CAT-INPAT']
            sub_cat = 'العمليات الجراحية والتخدير'
        elif 'تحاليل' in generic_cat or 'معامل' in specialty:
            main_cat = ROOT_CATEGORIES['CAT-OUTPAT']
            sub_cat = 'التحاليل الطبية والمخبرية'
        elif 'اشعة' in specialty or 'الصور التشخيصية' in generic_cat:
            main_cat = ROOT_CATEGORIES['CAT-OUTPAT']
            sub_cat = 'الأشعة والتصوير الطبي'
        elif 'الطوارئ' in specialty or 'إسعاف' in specialty:
            main_cat = ROOT_CATEGORIES['CAT-EMERGENCY']
            sub_cat = 'خدمات الحالات الطارئة'

        mapping.append({
            'Service_Code': f"SVC-{index+1}",
            'Service_Name': service_name,
            'Price': price,
            'Context_Category': main_cat,
            'Benefit_Category': sub_cat
        })
    
    result_df = pd.DataFrame(mapping)
    output_file = f"Import_Ready_{os.path.basename(input_file)}"
    result_df.to_excel(output_file, index=False)
    print(f"Successfully processed {len(result_df)} services.")
    print(f"Import file generated: {output_file}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python prepare_hospital_import.py <hospital_excel_file>")
    else:
        classify_excel(sys.argv[1])
