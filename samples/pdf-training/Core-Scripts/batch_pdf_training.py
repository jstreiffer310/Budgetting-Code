#!/usr/bin/env python3
"""
PDF BATCH TRAINING SYSTEM
======================                # Update training results
                self.training_results['processed_files'].append({
                    'filename': os.path.basename(pdf_path),
                    'transactions_count': len(transactions),
                    'training_data': training_data,
                    'extracted_at': datetime.now().isoformat()
                })
                
                self.training_results['total_transactions'] += len(transactions)
                
                # Build merchant mappings from training data
                for entry in training_data:
                    merchant = entry['description'][:30]  # First 30 chars as merchant key
                    if merchant not in self.training_results['merchant_mappings']:
                        self.training_results['merchant_mappings'][merchant] = {
                            'suggested_category': entry['suggested_category'],
                            'confidence': entry['confidence'],
                            'frequency': 1
                        }
                    else:
                        self.training_results['merchant_mappings'][merchant]['frequency'] += 1ategorization model on all PDF files in the Model_Training_Files directory
while ignoring CSV files.

This script:
1. Scans for PDF files only (ignores CSV files)
2. Processes each PDF through the enhanced PDFTransactionExtractor
3. Builds a comprehensive training dataset
4. Generates categorization intelligence
5. Creates integration files for the main finance system

Usage:
    python batch_pdf_training.py
"""

import os
import sys
import json
from pathlib import Path
import traceback
from datetime import datetime
import glob

# Add the current directory to path so we can import pdf_test
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import our enhanced PDF training system
try:
    from pdf_test import PDFTransactionExtractor
except ImportError as e:
    print(f"❌ Error importing PDFTransactionExtractor: {e}")
    print("Make sure pdf_test.py is in the same directory")
    sys.exit(1)

class BatchPDFTrainer:
    def __init__(self, training_directory):
        self.training_directory = Path(training_directory)
        self.extractor = PDFTransactionExtractor()
        self.training_results = {
            'processed_files': [],
            'failed_files': [],
            'total_transactions': 0,
            'merchant_mappings': {},
            'category_distribution': {},
            'confidence_stats': {},
            'training_quality': {}
        }
        
    def find_pdf_files(self):
        """Find all PDF files in the training directory, ignoring CSV files"""
        pdf_files = []
        
        # Search for PDF files only
        pdf_pattern = os.path.join(self.training_directory, "*.pdf")
        pdf_files = glob.glob(pdf_pattern)
        
        # Sort files for consistent processing order
        pdf_files.sort()
        
        print(f"📁 Found {len(pdf_files)} PDF files in {self.training_directory}")
        print(f"🚫 Ignoring all CSV files as requested")
        
        return pdf_files
    
    def process_pdf_file(self, pdf_path):
        """Process a single PDF file and extract training data"""
        try:
            print(f"\n📄 Processing: {os.path.basename(pdf_path)}")
            
            # Extract transactions from PDF - returns list directly
            transactions = self.extractor.extract_transactions(pdf_path)
            
            if transactions and len(transactions) > 0:
                print(f"  ✅ Extracted {len(transactions)} transactions")
                
                # Create training data
                training_data = self.extractor.create_training_data(transactions)
                for entry in training_data:
                    entry['pdf_source'] = os.path.basename(pdf_path)
                
                # Update training results
                self.training_results['processed_files'].append({
                    'file': os.path.basename(pdf_path),
                    'transactions': len(transactions),
                    'processed_at': datetime.now().isoformat()
                })
                
                self.training_results['total_transactions'] += len(transactions)
                
                # Build merchant mappings from this PDF
                # Create training data
                training_data = self.extractor.create_training_data(transactions)
                for entry in training_data:
                    entry['pdf_source'] = os.path.basename(pdf_path)
                
                return True
                
            else:
                print(f"  ⚠️ No transactions extracted from this PDF")
                self.training_results['failed_files'].append({
                    'file': os.path.basename(pdf_path),
                    'error': 'No transactions found',
                    'failed_at': datetime.now().isoformat()
                })
                return False
                
        except Exception as e:
            error_msg = f"Exception processing {pdf_path}: {str(e)}"
            print(f"  ❌ {error_msg}")
            print(f"  📋 Traceback: {traceback.format_exc()}")
            
            self.training_results['failed_files'].append({
                'file': os.path.basename(pdf_path),
                'error': error_msg,
                'failed_at': datetime.now().isoformat()
            })
            return False
    
    def _merge_training_data(self, pdf_mappings):
        """Merge training data from a PDF into the overall training dataset"""
        for merchant, data in pdf_mappings.get('merchant_mappings', {}).items():
            if merchant in self.training_results['merchant_mappings']:
                # Merge existing merchant data
                existing = self.training_results['merchant_mappings'][merchant]
                existing['transaction_count'] += data['transaction_count']
                
                # Update confidence if this PDF has more transactions
                if data['transaction_count'] > existing.get('transaction_count', 0):
                    existing['category'] = data['category']
                    existing['confidence'] = data['confidence']
                    
                # Track all categories seen for this merchant
                if 'categories_seen' not in existing:
                    existing['categories_seen'] = set()
                existing['categories_seen'].add(data['category'])
                
            else:
                # New merchant
                self.training_results['merchant_mappings'][merchant] = {
                    'category': data['category'],
                    'confidence': data['confidence'],
                    'transaction_count': data['transaction_count'],
                    'categories_seen': {data['category']},
                    'first_seen': datetime.now().isoformat()
                }
        
        # Update category distribution
        for category, count in pdf_mappings.get('category_distribution', {}).items():
            if category in self.training_results['category_distribution']:
                self.training_results['category_distribution'][category] += count
            else:
                self.training_results['category_distribution'][category] = count
    
    def train_on_all_pdfs(self):
        """Process all PDF files in the training directory"""
        print(f"🚀 Starting batch PDF training on {self.training_directory}")
        print(f"📅 Training started at: {datetime.now()}")
        
        # Find PDF files (ignoring CSV files)
        pdf_files = self.find_pdf_files()
        
        if not pdf_files:
            print("❌ No PDF files found in the training directory")
            return False
        
        # Process each PDF file
        successful_files = 0
        failed_files = 0
        
        for pdf_file in pdf_files:
            if self.process_pdf_file(pdf_file):
                successful_files += 1
            else:
                failed_files += 1
        
        # Generate training summary
        print(f"\n📊 BATCH TRAINING COMPLETE")
        print(f"✅ Successfully processed: {successful_files} PDF files")
        print(f"❌ Failed to process: {failed_files} PDF files")
        print(f"📈 Total transactions extracted: {self.training_results['total_transactions']}")
        print(f"🏪 Unique merchants identified: {len(self.training_results['merchant_mappings'])}")
        print(f"🎯 Categories found: {len(self.training_results['category_distribution'])}")
        
        # Calculate training quality metrics
        self._calculate_training_quality()
        
        # Save training results
        self._save_training_results()
        
        # Generate integration files
        self._generate_integration_files()
        
        return successful_files > 0
    
    def _calculate_training_quality(self):
        """Calculate training quality metrics"""
        total_merchants = len(self.training_results['merchant_mappings'])
        if total_merchants == 0:
            return
        
        high_confidence = sum(1 for m in self.training_results['merchant_mappings'].values() 
                             if m['confidence'] > 0.8)
        medium_confidence = sum(1 for m in self.training_results['merchant_mappings'].values() 
                               if 0.6 <= m['confidence'] <= 0.8)
        low_confidence = total_merchants - high_confidence - medium_confidence
        
        high_volume = sum(1 for m in self.training_results['merchant_mappings'].values() 
                         if m['transaction_count'] >= 5)
        
        self.training_results['training_quality'] = {
            'total_merchants': total_merchants,
            'high_confidence_merchants': high_confidence,
            'medium_confidence_merchants': medium_confidence,
            'low_confidence_merchants': low_confidence,
            'high_volume_merchants': high_volume,
            'confidence_distribution': {
                'high': f"{(high_confidence/total_merchants)*100:.1f}%",
                'medium': f"{(medium_confidence/total_merchants)*100:.1f}%",
                'low': f"{(low_confidence/total_merchants)*100:.1f}%"
            }
        }
        
        print(f"\n📊 TRAINING QUALITY METRICS:")
        print(f"🎯 High confidence merchants (>80%): {high_confidence} ({(high_confidence/total_merchants)*100:.1f}%)")
        print(f"⚠️ Medium confidence merchants (60-80%): {medium_confidence} ({(medium_confidence/total_merchants)*100:.1f}%)")
        print(f"❓ Low confidence merchants (<60%): {low_confidence} ({(low_confidence/total_merchants)*100:.1f}%)")
        print(f"📈 High volume merchants (5+ transactions): {high_volume}")
    
    def _save_training_results(self):
        """Save comprehensive training results to JSON file"""
        # Convert sets to lists for JSON serialization
        serializable_results = json.loads(json.dumps(self.training_results, default=str))
        
        # Handle sets in merchant mappings
        for merchant, data in serializable_results['merchant_mappings'].items():
            if 'categories_seen' in data and isinstance(data['categories_seen'], set):
                data['categories_seen'] = list(data['categories_seen'])
        
        output_file = "batch_pdf_training_results.json"
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(serializable_results, f, indent=2, ensure_ascii=False)
            print(f"💾 Training results saved to: {output_file}")
        except Exception as e:
            print(f"❌ Failed to save training results: {e}")
    
    def _generate_integration_files(self):
        """Generate integration files for the finance automation system"""
        try:
            # Create a temporary extractor with our consolidated training data
            final_extractor = PDFTransactionExtractor()
            
            # Populate the extractor with our consolidated training data
            final_extractor.training_data = {
                'transactions': [],  # We don't need individual transactions for export
                'merchant_mappings': self.training_results['merchant_mappings'],
                'categorization_rules': self._generate_categorization_rules(),
                'category_distribution': self.training_results['category_distribution'],
                'training_quality': self.training_results['training_quality']
            }
            
            # Save training data using the extractor's method
            all_training_data = []
            for file_data in self.training_results['processed_files']:
                all_training_data.extend(file_data.get('training_data', []))
            
            final_extractor.save_transactions_json(all_training_data, "batch_pdf_training_data.json")
            print(f"✅ Generated Google Apps Script integration file")
            
            # Generate Excel Analyzer integration
            excel_data = {
                'training_summary': {
                    'total_files_processed': len(self.training_results['processed_files']),
                    'total_transactions': self.training_results['total_transactions'],
                    'unique_merchants': len(self.training_results['merchant_mappings']),
                    'training_date': datetime.now().isoformat()
                },
                'merchant_mappings': self.training_results['merchant_mappings'],
                'category_distribution': self.training_results['category_distribution'],
                'training_quality': self.training_results['training_quality']
            }
            
            with open("batch_pdf_excel_integration.json", 'w', encoding='utf-8') as f:
                json.dump(excel_data, f, indent=2, ensure_ascii=False, default=str)
            print(f"✅ Generated Excel Analyzer integration file")
            
        except Exception as e:
            print(f"❌ Failed to generate integration files: {e}")
    
    def _generate_categorization_rules(self):
        """Generate categorization rules from merchant mappings"""
        rules = {}
        
        for merchant, data in self.training_results['merchant_mappings'].items():
            if data['confidence'] > 0.7:  # Only high-confidence mappings
                category = data['category']
                if category not in rules:
                    rules[category] = []
                
                rules[category].append({
                    'merchant': merchant,
                    'confidence': data['confidence'],
                    'transaction_count': data['transaction_count']
                })
        
        return rules
    
    def print_training_summary(self):
        """Print a detailed summary of the training results"""
        print(f"\n🎯 COMPREHENSIVE TRAINING SUMMARY")
        print(f"=" * 50)
        
        # File processing summary
        print(f"📁 Files Processed:")
        print(f"  ✅ Successful: {len(self.training_results['processed_files'])}")
        print(f"  ❌ Failed: {len(self.training_results['failed_files'])}")
        
        # Transaction summary
        print(f"\n📈 Transaction Summary:")
        print(f"  🔢 Total transactions: {self.training_results['total_transactions']}")
        print(f"  🏪 Unique merchants: {len(self.training_results['merchant_mappings'])}")
        
        # Category distribution
        print(f"\n🎯 Category Distribution:")
        sorted_categories = sorted(
            self.training_results['category_distribution'].items(),
            key=lambda x: x[1], 
            reverse=True
        )
        for category, count in sorted_categories[:10]:  # Top 10 categories
            percentage = (count / self.training_results['total_transactions']) * 100
            print(f"  {category}: {count} transactions ({percentage:.1f}%)")
        
        # Top merchants by transaction count
        print(f"\n🏪 Top Merchants by Volume:")
        sorted_merchants = sorted(
            self.training_results['merchant_mappings'].items(),
            key=lambda x: x[1]['transaction_count'],
            reverse=True
        )
        for merchant, data in sorted_merchants[:10]:  # Top 10 merchants
            print(f"  {merchant}: {data['transaction_count']} transactions → {data['category']} ({data['confidence']:.2f} confidence)")
        
        # Failed files (if any)
        if self.training_results['failed_files']:
            print(f"\n❌ Failed Files:")
            for failed in self.training_results['failed_files']:
                print(f"  {failed['file']}: {failed['error']}")

def main():
    """Main function to run batch PDF training"""
    # Training directory
    training_dir = r"c:\Users\jstre\Desktop\Model_Training_Files"
    
    print("🚀 BATCH PDF TRAINING SYSTEM")
    print("=" * 40)
    print(f"📁 Training directory: {training_dir}")
    print(f"🎯 Target: PDF files only (ignoring CSV files)")
    print(f"📅 Started: {datetime.now()}")
    
    # Check if training directory exists
    if not os.path.exists(training_dir):
        print(f"❌ Training directory not found: {training_dir}")
        return False
    
    # Initialize batch trainer
    trainer = BatchPDFTrainer(training_dir)
    
    # Run batch training
    success = trainer.train_on_all_pdfs()
    
    if success:
        # Print detailed summary
        trainer.print_training_summary()
        
        print(f"\n🎉 BATCH TRAINING COMPLETED SUCCESSFULLY!")
        print(f"📁 Check the following files for results:")
        print(f"  • batch_pdf_training_results.json (complete results)")
        print(f"  • pdf_gas_integration.gs (Google Apps Script integration)")
        print(f"  • batch_pdf_excel_integration.json (Excel Analyzer integration)")
        
        return True
    else:
        print(f"\n❌ BATCH TRAINING FAILED")
        print(f"Check the error messages above for details")
        return False

if __name__ == "__main__":
    main()
