# 📊 Excel Analyzer with Automated File Management

## Quick Start

```bash
# Install dependencies
npm install

# Run analysis with automatic file management
npm run analyze

# Manual cleanup (if needed)
npm run clean
```

## 🎯 Features

### ✅ **Smart Analysis**
- **Streamlined System Detection**: Automatically detects new Google Apps Script architecture
- **Legacy System Support**: Full backward compatibility with older systems
- **Health Monitoring**: Real-time system health assessment
- **Migration Guidance**: Clear upgrade recommendations

### 🗂️ **Automated File Management** (NEW!)
- **Zero Maintenance**: Automatic cleanup after each analysis
- **Smart Archiving**: Previous outputs preserved with timestamps
- **Temp File Cleanup**: Automatic removal of processing files
- **Configurable Retention**: Customizable file age thresholds

## 📁 File Structure

```
Excel Analyzer/
├── excel-analyzer.js              # Main analyzer with file management
├── FILE-MANAGEMENT-GUIDE.md       # Detailed file management documentation
├── file-management-config.json    # Configuration settings
├── package.json                   # Dependencies and scripts
├── finance-analysis.json          # Current analysis (auto-managed)
├── finance-report.md              # Current report (auto-managed)
└── archive/                       # Auto-managed historical data
```

## 🚀 Usage Examples

### **Basic Analysis**
```bash
# Place your Excel file in this directory
# Run analysis - file management is automatic
npm run analyze
```

### **Programmatic Usage**
```javascript
const ExcelAnalyzer = require('./excel-analyzer.js');
const analyzer = new ExcelAnalyzer();

// Full managed analysis (recommended)
const result = await analyzer.runManagedAnalysis();

// Custom file analysis
const result = await analyzer.runManagedAnalysis('./my-file.xlsx');
```

## 📊 Output Files

### **Always Available**
- `finance-analysis.json` - Detailed analysis data
- `finance-report.md` - Human-readable report

### **Automatically Managed**
- Previous outputs archived to `./archive/`
- Temporary files cleaned up automatically
- Old archives removed after 30 days

## ⚙️ Configuration

### **File Management Settings**
Edit `file-management-config.json`:

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

### **Available Scripts**
- `npm run analyze` - Run analysis with automatic file management
- `npm run clean` - Manual cleanup (if needed)

## 🔍 System Detection

The analyzer automatically detects your system type:

### **Streamlined System** ✅
- Uses `System_Analysis` and `Excel_Analyzer_Output` sheets
- Optimized performance and clean data flow
- Enhanced health monitoring

### **Legacy System** ⚠️
- Supports older multi-sheet architecture
- Provides migration guidance
- Backward compatible analysis

## 📈 Benefits

### **For Streamlined Systems**
- Real-time health monitoring
- Integration metrics tracking
- Unified event analysis
- Performance optimization insights

### **For Legacy Systems**
- Migration path recommendations
- Legacy component identification
- Upgrade benefits explanation
- Compatibility maintenance

### **File Management**
- Zero-maintenance workspace
- Automatic archiving of historical data
- Intelligent temp file cleanup
- Configurable retention policies

## 🔧 Troubleshooting

### **No Excel Files Found**
```
📁 No Excel files found in current directory.
💡 Please place your Excel file in this folder and run again.
```
**Solution**: Copy your Excel file (.xlsx, .xls, .csv) to this directory

### **Analysis Fails**
- File management still completes automatically
- Check `.last-cleanup.json` for cleanup status
- Previous outputs safely archived

### **Custom Configuration**
- Modify `file-management-config.json` for custom settings
- See `FILE-MANAGEMENT-GUIDE.md` for detailed options

## 📚 Documentation

- **[FILE-MANAGEMENT-GUIDE.md](./FILE-MANAGEMENT-GUIDE.md)** - Complete file management documentation
- **[INTEGRATION-COMPLETE.md](./INTEGRATION-COMPLETE.md)** - Integration with Google Apps Script system

## 🎉 Recent Updates

### **v2.0 - Automated File Management System**
- ✅ Automatic pre/post-analysis cleanup
- ✅ Smart archiving with timestamps
- ✅ Configurable retention policies
- ✅ Zero-maintenance operation
- ✅ Backward compatible with existing workflows

This system ensures your workspace stays clean and organized automatically, eliminating manual file management while preserving important historical data!
