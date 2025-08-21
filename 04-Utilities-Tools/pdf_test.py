# PDF Transaction Extractor and Category Training System
# Extracts transaction data from credit card statements and builds categorization training data

import pdfplumber
import PyPDF2
import json
import re
from datetime import datetime, timedelta
import os
from pathlib import Path

class PDFTransactionExtractor:
    def __init__(self):
        """Initialize the PDF transaction extractor"""
        self.debug = True
        
    def extract_transactions(self, pdf_path):
        """Extract transactions from PDF using multiple methods"""
        if self.debug:
            print(f"\n🔍 Extracting transactions from: {os.path.basename(pdf_path)}")
        
        all_transactions = []
        
        # Method 1: Try pdfplumber for text and table extraction
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    if self.debug:
                        print(f"📄 Processing page {page_num}")
                    
                    # Extract text
                    text = page.extract_text()
                    if text:
                        text_transactions = self._parse_text_transactions(text)
                        all_transactions.extend(text_transactions)
                    
                    # Extract tables
                    tables = page.extract_tables()
                    for table_num, table in enumerate(tables):
                        if self.debug:
                            print(f"📊 Processing table {table_num + 1}")
                        table_transactions = self._parse_table_transactions(table)
                        all_transactions.extend(table_transactions)
                        
        except Exception as e:
            if self.debug:
                print(f"⚠️ pdfplumber error: {e}")
        
        # Method 2: Fallback to PyPDF2 if needed
        if not all_transactions:
            try:
                with open(pdf_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page_num, page in enumerate(pdf_reader.pages, 1):
                        text = page.extract_text()
                        if text:
                            text_transactions = self._parse_text_transactions(text)
                            all_transactions.extend(text_transactions)
            except Exception as e:
                if self.debug:
                    print(f"⚠️ PyPDF2 error: {e}")
        
        # Remove duplicates and sort by date
        unique_transactions = self._deduplicate_transactions(all_transactions)
        
        if self.debug:
            print(f"✅ Extracted {len(unique_transactions)} unique transactions")
        
        return unique_transactions
    
    def _parse_text_transactions(self, text):
        """Parse transactions from text content with enhanced CIBC pattern matching"""
        transactions = []
        lines = text.split('\n')
        
        # Enhanced patterns based on analysis of actual CIBC statements
        cibc_patterns = [
            # Pattern: "May 14 May 15 ROYAL BANK OF CANADA MONTREAL 160.82"
            # Format: Trans_Date Post_Date Description Amount
            r'([A-Z][a-z]{2})\s+(\d{1,2})\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(.+?)\s+([\d,]+\.\d{2})(?:\s|$)',
            
            # Alternative pattern with more flexible spacing
            r'([A-Z][a-z]{2})\s+(\d{1,2})\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(.{10,}?)\s+([\d,]+\.\d{2})',
            
            # Pattern for potential negative amounts
            r'([A-Z][a-z]{2})\s+(\d{1,2})\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(.+?)\s+\(([\d,]+\.\d{2})\)',
        ]
        
        for line in lines:
            line = line.strip()
            if not line or len(line) < 20:  # Skip short lines
                continue
                
            # Try CIBC patterns
            for pattern in cibc_patterns:
                match = re.match(pattern, line)
                if match:
                    trans_month, trans_day, post_month, post_day, description, amount_str = match.groups()
                    
                    # Parse the transaction date (use post date)
                    transaction_date = self._parse_month_day_to_date(post_month, post_day)
                    
                    if transaction_date and description.strip():
                        transaction = {
                            'date': transaction_date,
                            'description': description.strip(),
                            'amount': self._normalize_amount(amount_str),
                            'raw_data': line,
                            'source': 'cibc_text_extraction'
                        }
                        
                        transactions.append(transaction)
                        if self.debug:
                            print(f"✅ Text extracted: {transaction['date']} | {transaction['description'][:30]}... | ${transaction['amount']}")
                        break
        
        return transactions
    
    def _parse_month_day_to_date(self, month_str, day_str):
        """Convert month abbreviation and day to full date"""
        month_map = {
            'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
            'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
        }
        
        try:
            month_num = month_map.get(month_str)
            if not month_num:
                return None
                
            day_num = int(day_str)
            current_year = datetime.now().year
            
            # Create the date
            transaction_date = datetime(current_year, month_num, day_num)
            
            # If the date is in the future, assume it's from last year
            if transaction_date > datetime.now():
                transaction_date = datetime(current_year - 1, month_num, day_num)
                
            return transaction_date.strftime('%Y-%m-%d')
            
        except (ValueError, TypeError):
            return None
    
    def _parse_table_transactions(self, table):
        """Parse transactions from table structure with enhanced CIBC support"""
        transactions = []
        
        if not table or len(table) < 2:
            return transactions
        
        # Analyze table structure
        header_row = table[0] if table else []
        print(f"📊 Table header: {header_row}")
        
        # Look for CIBC-style table columns
        # Expected columns: Trans Date, Post Date, Description, Amount
        for row_idx, row in enumerate(table[1:], 1):
            if not row or len(row) < 4:
                continue
                
            try:
                # Handle different table structures
                if len(row) >= 4:
                    # Try CIBC format: [Trans_Date, Post_Date, Description, Amount]
                    trans_date, post_date, description, amount_str = row[:4]
                    
                    # Skip empty or header-like rows
                    if not description or str(description).upper() in ['DESCRIPTION', 'TRANS DATE']:
                        continue
                    
                    # Parse dates - prioritize post date
                    transaction_date = self._parse_table_date(post_date) or self._parse_table_date(trans_date)
                    
                    if transaction_date and description and amount_str:
                        transaction = {
                            'date': transaction_date,
                            'description': str(description).strip(),
                            'amount': self._normalize_amount(str(amount_str)),
                            'raw_data': f"Table row {row_idx}: {row}",
                            'source': 'cibc_table_extraction'
                        }
                        
                        if transaction['amount'] != 0:  # Skip zero amounts
                            transactions.append(transaction)
                            print(f"✅ Table extracted: {transaction['date']} | {transaction['description'][:30]}... | ${transaction['amount']}")
                            
            except Exception as e:
                print(f"⚠️ Error parsing table row {row_idx}: {e}")
                continue
        
        return transactions

    def _parse_table_date(self, date_cell):
        """Parse date from table cell with multiple format support"""
        if not date_cell:
            return None
            
        date_str = str(date_cell).strip()
        if not date_str or date_str.upper() in ['NONE', 'NULL', '']:
            return None
        
        # Try to parse various date formats
        date_formats = [
            '%m/%d/%Y',    # 05/15/2024
            '%Y-%m-%d',    # 2024-05-15
            '%m-%d-%Y',    # 05-15-2024
            '%b %d',       # May 15
            '%m/%d',       # 05/15
        ]
        
        for fmt in date_formats:
            try:
                if fmt in ['%b %d', '%m/%d']:
                    # Add current year for partial dates
                    full_date_str = f"{date_str} {datetime.now().year}"
                    if fmt == '%b %d':
                        parsed_date = datetime.strptime(full_date_str, f"{fmt} %Y")
                    else:
                        parsed_date = datetime.strptime(full_date_str, f"{fmt}/%Y")
                else:
                    parsed_date = datetime.strptime(date_str, fmt)
                
                return parsed_date.strftime('%Y-%m-%d')
                
            except ValueError:
                continue
        
        return None
    
    def _normalize_amount(self, amount_str):
        """Normalize amount string to float"""
        if not amount_str:
            return 0.0
            
        # Remove currency symbols, commas, and whitespace
        cleaned = re.sub(r'[^\d\.\-\(\)]', '', str(amount_str))
        
        # Handle parentheses as negative (accounting format)
        if '(' in cleaned and ')' in cleaned:
            cleaned = '-' + cleaned.replace('(', '').replace(')', '')
        
        try:
            return float(cleaned)
        except (ValueError, TypeError):
            return 0.0
    
    def _deduplicate_transactions(self, transactions):
        """Remove duplicate transactions"""
        seen = set()
        unique_transactions = []
        
        for transaction in transactions:
            # Create a key based on date, description, and amount
            key = (
                transaction.get('date'),
                transaction.get('description', '').strip().lower(),
                transaction.get('amount', 0)
            )
            
            if key not in seen:
                seen.add(key)
                unique_transactions.append(transaction)
        
        # Sort by date
        unique_transactions.sort(key=lambda x: x.get('date', ''))
        return unique_transactions
    
    def save_transactions_json(self, transactions, output_file):
        """Save extracted transactions to JSON file"""
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(transactions, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Saved {len(transactions)} transactions to {output_file}")
    
    def create_training_data(self, transactions):
        """Create training data for categorization"""
        training_data = []
        
        for transaction in transactions:
            # Basic category inference based on merchant patterns
            description = transaction.get('description', '').upper()
            category = self._infer_category(description)
            
            training_entry = {
                'description': transaction.get('description'),
                'amount': transaction.get('amount'),
                'date': transaction.get('date'),
                'suggested_category': category,
                'confidence': 0.7 if category != 'Other' else 0.3
            }
            
            training_data.append(training_entry)
        
        return training_data
    
    def _infer_category(self, description):
        """Basic category inference from merchant name"""
        categories = {
            'Food & Dining': ['RESTAURANT', 'PIZZA', 'CAFE', 'COFFEE', 'MCDONALD', 'BURGER', 'FOOD', 'GROCERY', 'MARKET'],
            'Gas & Transportation': ['SHELL', 'ESSO', 'PETRO', 'GAS', 'UBER', 'TAXI', 'TRANSIT'],
            'Shopping': ['WALMART', 'AMAZON', 'STORE', 'SHOP', 'RETAIL'],
            'Banking': ['BANK', 'ATM', 'TRANSFER', 'FEE'],
            'Entertainment': ['NETFLIX', 'SPOTIFY', 'MOVIE', 'THEATER'],
            'Utilities': ['HYDRO', 'ELECTRIC', 'PHONE', 'INTERNET', 'CABLE']
        }
        
        for category, keywords in categories.items():
            if any(keyword in description for keyword in keywords):
                return category
        
        return 'Other'

def main():
    """Test the extraction on a sample PDF"""
    extractor = PDFTransactionExtractor()
    
    # Test file path
    test_file = r"c:\Users\jstre\Desktop\Model_Training_Files\onlineStatement (1).pdf"
    
    if os.path.exists(test_file):
        print(f"🧪 Testing extraction on: {test_file}")
        transactions = extractor.extract_transactions(test_file)
        
        if transactions:
            print(f"\n📋 Sample transactions:")
            for i, transaction in enumerate(transactions[:5], 1):
                print(f"{i}. {transaction['date']} | {transaction['description'][:40]}... | ${transaction['amount']}")
            
            # Save to JSON
            output_file = "test_transactions.json"
            extractor.save_transactions_json(transactions, output_file)
            
            # Create training data
            training_data = extractor.create_training_data(transactions)
            training_file = "test_training_data.json"
            extractor.save_transactions_json(training_data, training_file)
            
        else:
            print("❌ No transactions extracted")
    else:
        print(f"❌ Test file not found: {test_file}")

if __name__ == "__main__":
    main()
