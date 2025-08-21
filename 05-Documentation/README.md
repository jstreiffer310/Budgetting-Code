# Budgetting-Code

## Overview
Comprehensive Google Apps Script finance automation system with email parsing, learning capabilities, and robust CSV/PDF import functionality.

## 🆕 Latest Updates (v10)

### Enhanced Import System
- **Fixed 1969 Date Bug**: Resolved CSV date parsing issues
- **PDF Statement Processing**: OCR-based transaction extraction
- **Vendor Learning**: Automatic merchant categorization from imports
- **Batch Import**: Process multiple files simultaneously
- **Auto-Detection**: Smart format recognition for unknown files
- **Chronological Sorting**: All transactions automatically ordered by date (most recent first)

### Learning Framework
- **Pattern Recognition**: Self-improving transaction categorization
- **Cross-Validation**: Validates learned patterns for accuracy
- **Professional Language**: Cleaned up terminology for business use
- **Training Data**: Enhanced learning from imported statements

### Sheet Organization
- **Consolidated Dashboard**: NetWorthHistory merged into main Dashboard
- **Optimized Layout**: 5 visible sheets, 5 hidden for clean interface
- **Learning Hub**: Centralized pattern storage and analysis

## Core Features

### 1. 🏦 ACCOUNT MANAGEMENT
- Only accounts listed in MY_ACCOUNTS will have balances auto-updated
- No more phantom "Cash" account issues
- Robust account name normalization with aliases

### 2. 📧 EMAIL PARSING
- **Multi-Bank Support**: CIBC, PC Financial, PayPal, Interac, Wealthsimple
- **Intelligent Parsing**: Subject-line priority over body parsing
- **Transaction Types**: Payments, purchases, transfers, investments
- **Robust Extraction**: Amount and merchant identification

### 3. 📊 HOLDINGS INTEGRATION
- Holdings sheet tracks: Account, Ticker, Shares, Price, Value
- GOOGLEFINANCE formulas auto-update prices
- Account balances reflect total holding values
- Trade emails automatically update share quantities

### 4. 🏷️ SMART CATEGORIZATION
- **Learning System**: Improves categorization over time
- **Manual Override**: Respects user-assigned categories
- **Multiple Formats**: Supports various keyword formats
- **Vendor Recognition**: Learns from imported statement data

### 5. 📥 ENHANCED IMPORT SYSTEM
- **CSV Support**: CIBC, PC Financial, Generic bank formats
- **PDF Processing**: OCR text extraction from bank statements
- **Date Parsing**: Fixed 1969 date issues with robust parsing
- **Training Integration**: Extracts learning data from imports
- **Batch Processing**: Handle multiple files efficiently

### 6. 🔗 STAGING & PAIRING
- 48-hour pairing window for transfers
- Automatic cleanup of stale entries
- Robust duplicate detection

### 7. 📈 DASHBOARD
- Single pie chart (COUNT or AMOUNT mode)
- 30-day analysis period with Net Worth tracking
- Import system status and capabilities
- Summary statistics and trend analysis

### 8. 🛠️ ERROR HANDLING & MAINTENANCE
- Comprehensive logging throughout
- Recovery functions for common issues
- Data integrity validation tools
- Built-in testing and optimization

## Import System Usage

### CSV Import
```javascript
// Basic CSV import
const result = processCSVStatement(csvData, "Account Name");

// Test date parsing
testDateParsing(); // Verify no 1969 date issues
```

### PDF Import
```javascript
// PDF statement processing
const pdfBlob = DriveApp.getFileById('file-id').getBlob();
const result = processPDFStatement(pdfBlob, "Account Name");
```

### Batch Import
```javascript
// Multiple file processing
const files = [
  { blob: csvBlob, name: "january.csv", account: "Checking" },
  { blob: pdfBlob, name: "statement.pdf", account: "Credit Card" }
];
const result = batchImportFiles(files);
```

## Testing & Validation

### Quick Tests
```javascript
quickTest();                    // Complete system test
testCompleteImportSystem();     // Import system validation
testDateParsing();             // Verify 1969 date fix
testImportSystem();            // Add status to Dashboard
runCompleteSortingTest();      // Transaction sorting verification
```

### Learning System Tests
```javascript
testLearningSystem();          // Validate pattern recognition
_crossValidateLearning();      // Check learning accuracy
```

## Sheet Organization

### Visible Sheets (5)
- **Dashboard**: Main overview and controls
- **Transactions**: All financial transactions
- **Accounts**: Account balances and management
- **Holdings**: Investment tracking
- **Categories**: Category management

### Hidden Sheets (5)
- **Learning_Hub**: Pattern storage and analysis
- **Failed_Parsing**: Error tracking and recovery
- **Staging**: Transfer pairing workspace
- **AuditLog**: System operation history
- **CSV_Import**: Import processing workspace

## Configuration

### Supported Banks/Services
- CIBC (Aventura, Dividend cards)
- PC Financial (Banking, Credit)
- PayPal (Payments, Transfers)
- Interac e-Transfer
- Wealthsimple (Investments)

### File Formats
- **CSV**: Auto-detected profiles with date parsing
- **PDF**: OCR text extraction with pattern recognition
- **Future**: QIF, OFX, Bank APIs

## Professional Features

- **Business Ready**: Professional terminology and presentation
- **Scalable**: Handles large transaction volumes
- **Reliable**: Comprehensive error handling and recovery
- **Maintainable**: Well-documented code with testing framework
- **Secure**: No external dependencies, Google Workspace native

## Troubleshooting

### Common Issues
- **1969 Dates**: ✅ Fixed with enhanced date parsing
- **Import Failures**: Check file format and account names
- **Learning Accuracy**: Review patterns in Learning_Hub sheet
- **Performance**: Use batch processing for large imports

### Recovery Functions
```javascript
_recoverFromErrors();          // General error recovery
_validateDataIntegrity();      // Check data consistency
showAllSheets();              // Unhide all sheets for debugging
sortAllTransactions();         // Organize all transactions by date
getTransactionOrderStats();    // Check chronological order status
```

## Documentation
- **IMPORT_SYSTEM_DOCS.md**: Detailed import system guide
- **test_import_system.gs**: Comprehensive testing suite
- **Inline Comments**: Extensive code documentation

---

The system is designed to be robust, maintainable, and handle edge cases gracefully while providing professional-grade financial automation.
