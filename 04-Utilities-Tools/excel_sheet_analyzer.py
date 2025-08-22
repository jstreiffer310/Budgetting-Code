#!/usr/bin/env python3
"""
📊 EXCEL SHEET ANALYZER - Simple Python Tool
Analyzes Excel file structure to identify which sheets exist and their purposes
"""

import pandas as pd
import sys
import os
from datetime import datetime

def analyze_excel_structure(file_path):
    """Analyze Excel file structure and provide actionable insights"""
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return
    
    try:
        # Get all sheet names
        excel_file = pd.ExcelFile(file_path)
        sheet_names = excel_file.sheet_names
        
        print("🔍 EXCEL STRUCTURE ANALYSIS")
        print("=" * 50)
        print(f"📁 File: {os.path.basename(file_path)}")
        print(f"📅 Analyzed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"📊 Total Sheets: {len(sheet_names)}")
        print()
        
        # Categorize sheets
        core_sheets = []
        diagnostic_sheets = []
        system_sheets = []
        unknown_sheets = []
        
        for i, sheet in enumerate(sheet_names, 1):
            # Read just the first few rows to understand structure
            try:
                df = pd.read_excel(file_path, sheet_name=sheet, nrows=3)
                rows = len(pd.read_excel(file_path, sheet_name=sheet))
                cols = len(df.columns)
                
                # Categorize by name and content
                if sheet in ['Transactions', 'Accounts', 'Holdings', 'Dashboard', 'Categories']:
                    category = '🟢 CORE'
                    core_sheets.append(sheet)
                elif sheet in ['System_Analysis', 'Excel_Analyzer_Output']:
                    category = '🔵 SYSTEM'
                    system_sheets.append(sheet)
                elif sheet in ['Failed_Parsing', 'Learning_Hub', 'AI_Learning', 'AuditLog', 'Diagnostic_Hub']:
                    category = '🟡 DIAGNOSTIC'
                    diagnostic_sheets.append(sheet)
                elif sheet in ['CSV_Import', 'Staging', 'Categorization_Metadata']:
                    category = '🟠 PROCESSING'
                else:
                    category = '❓ UNKNOWN'
                    unknown_sheets.append(sheet)
                
                print(f"{i:2}. {sheet:<25} {category:<15} ({rows:>4} rows × {cols:>2} cols)")
                
            except Exception as e:
                print(f"{i:2}. {sheet:<25} ❌ ERROR        (Cannot read)")
        
        print()
        print("📋 SHEET CATEGORIES:")
        print(f"🟢 Core Data:     {len(core_sheets)} sheets - {', '.join(core_sheets)}")
        print(f"🔵 System:        {len(system_sheets)} sheets - {', '.join(system_sheets)}")
        print(f"🟡 Diagnostic:    {len(diagnostic_sheets)} sheets - {', '.join(diagnostic_sheets)}")
        print(f"❓ Unknown:       {len(unknown_sheets)} sheets - {', '.join(unknown_sheets)}")
        
        print()
        print("🎯 CONSOLIDATION RECOMMENDATIONS:")
        print("=" * 50)
        
        if len(diagnostic_sheets) > 2:
            print(f"📊 You have {len(diagnostic_sheets)} diagnostic sheets:")
            for sheet in diagnostic_sheets:
                print(f"   • {sheet}")
            print()
            print("💡 RECOMMENDED ACTION:")
            print("   Consolidate all logging into 'System_Analysis' sheet")
            print("   - This will simplify the structure for Excel Analyzer")
            print("   - Reduce complexity from 5 diagnostic sheets to 1")
            print("   - Make the file more manageable")
        
        if 'System_Analysis' in sheet_names:
            try:
                sys_df = pd.read_excel(file_path, sheet_name='System_Analysis')
                sys_rows = len(sys_df)
                print(f"📈 System_Analysis currently has {sys_rows} rows")
                if sys_rows < 10:
                    print("   ✅ Perfect candidate for consolidation (low data volume)")
                else:
                    print("   ⚠️  Already contains significant data")
            except:
                print("   ❓ Could not read System_Analysis structure")
        
        print()
        print("🔧 SCRIPT UPDATES NEEDED:")
        print("   1. Update SHEET_NAMES constant to match actual sheets")
        print("   2. Route all logging to System_Analysis sheet")
        print("   3. Remove references to non-existent sheets")
        print("   4. Test validation functions with actual sheet structure")
        
        return {
            'total_sheets': len(sheet_names),
            'core_sheets': core_sheets,
            'diagnostic_sheets': diagnostic_sheets,
            'system_sheets': system_sheets,
            'unknown_sheets': unknown_sheets,
            'sheet_names': sheet_names
        }
        
    except Exception as e:
        print(f"❌ Error analyzing file: {e}")
        return None

def main():
    if len(sys.argv) != 2:
        print("Usage: python excel_sheet_analyzer.py <excel_file_path>")
        print("Example: python excel_sheet_analyzer.py 'C:\\Users\\jstre\\Downloads\\My Budget (11).xlsx'")
        return
    
    file_path = sys.argv[1]
    analyze_excel_structure(file_path)

if __name__ == "__main__":
    main()
