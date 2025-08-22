#!/usr/bin/env python3
"""
Report Viewer - Quick access to generated analysis reports
"""

import os
import webbrowser
import subprocess

def open_reports_directory():
    """Open the generated reports directory"""
    reports_dir = "generated-reports"
    if os.path.exists(reports_dir):
        os.startfile(reports_dir)
        print(f"📂 Opened reports directory: {reports_dir}")
    else:
        print("❌ Reports directory not found")

def open_html_report():
    """Open the HTML analysis report in browser"""
    html_file = os.path.join("generated-reports", "comprehensive_analysis_report.html")
    if os.path.exists(html_file):
        webbrowser.open(f'file://{os.path.abspath(html_file)}')
        print(f"🌐 Opened HTML report in browser")
    else:
        print("❌ HTML report not found")

def open_checklist():
    """Open the action checklist"""
    checklist_file = os.path.join("generated-reports", "critical_fixes_checklist.md")
    if os.path.exists(checklist_file):
        os.startfile(checklist_file)
        print(f"📋 Opened action checklist")
    else:
        print("❌ Action checklist not found")

def main():
    print("📊 FINANCE SYSTEM REPORTS VIEWER")
    print("=" * 40)
    
    while True:
        print("\nSelect an option:")
        print("1. 📂 Open reports directory")
        print("2. 🌐 View HTML analysis report")
        print("3. 📋 View action checklist")
        print("4. 🚀 Run comprehensive analysis")
        print("5. 🔧 Apply critical fixes")
        print("0. Exit")
        
        choice = input("\nEnter choice (0-5): ").strip()
        
        if choice == "1":
            open_reports_directory()
        elif choice == "2":
            open_html_report()
        elif choice == "3":
            open_checklist()
        elif choice == "4":
            os.system("python comprehensive_system_analyzer.py")
        elif choice == "5":
            os.system("python apply_critical_fixes.py")
        elif choice == "0":
            break
        else:
            print("❌ Invalid choice")

if __name__ == "__main__":
    main()
