#!/usr/bin/env python3
"""
🔬 COMPREHENSIVE FINANCE SYSTEM ANALYZER
Deep analysis of Google Sheets data in relation to Google Apps Script functions
Maps data patterns to email logic, ML learning, and processing workflows
"""

import pandas as pd
import numpy as np
import re
import json
import ast
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import warnings
warnings.filterwarnings('ignore')

class ComprehensiveSystemAnalyzer:
    def __init__(self, excel_file_path, script_file_path):
        self.excel_file = excel_file_path
        self.script_file = script_file_path
        self.data = {}
        self.script_content = ""
        self.functions = {}
        self.email_patterns = {}
        self.learning_insights = {}
        self.data_function_mapping = {}
        
    def load_all_data(self):
        """Load Excel data and script content"""
        print("🔍 LOADING SYSTEM DATA...")
        
        # Load Excel sheets
        try:
            with pd.ExcelFile(self.excel_file) as excel:
                for sheet_name in excel.sheet_names:
                    self.data[sheet_name] = pd.read_excel(excel, sheet_name=sheet_name)
                print(f"   ✅ Loaded {len(excel.sheet_names)} sheets")
        except Exception as e:
            print(f"   ❌ Excel loading failed: {e}")
            return False
        
        # Load script content
        try:
            with open(self.script_file, 'r', encoding='utf-8') as f:
                self.script_content = f.read()
            print(f"   ✅ Loaded script ({len(self.script_content)} characters)")
        except Exception as e:
            print(f"   ❌ Script loading failed: {e}")
            return False
        
        return True
    
    def analyze_email_logic_data_relationship(self):
        """Analyze how email data relates to processing functions"""
        print("\n📧 EMAIL LOGIC ↔ DATA ANALYSIS")
        print("=" * 40)
        
        insights = {
            'failed_parsing_patterns': {},
            'learning_effectiveness': {},
            'email_domain_processing': {},
            'function_data_gaps': [],
            'improvement_recommendations': []
        }
        
        # Analyze Failed_Parsing sheet vs email processing functions
        if 'Failed_Parsing' in self.data:
            failed_df = self.data['Failed_Parsing']
            
            if not failed_df.empty:
                print(f"📧 Analyzing {len(failed_df)} parsing failures...")
                
                # Extract email domains and failure patterns
                if 'From' in failed_df.columns:
                    domains = failed_df['From'].apply(self._extract_domain).value_counts()
                    insights['email_domain_processing'] = domains.to_dict()
                    
                    print("🔍 Top failure domains:")
                    for domain, count in domains.head(5).items():
                        print(f"   • {domain}: {count} failures")
                        
                        # Check if domain-specific parsing functions exist
                        domain_functions = self._find_domain_specific_functions(domain)
                        if not domain_functions:
                            insights['function_data_gaps'].append(
                                f"No specific parsing logic found for {domain} ({count} failures)"
                            )
                
                # Analyze failure reasons vs script functions
                if 'FailureReason' in failed_df.columns:
                    failure_reasons = failed_df['FailureReason'].value_counts()
                    insights['failed_parsing_patterns'] = failure_reasons.to_dict()
                    
                    print("\n🚨 Failure pattern analysis:")
                    for reason, count in failure_reasons.head(3).items():
                        print(f"   • {reason}: {count}")
                        
                        # Map failures to missing script logic
                        if 'domain is not defined' in reason.lower():
                            insights['improvement_recommendations'].append(
                                "Add domain validation in _extractEmailDomain() function"
                            )
                        elif 'parsing methods failed' in reason.lower():
                            insights['improvement_recommendations'].append(
                                "Implement fallback parsing strategies in email processing"
                            )
        
        # Analyze AI_Learning vs Learning_Hub data relationship
        ai_learning = self.data.get('AI_Learning', pd.DataFrame())
        learning_hub = self.data.get('Learning_Hub', pd.DataFrame())
        
        if not ai_learning.empty and not learning_hub.empty:
            print(f"\n🧠 ML Learning Data Analysis:")
            print(f"   AI_Learning: {len(ai_learning)} patterns")
            print(f"   Learning_Hub: {len(learning_hub)} patterns")
            
            # Check for pattern overlap and effectiveness
            if 'Pattern' in ai_learning.columns and 'Pattern' in learning_hub.columns:
                ai_patterns = set(ai_learning['Pattern'].dropna())
                hub_patterns = set(learning_hub['Pattern'].dropna())
                
                overlap = ai_patterns.intersection(hub_patterns)
                unique_hub = hub_patterns - ai_patterns
                
                insights['learning_effectiveness'] = {
                    'total_ai_patterns': len(ai_patterns),
                    'total_hub_patterns': len(hub_patterns),
                    'overlapping_patterns': len(overlap),
                    'unique_hub_patterns': len(unique_hub)
                }
                
                print(f"   📊 Pattern overlap: {len(overlap)}")
                print(f"   📊 Unique Hub patterns: {len(unique_hub)}")
                
                if unique_hub:
                    insights['improvement_recommendations'].append(
                        f"Merge {len(unique_hub)} unique Learning_Hub patterns into AI_Learning"
                    )
        
        return insights
    
    def analyze_transaction_processing_flow(self):
        """Analyze transaction flow through staging, processing, and categorization"""
        print("\n💳 TRANSACTION PROCESSING FLOW ANALYSIS")
        print("=" * 45)
        
        flow_analysis = {
            'staging_bottlenecks': [],
            'categorization_gaps': [],
            'processing_efficiency': {},
            'data_quality_issues': []
        }
        
        # Analyze Staging sheet
        staging = self.data.get('Staging', pd.DataFrame())
        transactions = self.data.get('Transactions', pd.DataFrame())
        
        print(f"📊 Processing Pipeline:")
        print(f"   Staging: {len(staging)} pending items")
        print(f"   Transactions: {len(transactions)} processed items")
        
        if not staging.empty:
            flow_analysis['staging_bottlenecks'].append(
                f"{len(staging)} transactions stuck in staging - check pairStagedTransfers()"
            )
        
        # Analyze categorization effectiveness
        if not transactions.empty and 'Category' in transactions.columns:
            uncategorized = transactions['Category'].isna().sum()
            total_transactions = len(transactions)
            categorization_rate = (total_transactions - uncategorized) / total_transactions * 100
            
            flow_analysis['processing_efficiency']['categorization_rate'] = categorization_rate
            
            print(f"   📈 Categorization rate: {categorization_rate:.1f}%")
            
            if categorization_rate < 80:
                flow_analysis['categorization_gaps'].append(
                    "Low categorization rate - check learnCategoriesFromTransactions() effectiveness"
                )
        
        # Check for data quality issues
        if not transactions.empty:
            # Missing amounts
            if 'Amount' in transactions.columns:
                missing_amounts = transactions['Amount'].isna().sum()
                if missing_amounts > 0:
                    flow_analysis['data_quality_issues'].append(
                        f"{missing_amounts} transactions missing amounts - check email parsing logic"
                    )
            
            # Missing descriptions
            desc_columns = [col for col in transactions.columns if 'description' in col.lower()]
            if desc_columns:
                missing_desc = transactions[desc_columns[0]].isna().sum()
                if missing_desc > 0:
                    flow_analysis['data_quality_issues'].append(
                        f"{missing_desc} transactions missing descriptions - check email extraction"
                    )
        
        return flow_analysis
    
    def analyze_function_data_relationships(self):
        """Map specific functions to their data dependencies and outputs"""
        print("\n🔗 FUNCTION ↔ DATA RELATIONSHIP MAPPING")
        print("=" * 40)
        
        relationships = {}
        
        # Extract function definitions and their data interactions
        function_pattern = r'function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}'
        functions = re.findall(function_pattern, self.script_content, re.DOTALL)
        
        print(f"🔍 Analyzing {len(functions)} functions for data relationships...")
        
        for func_name, func_body in functions:
            # Skip internal helper functions for this analysis
            if func_name.startswith('_'):
                continue
            
            data_interactions = {
                'reads_from_sheets': [],
                'writes_to_sheets': [],
                'data_dependencies': [],
                'missing_data_connections': []
            }
            
            # Find sheet interactions
            sheet_reads = re.findall(r'getSheetByName\([\'"`]([^\'"`]+)[\'"`]\)', func_body)
            sheet_writes = re.findall(r'\.getRange\([^)]+\)\.setValue', func_body)
            
            data_interactions['reads_from_sheets'] = list(set(sheet_reads))
            data_interactions['writes_to_sheets'] = len(sheet_writes)
            
            # Check if function has corresponding data
            for sheet_name in data_interactions['reads_from_sheets']:
                if sheet_name in self.data:
                    if self.data[sheet_name].empty:
                        data_interactions['missing_data_connections'].append(
                            f"Function reads from empty {sheet_name} sheet"
                        )
                else:
                    data_interactions['missing_data_connections'].append(
                        f"Function reads from non-existent {sheet_name} sheet"
                    )
            
            # Identify email processing functions
            if any(keyword in func_body.lower() for keyword in ['email', 'message', 'gmail']):
                data_interactions['data_dependencies'].append('Email processing')
                
                # Check if Failed_Parsing data supports this function
                if 'Failed_Parsing' in self.data and not self.data['Failed_Parsing'].empty:
                    failure_count = len(self.data['Failed_Parsing'])
                    data_interactions['data_dependencies'].append(
                        f"Has {failure_count} parsing failures to analyze"
                    )
            
            # Identify learning functions
            if any(keyword in func_body.lower() for keyword in ['learn', 'pattern', 'train']):
                data_interactions['data_dependencies'].append('ML learning')
                
                # Check learning data availability
                ai_patterns = len(self.data.get('AI_Learning', []))
                hub_patterns = len(self.data.get('Learning_Hub', []))
                data_interactions['data_dependencies'].append(
                    f"Has {ai_patterns + hub_patterns} total learning patterns"
                )
            
            if data_interactions['reads_from_sheets'] or data_interactions['data_dependencies']:
                relationships[func_name] = data_interactions
        
        # Show key relationships
        print("\n🎯 Key Function-Data Relationships:")
        
        # Email processing functions
        email_functions = [f for f, data in relationships.items() 
                          if any('Email processing' in dep for dep in data['data_dependencies'])]
        if email_functions:
            print(f"   📧 Email Processing: {len(email_functions)} functions")
            for func in email_functions[:3]:
                missing = relationships[func]['missing_data_connections']
                if missing:
                    print(f"      ⚠️  {func}: {missing[0]}")
        
        # Learning functions
        learning_functions = [f for f, data in relationships.items() 
                             if any('ML learning' in dep for dep in data['data_dependencies'])]
        if learning_functions:
            print(f"   🧠 ML Learning: {len(learning_functions)} functions")
            for func in learning_functions[:3]:
                deps = relationships[func]['data_dependencies']
                pattern_info = [d for d in deps if 'patterns' in d]
                if pattern_info:
                    print(f"      ✅ {func}: {pattern_info[0]}")
        
        return relationships
    
    def generate_system_optimization_report(self):
        """Generate comprehensive optimization recommendations"""
        print("\n📋 SYSTEM OPTIMIZATION ANALYSIS")
        print("=" * 35)
        
        # Run all analyses
        email_insights = self.analyze_email_logic_data_relationship()
        flow_analysis = self.analyze_transaction_processing_flow()
        function_relationships = self.analyze_function_data_relationships()
        
        optimization_report = {
            'critical_issues': [],
            'performance_bottlenecks': [],
            'data_inconsistencies': [],
            'function_accessibility_gaps': [],
            'recommended_actions': []
        }
        
        # Critical issues from email analysis
        if email_insights['function_data_gaps']:
            optimization_report['critical_issues'].extend(email_insights['function_data_gaps'])
        
        # Performance bottlenecks from flow analysis
        if flow_analysis['staging_bottlenecks']:
            optimization_report['performance_bottlenecks'].extend(flow_analysis['staging_bottlenecks'])
        
        # Data inconsistencies
        if flow_analysis['data_quality_issues']:
            optimization_report['data_inconsistencies'].extend(flow_analysis['data_quality_issues'])
        
        # Function accessibility (functions with data but no menu access)
        functions_with_data = [f for f, data in function_relationships.items() 
                              if data['reads_from_sheets'] and not f.startswith('show')]
        
        # Check which of these are missing from menus (simplified check)
        menu_functions = re.findall(r'\.addItem\([^,]+,\s*[\'"`]([^\'"`]+)[\'"`]\)', self.script_content)
        
        for func in functions_with_data:
            if func not in menu_functions:
                optimization_report['function_accessibility_gaps'].append(
                    f"{func} processes data but not accessible via menu"
                )
        
        # Generate specific recommendations
        recommendations = []
        
        # Email processing recommendations
        if 'domain is not defined' in str(email_insights['failed_parsing_patterns']):
            recommendations.append("IMMEDIATE: Fix domain extraction in _extractEmailDomain() function")
        
        # Learning data recommendations
        if email_insights['learning_effectiveness'].get('unique_hub_patterns', 0) > 0:
            recommendations.append("HIGH: Execute consolidateIntelligentSheets() to merge learning data")
        
        # Flow recommendations
        if flow_analysis['processing_efficiency'].get('categorization_rate', 100) < 80:
            recommendations.append("MEDIUM: Improve categorization logic in learnCategoriesFromTransactions()")
        
        # Accessibility recommendations
        if len(optimization_report['function_accessibility_gaps']) > 5:
            recommendations.append("LOW: Add key processing functions to menus for easier debugging")
        
        optimization_report['recommended_actions'] = recommendations
        
        # Display summary
        print("\n🎯 OPTIMIZATION SUMMARY:")
        print(f"   Critical Issues: {len(optimization_report['critical_issues'])}")
        print(f"   Performance Bottlenecks: {len(optimization_report['performance_bottlenecks'])}")
        print(f"   Data Inconsistencies: {len(optimization_report['data_inconsistencies'])}")
        print(f"   Function Access Gaps: {len(optimization_report['function_accessibility_gaps'])}")
        
        print(f"\n💡 TOP RECOMMENDATIONS:")
        for i, rec in enumerate(recommendations[:5], 1):
            print(f"   {i}. {rec}")
        
        return {
            'email_insights': email_insights,
            'flow_analysis': flow_analysis,
            'function_relationships': function_relationships,
            'optimization_report': optimization_report
        }
    
    def _extract_domain(self, email_string):
        """Extract domain from email string"""
        if pd.isna(email_string):
            return 'unknown'
        try:
            if '@' in str(email_string):
                domain = str(email_string).split('@')[-1].strip('>')
                return domain
        except:
            pass
        return 'unknown'
    
    def _find_domain_specific_functions(self, domain):
        """Find functions that handle specific email domains"""
        domain_clean = domain.replace('.', '\\.').lower()
        pattern = fr'{domain_clean}|{domain_clean.split("\.")[0]}'
        return re.findall(pattern, self.script_content.lower())
    
    def generate_html_report(self, results):
        """Generate a formatted HTML report"""
        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Finance System Analysis Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }}
        .section {{ margin: 20px 0; padding: 15px; border-left: 4px solid #3498db; background: #f8f9fa; }}
        .critical {{ border-left-color: #e74c3c; }}
        .success {{ border-left-color: #27ae60; }}
        .warning {{ border-left-color: #f39c12; }}
        ul {{ line-height: 1.6; }}
        .metric {{ font-weight: bold; color: #2c3e50; }}
        pre {{ background: #f4f4f4; padding: 10px; border-radius: 3px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🔬 Comprehensive Finance System Analysis</h1>
        <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    </div>
    
    <div class="section success">
        <h2>📊 System Health Summary</h2>
        <ul>
            <li class="metric">Total Functions: {results.get('function_count', 'N/A')}</li>
            <li class="metric">Email Processing Functions: {len(results.get('email_functions', []))}</li>
            <li class="metric">ML Learning Functions: {len(results.get('ml_functions', []))}</li>
            <li class="metric">Success Rate: {results.get('success_rate', 0):.1f}%</li>
        </ul>
    </div>
    
    <div class="section critical">
        <h2>🚨 Critical Issues</h2>
        <ul>
"""
        
        # Add critical issues
        for issue in results.get('critical_issues', []):
            html += f"            <li>{issue}</li>\n"
        
        html += """        </ul>
    </div>
    
    <div class="section warning">
        <h2>💡 Optimization Recommendations</h2>
        <ul>
"""
        
        # Add recommendations  
        for rec in results.get('optimization_recommendations', []):
            html += f"            <li>{rec}</li>\n"
        
        html += """        </ul>
    </div>
    
    <div class="section">
        <h2>📧 Email Processing Architecture</h2>
        <p>Functions handling email processing:</p>
        <ul>
"""
        
        # Add email functions
        for func in results.get('email_functions', []):
            html += f"            <li><code>{func}()</code></li>\n"
        
        html += """        </ul>
    </div>
    
    <div class="section">
        <h2>🤖 Machine Learning System</h2>
        <p>Functions managing ML learning:</p>
        <ul>
"""
        
        # Add ML functions
        for func in results.get('ml_functions', []):
            html += f"            <li><code>{func}()</code></li>\n"
        
        html += """        </ul>
    </div>
    
</body>
</html>"""
        
        return html
    
    def run_comprehensive_analysis(self):
        """Run the complete comprehensive analysis"""
        print("🔬 COMPREHENSIVE FINANCE SYSTEM ANALYZER")
        print("=" * 50)
        print(f"📅 Analysis Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        if not self.load_all_data():
            return None
        
        # Run comprehensive analysis
        results = self.generate_system_optimization_report()
        
        # Save detailed results
        output_file = 'generated-reports/comprehensive_system_analysis.json'
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        # Generate HTML report for better readability
        html_report = self.generate_html_report(results)
        html_file = 'generated-reports/comprehensive_analysis_report.html'
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_report)
        
        print(f"\n💾 Comprehensive analysis saved to: {output_file}")
        print(f"💾 HTML report saved to: {html_file}")
        
        return results

def main():
    excel_file = None
    script_file = "C:\\Users\\jstre\\Documents\\GitHub\\Budgetting-Code\\01-Core-Scripts\\finance_automation_v10.gs"
    
    # Auto-detect Excel file
    import os
    downloads_dir = os.path.expanduser("~/Downloads")
    excel_files = [f for f in os.listdir(downloads_dir) 
                  if f.lower().endswith(('.xlsx', '.xls')) and 'budget' in f.lower()]
    
    if excel_files:
        excel_file = os.path.join(downloads_dir, max(excel_files, key=lambda x: os.path.getmtime(os.path.join(downloads_dir, x))))
        print(f"🔍 Auto-detected Excel: {os.path.basename(excel_file)}")
    else:
        print("❌ No budget Excel files found")
        return
    
    analyzer = ComprehensiveSystemAnalyzer(excel_file, script_file)
    results = analyzer.run_comprehensive_analysis()
    
    if results:
        print("\n🎉 COMPREHENSIVE ANALYSIS COMPLETE!")
        print("This analysis reveals the deep relationships between your data and email processing logic.")

if __name__ == "__main__":
    main()
