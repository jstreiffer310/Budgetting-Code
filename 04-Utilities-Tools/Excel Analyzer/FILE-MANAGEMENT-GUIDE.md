# 🗂️ Automated File Management System

## Overview

The Excel Analyzer now includes a comprehensive **Automated File Management System** that prevents accumulation of unnecessary files after each analysis run. This system ensures your workspace stays clean and organized without manual intervention.

## 🎯 Key Features

### ✅ **Pre-Analysis Cleanup**
- Archives existing output files before creating new ones
- Cleans temporary processing files
- Ensures required directories exist
- Prepares clean workspace for analysis

### ✅ **Post-Analysis Organization**
- Timestamps output files for tracking
- Removes temporary processing files
- Cleans old archived files based on age
- Generates cleanup summary

### ✅ **Intelligent File Categories**

#### 📊 **Current Output Files** (Always Kept)
- `finance-analysis.json` - Detailed analysis data
- `finance-report.md` - Readable analysis report

#### 📦 **Automatic Archiving**
Previous outputs are automatically archived with timestamps:
- `finance-analysis-2025-08-21T14-30-15.json`
- `finance-report-2025-08-21T14-30-15.md`

#### 🗑️ **Temporary Files** (Auto-Cleaned)
- `temp-analysis.json`
- `processing-log.txt`
- `debug-output.json`
- `debug-*.json`
- `temp-*.json`
- `processing-*.log`

## 🚀 How It Works

### **Automatic Mode** (Default)
```javascript
const analyzer = new ExcelAnalyzer();
await analyzer.runManagedAnalysis(); // Includes full file management
```

### **Manual Control**
```javascript
const analyzer = new ExcelAnalyzer();

// Pre-analysis cleanup
await analyzer.preAnalysisCleanup();

// Your analysis code here
const analysis = analyzer.analyzeFinanceData();

// Post-analysis cleanup
await analyzer.postAnalysisCleanup();
```

## 📋 File Lifecycle

```
1. 🧹 PRE-ANALYSIS
   ├── Archive existing outputs → ./archive/
   ├── Clean temporary files
   └── Ensure directories exist

2. 📊 ANALYSIS
   ├── Process Excel data
   ├── Generate insights
   └── Create output files

3. 🗂️ POST-ANALYSIS
   ├── Timestamp current outputs
   ├── Clean temporary files
   ├── Remove old archives (30+ days)
   └── Generate cleanup summary
```

## ⚙️ Configuration

### **Default Settings**
- **Archive Retention**: 30 days
- **Current Output Retention**: 7 days  
- **Temp File Retention**: 1 day
- **Archive Directory**: `./archive/`

### **Customization**
Edit `file-management-config.json` to customize:

```json
{
  "archiveSettings": {
    "retentionDays": 30,
    "enabled": true
  },
  "ageThresholds": {
    "archivedFiles": 30,
    "currentOutputs": 7,
    "tempFiles": 1
  }
}
```

## 📁 Directory Structure

```
Excel Analyzer/
├── excel-analyzer.js          # Main analyzer with file management
├── file-management-config.json # Configuration settings
├── finance-analysis.json      # Current analysis (auto-managed)
├── finance-report.md          # Current report (auto-managed)
├── archive/                   # Auto-managed archive
│   ├── finance-analysis-2025-08-20T10-15-30.json
│   ├── finance-report-2025-08-20T10-15-30.json
│   └── [older files auto-deleted after 30 days]
└── .last-cleanup.json        # Cleanup status (auto-generated)
```

## 🎉 Benefits

### ✨ **Zero Maintenance**
- No manual file cleanup required
- Automatic organization after each run
- Intelligent archiving preserves history

### 📦 **Space Efficient**
- Old files automatically removed
- Temporary files cleaned immediately
- Configurable retention periods

### 🔍 **Easy Navigation**
- Current outputs always in predictable locations
- Historical data properly archived
- No clutter in working directory

### 🛡️ **Data Safety**
- Previous outputs archived before deletion
- Configurable retention periods
- Cleanup summary for transparency

## 🔧 Advanced Usage

### **Custom File Patterns**
Add custom temporary file patterns:

```javascript
const config = analyzer.getFileManagementConfig();
config.alwaysCleanup.push('my-custom-temp-*.json');
```

### **Disable Features**
```javascript
// Disable archiving
config.archiveSettings.enabled = false;

// Disable automatic cleanup
config.features.postAnalysisCleanup = false;
```

### **Custom Analysis with Management**
```javascript
const analyzer = new ExcelAnalyzer();

// Analyze specific file with full file management
const result = await analyzer.runManagedAnalysis('./my-specific-file.xlsx');
```

## 📊 Monitoring

### **Cleanup Summary**
Check `.last-cleanup.json` for last cleanup status:

```json
{
  "timestamp": "2025-08-21T14:30:15.123Z",
  "status": "complete",
  "currentFiles": ["finance-analysis.json", "finance-report.md"],
  "archiveExists": true,
  "cleanupEnabled": true
}
```

### **Console Output**
The system provides clear feedback:

```
🧹 Pre-analysis cleanup...
📦 Archived: finance-analysis.json → finance-analysis-2025-08-21T14-30-15.json
🗑️ Cleaned: temp-analysis.json
✅ Workspace prepared for analysis

🗂️ Post-analysis file management...
🗑️ Cleaned 3 old archived file(s)
✅ File management complete
```

## 🚨 Important Notes

1. **Archive Safety**: Files are copied to archive before deletion
2. **Configurable**: All settings can be customized
3. **Error Tolerant**: Analysis continues even if cleanup fails
4. **Backward Compatible**: Existing workflows unchanged

This system ensures your Excel Analyzer workspace stays clean and organized automatically, eliminating the need for manual file management while preserving important historical data.
