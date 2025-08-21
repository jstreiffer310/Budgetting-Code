# 🔍 Quick Excel Analyzer

Easy-to-use financial intelligence tool for analyzing Excel files from your Downloads folder.

## 🚀 Quick Start

### Windows Users (Easiest)

1. **Double-click** `run_excel_analyzer.bat` 
2. Select your Excel file from the Downloads folder
3. Get instant financial intelligence insights!

### PowerShell Users (Recommended)

```powershell
# Interactive mode
.\run_excel_analyzer.ps1

# Auto-install dependencies
.\run_excel_analyzer.ps1 -AutoInstall
```

### Advanced Users

```bash
# Direct Node.js execution
node quick_excel_analyzer.js
```

## 📋 Requirements

- **Node.js** (automatically checked and guided installation)
- **Excel files** in your Downloads folder (`.xlsx`, `.xls`)
- **ExcelJS** package (automatically installed if missing)

## 🧠 What It Analyzes

### Diagnostic Sheets
- **Failed_Parsing** - Email parsing errors and patterns
- **AuditLog** - System errors and warnings
- **Learning_Hub** - AI learning patterns and success rates
- **Diagnostic_Hub** - Unified diagnostic insights

### Financial Intelligence
- ✅ **System Health** assessment (HEALTHY/STABLE/DEGRADED/CRITICAL)
- 🔍 **Error Pattern** recognition across domains
- 📊 **Success Rate** calculations
- 💡 **Actionable Recommendations**
- 🌐 **Email Domain** analysis
- 📈 **Trend Analysis** and predictions

## 📊 Sample Output

```
🔍 QUICK EXCEL ANALYZER - Financial Intelligence Tool
============================================================

📁 Excel files found in Downloads:
1. My Budget (7).xlsx
   📅 8/21/2025 2:30:15 PM | 📏 2.3MB

🎯 Select file (1-1) or 'q' to quit: 1

🔍 Analyzing: My Budget (7).xlsx
============================================================
📊 Found 10 worksheets:

🔍 Sheet 1: Failed_Parsing (Diagnostic)
   📏 40 rows × 10 columns
   📋 Headers: Timestamp, EmailId, From, Subject...
   ⚠️  Errors: 40 | ✅ Success: 0
   🌐 Email domains: 3

🧠 FINANCIAL INTELLIGENCE INSIGHTS
============================================================
🔴 System Health: CRITICAL
📊 Total Errors: 40
✅ Total Success: 0
🔍 Diagnostic Sheets: 3
📈 Data Sheets: 7

🚨 Critical Issues:
   • Failed_Parsing: 40 errors (HIGH_ERROR_RATE)

💡 Recommendations:
   🚨 URGENT: Address critical system errors immediately
   🔧 Fix error patterns - more failures than successes detected
   📧 Review email parsing for multiple domains
```

## 🔗 Integration with Finance Automation

This tool integrates seamlessly with your Google Apps Script finance automation:

1. **Identifies Issues** in your Excel exports
2. **Provides Context** for failed parsing errors
3. **Suggests Solutions** based on error patterns
4. **Tracks Progress** over time

### Related Functions in Your Finance Script

```javascript
// Use these functions in your Google Apps Script
consolidateDiagnosticData()        // Merge all diagnostic data
runConsolidatedAnalysis()          // Get system health report
generateExcelAnalyzerReport()      // Create detailed reports
demonstrateUnifiedDiagnostics()    // Full system demonstration
```

## 🆚 Why This vs ExcelJS Alone?

| Feature | Raw ExcelJS | Our Quick Analyzer |
|---------|-------------|-------------------|
| Basic Excel Reading | ✅ | ✅ |
| **Financial Context** | ❌ | ✅ **Domain-Specific** |
| **Error Intelligence** | ❌ | ✅ **Pattern Recognition** |
| **System Health** | ❌ | ✅ **Health Assessment** |
| **Recommendations** | ❌ | ✅ **Actionable Insights** |
| **Domain Analysis** | ❌ | ✅ **Email Domain Tracking** |

## 🛠️ Troubleshooting

### "Node.js not found"
Install Node.js from [nodejs.org](https://nodejs.org/)

### "ExcelJS not found"
The tool will offer to install it automatically, or run:
```bash
npm install exceljs
```

### "No Excel files found"
- Ensure files are in your Downloads folder
- Supported formats: `.xlsx`, `.xls`
- Try refreshing the Downloads folder

### PowerShell Execution Policy
If you get execution policy errors:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 🔮 Future Enhancements

- 📱 Web interface for cross-platform usage
- 📊 Visual charts and graphs
- 🔄 Real-time monitoring integration
- 📧 Email integration for automated reports
- 🤖 Enhanced AI pattern recognition

---

**Made with ❤️ for financial intelligence and budget automation**
