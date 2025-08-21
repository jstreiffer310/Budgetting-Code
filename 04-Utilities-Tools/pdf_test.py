# PDF Transaction Extractor and Category Training System
# Extracts transaction data from credit card statements and builds categorization intelligence
import sys
import os
import json
import re
from datetime import datetime
from collections import defaultdict
import csv

class PDFTransactionExtractor:
    def __init__(self):
        self.transactions = []
        self.category_patterns = {}
        self.merchant_mappings = {}
        self.training_data = {
            'transactions': [],
            'patterns': {},
            'merchant_confidence': {},
            'categorization_rules': {}
        }
        
    def test_pdf_libraries(self):
        """Test PDF processing libraries availability"""
        print("🧪 Testing PDF processing libraries...")
        
        # Test PyPDF2
        try:
            import PyPDF2
            print("✅ PyPDF2 available")
            pdf_readers = ['PyPDF2']
        except ImportError:
            print("❌ PyPDF2 not available - installing...")
            os.system("pip install --user PyPDF2")
            pdf_readers = []
        
        # Test pdfplumber
        try:
            import pdfplumber
            print("✅ pdfplumber available")
            pdf_readers.append('pdfplumber')
        except ImportError:
            print("❌ pdfplumber not available - installing...")
            os.system("pip install --user pdfplumber")
        
        return pdf_readers

    def extract_transactions_from_pdf(self, file_path):
        """Extract transaction data from credit card statement PDF"""
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            return []
        
        print(f"📄 Extracting transactions from: {file_path}")
        transactions = []
        
        # Try with pdfplumber first (better for tables)
        try:
            import pdfplumber
            transactions = self._extract_with_pdfplumber(file_path)
            if transactions:
                print(f"✅ pdfplumber extracted {len(transactions)} transactions")
                return transactions
        except Exception as e:
            print(f"⚠️ pdfplumber failed: {e}")
        
        # Fallback to PyPDF2
        try:
            import PyPDF2
            transactions = self._extract_with_pypdf2(file_path)
            if transactions:
                print(f"✅ PyPDF2 extracted {len(transactions)} transactions")
                return transactions
        except Exception as e:
            print(f"❌ PyPDF2 failed: {e}")
        
        return transactions

    def _extract_with_pdfplumber(self, file_path):
        """Extract transactions using pdfplumber (better for structured data)"""
        import pdfplumber
        transactions = []
        
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                print(f"📋 Processing page {page_num + 1}...")
                
                # Try to extract tables first
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        transactions.extend(self._parse_table_transactions(table))
                
                # If no tables, extract text and parse
                if not transactions:
                    text = page.extract_text()
                    if text:
                        transactions.extend(self._parse_text_transactions(text))
        
        return transactions

    def _extract_with_pypdf2(self, file_path):
        """Extract transactions using PyPDF2 (fallback method)"""
        import PyPDF2
        transactions = []
        
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            for page_num, page in enumerate(pdf_reader.pages):
                print(f"📋 Processing page {page_num + 1}...")
                text = page.extract_text()
                if text:
                    transactions.extend(self._parse_text_transactions(text))
        
        return transactions

    def _parse_table_transactions(self, table):
        """Parse transactions from table structure"""
        transactions = []
        
        if not table or len(table) < 2:
            return transactions
            
        # Look for transaction patterns in table
        for row in table[1:]:  # Skip header
            if len(row) >= 3:  # Need at least date, description, amount
                transaction = self._extract_transaction_from_row(row)
                if transaction:
                    transactions.append(transaction)
        
        return transactions

    def _parse_text_transactions(self, text):
        """Parse transactions from plain text"""
        transactions = []
        lines = text.split('\n')
        
        for line in lines:
            transaction = self._extract_transaction_from_line(line)
            if transaction:
                transactions.append(transaction)
        
        return transactions

    def _extract_transaction_from_row(self, row):
        """Extract transaction data from table row"""
        try:
            # Common patterns for credit card statements
            date_patterns = [
                r'\d{2}/\d{2}/\d{4}',  # MM/DD/YYYY
                r'\d{4}-\d{2}-\d{2}',  # YYYY-MM-DD
                r'\d{2}-\d{2}-\d{4}',  # MM-DD-YYYY
                r'\w{3}\s+\d{1,2}',    # MON DD
            ]
            
            amount_patterns = [
                r'-?\$?[\d,]+\.\d{2}',  # $1,234.56 or -$1,234.56
                r'-?\d+\.\d{2}',        # 1234.56 or -1234.56
            ]
            
            date_col = None
            desc_col = None
            amount_col = None
            
            # Identify columns
            for i, cell in enumerate(row):
                if not cell:
                    continue
                    
                cell_str = str(cell).strip()
                
                # Check for date
                for pattern in date_patterns:
                    if re.search(pattern, cell_str):
                        date_col = i
                        break
                
                # Check for amount
                for pattern in amount_patterns:
                    if re.search(pattern, cell_str):
                        amount_col = i
                        break
                        
                # Description is usually the longest text field
                if len(cell_str) > 10 and not date_col == i and not amount_col == i:
                    desc_col = i
            
            if date_col is not None and desc_col is not None and amount_col is not None:
                return {
                    'date': self._normalize_date(row[date_col]),
                    'description': self._normalize_description(row[desc_col]),
                    'amount': self._normalize_amount(row[amount_col]),
                    'raw_data': row,
                    'source': 'table_extraction'
                }
                
        except Exception as e:
            print(f"⚠️ Error parsing row: {e}")
            
        return None

    def _extract_transaction_from_line(self, line):
        """Extract transaction data from text line"""
        try:
            # Pattern for typical credit card transaction line
            # Example: "01/15/2025 STARBUCKS #12345 TORONTO ON -$5.67"
            transaction_pattern = r'(\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})(?:\s|$)'
            
            match = re.search(transaction_pattern, line.strip())
            if match:
                date_str, description, amount_str = match.groups()
                
                return {
                    'date': self._normalize_date(date_str),
                    'description': self._normalize_description(description),
                    'amount': self._normalize_amount(amount_str),
                    'raw_data': line.strip(),
                    'source': 'text_extraction'
                }
                
        except Exception as e:
            print(f"⚠️ Error parsing line: {e}")
            
        return None

    def _normalize_date(self, date_str):
        """Normalize date to standard format"""
        if not date_str:
            return None
            
        date_str = str(date_str).strip()
        
        # Try different date formats
        formats = ['%m/%d/%Y', '%Y-%m-%d', '%m-%d-%Y', '%b %d', '%d/%m/%Y']
        
        for fmt in formats:
            try:
                if fmt == '%b %d':
                    # Add current year for month-day format
                    date_str_with_year = f"{date_str} {datetime.now().year}"
                    return datetime.strptime(date_str_with_year, '%b %d %Y').strftime('%Y-%m-%d')
                else:
                    return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
            except ValueError:
                continue
                
        return date_str  # Return original if parsing fails

    def _normalize_description(self, desc_str):
        """Clean and normalize transaction description"""
        if not desc_str:
            return ""
            
        desc = str(desc_str).strip()
        
        # Remove common noise
        desc = re.sub(r'\s+', ' ', desc)  # Multiple spaces to single
        desc = re.sub(r'^[*\-\s]+|[*\-\s]+$', '', desc)  # Remove leading/trailing symbols
        
        return desc

    def _normalize_amount(self, amount_str):
        """Normalize amount to float"""
        if not amount_str:
            return 0.0
            
        amount_str = str(amount_str).strip()
        
        # Remove currency symbols and commas
        amount_str = re.sub(r'[\$,]', '', amount_str)
        
        try:
            return float(amount_str)
        except ValueError:
            return 0.0

    def build_category_training(self, transactions):
        """Build categorization training data from extracted transactions"""
        print(f"🧠 Building category training from {len(transactions)} transactions...")
        
        category_patterns = defaultdict(list)
        merchant_frequency = defaultdict(int)
        
        for transaction in transactions:
            description = transaction['description'].lower()
            
            # Extract merchant name (first few words usually)
            merchant = self._extract_merchant_name(description)
            merchant_frequency[merchant] += 1
            
            # Categorize based on common patterns
            category = self._auto_categorize(description)
            if category:
                category_patterns[category].append({
                    'merchant': merchant,
                    'description': description,
                    'amount': transaction['amount'],
                    'date': transaction['date']
                })
        
        # Build training data
        self.training_data = {
            'transactions': transactions,
            'category_patterns': dict(category_patterns),
            'merchant_frequency': dict(merchant_frequency),
            'merchant_mappings': self._build_merchant_mappings(merchant_frequency, category_patterns),
            'categorization_rules': self._build_categorization_rules(category_patterns),
            'extraction_metadata': {
                'total_transactions': len(transactions),
                'unique_merchants': len(merchant_frequency),
                'categories_found': len(category_patterns),
                'generated_at': datetime.now().isoformat()
            }
        }
        
        return self.training_data

    def _extract_merchant_name(self, description):
        """Extract merchant name from transaction description"""
        # Remove common prefixes and suffixes
        clean_desc = re.sub(r'^(purchase|payment|debit|credit)\s+', '', description, flags=re.IGNORECASE)
        clean_desc = re.sub(r'\s+(inc|ltd|llc|corp|co)\.?$', '', clean_desc, flags=re.IGNORECASE)
        
        # Take first 2-3 words as merchant name
        words = clean_desc.split()[:3]
        merchant = ' '.join(words).strip()
        
        return merchant if merchant else description[:20]

    def _auto_categorize(self, description):
        """Auto-categorize transaction based on description patterns"""
        desc_lower = description.lower()
        
        # Define category patterns
        categories = {
            'Food & Dining': [
                'restaurant', 'starbucks', 'tim hortons', 'mcdonalds', 'subway', 'pizza',
                'food', 'dining', 'cafe', 'coffee', 'kitchen', 'grill', 'bistro',
                'uber eats', 'doordash', 'skip', 'deliveroo'
            ],
            'Groceries': [
                'grocery', 'supermarket', 'loblaws', 'metro', 'sobeys', 'walmart',
                'costco', 'food basics', 'no frills', 'freshco', 'farm boy'
            ],
            'Gas & Fuel': [
                'gas', 'fuel', 'petro', 'shell', 'esso', 'chevron', 'mobil',
                'station', 'petroleum'
            ],
            'Shopping': [
                'amazon', 'store', 'shop', 'retail', 'mall', 'outlet', 'boutique',
                'best buy', 'canadian tire', 'home depot', 'ikea'
            ],
            'Transportation': [
                'uber', 'lyft', 'taxi', 'ttc', 'transit', 'parking', 'presto',
                'go train', 'via rail'
            ],
            'Utilities': [
                'hydro', 'electric', 'gas bill', 'water', 'utility', 'bell', 'rogers',
                'telus', 'internet', 'phone'
            ],
            'Healthcare': [
                'pharmacy', 'medical', 'dental', 'doctor', 'clinic', 'hospital',
                'health', 'shoppers drug mart', 'rexall'
            ],
            'Entertainment': [
                'movie', 'theatre', 'cinema', 'netflix', 'spotify', 'game',
                'entertainment', 'gym', 'fitness'
            ]
        }
        
        for category, keywords in categories.items():
            for keyword in keywords:
                if keyword in desc_lower:
                    return category
        
        return 'Other'  # Default category

    def _build_merchant_mappings(self, merchant_frequency, category_patterns):
        """Build merchant to category mappings with confidence scores"""
        mappings = {}
        
        for category, transactions in category_patterns.items():
            for transaction in transactions:
                merchant = transaction['merchant']
                freq = merchant_frequency[merchant]
                
                if merchant not in mappings:
                    mappings[merchant] = {
                        'category': category,
                        'confidence': min(1.0, freq / 10.0),  # Higher frequency = higher confidence
                        'transaction_count': freq
                    }
                elif freq > mappings[merchant]['transaction_count']:
                    # Update if this merchant appears more frequently in this category
                    mappings[merchant] = {
                        'category': category,
                        'confidence': min(1.0, freq / 10.0),
                        'transaction_count': freq
                    }
        
        return mappings

    def _build_categorization_rules(self, category_patterns):
        """Build categorization rules for Google Apps Script integration"""
        rules = {}
        
        for category, transactions in category_patterns.items():
            # Extract common keywords for this category
            all_descriptions = [t['description'] for t in transactions]
            keywords = set()
            
            for desc in all_descriptions:
                words = desc.lower().split()
                for word in words:
                    if len(word) > 3:  # Only meaningful words
                        keywords.add(word)
            
            # Only keep keywords that appear frequently
            keyword_counts = defaultdict(int)
            for desc in all_descriptions:
                for keyword in keywords:
                    if keyword in desc.lower():
                        keyword_counts[keyword] += 1
            
            # Filter to most common keywords
            frequent_keywords = [k for k, v in keyword_counts.items() if v >= 2]
            
            rules[category] = {
                'keywords': frequent_keywords[:10],  # Top 10 keywords
                'transaction_count': len(transactions),
                'confidence': len(transactions) / len(all_descriptions) if all_descriptions else 0
            }
        
        return rules

    def export_training_data(self, output_path="pdf_training_data.json"):
        """Export training data for integration with main system"""
        if not self.training_data['transactions']:
            print("❌ No training data to export")
            return False
        
        # Export JSON training data
        with open(output_path, 'w') as f:
            json.dump(self.training_data, f, indent=2, default=str)
        
        print(f"✅ Training data exported to: {output_path}")
        
        # Export Google Apps Script integration code
        self._export_gas_integration()
        
        # Export Excel Analyzer compatible data
        self._export_excel_compatible_data()
        
        return True

    def _export_gas_integration(self):
        """Export Google Apps Script integration code"""
        gas_code = f'''// PDF Training Data Integration - Generated {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
// Merchant mappings and categorization rules from PDF statement analysis

const PDF_MERCHANT_MAPPINGS = {json.dumps(self.training_data['merchant_mappings'], indent=2)};

const PDF_CATEGORIZATION_RULES = {json.dumps(self.training_data['categorization_rules'], indent=2)};

/**
 * Enhanced categorization using PDF training data
 */
function _categorizeWithPDFTraining(description, amount) {{
  const desc = description.toLowerCase();
  
  // Check merchant mappings first
  for (const [merchant, data] of Object.entries(PDF_MERCHANT_MAPPINGS)) {{
    if (desc.includes(merchant.toLowerCase())) {{
      return {{
        category: data.category,
        confidence: data.confidence,
        source: 'pdf_training',
        merchant: merchant
      }};
    }}
  }}
  
  // Check categorization rules
  for (const [category, rules] of Object.entries(PDF_CATEGORIZATION_RULES)) {{
    for (const keyword of rules.keywords) {{
      if (desc.includes(keyword)) {{
        return {{
          category: category,
          confidence: rules.confidence,
          source: 'pdf_rules',
          keyword: keyword
        }};
      }}
    }}
  }}
  
  return {{
    category: 'Other',
    confidence: 0.1,
    source: 'fallback'
  }};
}}

/**
 * Integration with existing categorization system
 */
function _categorizeTransactionEnhanced(transaction) {{
  // Try PDF training first
  const pdfResult = _categorizeWithPDFTraining(transaction.description, transaction.amount);
  
  if (pdfResult.confidence > 0.7) {{
    return pdfResult.category;
  }}
  
  // Fall back to existing categorization
  return _categorizeTransaction(transaction);
}}

// Metadata about PDF training
const PDF_TRAINING_METADATA = {json.dumps(self.training_data['extraction_metadata'], indent=2)};

_logInfo(`PDF Training Data Loaded: ${{PDF_TRAINING_METADATA.total_transactions}} transactions, ${{PDF_TRAINING_METADATA.unique_merchants}} merchants`);
'''
        
        with open('pdf_gas_integration.gs', 'w') as f:
            f.write(gas_code)
        
        print("✅ Google Apps Script integration exported to: pdf_gas_integration.gs")

    def _export_excel_compatible_data(self):
        """Export data compatible with Excel Analyzer"""
        excel_data = {
            'pdf_analysis': {
                'transactions': self.training_data['transactions'],
                'merchant_mappings': self.training_data['merchant_mappings'],
                'category_distribution': {},
                'training_quality': {
                    'total_transactions': len(self.training_data['transactions']),
                    'categorized_transactions': len([t for t in self.training_data['transactions'] if self._auto_categorize(t['description']) != 'Other']),
                    'unique_merchants': len(self.training_data['merchant_frequency']),
                    'categories_identified': len(self.training_data['category_patterns'])
                }
            }
        }
        
        # Calculate category distribution
        for transaction in self.training_data['transactions']:
            category = self._auto_categorize(transaction['description'])
            excel_data['pdf_analysis']['category_distribution'][category] = \
                excel_data['pdf_analysis']['category_distribution'].get(category, 0) + 1
        
        with open('pdf_excel_integration.json', 'w') as f:
            json.dump(excel_data, f, indent=2, default=str)
        
        print("✅ Excel Analyzer integration exported to: pdf_excel_integration.json")

    def process_pdf_statement(self, file_path):
        """Complete PDF processing workflow"""
        print(f"🚀 Starting PDF statement processing: {file_path}")
        
        # Test libraries
        available_readers = self.test_pdf_libraries()
        if not available_readers:
            print("❌ No PDF libraries available")
            return False
        
        # Extract transactions
        transactions = self.extract_transactions_from_pdf(file_path)
        if not transactions:
            print("❌ No transactions extracted")
            return False
        
        print(f"📊 Extracted {len(transactions)} transactions")
        
        # Build training data
        training_data = self.build_category_training(transactions)
        
        # Export for integration
        self.export_training_data()
        
        # Print summary
        self._print_training_summary()
        
        return True

    def _print_training_summary(self):
        """Print summary of training data"""
        print("\n📈 TRAINING DATA SUMMARY")
        print("=" * 50)
        
        metadata = self.training_data['extraction_metadata']
        print(f"📄 Total Transactions: {metadata['total_transactions']}")
        print(f"🏪 Unique Merchants: {metadata['unique_merchants']}")
        print(f"📊 Categories Found: {metadata['categories_found']}")
        
        print("\n🏆 TOP MERCHANTS:")
        sorted_merchants = sorted(
            self.training_data['merchant_frequency'].items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        for merchant, count in sorted_merchants:
            category = self.training_data['merchant_mappings'].get(merchant, {}).get('category', 'Unknown')
            confidence = self.training_data['merchant_mappings'].get(merchant, {}).get('confidence', 0)
            print(f"  {merchant:<25} | {count:>3} transactions | {category} ({confidence:.2f})")
        
        print("\n📊 CATEGORY DISTRIBUTION:")
        category_counts = defaultdict(int)
        for transaction in self.training_data['transactions']:
            category = self._auto_categorize(transaction['description'])
            category_counts[category] += 1
        
        for category, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / len(self.training_data['transactions'])) * 100
            print(f"  {category:<20} | {count:>3} transactions ({percentage:>5.1f}%)")
        
        print("\n🔗 INTEGRATION FILES CREATED:")
        print("  ✅ pdf_training_data.json      - Complete training dataset")
        print("  ✅ pdf_gas_integration.gs      - Google Apps Script integration")
        print("  ✅ pdf_excel_integration.json  - Excel Analyzer integration")


def main():
    """Main execution function"""
    extractor = PDFTransactionExtractor()
    
    if len(sys.argv) > 1:
        pdf_file = sys.argv[1]
        success = extractor.process_pdf_statement(pdf_file)
        if success:
            print("\n🎉 PDF training completed successfully!")
            print("📝 Next steps:")
            print("   1. Copy pdf_gas_integration.gs content to your Google Apps Script")
            print("   2. Update your Excel Analyzer to use pdf_excel_integration.json")
            print("   3. Test categorization with the new training data")
        else:
            print("❌ PDF training failed")
    else:
        print("💡 PDF Transaction Extractor and Category Training System")
        print("=" * 60)
        print("🎯 Purpose: Extract transactions from credit card PDFs and train categorization")
        print("\n📖 Usage:")
        print("   python pdf_test.py <pdf_file>")
        print("\n📄 Example:")
        print("   python pdf_test.py 'Downloads/Credit_Card_Statement_Jan2025.pdf'")
        print("\n✨ Features:")
        print("   • Extract transaction data from PDF statements")
        print("   • Build merchant-to-category mappings")
        print("   • Generate Google Apps Script integration code")
        print("   • Create Excel Analyzer compatible data")
        print("   • Train categorization patterns automatically")


if __name__ == "__main__":
    main()
