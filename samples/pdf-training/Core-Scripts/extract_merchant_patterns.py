import json
import os
from pdf_test import PDFTransactionExtractor

# Extract merchant patterns from all successful PDFs
extractor = PDFTransactionExtractor()
pdf_dir = 'C:/Users/jstre/Desktop/Model_Training_Files'
merchant_patterns = {}
category_mappings = {}

# Define categorization rules based on extracted merchants
def categorize_merchant(description):
    desc_lower = description.lower()
    
    # Restaurants & Food
    if any(word in desc_lower for word in ['tim hortons', 'mcdonald', 'wendy', 'restaurant', 'diner', 'pizza', 'subway', 'burger', 'a&w', 'dq grill', 'starbucks', 'uber eats', 'ubereats', 'thai express', 'east side mario', 'osmow', 'burrito']):
        return 'Restaurants'
    
    # Groceries & Retail
    if any(word in desc_lower for word in ['no frills', 'shoppers drug mart', 'walmart', 'dollarama', 'canadian tire', 'home depot', 'loblaws', 'metro', 'superstore', 'sobeys', 'lcbo', 'freshco']):
        return 'Groceries'
    
    # Gas & Transportation  
    if any(word in desc_lower for word in ['esso', 'petro canada', 'shell', 'gas', 'fuel', 'uber trip', 'ubertrip', 'taxi', 'presto']):
        return 'Transportation'
    
    # Health & Medical
    if any(word in desc_lower for word in ['dental', 'medical', 'health', 'pharmacy', 'physio', 'dr ', 'clinic']):
        return 'Healthcare'
    
    # Entertainment & Recreation
    if any(word in desc_lower for word in ['steam games', 'paypal', 'cinema', 'movie', 'karaoke', 'bar', 'entertainment']):
        return 'Entertainment'
    
    # Utilities & Services
    if any(word in desc_lower for word in ['rogers', 'bell', 'internet', 'phone', 'hydro', 'electric', 'utilities']):
        return 'Utilities'
    
    # Shopping & Online
    if any(word in desc_lower for word in ['amazon', 'amzn', 'online', 'bestbuy', 'canadian tire', 'roots', 'urban planet']):
        return 'Shopping'
    
    # Cannabis & Vaping
    if any(word in desc_lower for word in ['cannabis', 'canna cabana', 'vape', 'smoke']):
        return 'Personal Care'
    
    # Professional Services
    if any(word in desc_lower for word in ['professional', 'service', 'consultant', 'legal', 'accountant']):
        return 'Professional Services'
    
    # Bank fees, transfers, payments
    if any(word in desc_lower for word in ['payment thank you', 'royal bank', 'annual fee', 'bank fee', 'transfer']):
        return 'Banking'
    
    return 'Other'

# Process all successful PDFs from training results
training_results = json.load(open('batch_pdf_training_results.json'))
all_transactions = []

for file_info in training_results['processed_files']:
    if file_info['transactions'] > 0:
        pdf_path = os.path.join(pdf_dir, file_info['file'])
        try:
            print(f"Processing {file_info['file']}...")
            transactions = extractor.extract_transactions(pdf_path)
            for trans in transactions:
                desc = trans.get('description', '')
                if desc and 'PAYMENT THANK YOU' not in desc:  # Skip payment transactions
                    category = categorize_merchant(desc)
                    merchant_key = desc.split()[0:2]  # First 2 words as merchant key
                    merchant_name = ' '.join(merchant_key)
                    
                    merchant_patterns[merchant_name] = category
                    if category in category_mappings:
                        category_mappings[category] += 1
                    else:
                        category_mappings[category] = 1
                    
                    all_transactions.append({
                        'description': desc,
                        'category': category,
                        'merchant': merchant_name,
                        'amount': trans.get('amount', 0)
                    })
        except Exception as e:
            print(f'Error processing {file_info["file"]}: {str(e)}')

print(f'Total merchant patterns extracted: {len(merchant_patterns)}')
print(f'Categories identified: {list(category_mappings.keys())}')
print(f'Category distribution: {category_mappings}')

# Save enhanced training data
enhanced_training = {
    'merchant_patterns': merchant_patterns,
    'category_distribution': category_mappings,
    'total_merchants': len(merchant_patterns),
    'sample_transactions': all_transactions[:50],  # Sample for validation
    'training_source': 'CIBC_PDF_Statements',
    'generated_at': '2025-08-21'
}

with open('enhanced_merchant_training.json', 'w') as f:
    json.dump(enhanced_training, f, indent=2)

print('Enhanced training data saved to enhanced_merchant_training.json')
