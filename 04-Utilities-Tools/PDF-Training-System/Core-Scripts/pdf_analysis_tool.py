#!/usr/bin/env python3
"""
PDF ANALYSIS AND DEBUGGING TOOL
================================
Analyzes PDF structure to help understand why transaction extraction is failing
and creates better extraction patterns for the specific PDF format.
"""

import os
import sys
from pathlib import Path

def analyze_pdf_structure(file_path):
    """Analyze PDF structure to understand the format"""
    print(f"\n🔍 ANALYZING PDF STRUCTURE: {os.path.basename(file_path)}")
    print("=" * 60)
    
    # Try with pdfplumber first
    try:
        import pdfplumber
        print("\n📄 PDFPLUMBER ANALYSIS:")
        
        with pdfplumber.open(file_path) as pdf:
            print(f"   📊 Total pages: {len(pdf.pages)}")
            
            for page_num, page in enumerate(pdf.pages[:2]):  # Analyze first 2 pages
                print(f"\n   📋 PAGE {page_num + 1}:")
                
                # Extract text
                text = page.extract_text()
                if text:
                    lines = text.split('\n')
                    print(f"      📝 Text lines: {len(lines)}")
                    print(f"      📄 First 10 lines:")
                    for i, line in enumerate(lines[:10]):
                        if line.strip():
                            print(f"         {i+1:2d}: {line.strip()}")
                    
                    # Look for potential transaction patterns
                    print(f"\n      🔍 POTENTIAL TRANSACTION PATTERNS:")
                    date_patterns = []
                    amount_patterns = []
                    for line in lines:
                        line = line.strip()
                        if not line:
                            continue
                            
                        # Look for dates
                        import re
                        date_matches = re.findall(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b', line)
                        if date_matches:
                            date_patterns.append(line)
                        
                        # Look for amounts
                        amount_matches = re.findall(r'\$\d+\.\d{2}|\d+\.\d{2}', line)
                        if amount_matches:
                            amount_patterns.append(line)
                    
                    print(f"         📅 Lines with dates ({len(date_patterns)}):")
                    for pattern in date_patterns[:5]:
                        print(f"            {pattern}")
                    
                    print(f"         💰 Lines with amounts ({len(amount_patterns)}):")
                    for pattern in amount_patterns[:5]:
                        print(f"            {pattern}")
                
                # Extract tables
                tables = page.extract_tables()
                if tables:
                    print(f"      📊 Tables found: {len(tables)}")
                    for table_num, table in enumerate(tables):
                        print(f"         Table {table_num + 1}: {len(table)} rows x {len(table[0]) if table else 0} cols")
                        if table:
                            print(f"         Header: {table[0]}")
                            if len(table) > 1:
                                print(f"         Sample: {table[1]}")
                else:
                    print(f"      📊 No tables found")
                    
    except Exception as e:
        print(f"❌ pdfplumber analysis failed: {e}")
    
    # Try with PyPDF2
    try:
        import PyPDF2
        print(f"\n📄 PYPDF2 ANALYSIS:")
        
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            print(f"   📊 Total pages: {len(pdf_reader.pages)}")
            
            for page_num in range(min(2, len(pdf_reader.pages))):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                
                print(f"\n   📋 PAGE {page_num + 1}:")
                if text:
                    lines = text.split('\n')
                    print(f"      📝 Text lines: {len(lines)}")
                    print(f"      📄 First 10 lines:")
                    for i, line in enumerate(lines[:10]):
                        if line.strip():
                            print(f"         {i+1:2d}: {line.strip()}")
                else:
                    print(f"      ❌ No text extracted")
                    
    except Exception as e:
        print(f"❌ PyPDF2 analysis failed: {e}")

def analyze_multiple_pdfs(directory_path, max_files=3):
    """Analyze multiple PDFs to find common patterns"""
    print(f"🚀 ANALYZING MULTIPLE PDFS FROM: {directory_path}")
    print(f"🎯 Analyzing up to {max_files} files to find patterns")
    
    # Find PDF files
    pdf_files = []
    for file in os.listdir(directory_path):
        if file.lower().endswith('.pdf'):
            pdf_files.append(os.path.join(directory_path, file))
    
    pdf_files.sort()
    
    if not pdf_files:
        print("❌ No PDF files found")
        return
    
    print(f"📁 Found {len(pdf_files)} PDF files")
    
    # Analyze first few files
    for i, pdf_file in enumerate(pdf_files[:max_files]):
        analyze_pdf_structure(pdf_file)
        
        if i < max_files - 1:
            print("\n" + "="*80)

def create_enhanced_extraction_patterns():
    """Create enhanced extraction patterns based on analysis"""
    print(f"\n🔧 CREATING ENHANCED EXTRACTION PATTERNS")
    print("=" * 50)
    
    enhanced_patterns = {
        'transaction_patterns': [
            # Standard credit card patterns
            r'(\d{2}/\d{2}/\d{4})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})(?:\s|$)',
            r'(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})(?:\s|$)',
            
            # Alternative patterns
            r'(\d{1,2}/\d{1,2}/\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})',
            r'(\d{1,2}-\d{1,2}-\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})',
            
            # Table-based patterns
            r'(.+?)\s+(\d{2}/\d{2}/\d{4})\s+(.+?)\s+([\d,]+\.\d{2})',
            
            # Merchant-first patterns
            r'(.+?)\s+(\d{2}/\d{2})\s+([\d,]+\.\d{2})',
        ],
        
        'date_patterns': [
            r'\d{2}/\d{2}/\d{4}',
            r'\d{4}-\d{2}-\d{2}',
            r'\d{1,2}/\d{1,2}/\d{2,4}',
            r'\d{1,2}-\d{1,2}-\d{2,4}',
            r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b',
        ],
        
        'amount_patterns': [
            r'\$[\d,]+\.\d{2}',
            r'[\d,]+\.\d{2}',
            r'-\$[\d,]+\.\d{2}',
            r'\([\d,]+\.\d{2}\)',
        ],
        
        'merchant_patterns': [
            r'[A-Z][A-Z\s&]{3,}',  # All caps merchant names
            r'[A-Z][a-zA-Z\s&\#\*]{5,}',  # Mixed case with common symbols
        ]
    }
    
    print("✅ Enhanced patterns created:")
    for pattern_type, patterns in enhanced_patterns.items():
        print(f"   📋 {pattern_type}: {len(patterns)} patterns")
    
    return enhanced_patterns

def main():
    """Main analysis function"""
    training_dir = r"c:\Users\jstre\Desktop\Model_Training_Files"
    
    print("🔍 PDF STRUCTURE ANALYSIS TOOL")
    print("=" * 40)
    print(f"📁 Target directory: {training_dir}")
    
    if not os.path.exists(training_dir):
        print(f"❌ Directory not found: {training_dir}")
        return
    
    # Analyze multiple PDFs
    analyze_multiple_pdfs(training_dir, max_files=3)
    
    # Create enhanced patterns
    enhanced_patterns = create_enhanced_extraction_patterns()
    
    print(f"\n💡 RECOMMENDATIONS:")
    print(f"   1. Update PDF extraction patterns based on analysis above")
    print(f"   2. Focus on the transaction patterns that appear most frequently")
    print(f"   3. Consider table-based extraction if tables are detected")
    print(f"   4. Test with enhanced patterns on a single PDF first")

if __name__ == "__main__":
    main()
