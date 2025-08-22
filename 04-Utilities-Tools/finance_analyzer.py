#!/usr/bin/env python3
"""
🐍 PYTHON FINANCE ANALYZER - Replaces Excel Analyzer
Analyzes Google Sheets data exported from the finance automation script
"""

import pandas as pd
import sys
import os
import json
from datetime import datetime, timedelta
import numpy as np

class FinanceAnalyzer:
    def __init__(self, excel_file_path):
        self.file_path = excel_file_path
        self.data = {}
        self.analysis_results = {}
        
    def load_data(self):
        """Load all sheets from the Excel file"""
        try:
            excel_file = pd.ExcelFile(self.file_path)
            
            for sheet_name in excel_file.sheet_names:
                try:
                    self.data[sheet_name] = pd.read_excel(self.file_path, sheet_name=sheet_name)
                    print(f"✅ Loaded {sheet_name}: {len(self.data[sheet_name])} rows")
                except Exception as e:
                    print(f"❌ Failed to load {sheet_name}: {e}")
            
            return True
        except Exception as e:
            print(f"❌ Failed to load Excel file: {e}")
            return False
    
    def analyze_system_health(self):
        """Analyze system health from System_Analysis sheet"""
        if 'System_Analysis' not in self.data:
            return {"status": "ERROR", "message": "System_Analysis sheet not found"}
        
        df = self.data['System_Analysis']
        
        if df.empty:
            return {"status": "WARNING", "message": "System_Analysis sheet is empty"}
        
        # Analyze events
        total_events = len(df)
        
        # Look for error patterns
        error_count = 0
        warning_count = 0
        
        if 'Type' in df.columns:
            error_count = len(df[df['Type'].str.contains('ERROR', case=False, na=False)])
            warning_count = len(df[df['Type'].str.contains('WARNING', case=False, na=False)])
        
        # Recent activity (last 7 days)
        recent_events = 0
        if 'Timestamp' in df.columns:
            try:
                df['Timestamp'] = pd.to_datetime(df['Timestamp'])
                recent_cutoff = datetime.now() - timedelta(days=7)
                recent_events = len(df[df['Timestamp'] > recent_cutoff])
            except:
                pass
        
        health_score = max(0, 100 - (error_count * 10) - (warning_count * 5))
        
        if health_score >= 90:
            status = "EXCELLENT"
        elif health_score >= 70:
            status = "GOOD"
        elif health_score >= 50:
            status = "FAIR"
        else:
            status = "POOR"
        
        return {
            "status": status,
            "health_score": health_score,
            "total_events": total_events,
            "error_count": error_count,
            "warning_count": warning_count,
            "recent_events": recent_events
        }
    
    def analyze_transactions(self):
        """Analyze transaction data"""
        if 'Transactions' not in self.data:
            return {"status": "ERROR", "message": "Transactions sheet not found"}
        
        df = self.data['Transactions']
        
        if df.empty:
            return {"status": "WARNING", "message": "No transactions found"}
        
        results = {
            "total_transactions": len(df),
            "total_amount": 0,
            "categories": {},
            "accounts": {},
            "recent_activity": 0
        }
        
        # Amount analysis
        if 'Amount' in df.columns:
            try:
                df['Amount'] = pd.to_numeric(df['Amount'], errors='coerce')
                results["total_amount"] = df['Amount'].sum()
                results["avg_amount"] = df['Amount'].mean()
                results["largest_transaction"] = df['Amount'].max()
                results["smallest_transaction"] = df['Amount'].min()
            except:
                pass
        
        # Category analysis
        if 'Category' in df.columns:
            results["categories"] = df['Category'].value_counts().to_dict()
        
        # Account analysis
        if 'From' in df.columns and 'To' in df.columns:
            all_accounts = list(df['From'].dropna()) + list(df['To'].dropna())
            results["accounts"] = pd.Series(all_accounts).value_counts().to_dict()
        
        # Recent activity
        if 'Date' in df.columns:
            try:
                df['Date'] = pd.to_datetime(df['Date'])
                recent_cutoff = datetime.now() - timedelta(days=30)
                results["recent_activity"] = len(df[df['Date'] > recent_cutoff])
            except:
                pass
        
        return results
    
    def analyze_failed_parsing(self):
        """Analyze failed parsing patterns"""
        if 'Failed_Parsing' not in self.data:
            return {"status": "INFO", "message": "No failed parsing data"}
        
        df = self.data['Failed_Parsing']
        
        if df.empty:
            return {"status": "SUCCESS", "message": "No parsing failures"}
        
        results = {
            "total_failures": len(df),
            "failure_patterns": {},
            "email_domains": {},
            "recent_failures": 0
        }
        
        # Failure reason analysis
        if 'FailureReason' in df.columns:
            results["failure_patterns"] = df['FailureReason'].value_counts().to_dict()
        
        # Email domain analysis
        if 'From' in df.columns:
            try:
                domains = df['From'].str.extract(r'@([^>]+)')[0].value_counts()
                results["email_domains"] = domains.to_dict()
            except:
                pass
        
        # Recent failures
        if 'Timestamp' in df.columns:
            try:
                df['Timestamp'] = pd.to_datetime(df['Timestamp'])
                recent_cutoff = datetime.now() - timedelta(days=7)
                results["recent_failures"] = len(df[df['Timestamp'] > recent_cutoff])
            except:
                pass
        
        return results
    
    def generate_report(self):
        """Generate comprehensive analysis report"""
        print("🐍 PYTHON FINANCE ANALYZER")
        print("=" * 50)
        print(f"📁 File: {os.path.basename(self.file_path)}")
        print(f"📅 Analysis Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # System Health
        health = self.analyze_system_health()
        print("🏥 SYSTEM HEALTH")
        print("-" * 20)
        print(f"Status: {health.get('status', 'UNKNOWN')}")
        if 'health_score' in health:
            print(f"Score: {health['health_score']}/100")
            print(f"Total Events: {health['total_events']}")
            print(f"Errors: {health['error_count']}")
            print(f"Warnings: {health['warning_count']}")
            print(f"Recent Activity: {health['recent_events']} events (7 days)")
        print()
        
        # Transaction Analysis
        transactions = self.analyze_transactions()
        print("💳 TRANSACTION ANALYSIS")
        print("-" * 25)
        if transactions.get('status') != 'ERROR':
            print(f"Total Transactions: {transactions['total_transactions']}")
            if 'total_amount' in transactions:
                print(f"Total Amount: ${transactions['total_amount']:,.2f}")
                print(f"Average Amount: ${transactions.get('avg_amount', 0):,.2f}")
            print(f"Recent Activity: {transactions['recent_activity']} (30 days)")
            
            if transactions['categories']:
                print("Top Categories:")
                for cat, count in list(transactions['categories'].items())[:5]:
                    print(f"  • {cat}: {count} transactions")
        else:
            print(f"❌ {transactions['message']}")
        print()
        
        # Failed Parsing Analysis
        parsing = self.analyze_failed_parsing()
        print("📧 PARSING ANALYSIS")
        print("-" * 20)
        if parsing.get('status') != 'ERROR':
            if parsing['total_failures'] > 0:
                print(f"❌ Total Failures: {parsing['total_failures']}")
                print(f"🔄 Recent Failures: {parsing['recent_failures']} (7 days)")
                
                if parsing['failure_patterns']:
                    print("Top Failure Patterns:")
                    for pattern, count in list(parsing['failure_patterns'].items())[:3]:
                        print(f"  • {pattern}: {count}")
                
                if parsing['email_domains']:
                    print("Affected Domains:")
                    for domain, count in list(parsing['email_domains'].items())[:3]:
                        print(f"  • {domain}: {count}")
            else:
                print("✅ No parsing failures")
        print()
        
        # Recommendations
        print("💡 RECOMMENDATIONS")
        print("-" * 18)
        
        if health.get('error_count', 0) > 10:
            print("🚨 High error count - investigate System_Analysis sheet")
        
        if parsing.get('total_failures', 0) > 50:
            print("📧 High parsing failure rate - review email parsing logic")
        
        if transactions.get('recent_activity', 0) == 0:
            print("⚠️  No recent transaction activity - check automation")
        
        if health.get('health_score', 0) < 70:
            print("🔧 System health below 70% - maintenance required")
        else:
            print("✅ System appears healthy")
        
        print()
        print("🔗 Next Steps:")
        print("   1. Review detailed logs in System_Analysis sheet")
        print("   2. Address any parsing failures in Failed_Parsing sheet") 
        print("   3. Monitor transaction flow for automation issues")
        
        return {
            "health": health,
            "transactions": transactions,
            "parsing": parsing,
            "timestamp": datetime.now().isoformat()
        }

def main():
    if len(sys.argv) != 2:
        print("Usage: python finance_analyzer.py <excel_file_path>")
        print("Example: python finance_analyzer.py 'C:\\Users\\jstre\\Downloads\\My Budget (11).xlsx'")
        return
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return
    
    analyzer = FinanceAnalyzer(file_path)
    
    if analyzer.load_data():
        results = analyzer.generate_report()
        
        # Save results to JSON for further processing
        output_file = "finance_analysis_results.json"
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"📄 Detailed results saved to: {output_file}")

if __name__ == "__main__":
    main()
