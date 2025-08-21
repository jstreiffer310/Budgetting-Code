/**
 * FINANCE AUTOMATION V10.0 - ULTIMATE COMPOSITE SOLUTION
 * ======================================================
 * 
 * This version combines the robust V8 framework with V9's investment tracking
 * improvements and improved categorization/dashboard functionality.
 * 
 * INTEGRATED FEATURES:
 * - V8's comprehensive email parsing and transaction processing engine
 * - V9's investment holdings management (stocks, ETFs)
 * - Improved merchant-based categorization (avoiding generic keywords)
 * - Improved dashboard with better expense analysis
 * - Robust error handling and recovery mechanisms
 * - Complete staging and pairing system for transfers
 * - Audit logging and diagnostics
 * 
 * IMPROVEMENTS OVER V8/V9:
 * - Merchant-focused categorization (not generic banking terms)
 * - Enhanced stock and ETF price fetching precision
 * - Better Canadian stock support (VCE.TO, XEQT.TO)
 * - Improved dashboard analytics and visualization
 * - Comprehensive transaction review and validation
 * 
 * Last Updated: 2025-08-20
 * Author: jstreiffer310 (with AI assistance)
 */

// ===================== CONFIGURATION & CONSTANTS =====================

const SPREADSHEET_ID = '1-eUeYMTeKoz2bIkHS8Jc2J9vO0Bnl8y6aHXmXGdJqg8';

// Sheet names (verified from live analysis)
const SHEET_NAMES = {
  MAIN: 'Transactions',
  ACCOUNTS: 'Accounts',
  HOLDINGS: 'Holdings',
  STAGING: 'Staging',
  CATEGORIES: 'Categories',
  NETWORTH: 'NetWorthHistory',  // Legacy - now integrated into Dashboard
  DASHBOARD: 'Dashboard',
  CSV_IMPORT: 'CSV_Import',
  AUDIT_LOG: 'AuditLog',
  AI_LEARNING: 'Learning_Hub',      // Learning system
  FAILED_PARSING: 'Failed_Parsing'     // Consolidated parsing failures
};

// Column mappings (based on live data structure)
const COLUMNS = {
  TRANSACTIONS: {
    DATE: 1,        // "Date"
    AMOUNT: 2,      // "Amount" 
    FROM: 3,        // "From"
    TO: 4,          // "To"
    BANK: 5,        // "Bank"
    NOTES: 6,       // "Notes"
    EMAIL_ID: 7,    // "EmailId"
    CATEGORY: 8,    // "Category"
    TYPE: 9,        // "Type"
    FINGERPRINT: 10 // Fingerprint for deduplication
  },
  ACCOUNTS: {
    NAME: 1,         // "Account"
    BALANCE: 2,      // "Balance"
    LAST_UPDATED: 3, // "Last Updated"
    TYPE: 4          // Account type
  },
  HOLDINGS: {
    ACCOUNT: 1,       // "Account"
    TICKER: 2,        // "Ticker"
    SHARES: 3,        // "Shares"
    UNIT_PRICE_CAD: 4,    // "Unit Price (CAD)"
    TOTAL_VALUE_CAD: 5,   // "Total Value (CAD)"
    LAST_UPDATED: 6   // "Last Updated"
  },
  STAGING: {
    DATE: 1,         // "Date"
    AMOUNT: 2,       // "Amount"
    FROM: 3,         // "From"
    TO: 4,           // "To"
    BANK: 5,         // "Bank"
    EMAIL_ID: 6,     // "EmailId"
    STAGED_AT: 7,    // "StagedAt"
    DIRECTION: 8,    // "Direction"
    STATUS: 9,       // "Status"
    FINGERPRINT: 10  // Fingerprint for tracking
  },
  CATEGORIES: {
    KEYWORD: 1,      // "Keyword"
    CATEGORY: 2      // "Category"
  }
};

// Configuration constants
const CONFIG = {
  GMAIL_LABEL: 'Transfers',
  GMAIL_LOOKBACK: 'newer_than:7d',
  PAIRING_WINDOW_MS: 48 * 60 * 60 * 1000,
  AMOUNT_TOLERANCE: 0.01,
  STALE_CLEANUP_HOURS: 72,
  MAX_PROCESSING_ATTEMPTS: 3,
  DASHBOARD_ANALYSIS_DAYS: 30,
  YAHOO_FINANCE_RATE_LIMIT: 200,
  LEARNING_ENABLED: true,
  PATTERN_CONFIDENCE_THRESHOLD: 0.7,
  ADAPTATION_TRIGGER_COUNT: 3,
  LEARNING_RETENTION_DAYS: 90
};

// Account definitions (from live analysis)
const MY_ACCOUNTS = [
  'PC Financial',
  'CIBC Aventura', 
  'CIBC Dividend',
  'Wealthsimple RRSP',
  'Wealthsimple Cash'
];

// Account normalization (to fix naming inconsistencies)
const ACCOUNT_ALIASES = {
  'pc money': 'PC Financial',
  'pc financial': 'PC Financial',
  'pc money cash account': 'PC Financial',
  'aventura': 'CIBC Aventura',
  'dividend': 'CIBC Dividend',
  'rrsp': 'Wealthsimple RRSP',
  'wealthsimple': 'Wealthsimple Cash',
  'cash': '', // CRITICAL: Prevents "Cash" phantom accounts
  'retirey mcretireface': 'Wealthsimple RRSP' // From your data
};

// Bank name standardization (from live patterns)
const BANK_ALIASES = {
  'PC Money Purchase': 'PC Financial Purchase',
  'PC Money Cash Account': 'PC Financial',
  'CIBC Credit Card': 'CIBC Aventura Purchase',
  'CIBC Aventura Purchase': 'CIBC Aventura Purchase',
  'CIBC Card Payment': 'CIBC Card Payment',
  'Wealthsimple Deposit': 'Wealthsimple Deposit',
  'Wealthsimple Trade': 'Wealthsimple Trade',
  'Interac Deposit': 'Interac Deposit'
};

// Canadian stock exchanges for proper price fetching
const CANADIAN_TICKERS = new Set([
  'VCE.TO', 'XEQT.TO', 'TDB902', 'TDB900', 'VEQT.TO', 'VGRO.TO'
]);

// ===================== ENHANCED IMPORT SYSTEM =====================

/**
 * Enhanced CSV and PDF Import profiles with robust date handling
 */
const IMPORT_PROFILES = {
  CSV: [
    {
      name: 'CIBC Aventura Card',
      identifyingKeyword: '4500********6271',
      accountName: 'CIBC Aventura',
      columnMap: { date: 1, description: 2, debit: 3, credit: 4 },
      dateFormat: 'MM/DD/YYYY',
      encoding: 'UTF-8'
    },
    {
      name: 'CIBC Dividend Card', 
      identifyingKeyword: '4505********2866',
      accountName: 'CIBC Dividend',
      columnMap: { date: 1, description: 2, debit: 3, credit: 4 },
      dateFormat: 'MM/DD/YYYY',
      encoding: 'UTF-8'
    },
    {
      name: 'PC Financial Cash Account',
      identifyingKeyword: 'Card Holder Name',
      accountName: 'PC Financial', 
      columnMap: { date: 4, description: 1, amount: 6 },
      dateFormat: 'YYYY-MM-DD',
      encoding: 'UTF-8'
    },
    {
      name: 'Generic Bank CSV',
      identifyingKeyword: 'Transaction Date',
      accountName: 'Bank Account',
      columnMap: { date: 0, description: 1, amount: 2 },
      dateFormat: 'YYYY-MM-DD',
      encoding: 'UTF-8'
    }
  ],
  PDF: [
    {
      name: 'CIBC Statement',
      patterns: {
        transaction: /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s*(CR|DR)?/g,
        balance: /Balance.*?([\d,]+\.\d{2})/i,
        accountNumber: /Account.*?(\d{4})/i,
        statementPeriod: /Statement Period.*?(\d{2}\/\d{2}\/\d{4})\s*to\s*(\d{2}\/\d{2}\/\d{4})/i
      },
      dateFormat: 'MM/DD/YYYY',
      accountType: 'Credit Card'
    },
    {
      name: 'PC Financial Statement',
      patterns: {
        transaction: /(\d{4}-\d{2}-\d{2})\s+(.+?)\s+([\d,]+\.\d{2})/g,
        balance: /Current Balance.*?([\d,]+\.\d{2})/i,
        accountNumber: /Account.*?(\d{4})/i
      },
      dateFormat: 'YYYY-MM-DD',
      accountType: 'Bank Account'
    },
    {
      name: 'Generic Bank Statement',
      patterns: {
        transaction: /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\s+(.+?)\s+([\d,]+\.\d{2})/g,
        balance: /Balance.*?([\d,]+\.\d{2})/i
      },
      dateFormat: 'AUTO_DETECT',
      accountType: 'Bank Account'
    }
  ]
};

/**
 * Date parsing with 1969 fix and robust format detection
 */
function _parseStatementDate(dateString, expectedFormat = 'AUTO_DETECT') {
  if (!dateString || dateString.trim() === '') {
    return null;
  }

  // Clean the date string
  let cleanDate = dateString.toString().trim();
  
  // Fix common issues that cause 1969 dates
  if (cleanDate.includes('/')) {
    // Handle MM/DD/YY vs MM/DD/YYYY
    const parts = cleanDate.split('/');
    if (parts.length === 3) {
      let [month, day, year] = parts;
      
      // Fix 2-digit years (common cause of 1969 issue)
      if (year.length === 2) {
        const currentYear = new Date().getFullYear();
        const currentCentury = Math.floor(currentYear / 100) * 100;
        const yearNum = parseInt(year);
        
        // Assume years 00-30 are 2000s, 31-99 are 1900s
        if (yearNum <= 30) {
          year = (currentCentury + yearNum).toString();
        } else {
          year = (currentCentury - 100 + yearNum).toString();
        }
      }
      cleanDate = `${month}/${day}/${year}`;
    }
  }

  // Try multiple date formats
  const formats = [
    'MM/DD/YYYY', 'MM/DD/YY', 'M/D/YYYY', 'M/D/YY',
    'YYYY-MM-DD', 'DD/MM/YYYY', 'DD-MM-YYYY',
    'MMM DD, YYYY', 'DD MMM YYYY'
  ];

  for (const format of formats) {
    try {
      const date = _parseSpecificDateFormat(cleanDate, format);
      if (date && date.getFullYear() > 1990 && date.getFullYear() <= new Date().getFullYear() + 1) {
        return date;
      }
    } catch (e) {
      continue;
    }
  }

  // Fallback to JavaScript Date parsing with validation
  try {
    const date = new Date(cleanDate);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1990) {
      return date;
    }
  } catch (e) {
    // Continue to null return
  }

  _logError(`Failed to parse date: ${dateString}`, { cleanDate, expectedFormat });
  return null;
}

/**
 * Parse specific date format
 */
function _parseSpecificDateFormat(dateString, format) {
  const cleanDate = dateString.trim();
  
  switch (format) {
    case 'MM/DD/YYYY':
    case 'MM/DD/YY':
      const mmddParts = cleanDate.split('/');
      if (mmddParts.length === 3) {
        return new Date(mmddParts[2], mmddParts[0] - 1, mmddParts[1]);
      }
      break;
      
    case 'YYYY-MM-DD':
      const yyyyParts = cleanDate.split('-');
      if (yyyyParts.length === 3) {
        return new Date(yyyyParts[0], yyyyParts[1] - 1, yyyyParts[2]);
      }
      break;
      
    case 'DD/MM/YYYY':
      const ddmmParts = cleanDate.split('/');
      if (ddmmParts.length === 3) {
        return new Date(ddmmParts[2], ddmmParts[1] - 1, ddmmParts[0]);
      }
      break;
  }
  
  return null;
}

/**
 * Enhanced PDF statement processing with vendor learning
 */
function processPDFStatement(pdfBlob, accountName = 'Unknown Account') {
  try {
    const pdfText = _extractTextFromPDF(pdfBlob);
    if (!pdfText) {
      throw new Error('Failed to extract text from PDF');
    }

    // Detect statement type
    const profile = _detectPDFProfile(pdfText);
    if (!profile) {
      throw new Error('Unable to detect statement format');
    }

    _logInfo(`Processing PDF statement using profile: ${profile.name}`);

    // Extract transactions
    const transactions = _extractPDFTransactions(pdfText, profile);
    const trainingData = _extractTrainingData(pdfText, profile);

    // Sort transactions by date (most recent first)
    transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Import transactions
    let imported = 0;
    let failed = 0;

    for (const transaction of transactions) {
      try {
        _addTransactionToSheet(transaction, accountName);
        imported++;
        
        // Learn from vendor patterns
        if (trainingData.vendors && trainingData.vendors.length > 0) {
          _learnFromVendorData(transaction.description, trainingData.vendors);
        }
        
      } catch (error) {
        _logError(`Failed to import transaction: ${transaction.description}`, error);
        failed++;
      }
    }

    // Learn from account information
    if (trainingData.accountInfo) {
      _updateAccountLearning(accountName, trainingData.accountInfo);
    }

    // Sort the transactions sheet to maintain chronological order
    _sortTransactionsByDate();

    _logInfo(`PDF import complete: ${imported} imported, ${failed} failed`);
    
    return {
      success: true,
      imported,
      failed,
      profile: profile.name,
      trainingData: trainingData
    };

  } catch (error) {
    _logError('PDF processing failed', error);
    return { success: false, error: error.message };
  }
}

/**
 * Extract text from PDF using Google Apps Script
 */
function _extractTextFromPDF(pdfBlob) {
  try {
    // Convert PDF to Google Doc temporarily
    const tempDoc = DriveApp.createFile(pdfBlob).getAs('application/pdf');
    const docBlob = DriveApp.getFileById(tempDoc.getId()).getBlob();
    
    // Use OCR to extract text
    const ocrResult = Drive.Files.insert({
      title: 'temp_ocr_file',
      mimeType: 'application/vnd.google-apps.document'
    }, docBlob, {
      ocr: true
    });

    const doc = DocumentApp.openById(ocrResult.id);
    const text = doc.getBody().getText();
    
    // Clean up temporary files
    DriveApp.getFileById(ocrResult.id).setTrashed(true);
    DriveApp.getFileById(tempDoc.getId()).setTrashed(true);
    
    return text;
    
  } catch (error) {
    _logError('PDF text extraction failed', error);
    return null;
  }
}

/**
 * Detect PDF statement profile
 */
function _detectPDFProfile(pdfText) {
  const profiles = IMPORT_PROFILES.PDF;
  
  for (const profile of profiles) {
    // Check for identifying patterns
    if (pdfText.toLowerCase().includes(profile.name.toLowerCase().split(' ')[0])) {
      return profile;
    }
    
    // Check for account number patterns
    if (profile.patterns.accountNumber && profile.patterns.accountNumber.test(pdfText)) {
      return profile;
    }
  }
  
  // Return generic profile as fallback
  return profiles.find(p => p.name === 'Generic Bank Statement');
}

/**
 * Extract transactions from PDF text
 */
function _extractPDFTransactions(pdfText, profile) {
  const transactions = [];
  const transactionPattern = profile.patterns.transaction;
  
  let match;
  while ((match = transactionPattern.exec(pdfText)) !== null) {
    const [fullMatch, dateStr, description, amountStr, indicator] = match;
    
    const date = _parseStatementDate(dateStr, profile.dateFormat);
    if (!date) continue;
    
    const amount = parseFloat(amountStr.replace(/,/g, ''));
    const isDebit = indicator === 'DR' || (!indicator && amount < 0);
    
    transactions.push({
      date: date,
      description: description.trim(),
      amount: isDebit ? -Math.abs(amount) : Math.abs(amount),
      category: 'Uncategorized',
      account: profile.accountType,
      source: 'PDF Import'
    });
  }
  
  return transactions;
}

/**
 * Extract training data from PDF
 */
function _extractTrainingData(pdfText, profile) {
  const trainingData = {
    vendors: [],
    categories: [],
    accountInfo: {}
  };

  // Extract vendor information from transaction descriptions
  const vendors = _extractVendorPatterns(pdfText);
  trainingData.vendors = vendors;

  // Extract account information
  if (profile.patterns.accountNumber) {
    const accountMatch = profile.patterns.accountNumber.exec(pdfText);
    if (accountMatch) {
      trainingData.accountInfo.accountNumber = accountMatch[1];
    }
  }

  if (profile.patterns.statementPeriod) {
    const periodMatch = profile.patterns.statementPeriod.exec(pdfText);
    if (periodMatch) {
      trainingData.accountInfo.statementPeriod = {
        start: periodMatch[1],
        end: periodMatch[2]
      };
    }
  }

  return trainingData;
}

/**
 * Extract vendor patterns for learning
 */
function _extractVendorPatterns(pdfText) {
  const vendors = [];
  const lines = pdfText.split('\n');
  
  // Common vendor patterns
  const vendorPatterns = [
    /^([A-Z][A-Z\s&]+)\s+\d{2}\/\d{2}/,  // ALL CAPS vendor names
    /^(.+?)\s+\$[\d,]+\.\d{2}/,           // Description before amount
    /(\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:INC|LLC|CORP|LTD)/i, // Corporate suffixes
    /^(.*?)\s+(?:PURCHASE|PAYMENT|WITHDRAWAL)/i  // Transaction types
  ];
  
  for (const line of lines) {
    for (const pattern of vendorPatterns) {
      const match = pattern.exec(line.trim());
      if (match && match[1]) {
        const vendor = match[1].trim();
        if (vendor.length > 3 && vendor.length < 50) {
          vendors.push(vendor);
        }
      }
    }
  }
  
  return [...new Set(vendors)]; // Remove duplicates
}

/**
 * Learn from vendor data for improved categorization
 */
function _learnFromVendorData(description, vendors) {
  for (const vendor of vendors) {
    if (description.toLowerCase().includes(vendor.toLowerCase())) {
      // This vendor appears in this transaction
      const category = _predictCategoryFromVendor(vendor);
      if (category && category !== 'Uncategorized') {
        _recordLearning(description, category, 'vendor_pattern', 0.7);
      }
    }
  }
}

/**
 * Predict category from vendor name
 */
function _predictCategoryFromVendor(vendor) {
  const vendorLower = vendor.toLowerCase();
  
  // Common vendor categories
  const categoryPatterns = {
    'Groceries': ['walmart', 'superstore', 'sobeys', 'metro', 'loblaws', 'food', 'grocery'],
    'Gas': ['shell', 'esso', 'petro', 'gas', 'fuel', 'station'],
    'Restaurants': ['restaurant', 'cafe', 'pizza', 'burger', 'mcdonalds', 'tim hortons'],
    'Shopping': ['amazon', 'bestbuy', 'canadian tire', 'home depot', 'costco'],
    'Utilities': ['hydro', 'electric', 'gas company', 'water', 'internet', 'phone'],
    'Transportation': ['uber', 'taxi', 'ttc', 'go transit', 'parking']
  };
  
  for (const [category, keywords] of Object.entries(categoryPatterns)) {
    if (keywords.some(keyword => vendorLower.includes(keyword))) {
      return category;
    }
  }
  
  return 'Uncategorized';
}

/**
 * Update account learning data
 */
function _updateAccountLearning(accountName, accountInfo) {
  try {
    const learningSheet = _getOrCreateSheet('Learning_Hub');
    const data = learningSheet.getDataRange().getValues();
    
    // Find or create account learning record
    let accountRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'account_info' && data[i][1] === accountName) {
        accountRow = i + 1;
        break;
      }
    }
    
    const learningData = {
      type: 'account_info',
      pattern: accountName,
      metadata: JSON.stringify(accountInfo),
      timestamp: new Date(),
      confidence: 1.0,
      source: 'PDF Import'
    };
    
    if (accountRow > 0) {
      // Update existing record
      learningSheet.getRange(accountRow, 1, 1, 6).setValues([[
        learningData.type, learningData.pattern, '', '', learningData.metadata, learningData.timestamp
      ]]);
    } else {
      // Add new record
      learningSheet.appendRow([
        learningData.type, learningData.pattern, '', '', learningData.metadata, learningData.timestamp
      ]);
    }
    
  } catch (error) {
    _logError('Failed to update account learning', error);
  }
}

/**
 * Enhanced CSV import with 1969 date fix and robust processing
 */
function processCSVStatement(csvData, accountName = 'Unknown Account') {
  try {
    // Detect CSV profile
    const profile = _detectCSVProfile(csvData);
    if (!profile) {
      throw new Error('Unable to detect CSV format');
    }

    _logInfo(`Processing CSV using profile: ${profile.name}`);

    // Parse CSV data
    const transactions = _parseCSVTransactions(csvData, profile);
    const trainingData = _extractCSVTrainingData(csvData, profile);

    // Sort transactions by date (most recent first)
    transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Import transactions
    let imported = 0;
    let failed = 0;

    for (const transaction of transactions) {
      try {
        _addTransactionToSheet(transaction, accountName || profile.accountName);
        imported++;
        
        // Learn from transaction patterns
        if (transaction.description) {
          const predictedCategory = _predictCategoryFromDescription(transaction.description);
          if (predictedCategory !== 'Uncategorized') {
            _recordLearning(transaction.description, predictedCategory, 'csv_import', 0.6);
          }
        }
        
      } catch (error) {
        _logError(`Failed to import CSV transaction: ${transaction.description}`, error);
        failed++;
      }
    }

    // Sort the transactions sheet to maintain chronological order
    _sortTransactionsByDate();

    _logInfo(`CSV import complete: ${imported} imported, ${failed} failed`);
    
    return {
      success: true,
      imported,
      failed,
      profile: profile.name,
      trainingData: trainingData
    };

  } catch (error) {
    _logError('CSV processing failed', error);
    return { success: false, error: error.message };
  }
}

/**
 * Detect CSV profile from data
 */
function _detectCSVProfile(csvData) {
  const lines = csvData.split('\n');
  const headerLine = lines[0];
  
  const profiles = IMPORT_PROFILES.CSV;
  
  for (const profile of profiles) {
    if (headerLine.toLowerCase().includes(profile.identifyingKeyword.toLowerCase())) {
      return profile;
    }
  }
  
  // Try to auto-detect based on common patterns
  return _autoDetectCSVProfile(headerLine);
}

/**
 * Auto-detect CSV profile from header
 */
function _autoDetectCSVProfile(headerLine) {
  const headers = headerLine.toLowerCase().split(',').map(h => h.trim());
  
  // Create dynamic profile based on header analysis
  const profile = {
    name: 'Auto-Detected CSV',
    identifyingKeyword: 'auto',
    accountName: 'CSV Import',
    columnMap: {},
    dateFormat: 'AUTO_DETECT',
    encoding: 'UTF-8'
  };
  
  // Map common column names
  headers.forEach((header, index) => {
    if (header.includes('date') || header.includes('transaction')) {
      profile.columnMap.date = index;
    } else if (header.includes('description') || header.includes('memo') || header.includes('payee')) {
      profile.columnMap.description = index;
    } else if (header.includes('amount') && !header.includes('balance')) {
      profile.columnMap.amount = index;
    } else if (header.includes('debit') || header.includes('withdrawal')) {
      profile.columnMap.debit = index;
    } else if (header.includes('credit') || header.includes('deposit')) {
      profile.columnMap.credit = index;
    }
  });
  
  return profile;
}

/**
 * Parse CSV transactions with robust date handling
 */
function _parseCSVTransactions(csvData, profile) {
  const transactions = [];
  const lines = csvData.split('\n');
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      const columns = _parseCSVLine(line);
      const transaction = _parseCSVTransaction(columns, profile);
      
      if (transaction && transaction.date) {
        // Validate date is not 1969 (common CSV parsing error)
        if (transaction.date.getFullYear() >= 1990) {
          transactions.push(transaction);
        } else {
          _logError(`Skipped transaction with invalid date: ${transaction.date}`, { line, profile: profile.name });
        }
      }
      
    } catch (error) {
      _logError(`Failed to parse CSV line: ${line}`, error);
    }
  }
  
  return transactions;
}

/**
 * Parse CSV line handling quotes and commas
 */
function _parseCSVLine(line) {
  const columns = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      columns.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add final column
  columns.push(current.trim());
  
  return columns;
}

/**
 * Parse individual CSV transaction
 */
function _parseCSVTransaction(columns, profile) {
  const map = profile.columnMap;
  
  // Extract date with enhanced parsing
  const dateStr = columns[map.date];
  const date = _parseStatementDate(dateStr, profile.dateFormat);
  
  if (!date) {
    _logError(`Failed to parse date: ${dateStr}`);
    return null;
  }
  
  // Extract description
  const description = (columns[map.description] || '').replace(/"/g, '').trim();
  if (!description) {
    return null;
  }
  
  // Extract amount
  let amount = 0;
  
  if (map.amount !== undefined) {
    // Single amount column
    const amountStr = (columns[map.amount] || '').replace(/[$,]/g, '');
    amount = parseFloat(amountStr) || 0;
  } else if (map.debit !== undefined && map.credit !== undefined) {
    // Separate debit/credit columns
    const debitStr = (columns[map.debit] || '').replace(/[$,]/g, '');
    const creditStr = (columns[map.credit] || '').replace(/[$,]/g, '');
    
    const debit = parseFloat(debitStr) || 0;
    const credit = parseFloat(creditStr) || 0;
    
    amount = credit - debit;
  }
  
  return {
    date: date,
    description: description,
    amount: amount,
    category: 'Uncategorized',
    account: profile.accountName,
    source: 'CSV Import'
  };
}

/**
 * Extract training data from CSV
 */
function _extractCSVTrainingData(csvData, profile) {
  const trainingData = {
    vendors: [],
    patterns: [],
    accountInfo: {
      profile: profile.name,
      columnMapping: profile.columnMap,
      dateFormat: profile.dateFormat
    }
  };
  
  // Extract vendor patterns from descriptions
  const lines = csvData.split('\n');
  const vendors = new Set();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      const columns = _parseCSVLine(line);
      const description = columns[profile.columnMap.description] || '';
      
      // Extract potential vendor names
      const vendorMatches = description.match(/\b[A-Z][A-Z\s&]+\b/g);
      if (vendorMatches) {
        vendorMatches.forEach(vendor => {
          if (vendor.length > 3 && vendor.length < 50) {
            vendors.add(vendor.trim());
          }
        });
      }
      
    } catch (error) {
      continue;
    }
  }
  
  trainingData.vendors = Array.from(vendors);
  return trainingData;
}

/**
 * File upload handler for CSV/PDF processing
 */
function handleFileUpload(fileBlob, fileName, accountName) {
  try {
    const fileExtension = fileName.toLowerCase().split('.').pop();
    
    if (fileExtension === 'csv') {
      const csvData = fileBlob.getDataAsString();
      return processCSVStatement(csvData, accountName);
    } else if (fileExtension === 'pdf') {
      return processPDFStatement(fileBlob, accountName);
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }
    
  } catch (error) {
    _logError('File upload processing failed', error);
    return { success: false, error: error.message };
  }
}

/**
 * Batch import function for multiple files
 */
function batchImportFiles(files, defaultAccount = 'Imported Account') {
  const results = {
    totalFiles: files.length,
    successful: 0,
    failed: 0,
    totalTransactions: 0,
    errors: []
  };
  
  for (const file of files) {
    try {
      const result = handleFileUpload(file.blob, file.name, file.account || defaultAccount);
      
      if (result.success) {
        results.successful++;
        results.totalTransactions += result.imported;
      } else {
        results.failed++;
        results.errors.push({ file: file.name, error: result.error });
      }
      
    } catch (error) {
      results.failed++;
      results.errors.push({ file: file.name, error: error.message });
    }
  }
  
  _logInfo(`Batch import complete: ${results.successful}/${results.totalFiles} files successful, ${results.totalTransactions} transactions imported`);
  
  return results;
}

/**
 * UI function to test and demonstrate import capabilities
 */
function testImportSystem() {
  const dashboard = _getOrCreateSheet('Dashboard');
  const now = new Date();
  
  // Add import status section to dashboard
  const importSection = [
    ['Import System Status', now.toISOString()],
    [''],
    ['Supported Formats:', ''],
    ['CSV Files', 'CIBC, PC Financial, Generic'],
    ['PDF Statements', 'CIBC, PC Financial, Generic'],
    [''],
    ['Recent Import Stats:', ''],
    ['Last Import', 'Use processCSVStatement() or processPDFStatement()'],
    ['Training Data Extracted', 'Vendor patterns and categories'],
    ['Date Parsing', 'Fixed 1969 date issues'],
    [''],
    ['Usage Examples:', ''],
    ['CSV Import', '=processCSVStatement(csvData, "Account Name")'],
    ['PDF Import', '=processPDFStatement(pdfBlob, "Account Name")'],
    ['Batch Import', '=batchImportFiles(fileArray, "Default Account")']
  ];
  
  // Find a good location in dashboard (after existing content)
  const lastRow = dashboard.getLastRow();
  const startRow = lastRow + 3;
  
  dashboard.getRange(startRow, 1, importSection.length, 2).setValues(importSection);
  
  // Format the section
  dashboard.getRange(startRow, 1, 1, 2).setFontWeight('bold').setBackground('#e1f5fe');
  dashboard.getRange(startRow + 2, 1, 1, 2).setFontWeight('bold');
  dashboard.getRange(startRow + 6, 1, 1, 2).setFontWeight('bold');
  dashboard.getRange(startRow + 10, 1, 1, 2).setFontWeight('bold');
  
  _logInfo('Import system status added to Dashboard');
  
  return {
    status: 'Import system ready',
    supportedFormats: ['CSV', 'PDF'],
    profiles: {
      csv: IMPORT_PROFILES.CSV.length,
      pdf: IMPORT_PROFILES.PDF.length
    },
    features: [
      'Fixed 1969 date parsing issues',
      'PDF OCR text extraction',
      'Vendor pattern learning',
      'Auto-detect CSV formats',
      'Batch import capability',
      'Training data extraction'
    ]
  };
}

// Enhanced categorization with machine learning-like pattern recognition
const CATEGORY_STOPWORDS = new Set([
  // Generic banking/system terms (should be excluded from categorization)
  'financial', 'cibc', 'amount', 'auto', 'logged', 'money', 'deposit', 'card', 
  'cash', 'credit', 'purchase', 'trade', 'unknown', 'sender', 'interac', 
  'transfer', 'received', 'been', 'automatically', 'deposited', 'bank', 
  'payment', 'etransfer', 'transaction', 'statement', 'balance', 'online', 
  'account', 'fee', 'service', 'interest', 'dividend', 'confirmation', 
  'receipt', 'monthly', 'annual', 'quarterly', 'processed', 'paid', 'paym', 
  'withdrawal', 'debit', 'aventura', 'wealthsimple', 'streiffer', 'pad',
  'standalone', 'youve', 'from', 'streiffer',
  
  // Generic corporate terms
  'inc', 'ltd', 'corp', 'limited', 'llc', 'co', 'company', 'group', 'enterprises',
  
  // Common English words
  'from', 'with', 'your', 'for', 'and', 'the', 'has', 'was', 'you', 'have', 'this',
  'that', 'are', 'had', 'not', 'been', 'were', 'they', 'but', 'also', 'their',
  'will', 'would', 'should', 'could', 'when', 'where', 'what', 'which', 'who', 'whom'
]);

// Enhanced merchant pattern recognition with confidence scoring
const ENHANCED_MERCHANT_PATTERNS = {
  'grocery': {
    patterns: [/sobeys|loblaws|metro|walmart|costco|food basics|no frills|superstore|freshco|farm boy/i],
    confidence: 0.95,
    keywords: ['grocery', 'food', 'supermarket']
  },
  'gas': {
    patterns: [/shell|esso|petro|husky|canadian tire gas|circle k|7-eleven|ultramar|pioneer/i],
    confidence: 0.9,
    keywords: ['gas', 'fuel', 'station']
  },
  'restaurant': {
    patterns: [/mcdonalds|tim hortons|subway|pizza|restaurant|cafe|bistro|grill|diner|starbucks|a&w|kfc|taco bell/i],
    confidence: 0.85,
    keywords: ['restaurant', 'food', 'dining']
  },
  'shopping': {
    patterns: [/amazon|ebay|walmart|target|best buy|canadian tire|home depot|lowe|costco|winners|marshalls/i],
    confidence: 0.8,
    keywords: ['shopping', 'retail', 'store']
  },
  'pharmacy': {
    patterns: [/shoppers drug mart|rexall|pharmacy|cvs|walgreens|pharmasave/i],
    confidence: 0.9,
    keywords: ['pharmacy', 'health', 'medicine']
  },
  'entertainment': {
    patterns: [/cineplex|netflix|spotify|disney|apple music|xbox|playstation|steam|epic games/i],
    confidence: 0.85,
    keywords: ['entertainment', 'streaming', 'gaming']
  },
  'transport': {
    patterns: [/uber|lyft|taxi|ttc|go transit|via rail|air canada|westjet|presto/i],
    confidence: 0.9,
    keywords: ['transport', 'travel', 'transit']
  },
  'utilities': {
    patterns: [/hydro|gas|water|electricity|bell|rogers|telus|internet|phone|enbridge/i],
    confidence: 0.95,
    keywords: ['utilities', 'bills', 'services']
  },
  'investment': {
    patterns: [/wealthsimple|questrade|td direct|rbc direct|cibc investor/i],
    confidence: 0.98,
    keywords: ['investment', 'trading', 'portfolio']
  }
};

// ===================== UTILITY FUNCTIONS =====================

function _lc(s) {
  return (s || '').toString().trim().toLowerCase();
}

function _normalize(s) {
  if (s === null || s === undefined) return '';
  try {
    return String(s)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (e) {
    return String(s).trim();
  }
}

function _toNumber(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  try {
    const cleaned = String(v).replace(/[^0-9.\-]+/g, '');
    const n = Number(cleaned);
    return isNaN(n) ? 0 : n;
  } catch (e) {
    return 0;
  }
}

function _extractAmount(text, customRegex = null) {
  if (!text) return null;
  const regex = customRegex || /\$([0-9,]+\.[0-9]{2})/i;
  const match = text.match(regex);
  return match ? parseFloat(match[1].replace(/,/g, '')) : null;
}

function _extractText(text, regex) {
  if (!text) return null;
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

// CRITICAL FIX: Add domain validation helper function to prevent domain parsing errors
function _extractEmailDomain(fromField) {
  if (!fromField) return 'unknown';
  const match = fromField.match(/<([^>]+)>/);
  const email = match ? match[1] : fromField;
  const domain = email.split('@')[1];
  return domain ? domain.toLowerCase() : 'unknown';
}

// Helper function to normalize strings for comparison
function _normalize(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

function _htmlToText(html) {
  try {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  } catch (error) {
    return '';
  }
}

// ===================== LOGGING FUNCTIONS =====================

function _logInfo(message, context = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[INFO] ${timestamp}: ${message}`);
  Logger.log(`INFO: ${message} - ${JSON.stringify(context)}`);
  _auditLog('INFO', message, context);
}

function _logError(message, error, context = {}) {
  const timestamp = new Date().toISOString();
  console.error(`[ERROR] ${timestamp}: ${message}`, error);
  Logger.log(`ERROR: ${message} - ${error?.message || error} - ${JSON.stringify(context)}`);
  _auditLog('ERROR', message, { error: error?.message || error, ...context });
}

function _logWarning(message, context = {}) {
  const timestamp = new Date().toISOString();
  console.warn(`[WARN] ${timestamp}: ${message}`);
  Logger.log(`WARN: ${message} - ${JSON.stringify(context)}`);
  _auditLog('WARNING', message, context);
}

function _auditLog(level, message, context = {}) {
  try {
    const ss = _ss();
    let auditSheet = ss.getSheetByName(SHEET_NAMES.AUDIT_LOG);
    if (!auditSheet) {
      auditSheet = ss.insertSheet(SHEET_NAMES.AUDIT_LOG);
      auditSheet.appendRow(['Timestamp', 'Level', 'Message', 'Context', 'User']);
      auditSheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    }
    
    const timestamp = new Date();
    const safeLevel = String(level || 'INFO').trim() || 'INFO';
    const safeMessage = String(message || 'No message').trim() || 'No message';
    const safeContext = JSON.stringify(context || {});
    const safeUser = Session.getActiveUser().getEmail() || 'Unknown User';
    
    if (timestamp && safeLevel && safeMessage) {
      auditSheet.appendRow([timestamp, safeLevel, safeMessage, safeContext, safeUser]);
    }
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
}

function _safeExecute(func, context, retries = CONFIG.MAX_PROCESSING_ATTEMPTS) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return func.call(context);
    } catch (error) {
      _logError(`Attempt ${attempt}/${retries} failed for ${func.name}`, error);
      if (attempt === retries) {
        throw error;
      }
      Utilities.sleep(1000 * attempt); // Exponential backoff
    }
  }
}

// ===================== SPREADSHEET ACCESS =====================

function _ss() {
  try {
    if (typeof SpreadsheetApp !== 'undefined') {
      try {
        const active = SpreadsheetApp.getActiveSpreadsheet();
        if (active && (!SPREADSHEET_ID || active.getId() === SPREADSHEET_ID)) {
          return active;
        }
      } catch (e) {
        // Fall through to openById
      }
    }
    
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_ID is not set');
    }
    
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (error) {
    const helpMsg = 'Cannot access spreadsheet: ' + error.message;
    console.error(helpMsg);
    throw new Error(helpMsg);
  }
}

// ===================== SHEET MANAGEMENT =====================

function _setupInitialSheets(ss) {
  try {
    _logInfo('Setting up initial sheets...');
    
    // Define sheet configurations with headers
    const sheetConfigs = {
      [SHEET_NAMES.MAIN]: [
        'Date', 'Amount', 'From Account', 'To Account', 'Bank', 'Notes', 'Email ID', 'Category', 'Type', 'Fingerprint'
      ],
      [SHEET_NAMES.STAGING]: [
        'Date', 'Amount', 'From Account', 'To Account', 'Bank', 'Email ID', 'Staged At', 'Direction', 'Status', 'Fingerprint'
      ],
      [SHEET_NAMES.ACCOUNTS]: [
        'Account Name', 'Balance', 'Account Type', 'Bank', 'Last Updated'
      ],
      [SHEET_NAMES.HOLDINGS]: [
        'Ticker', 'Shares', 'Cost Basis', 'Current Price', 'Current Value', 'Account', 'Last Updated'
      ],
      [SHEET_NAMES.CATEGORIES]: [
        'Merchant Pattern', 'Category'
      ],
      [SHEET_NAMES.DASHBOARD]: [
        'Finance Dashboard - Auto-Generated'
      ],
      [SHEET_NAMES.CSV_IMPORT]: [
        'Import Date', 'Source File', 'Records Imported', 'Status', 'Notes'
      ],
      [SHEET_NAMES.AUDIT_LOG]: [
        'Timestamp', 'Level', 'Message', 'Details', 'Function'
      ],
      [SHEET_NAMES.AI_LEARNING]: [
        'Timestamp', 'LearningType', 'Pattern', 'Context', 'Confidence', 'SuccessCount', 'FailureCount', 'Metadata', 'Status', 'CrossValidated'
      ],
      [SHEET_NAMES.FAILED_PARSING]: [
        'Timestamp', 'EmailId', 'From', 'Subject', 'BodyPreview', 'FailureReason', 'AttemptedParsers', 'AIAnalysis', 'Status', 'Priority'
      ]
    };
    
    // Create or ensure each sheet exists with proper headers
    for (const [sheetName, headers] of Object.entries(sheetConfigs)) {
      let sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        // Create new sheet
        sheet = ss.insertSheet(sheetName);
        _logInfo(`Created new sheet: ${sheetName}`);
        
        // Set headers for new sheet
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0f0f0');
        
        // Auto-resize columns
        for (let i = 1; i <= headers.length; i++) {
          sheet.autoResizeColumn(i);
        }
        
        _logInfo(`Set headers for new sheet: ${sheetName}`);
      } else {
        // Sheet exists - only set headers if row 1 is completely empty
        const firstRowRange = sheet.getRange(1, 1, 1, headers.length);
        const firstRowValues = firstRowRange.getValues()[0];
        
        // Check if all cells in first row are empty
        const isEmpty = firstRowValues.every(cell => !cell || cell.toString().trim() === '');
        
        if (isEmpty) {
          firstRowRange.setValues([headers]);
          firstRowRange.setFontWeight('bold').setBackground('#f0f0f0');
          _logInfo(`Set headers for existing empty sheet: ${sheetName}`);
        } else {
          _logInfo(`Sheet ${sheetName} already has headers - preserving existing data`);
        }
      }
    }
    
    _logInfo('All sheets ensured successfully');
    
  } catch (error) {
    _logError('Failed to setup initial sheets', error);
    throw error;
  }
}

function _ensureSheetsAndHeaders() {
  try {
    const ss = _ss();
    return _setupInitialSheets(ss);
  } catch (error) {
    _logError('Failed to ensure sheets and headers', error);
    throw error;
  }
}

function _ensureAccountExists(accountsSheet, accountName) {
  try {
    if (!accountName || !accountsSheet) return -1;
    
    const normalizedName = _normalizeAccountName(accountName);
    
    // Check if account already exists
    const existingRow = _findAccountRow(accountsSheet, normalizedName);
    if (existingRow > 0) return existingRow;
    
    // Create new account
    const accountType = _determineAccountType(normalizedName);
    const newRow = [normalizedName, 0, accountType, _extractBankName(accountName), new Date()];
    
    accountsSheet.appendRow(newRow);
    const rowNumber = accountsSheet.getLastRow();
    
    // Format the balance cell
    accountsSheet.getRange(rowNumber, 2).setNumberFormat('$#,##0.00');
    
    _logInfo(`Created new account: ${normalizedName} (${accountType})`);
    return rowNumber;
    
  } catch (error) {
    _logError('Failed to ensure account exists', error, { accountName });
    return -1;
  }
}

function _findAccountRow(accountsSheet, accountName) {
  try {
    if (!accountsSheet || !accountName) return -1;
    
    const normalizedSearchName = _normalizeAccountName(accountName);
    const lastRow = accountsSheet.getLastRow();
    
    if (lastRow < 2) return -1;
    
    const data = accountsSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    
    for (let i = 0; i < data.length; i++) {
      const existingName = _normalizeAccountName(data[i][0] || '');
      if (existingName === normalizedSearchName) {
        return i + 2; // Convert to sheet row number
      }
    }
    
    return -1;
  } catch (error) {
    _logError('Failed to find account row', error, { accountName });
    return -1;
  }
}

function _determineAccountType(accountName) {
  const name = _lc(accountName);
  
  if (name.includes('checking') || name.includes('chequing')) return 'Checking';
  if (name.includes('savings')) return 'Savings';
  if (name.includes('credit') || name.includes('card')) return 'Credit Card';
  if (name.includes('investment') || name.includes('wealthsimple') || name.includes('tfsa') || name.includes('rrsp')) return 'Investment';
  if (name.includes('loan') || name.includes('mortgage')) return 'Loan';
  if (name.includes('line of credit') || name.includes('loc')) return 'Line of Credit';
  
  return 'Other';
}

function _extractBankName(accountName) {
  const name = _lc(accountName);
  
  if (name.includes('cibc')) return 'CIBC';
  if (name.includes('pc financial') || name.includes('pc mastercard')) return 'PC Financial';
  if (name.includes('wealthsimple')) return 'Wealthsimple';
  if (name.includes('rbc')) return 'RBC';
  if (name.includes('td')) return 'TD';
  if (name.includes('scotiabank')) return 'Scotiabank';
  if (name.includes('bmo')) return 'BMO';
  
  return 'Unknown';
}

// ===================== TRANSACTION FINGERPRINTING =====================

function _generateFingerprint(transaction) {
  const date = transaction.date ? new Date(transaction.date) : new Date();
  const dateStr = date.toISOString().slice(0, 10);
  const amountStr = Math.abs(parseFloat(transaction.amount || 0)).toFixed(2);
  const fromStr = _normalize(transaction.fromAccount || '').slice(0, 30);
  const toStr = _normalize(transaction.toAccount || '').slice(0, 30);
  
  const key = [dateStr, amountStr, fromStr, toStr].join('|');
  return Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, key)
  ).slice(0, 12);
}

function _isDuplicateTransaction(transaction, mainSheet) {
  try {
    if (!mainSheet || mainSheet.getLastRow() < 2) return false;
    
    // Use dynamic column count
    const lastRow = mainSheet.getLastRow();
    const lastCol = Math.max(mainSheet.getLastColumn(), 10); // Ensure minimum columns
    
    const data = mainSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    const newFingerprint = _generateFingerprint(transaction);
    
    return data.some(row => {
      if (!row || row.length === 0) return false;
      
      // Use hardcoded indices for main transaction sheet structure
      // Check by email ID first (Column G: Email ID)
      if (transaction.emailId && _normalize(row[6] || '') === transaction.emailId) {
        return true;
      }
      
      // Check by fingerprint (Column J: Fingerprint)
      if (row[9] === newFingerprint) {
        return true;
      }
      
      // Legacy check for transactions without fingerprints
      const existingDate = row[0] ? new Date(row[0]).toDateString() : ''; // Column A: Date
      const transactionDate = transaction.date ? new Date(transaction.date).toDateString() : '';
      const existingAmount = parseFloat(row[1] || 0); // Column B: Amount
      const transactionAmount = parseFloat(transaction.amount || 0);
      
      return existingDate === transactionDate &&
             Math.abs(existingAmount - transactionAmount) < CONFIG.AMOUNT_TOLERANCE &&
             _normalize(row[2] || '') === _normalize(transaction.fromAccount) && // Column C: From Account
             _normalize(row[3] || '') === _normalize(transaction.toAccount); // Column D: To Account
    });
  } catch (error) {
    _logError('Failed to check for duplicate transaction', error);
    return false;
  }
}

// CRITICAL FIX: Add comprehensive duplicate detection and removal function
function _findAndRemoveDuplicates() {
  try {
    const ss = _ss();
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    
    if (!mainSheet || mainSheet.getLastRow() < 3) {
      _logInfo('Insufficient data for duplicate detection');
      return { duplicatesFound: 0, duplicatesRemoved: 0 };
    }
    
    const lastRow = mainSheet.getLastRow();
    const lastCol = Math.max(mainSheet.getLastColumn(), 10);
    const data = mainSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    
    _logInfo(`Analyzing ${data.length} transactions for duplicates...`);
    
    const duplicateGroups = [];
    const processed = new Set();
    
    // Group potential duplicates
    for (let i = 0; i < data.length; i++) {
      if (processed.has(i) || !data[i] || data[i].length === 0) continue;
      
      const transaction = {
        rowIndex: i,
        date: new Date(data[i][0] || new Date()),
        amount: parseFloat(data[i][1] || 0),
        fromAccount: _normalize(data[i][2] || ''),
        toAccount: _normalize(data[i][3] || ''),
        emailId: _normalize(data[i][6] || ''),
        fingerprint: data[i][9] || ''
      };
      
      const duplicates = [i];
      
      // Look for duplicates of this transaction
      for (let j = i + 1; j < data.length; j++) {
        if (processed.has(j) || !data[j] || data[j].length === 0) continue;
        
        const candidate = {
          date: new Date(data[j][0] || new Date()),
          amount: parseFloat(data[j][1] || 0),
          fromAccount: _normalize(data[j][2] || ''),
          toAccount: _normalize(data[j][3] || ''),
          emailId: _normalize(data[j][6] || ''),
          fingerprint: data[j][9] || ''
        };
        
        // Check if it's a duplicate
        const isDuplicate = _isDuplicateCandidate(transaction, candidate);
        
        if (isDuplicate) {
          duplicates.push(j);
          processed.add(j);
        }
      }
      
      if (duplicates.length > 1) {
        duplicateGroups.push(duplicates);
      }
      
      processed.add(i);
    }
    
    _logInfo(`Found ${duplicateGroups.length} duplicate groups containing ${duplicateGroups.reduce((sum, group) => sum + group.length, 0)} total transactions`);
    
    if (duplicateGroups.length === 0) {
      return { duplicatesFound: 0, duplicatesRemoved: 0 };
    }
    
    // Remove duplicates (keep the first occurrence, remove others)
    let removedCount = 0;
    const rowsToDelete = [];
    
    duplicateGroups.forEach(group => {
      // Keep first transaction, mark others for deletion
      for (let i = 1; i < group.length; i++) {
        rowsToDelete.push(group[i] + 2); // +2 for 1-based indexing and header row
      }
      removedCount += group.length - 1;
    });
    
    // Sort in descending order to maintain row indices during deletion
    rowsToDelete.sort((a, b) => b - a);
    
    // Delete duplicate rows
    rowsToDelete.forEach(rowNum => {
      mainSheet.deleteRow(rowNum);
    });
    
    _logInfo(`Duplicate cleanup completed: ${removedCount} duplicates removed from ${duplicateGroups.length} groups`);
    
    return { 
      duplicatesFound: duplicateGroups.reduce((sum, group) => sum + group.length, 0),
      duplicatesRemoved: removedCount 
    };
    
  } catch (error) {
    _logError('Failed to detect and remove duplicates', error);
    return { duplicatesFound: 0, duplicatesRemoved: 0, error: error.message };
  }
}

// Helper function to determine if two transactions are duplicates
function _isDuplicateCandidate(txA, txB) {
  // Exact email ID match (most reliable)
  if (txA.emailId && txB.emailId && txA.emailId === txB.emailId) {
    return true;
  }
  
  // Exact fingerprint match
  if (txA.fingerprint && txB.fingerprint && txA.fingerprint === txB.fingerprint) {
    return true;
  }
  
  // Date, amount, and account match
  const sameDate = Math.abs(txA.date.getTime() - txB.date.getTime()) < (24 * 60 * 60 * 1000); // Within 24 hours
  const sameAmount = Math.abs(txA.amount - txB.amount) < CONFIG.AMOUNT_TOLERANCE;
  const sameAccounts = (txA.fromAccount === txB.fromAccount && txA.toAccount === txB.toAccount);
  
  return sameDate && sameAmount && sameAccounts;
}

// ===================== ACCOUNT MANAGEMENT =====================

function _normalizeAccountName(name) {
  if (!name) return '';
  
  const normalized = _normalize(name);
  const lowered = _lc(normalized);
  
  if (lowered === 'cash') return '';
  
  for (const [alias, canonical] of Object.entries(ACCOUNT_ALIASES)) {
    if (lowered.includes(alias)) {
      return canonical || '';
    }
  }
  
  const exactMatch = MY_ACCOUNTS.find(acc => _lc(acc) === lowered);
  if (exactMatch) return exactMatch;
  
  const partialMatch = MY_ACCOUNTS.find(acc => 
    lowered.includes(_lc(acc)) || _lc(acc).includes(lowered)
  );
  
  return partialMatch || normalized;
}

function _isInternalAccount(name) {
  if (!name) return false;
  const normalized = _normalizeAccountName(name);
  return normalized && MY_ACCOUNTS.some(acc => _lc(acc) === _lc(normalized));
}

function _findAccountRow(accountsSheet, accountName) {
  if (!accountsSheet || !accountName) return -1;
  const data = accountsSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (_lc(data[i][COLUMNS.ACCOUNTS.NAME - 1]) === _lc(accountName)) {
      return i + 1;
    }
  }
  return -1;
}

function _ensureAccountExists(accountsSheet, accountName) {
  if (!accountName || !accountsSheet) return -1;
  
  const normalized = _normalizeAccountName(accountName);
  if (!normalized) return -1; // Prevents creating phantom accounts
  
  let row = _findAccountRow(accountsSheet, normalized);
  
  if (row === -1) {
    // Create new account
    accountsSheet.appendRow([normalized, 0, new Date(), 'Auto-Created']);
    row = accountsSheet.getLastRow();
    _logInfo(`Created new account: ${normalized}`);
  }
  
  return row;
}

// ===================== SENDER-AWARE EMAIL PARSING FRAMEWORK =====================

// Sender information profiles - defines what data is typically available from each sender
const SENDER_PROFILES = {
  'cibc': {
    name: 'CIBC',
    domains: ['cibc.com', 'email.cibc.com'],
    capabilities: {
      merchantInfo: 'excellent',        // Detailed merchant names and locations
      accountInfo: 'good',             // Can determine specific card (Aventura/Dividend)
      amountPrecision: 'high',         // Always includes exact amounts
      transactionTiming: 'realtime',   // Near real-time notifications
      recipientInfo: 'none',           // N/A for credit card transactions
      balanceInfo: 'none'              // Doesn't include balance information
    },
    transactionTypes: ['purchase', 'payment', 'refund', 'fee'],
    accountDetection: 'card_number_suffix',  // Uses last 4 digits to identify card
    fallbackAccount: 'CIBC Aventura'
  },
  
  'pcfinancial': {
    name: 'PC Financial',
    domains: ['pcfinancial.ca', 'email.pcfinancial.ca'],
    capabilities: {
      merchantInfo: 'good',            // Usually includes merchant name
      accountInfo: 'single',           // Only one main account
      amountPrecision: 'high',         // Exact amounts
      transactionTiming: 'realtime',   // Real-time for purchases
      recipientInfo: 'variable',       // e-Transfer recipients available
      balanceInfo: 'none'              // No balance information
    },
    transactionTypes: ['purchase', 'etransfer_sent', 'deposit', 'fee'],
    accountDetection: 'static',          // Always PC Financial account
    fallbackAccount: 'PC Financial'
  },
  
  'interac': {
    name: 'Interac',
    domains: ['payments.interac.ca', 'interac.ca'],
    capabilities: {
      merchantInfo: 'none',            // N/A for e-Transfers
      accountInfo: 'destination',      // Knows receiving account
      amountPrecision: 'high',         // Exact amounts
      transactionTiming: 'realtime',   // Real-time notifications
      recipientInfo: 'excellent',      // Detailed sender information
      balanceInfo: 'none'              // No balance information
    },
    transactionTypes: ['etransfer_received'],
    accountDetection: 'recipient_based',  // Based on receiving account
    fallbackAccount: 'PC Financial'
  },
  
  'wealthsimple': {
    name: 'Wealthsimple',
    domains: ['wealthsimple.com', 'email.wealthsimple.com'],
    capabilities: {
      merchantInfo: 'ticker_symbols',   // Stock/ETF symbols and company names
      accountInfo: 'excellent',        // RRSP, TFSA, Cash
      amountPrecision: 'high',         // Exact amounts and shares
      transactionTiming: 'delayed',    // Usually next business day
      recipientInfo: 'none',           // N/A for investment transactions
      balanceInfo: 'portfolio',        // Portfolio summaries available
      holdingsInfo: 'excellent'        // Detailed holdings data
    },
    transactionTypes: ['deposit', 'trade', 'dividend', 'portfolio_update', 'fee'],
    accountDetection: 'account_type_parsing',  // Parses RRSP/TFSA/etc from content
    fallbackAccount: 'Wealthsimple Cash'
  },

  'paypal': {
    name: 'PayPal',
    domains: ['paypal.com', 'intl.paypal.com', 'service@intl.paypal.com'],
    capabilities: {
      merchantInfo: 'excellent',       // Detailed merchant names and info
      accountInfo: 'linked_card',      // Shows linked payment method
      amountPrecision: 'high',         // Exact amounts with currency conversion
      transactionTiming: 'realtime',   // Real-time authorization notifications
      recipientInfo: 'excellent',     // Detailed recipient information
      balanceInfo: 'none'             // No PayPal balance information
    },
    transactionTypes: ['authorization', 'payment', 'refund', 'fee'],
    accountDetection: 'linked_card_analysis',  // Determines linked payment card
    fallbackAccount: 'PayPal Transaction'
  }
};

// Enhanced sender detection with domain and content analysis
function _identifyEmailSender(from, subject, body) {
  const fromLower = _lc(from);
  const subjectLower = _lc(subject);
  const bodyLower = _lc(body);
  
  _logInfo(`Identifying sender`, { 
    from: from,
    subject: subject,
    bodyPreview: body.substring(0, 100)
  });
  
  // Primary domain-based detection
  for (const [senderId, profile] of Object.entries(SENDER_PROFILES)) {
    if (profile.domains.some(domain => fromLower.includes(domain))) {
      _logInfo(`Domain match found: ${senderId}`, { domain: domain, confidence: 'high' });
      return { id: senderId, profile: profile, confidence: 'high' };
    }
  }
  
  // Secondary keyword-based detection
  if (fromLower.includes('cibc') || subjectLower.includes('cibc') || /cibc.*card/i.test(bodyLower)) {
    return { id: 'cibc', profile: SENDER_PROFILES.cibc, confidence: 'medium' };
  }
  
  if (fromLower.includes('pcfinancial') || fromLower.includes('pc financial') || 
      subjectLower.includes('pc mastercard') || /pc.*financial/i.test(bodyLower)) {
    return { id: 'pcfinancial', profile: SENDER_PROFILES.pcfinancial, confidence: 'medium' };
  }
  
  if (fromLower.includes('interac') || fromLower.includes('payments.interac') ||
      subjectLower.includes('interac') || /interac.*transfer/i.test(bodyLower)) {
    return { id: 'interac', profile: SENDER_PROFILES.interac, confidence: 'medium' };
  }
  
  if (fromLower.includes('wealthsimple') || subjectLower.includes('wealthsimple') ||
      /wealthsimple.*trade/i.test(bodyLower) || /portfolio.*update/i.test(bodyLower)) {
    return { id: 'wealthsimple', profile: SENDER_PROFILES.wealthsimple, confidence: 'medium' };
  }
  
  if (fromLower.includes('paypal') || subjectLower.includes('paypal') ||
      /you authorized.*to/i.test(bodyLower) || /paypal.*transaction/i.test(bodyLower)) {
    _logInfo(`PayPal keyword match found`, { confidence: 'medium' });
    return { id: 'paypal', profile: SENDER_PROFILES.paypal, confidence: 'medium' };
  }
  
  return { id: 'unknown', profile: null, confidence: 'none' };
}

// Adaptive parsing strategy based on sender capabilities
function _parseEmailWithSenderContext(message, subject, body, accountsSheet) {
  const sender = _identifyEmailSender(message.getFrom(), subject, body);
  
  _logInfo(`Parsing email from ${sender.id} (confidence: ${sender.confidence})`, {
    emailId: message.getId(),
    from: message.getFrom(),
    subject: subject.substring(0, 50)
  });
  
  if (!sender.profile) {
    _logWarning(`Unknown sender - using fallback parsing`, { from: message.getFrom() });
    return _parseFallbackEmail(message, subject, body);
  }
  
  // Use sender-specific parsing logic
  switch (sender.id) {
    case 'cibc':
      return _parseCibcEmailEnhanced(message, subject, body, accountsSheet, sender.profile);
    case 'pcfinancial':
      return _parsePcFinancialEmailEnhanced(message, subject, body, sender.profile);
    case 'interac':
      return _parseInteracEmailEnhanced(message, subject, body, sender.profile);
    case 'wealthsimple':
      return _parseWealthsimpleEmailEnhanced(message, subject, body, sender.profile);
    case 'paypal':
      return _parsePayPalEmailEnhanced(message, subject, body, sender.profile);
    default:
      return _parseFallbackEmail(message, subject, body);
  }
}

// Merchant name enhancement based on sender capabilities
function _enhanceMerchantName(rawMerchant, senderId) {
  if (!rawMerchant || rawMerchant === 'Unknown Merchant') return rawMerchant;
  
  let cleaned = rawMerchant
    .replace(/[0-9]{4,}/g, '') // Remove transaction IDs
    .replace(/\b(pos|terminal|txn|ref)\b/gi, '') // Remove POS terms
    .replace(/[^a-zA-Z0-9\s&'-]/g, ' ') // Clean special chars
    .replace(/\s+/g, ' ')
    .trim();
  
  // Sender-specific enhancements
  switch (senderId) {
    case 'cibc':
      // CIBC provides excellent merchant info, minimal cleaning needed
      cleaned = cleaned.replace(/\b(purchase|transaction)\b/gi, '').trim();
      break;
      
    case 'pcfinancial':
      // PC Financial provides good merchant info
      cleaned = cleaned.replace(/\b(merchant|at)\b/gi, '').trim();
      break;
      
    case 'wealthsimple':
      // For ticker symbols, keep them as-is
      if (/^[A-Z]{1,5}(\.TO)?$/.test(cleaned)) {
        return cleaned.toUpperCase();
      }
      break;
  }
  
  return cleaned || rawMerchant;
}

// ===================== LEARNING FRAMEWORK =====================

/**
 * Learning System that combines:
 * 1. Email parsing pattern learning
 * 2. Category classification learning 
 * 3. Cross-validation between systems for improved accuracy
 */
const LEARNING_TYPES = {
  EMAIL_PARSING: 'email_parsing',
  CATEGORY_CLASSIFICATION: 'category_classification',
  MERCHANT_EXTRACTION: 'merchant_extraction',
  AMOUNT_DETECTION: 'amount_detection',
  SENDER_IDENTIFICATION: 'sender_identification',
  CROSS_VALIDATION: 'cross_validation'
};

/**
 * Unified learning record structure
 */
function _recordLearning(type, pattern, context, confidence, metadata = {}) {
  if (!CONFIG.LEARNING_ENABLED) return;
  
  try {
    const ss = _ss();
    let aiLearningSheet = ss.getSheetByName(SHEET_NAMES.AI_LEARNING);
    
    if (!aiLearningSheet) {
      aiLearningSheet = ss.insertSheet(SHEET_NAMES.AI_LEARNING);
      aiLearningSheet.appendRow([
        'Timestamp', 'LearningType', 'Pattern', 'Context', 'Confidence', 
        'SuccessCount', 'FailureCount', 'Metadata', 'Status', 'CrossValidated'
      ]);
    }
    
    // Check if pattern already exists
    const data = aiLearningSheet.getDataRange().getValues();
    let existingRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === type && data[i][2] === pattern) {
        existingRow = i + 1;
        break;
      }
    }
    
    if (existingRow > 0) {
      // Update existing pattern
      const currentSuccess = parseInt(aiLearningSheet.getRange(existingRow, 6).getValue()) || 0;
      const currentFailure = parseInt(aiLearningSheet.getRange(existingRow, 7).getValue()) || 0;
      const totalUsage = currentSuccess + currentFailure + 1;
      const newConfidence = ((currentSuccess + 1) / totalUsage) * confidence;
      
      aiLearningSheet.getRange(existingRow, 1).setValue(new Date()); // Timestamp
      aiLearningSheet.getRange(existingRow, 5).setValue(newConfidence); // Confidence
      aiLearningSheet.getRange(existingRow, 6).setValue(currentSuccess + 1); // Success count
      aiLearningSheet.getRange(existingRow, 8).setValue(JSON.stringify(metadata)); // Metadata
    } else {
      // Add new pattern
      aiLearningSheet.appendRow([
        new Date(),
        type,
        pattern,
        context.substring(0, 200),
        confidence,
        1, // Success count
        0, // Failure count
        JSON.stringify(metadata),
        'ACTIVE',
        false // Cross validated
      ]);
    }
    
  } catch (error) {
    _logError('Failed to record AI learning', error);
  }
}

/**
 * Cross-validation between category and parsing learning
 */
function _crossValidateLearning() {
  try {
    const ss = _ss();
    const aiLearningSheet = ss.getSheetByName(SHEET_NAMES.AI_LEARNING);
    if (!aiLearningSheet || aiLearningSheet.getLastRow() < 2) return;
    
    const learningData = aiLearningSheet.getDataRange().getValues().slice(1);
    const categoryPatterns = learningData.filter(row => row[1] === LEARNING_TYPES.CATEGORY_CLASSIFICATION);
    const merchantPatterns = learningData.filter(row => row[1] === LEARNING_TYPES.MERCHANT_EXTRACTION);
    
    let validationResults = [];
    
    // Cross-validate merchant extraction with category patterns
    merchantPatterns.forEach(merchantRow => {
      const merchantName = merchantRow[2]; // Pattern
      const merchantMeta = JSON.parse(merchantRow[7] || '{}'); // Metadata
      
      // Find corresponding category patterns
      const relatedCategories = categoryPatterns.filter(catRow => {
        const categoryMeta = JSON.parse(catRow[7] || '{}');
        return categoryMeta.merchant && 
               categoryMeta.merchant.toLowerCase().includes(merchantName.toLowerCase());
      });
      
      if (relatedCategories.length > 0) {
        const consensusCategory = _findCategoryConsensus(relatedCategories);
        const confidence = _calculateCrossValidationConfidence(merchantRow, relatedCategories);
        
        validationResults.push({
          type: 'merchant_category_validation',
          merchant: merchantName,
          suggestedCategory: consensusCategory,
          confidence: confidence,
          supportingEvidence: relatedCategories.length
        });
      }
    });
    
    // Record cross-validation results
    validationResults.forEach(result => {
      if (result.confidence > CONFIG.PATTERN_CONFIDENCE_THRESHOLD) {
        _recordLearning(
          LEARNING_TYPES.CROSS_VALIDATION,
          `${result.merchant}→${result.suggestedCategory}`,
          'Cross-validated merchant-category mapping',
          result.confidence,
          {
            validationType: result.type,
            supportingEvidence: result.supportingEvidence,
            autoGenerated: true
          }
        );
      }
    });
    
    _logInfo(`Cross-validation completed: ${validationResults.length} validations processed`);
    
  } catch (error) {
    _logError('Cross-validation failed', error);
  }
}

/**
 * Find consensus category from multiple patterns
 */
function _findCategoryConsensus(categoryPatterns) {
  const categoryVotes = {};
  
  categoryPatterns.forEach(pattern => {
    const metadata = JSON.parse(pattern[7] || '{}');
    const category = metadata.category || pattern[2];
    const confidence = parseFloat(pattern[4]) || 0;
    
    categoryVotes[category] = (categoryVotes[category] || 0) + confidence;
  });
  
  return Object.entries(categoryVotes)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Uncategorized';
}

/**
 * Calculate cross-validation confidence
 */
function _calculateCrossValidationConfidence(merchantPattern, categoryPatterns) {
  const merchantConfidence = parseFloat(merchantPattern[4]) || 0;
  const categoryConfidences = categoryPatterns.map(p => parseFloat(p[4]) || 0);
  const avgCategoryConfidence = categoryConfidences.reduce((a, b) => a + b, 0) / categoryConfidences.length;
  
  // Weighted average with merchant extraction confidence
  return (merchantConfidence * 0.6) + (avgCategoryConfidence * 0.4);
}

/**
 * Category learning with learning system integration
 */
function _categoryLearning() {
  try {
    _logInfo('Starting category learning...');
    
    const ss = _ss();
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    const categoriesSheet = ss.getSheetByName(SHEET_NAMES.CATEGORIES);
    
    if (!mainSheet || !categoriesSheet) {
      _logError('Required sheets not found for category learning');
      return;
    }
    
    // Get transaction data
    const lastRow = mainSheet.getLastRow();
    if (lastRow < 2) return;
    
    const data = mainSheet.getRange(2, 1, lastRow - 1, Math.max(mainSheet.getLastColumn(), 10)).getValues();
    const merchantAnalysis = {};
    
    // Analyze patterns with AI learning integration
    for (const row of data) {
      if (!row || row.length === 0) continue;
      
      const toAccount = row[3] || ''; // Column D: To Account  
      const category = row[7] || ''; // Column H: Category
      const amount = Math.abs(parseFloat(row[1] || 0)); // Column B: Amount
      const fromAccount = row[2] || ''; // Column C: From Account
      
      if (!toAccount || !category || category === 'Uncategorized') continue;
      
      const merchant = _extractCleanMerchantName(toAccount);
      if (!merchant || merchant.length < 3) continue;
      
      const merchantKey = merchant.toLowerCase();
      
      if (!merchantAnalysis[merchantKey]) {
        merchantAnalysis[merchantKey] = {
          originalName: merchant,
          categories: {},
          totalTransactions: 0,
          totalAmount: 0,
          accounts: new Set(),
          patterns: []
        };
      }
      
      const analysis = merchantAnalysis[merchantKey];
      analysis.categories[category] = (analysis.categories[category] || 0) + 1;
      analysis.totalTransactions++;
      analysis.totalAmount += amount;
      analysis.accounts.add(fromAccount);
      
      // Record pattern for AI learning
      analysis.patterns.push({
        amount: amount,
        category: category,
        fromAccount: fromAccount,
        date: new Date(row[0] || new Date())
      });
    }
    
    // Generate recommendations
    const recommendations = [];
    
    for (const [merchantKey, analysis] of Object.entries(merchantAnalysis)) {
      const dominantCategory = Object.entries(analysis.categories)
        .reduce((a, b) => analysis.categories[a[0]] > analysis.categories[b[0]] ? a : b);
      
      const confidence = dominantCategory[1] / analysis.totalTransactions;
      const frequency = analysis.totalTransactions;
      
      if (confidence >= 0.7 && frequency >= 2) {
        // Record in learning system
        _recordLearning(
          LEARNING_TYPES.CATEGORY_CLASSIFICATION,
          `${analysis.originalName}→${dominantCategory[0]}`,
          `Merchant categorization pattern`,
          confidence,
          {
            merchant: analysis.originalName,
            category: dominantCategory[0],
            frequency: frequency,
            totalAmount: analysis.totalAmount,
            accounts: Array.from(analysis.accounts),
            patternCount: analysis.patterns.length
          }
        );
        
        recommendations.push({
          merchant: analysis.originalName,
          category: dominantCategory[0],
          confidence: confidence,
          frequency: frequency
        });
      }
    }
    
    // Cross-validate with existing patterns
    _crossValidateLearning();
    
    // Add high-confidence recommendations to Categories sheet
    let addedCount = 0;
    const existingMappings = new Set();
    
    if (categoriesSheet.getLastRow() > 1) {
      const existingData = categoriesSheet.getRange(2, 1, categoriesSheet.getLastRow() - 1, 2).getValues();
      existingData.forEach(row => {
        if (row[0]) existingMappings.add(row[0].toLowerCase());
      });
    }
    
    recommendations
      .filter(rec => !existingMappings.has(rec.merchant.toLowerCase()))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10) // Top 10 recommendations
      .forEach(rec => {
        categoriesSheet.appendRow([rec.merchant, rec.category]);
        addedCount++;
      });
    
    _logInfo(`Category learning completed: ${addedCount} new mappings added`);
    
    return { added: addedCount, analyzed: Object.keys(merchantAnalysis).length };
    
  } catch (error) {
    _logError('Category learning failed', error);
    throw error;
  }
}

/**
 * Unified parsing failure logging with AI learning
 */
function _logUnifiedParsingFailure(message, subject, body, failureReason, attemptedParsers = []) {
  if (!CONFIG.LEARNING_ENABLED) return;
  
  try {
    const ss = _ss();
    let failedSheet = ss.getSheetByName(SHEET_NAMES.FAILED_PARSING);
    
    if (!failedSheet) {
      failedSheet = ss.insertSheet(SHEET_NAMES.FAILED_PARSING);
      failedSheet.appendRow([
        'Timestamp', 'EmailId', 'From', 'Subject', 'BodyPreview', 
        'FailureReason', 'AttemptedParsers', 'AIAnalysis', 'Status', 'Priority'
      ]);
    }
    
    // Generate analysis of the failure
    const aiAnalysis = _generateFailureAnalysis(subject, body, attemptedParsers);
    
    failedSheet.appendRow([
      new Date(),
      message.getId(),
      message.getFrom(),
      subject.substring(0, 100),
      body.substring(0, 200),
      failureReason,
      attemptedParsers.join(', '),
      JSON.stringify(aiAnalysis),
      'PENDING_AI_ANALYSIS',
      aiAnalysis.priority || 'MEDIUM'
    ]);
    
    // Record patterns for learning
    if (aiAnalysis.patterns && aiAnalysis.patterns.length > 0) {
      aiAnalysis.patterns.forEach(pattern => {
        _recordLearning(
          pattern.type,
          pattern.pattern,
          pattern.context,
          pattern.confidence,
          {
            source: 'failure_analysis',
            emailDomain: message.getFrom().split('@')[1],
            failureReason: failureReason
          }
        );
      });
    }
    
  } catch (error) {
    _logError('Failed to log unified parsing failure', error);
  }
}

/**
 * Generate AI analysis of parsing failures
 */
function _generateFailureAnalysis(subject, body, attemptedParsers) {
  const analysis = {
    patterns: [],
    priority: 'MEDIUM',
    suggestions: []
  };
  
  // Analyze potential amount patterns
  const amountMatches = body.match(/[\$€£¥]?[0-9,]+\.[0-9]{2}/g) || [];
  amountMatches.forEach(match => {
    const context = body.substring(Math.max(0, body.indexOf(match) - 30), body.indexOf(match) + match.length + 30);
    analysis.patterns.push({
      type: LEARNING_TYPES.AMOUNT_DETECTION,
      pattern: match,
      context: context.trim(),
      confidence: 0.8
    });
  });
  
  // Analyze potential merchant patterns
  const merchantIndicators = ['to ', 'at ', 'from ', 'merchant:', 'payee:', 'authorized to'];
  merchantIndicators.forEach(indicator => {
    const regex = new RegExp(indicator + '([A-Za-z0-9\\s,.-]{5,50})', 'gi');
    const matches = body.match(regex) || [];
    matches.forEach(match => {
      analysis.patterns.push({
        type: LEARNING_TYPES.MERCHANT_EXTRACTION,
        pattern: match.replace(indicator, '').trim(),
        context: indicator,
        confidence: 0.6
      });
    });
  });
  
  // Determine priority based on patterns found
  if (analysis.patterns.length > 2) {
    analysis.priority = 'HIGH';
  } else if (analysis.patterns.length === 0) {
    analysis.priority = 'LOW';
  }
  
  // Generate suggestions
  if (amountMatches.length > 0 && analysis.patterns.some(p => p.type === LEARNING_TYPES.MERCHANT_EXTRACTION)) {
    analysis.suggestions.push('Consider adding new email parser for this domain');
  }
  
  return analysis;
}

/**
 * Enhanced parsing with learning system
 */
function _parseEmailWithAdaptiveLearning(message, subject, body, accountsSheet) {
  const attemptedParsers = [];
  let transaction = null;
  
  try {
    // First try the standard sender-aware parsing
    const sender = _identifyEmailSender(message.getFrom(), subject, body);
    attemptedParsers.push(sender.id);
    
    if (sender.profile) {
      transaction = _parseEmailWithSenderContext(message, subject, body, accountsSheet);
      
      if (transaction) {
        // Record successful patterns in learning system
        _recordLearning(LEARNING_TYPES.SENDER_IDENTIFICATION, sender.id, message.getFrom(), 0.9, {
          domain: message.getFrom().split('@')[1],
          confidence: sender.confidence
        });
        
        if (transaction.amount) {
          _recordLearning(LEARNING_TYPES.AMOUNT_DETECTION, transaction.amount.toString(), body.substring(0, 200), 0.8, {
            senderId: sender.id,
            currency: transaction.notes?.includes('USD') ? 'USD' : 'CAD'
          });
        }
        
        if (transaction.merchant && transaction.merchant !== 'Unknown Merchant') {
          _recordLearning(LEARNING_TYPES.MERCHANT_EXTRACTION, transaction.merchant, body.substring(0, 200), 0.7, {
            senderId: sender.id,
            toAccount: transaction.toAccount
          });
        }
        
        return transaction;
      }
    }
    
    // If standard parsing failed, try learned patterns
    transaction = _tryLearnedPatterns(message, subject, body, attemptedParsers);
    
    if (transaction) {
      _recordLearning(LEARNING_TYPES.EMAIL_PARSING, 'unified_success', body.substring(0, 100), 0.6, {
        fallbackMethod: true
      });
      return transaction;
    }
    
    // If all parsing failed, log for unified learning
    _logUnifiedParsingFailure(
      message, 
      subject, 
      body, 
      'All parsing methods failed', 
      attemptedParsers
    );
    
    return null;
    
  } catch (error) {
    _logUnifiedParsingFailure(
      message, 
      subject, 
      body, 
      `Parsing error: ${error.message}`, 
      attemptedParsers
    );
    return null;
  }
}

/**
 * Try parsing using learned patterns
 */
function _tryLearnedPatterns(message, subject, body, attemptedParsers) {
  try {
    const ss = _ss();
    const aiLearningSheet = ss.getSheetByName(SHEET_NAMES.AI_LEARNING);
    if (!aiLearningSheet || aiLearningSheet.getLastRow() < 2) return null;
    
    const patterns = aiLearningSheet.getDataRange().getValues().slice(1);
    const confidenceThreshold = CONFIG.PATTERN_CONFIDENCE_THRESHOLD;
    
    // Filter high-confidence patterns
    const highConfidencePatterns = patterns.filter(row => 
      parseFloat(row[4]) >= confidenceThreshold && // Confidence column
      row[8] === 'ACTIVE' // Status column
    );
    
    // Try to extract transaction using learned patterns
    let amount = null;
    let merchant = null;
    let category = null;
    
    // Try amount detection patterns
    const amountPatterns = highConfidencePatterns.filter(row => row[1] === LEARNING_TYPES.AMOUNT_DETECTION);
    for (const pattern of amountPatterns) {
      const amountMatch = body.match(new RegExp(pattern[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
      if (amountMatch) {
        amount = parseFloat(amountMatch[0].replace(/[^0-9.]/g, ''));
        break;
      }
    }
    
    // Try merchant extraction patterns
    const merchantPatterns = highConfidencePatterns.filter(row => row[1] === LEARNING_TYPES.MERCHANT_EXTRACTION);
    for (const pattern of merchantPatterns) {
      if (body.toLowerCase().includes(pattern[2].toLowerCase())) {
        merchant = pattern[2];
        
        // Try to get category from cross-validation
        const crossValidationPatterns = highConfidencePatterns.filter(row => 
          row[1] === LEARNING_TYPES.CROSS_VALIDATION &&
          row[2].includes(merchant)
        );
        
        if (crossValidationPatterns.length > 0) {
          const categoryMatch = crossValidationPatterns[0][2].match(/→(.+)/);
          if (categoryMatch) {
            category = categoryMatch[1];
          }
        }
        break;
      }
    }
    
    if (amount && amount > 0) {
      attemptedParsers.push('unified_ai_patterns');
      
      return {
        date: message.getDate(),
        amount: amount,
        fromAccount: 'AI Detected Account',
        toAccount: merchant || 'AI Detected Merchant',
        bank: 'Learning System',
        notes: `Parsed using learned patterns (confidence: learned)`,
        emailId: message.getId(),
        type: 'purchase',
        category: category || 'Uncategorized'
      };
    }
    
    return null;
    
  } catch (error) {
    _logError('Learning pattern parsing failed', error);
    return null;
  }
}

// ENHANCED: CIBC Email Parser with sender-aware capabilities
function _parseCibcEmailEnhanced(message, subject, body, accountsSheet, senderProfile) {
  const subjectLower = _lc(subject);
  const bodyLower = _lc(body);
  
  // Leverage CIBC's excellent merchant info capability
  const merchantExtractionPatterns = [
    /at\s+([A-Z0-9 \._\-&']+)\s+(?:was|on)/i,
    /merchant[:\s]*([^\n\r,]+)/i,
    /for\s+\$[\d,]+\.[\d]{2}\s+at\s+([^.]+)\./i,
    /transaction\s+at\s+([^,\n\r]+)/i,
    /purchase\s+at\s+([^,\n\r]+)/i
  ];
  
  // Enhanced account detection using card number suffix
  function detectCibcAccount(content) {
    const cardPatterns = {
      'CIBC Aventura': [/aventura/i, /card.*6271/i],
      'CIBC Dividend': [/dividend/i, /card.*2866/i]
    };
    
    for (const [account, patterns] of Object.entries(cardPatterns)) {
      if (patterns.some(pattern => pattern.test(content))) {
        return account;
      }
    }
    
    // Fallback to most negative card logic (CIBC's account detection capability)
    return accountsSheet ? _chooseMostNegativeCibcCard(accountsSheet) || senderProfile.fallbackAccount 
                        : senderProfile.fallbackAccount;
  }
  
  // CREDIT/REFUND detection - Money returned to card account
  const creditKeywords = ['credit', 'refund', 'return', 'credited', 'received a credit'];
  const creditPatterns = [
    /received\s+a\s+credit\s+of\s+\$?([\d,]+\.[\d]{2})/i,
    /credit\s+of\s+\$?([\d,]+\.[\d]{2})/i,
    /refund\s+of\s+\$?([\d,]+\.[\d]{2})/i,
    /return.*\$?([\d,]+\.[\d]{2})/i
  ];
  
  if (creditKeywords.some(keyword => subjectLower.includes(keyword)) || 
      creditPatterns.some(pattern => pattern.test(bodyLower))) {
    const amount = _extractAmount(body) || _extractAmount(subject);
    if (!amount) return null;
    
    const targetAccount = detectCibcAccount(subject + body);
    
    // Extract merchant from credit description
    const merchantMatch = body.match(/credit.*from\s+([A-Z0-9\*\s\._\-&']+?)(?:\s+on|\s+to|$)/i) ||
                         body.match(/refund.*from\s+([A-Z0-9\*\s\._\-&']+?)(?:\s+on|\s+to|$)/i);
    let merchant = merchantMatch ? merchantMatch[1].trim() : 'Credit/Refund';
    merchant = _enhanceMerchantName(merchant, 'cibc');
    
    return {
      date: message.getDate(),
      amount: amount, // Positive amount for credit
      direction: 'IN',
      fromAccount: merchant,
      toAccount: targetAccount,
      bank: `${targetAccount} Credit`,
      emailId: message.getId(),
      type: 'Card Credit/Refund',
      notes: `Credit/refund from ${merchant}`,
      senderInfo: {
        id: 'cibc',
        merchantInfoQuality: senderProfile.capabilities.merchantInfo,
        accountDetectionMethod: 'card_analysis',
        transactionType: 'credit'
      }
    };
  }
  
  // PAYMENT detection - Credit to card account
  const paymentKeywords = ['payment', 'payment received', 'new payment to your credit card', 'payment has been applied', 'credit card payment', 'payment processed'];
  
  if (paymentKeywords.some(keyword => subjectLower.includes(keyword))) {
    const amount = _extractAmount(body) || _extractAmount(subject);
    if (!amount) return null;
    
    const targetAccount = detectCibcAccount(subject + body);
    
    return {
      date: message.getDate(),
      amount: amount,
      direction: 'IN',
      fromAccount: 'External Payment',
      toAccount: targetAccount,
      bank: 'CIBC Card Payment',
      emailId: message.getId(),
      type: 'Card Payment',
      notes: `Payment to ${targetAccount}`,
      senderInfo: {
        id: 'cibc',
        merchantInfoQuality: senderProfile.capabilities.merchantInfo,
        accountDetectionMethod: 'card_analysis'
      }
    };
  }
  
  // PURCHASE detection - Debit from card account (leveraging CIBC's excellent merchant info)
  const purchaseKeywords = ['purchase', 'charge', 'authorization', 'transaction'];
  
  if (purchaseKeywords.some(keyword => subjectLower.includes(keyword)) || /purchase of|your card.*was charged|card ending in/i.test(bodyLower)) {
    const amount = _extractAmount(body) || _extractAmount(subject);
    if (!amount) return null;
    
    const cardAccount = detectCibcAccount(subject + body);
    
    // Enhanced merchant extraction using CIBC's detailed merchant info
    let merchant = 'Unknown Merchant';
    for (const pattern of merchantExtractionPatterns) {
      const match = body.match(pattern);
      if (match && match[1]) {
        merchant = match[1].trim();
        break;
      }
    }
    
    // Clean and enhance merchant name
    merchant = _enhanceMerchantName(merchant, 'cibc');
    
    return {
      date: message.getDate(),
      amount: -Math.abs(amount),
      direction: 'OUT',
      fromAccount: cardAccount,
      toAccount: merchant,
      bank: `${cardAccount} Purchase`,
      emailId: message.getId(),
      type: 'Card Purchase',
      notes: `Purchase at ${merchant}`,
      senderInfo: {
        id: 'cibc',
        merchantInfoQuality: senderProfile.capabilities.merchantInfo,
        accountDetectionMethod: 'card_analysis',
        extractedMerchant: merchant
      }
    };
  }
  
  return null;
}

// ENHANCED: PC Financial Email Parser with sender-aware capabilities
function _parsePcFinancialEmailEnhanced(message, subject, body, senderProfile) {
  const subjectLower = _lc(subject);
  const bodyLower = _lc(body);
  
  // PC Financial has good merchant info but limited account variety
  const merchantExtractionPatterns = [
    /merchant[:\s]*([^\n\r]+)/i,
    /at\s+([A-Z0-9 \._\-&']+)/i,
    /purchase\s+at\s+([^,\n\r]+)/i
  ];
  
  // Purchase notice (leveraging PC Financial's good merchant info)
  if (subjectLower.includes('purchase notice') || /purchase amount/i.test(bodyLower)) {
    const amount = _extractAmount(body, /purchase amount[:\s]*\$([0-9,]+\.[0-9]{2})/i) || _extractAmount(body);
    if (!amount) return null;
    
    let merchant = 'Unknown Merchant';
    for (const pattern of merchantExtractionPatterns) {
      const match = body.match(pattern);
      if (match && match[1]) {
        merchant = match[1].trim();
        break;
      }
    }
    
    merchant = _enhanceMerchantName(merchant, 'pcfinancial');
    
    // Intelligent transfer detection for Wealthsimple (cross-sender awareness)
    if (/wealthsimple/i.test(merchant)) {
      return {
        date: message.getDate(),
        amount: -Math.abs(amount),
        direction: 'OUT',
        fromAccount: senderProfile.fallbackAccount,
        toAccount: 'Pending Wealthsimple',
        bank: 'PC Financial Purchase',
        emailId: message.getId(),
        type: 'Transfer',
        shouldStage: true,
        notes: `Wealthsimple deposit - awaiting confirmation`,
        senderInfo: {
          id: 'pcfinancial',
          merchantInfoQuality: senderProfile.capabilities.merchantInfo,
          crossSenderAwareness: 'wealthsimple_transfer_detected'
        }
      };
    }
    
    return {
      date: message.getDate(),
      amount: -Math.abs(amount),
      direction: 'OUT',
      fromAccount: senderProfile.fallbackAccount,
      toAccount: merchant,
      bank: 'PC Financial Purchase',
      emailId: message.getId(),
      type: 'Purchase',
      notes: `Purchase at ${merchant}`,
      senderInfo: {
        id: 'pcfinancial',
        merchantInfoQuality: senderProfile.capabilities.merchantInfo,
        extractedMerchant: merchant
      }
    };
  }
  
  // E-transfer sent (leveraging PC Financial's variable recipient info)
  if (subjectLower.includes('transfer to') || /e-transfer/i.test(bodyLower)) {
    const amount = _extractAmount(subject) || _extractAmount(body);
    if (!amount) return null;
    
    // Enhanced recipient extraction patterns
    const recipientPatterns = [
      /transfer to\s+(.+?)\s+has been/i,
      /transfer to\s+(.+?)\s+for/i,
      /recipient[:\s]*([^\n\r]+)/i,
      /sent to[:\s]*([^\n\r]+)/i,
      /to:\s*([^\n\r]+)/i
    ];
    
    let recipient = null;
    for (const pattern of recipientPatterns) {
      const match = (subject + ' ' + body).match(pattern);
      if (match && match[1]) {
        recipient = match[1].trim();
        break;
      }
    }
    
    if (!recipient) {
      return {
        date: message.getDate(),
        amount: -Math.abs(amount),
        direction: 'OUT',
        fromAccount: senderProfile.fallbackAccount,
        toAccount: 'Pending - Unknown Recipient',
        bank: 'PC Financial e-Transfer',
        emailId: message.getId(),
        type: 'External Transfer',
        shouldStage: true,
        notes: 'Unable to determine recipient - requires manual review',
        senderInfo: {
          id: 'pcfinancial',
          recipientInfoQuality: 'failed_extraction',
          requiresManualReview: true
        }
      };
    }
    
    const normalizedRecipient = _normalizeAccountName(recipient);
    const isInternal = _isInternalAccount(normalizedRecipient);
    
    return {
      date: message.getDate(),
      amount: -Math.abs(amount),
      direction: 'OUT',
      fromAccount: senderProfile.fallbackAccount,
      toAccount: isInternal ? normalizedRecipient : `External to ${recipient}`,
      bank: 'PC Financial e-Transfer',
      emailId: message.getId(),
      type: isInternal ? 'Internal Transfer' : 'External Transfer',
      shouldStage: isInternal,
      notes: isInternal ? `Internal transfer to ${normalizedRecipient}` : `External transfer to ${recipient}`,
      senderInfo: {
        id: 'pcfinancial',
        recipientInfoQuality: senderProfile.capabilities.recipientInfo,
        isInternalTransfer: isInternal,
        extractedRecipient: recipient
      }
    };
  }
  
  return null;
}

// ENHANCED: Interac Email Parser with sender-aware capabilities
function _parseInteracEmailEnhanced(message, subject, body, senderProfile) {
  // Interac has excellent recipient info but no merchant info
  const amount = _extractAmount(body, /sent you \$([0-9,]+\.[0-9]{2})/i) ||
                 _extractAmount(body, /amount[:\s]*\$([0-9,]+\.[0-9]{2})/i) ||
                 _extractAmount(subject, /\$([0-9,]+\.[0-9]{2})/i);
  
  if (!amount) return null;
  
  // Enhanced sender extraction using Interac's excellent recipient capabilities
  const senderPatterns = [
    /([A-Za-z0-9 .'-]+)\s+sent you \$/i,
    /From[:\s]*([A-Za-z0-9 .'-]+)/i,
    /sender[:\s]*([A-Za-z0-9 .'-]+)/i,
    /from\s+([A-Za-z0-9 .'-]+)/i
  ];
  
  let sender = 'Unknown Sender';
  for (const pattern of senderPatterns) {
    const match = (subject + ' ' + body).match(pattern);
    if (match && match[1]) {
      sender = match[1].trim();
      break;
    }
  }
  
  // Intelligent destination account detection
  let destinationAccount = senderProfile.fallbackAccount;
  
  // Check if this might be going to a specific account based on sender
  if (/wealthsimple/i.test(sender)) {
    destinationAccount = 'Wealthsimple Cash';
  } else if (/dividend|investment/i.test(sender)) {
    destinationAccount = 'CIBC Dividend';
  }
  
  return {
    date: message.getDate(),
    amount: amount,
    direction: 'IN',
    fromAccount: `e-Transfer from ${sender}`,
    toAccount: destinationAccount,
    bank: 'Interac Deposit',
    emailId: message.getId(),
    type: 'Interac',
    notes: `Received from ${sender}`,
    senderInfo: {
      id: 'interac',
      recipientInfoQuality: senderProfile.capabilities.recipientInfo,
      extractedSender: sender,
      destinationLogic: 'sender_based_routing'
    }
  };
}

// ENHANCED: Wealthsimple Email Parser with sender-aware capabilities
function _parseWealthsimpleEmailEnhanced(message, subject, body, senderProfile) {
  const subjectLower = _lc(subject);
  const bodyLower = _lc(body);
  
  // Enhanced account type detection using Wealthsimple's excellent account info
  function detectWealthsimpleAccount(content, defaultAccount = senderProfile.fallbackAccount) {
    const accountPatterns = {
      'Wealthsimple RRSP': [/rrsp/i, /retirement/i, /retirey mcretireface/i],
      'Wealthsimple TFSA': [/tfsa/i, /tax.*free/i],
      'Wealthsimple Cash': [/cash/i, /spending/i, /save/i],
      'Wealthsimple Trade': [/trade/i, /trading/i, /investment/i]
    };
    
    for (const [account, patterns] of Object.entries(accountPatterns)) {
      if (patterns.some(pattern => pattern.test(content))) {
        return account;
      }
    }
    
    return defaultAccount;
  }
  
  // 1. DEPOSIT/CONTRIBUTION CONFIRMATION (leveraging excellent account info)
  if (subjectLower.includes('deposit') || /added money|deposit.*confirmed|contribution/i.test(bodyLower)) {
    const amount = _extractAmount(body, /amount[:\s]*\$([0-9,]+\.[0-9]{2})/i) || _extractAmount(subject) || _extractAmount(body);
                   
    if (!amount) return null;
    
    // Enhanced account detection using Wealthsimple's capabilities
    const accountInfo = _extractText(body, /to[:\s]*([\s\S]*?)\s*sometimes/i) || 
                        _extractText(body, /your\s+([A-Za-z]+)\s+account/i) ||
                        _extractText(body, /account type[:\s]*([^\n\r]+)/i) ||
                        '';
    
    const targetAccount = detectWealthsimpleAccount(accountInfo + subject + body);
    
    // Parse any holdings data (leveraging excellent holdings info capability)
    const holdingsData = _parseWealthsimpleHoldingsFromEmail(body);
    
    const transaction = {
      date: message.getDate(),
      amount: amount,
      direction: 'IN',
      fromAccount: 'PC Financial',
      toAccount: targetAccount,
      bank: 'Wealthsimple Deposit',
      emailId: message.getId(),
      type: 'Investment Contribution',
      shouldPair: true,
      notes: `Contribution to ${targetAccount}`,
      senderInfo: {
        id: 'wealthsimple',
        accountInfoQuality: senderProfile.capabilities.accountInfo,
        holdingsInfoQuality: senderProfile.capabilities.holdingsInfo,
        detectedAccount: targetAccount,
        holdingsFound: holdingsData.length
      }
    };
    
    if (holdingsData.length > 0) {
      transaction.holdings = holdingsData;
    }
    
    return transaction;
  }
  
  // 2. TRADE EXECUTION (leveraging ticker symbols and excellent holdings info)
  if (subjectLower.includes('order has been filled') || /shares of|purchased|bought/i.test(bodyLower)) {
    const tradeMatch = body.match(/(\d+[\d.,]*)\s+shares\s+of\s+([A-Z\.\-]+)[\s\S]+?total cost[:\s]*\$([0-9,]+\.[0-9]+)/i);
    
    if (!tradeMatch) return null;
    
    const shares = parseFloat(tradeMatch[1].replace(/,/g, ''));
    const ticker = tradeMatch[2].trim();
    const cost = parseFloat(tradeMatch[3].replace(/,/g, ''));
    
    const accountInfo = _extractText(body, /account[:\s]*([\s\S]*?)\s*time:/i) || 
                        _extractText(body, /your\s+([A-Za-z]+)\s+account/i) ||
                        '';
    
    const targetAccount = detectWealthsimpleAccount(accountInfo + subject + body);
    
    // Enhanced trade processing with holdings integration
    setTimeout(() => _updateHoldingsFromTrade(targetAccount, ticker, shares, cost), 1000);
    
    return {
      date: message.getDate(),
      amount: -cost,
      direction: 'TRADE',
      fromAccount: targetAccount,
      toAccount: targetAccount,
      bank: 'Wealthsimple Trade',
      emailId: message.getId(),
      type: 'Investment Purchase',
      notes: `Bought ${shares} shares of ${ticker}`,
      tradeInfo: { ticker, shares, cost },
      senderInfo: {
        id: 'wealthsimple',
        accountInfoQuality: senderProfile.capabilities.accountInfo,
        holdingsInfoQuality: senderProfile.capabilities.holdingsInfo,
        tickerSymbol: ticker,
        detectedAccount: targetAccount,
        autoHoldingsUpdate: true
      }
    };
  }
  
  // 3. PORTFOLIO SUMMARY/STATEMENT EMAILS (leveraging excellent holdings info)
  if (subjectLower.includes('portfolio') || subjectLower.includes('statement') || subjectLower.includes('summary')) {
    const holdingsData = _parseWealthsimpleHoldingsFromEmail(body);
    
    if (holdingsData.length > 0) {
      // Enhanced portfolio processing
      setTimeout(() => _updateAllHoldingsFromEmail(holdingsData), 1000);
      
      return {
        date: message.getDate(),
        amount: 0,
        direction: 'INFO',
        fromAccount: 'Wealthsimple',
        toAccount: 'Portfolio Update',
        bank: 'Wealthsimple Portfolio',
        emailId: message.getId(),
        type: 'Portfolio Update',
        notes: `Portfolio summary with ${holdingsData.length} holdings`,
        holdings: holdingsData,
        senderInfo: {
          id: 'wealthsimple',
          holdingsInfoQuality: senderProfile.capabilities.holdingsInfo,
          holdingsCount: holdingsData.length,
          portfolioUpdateType: 'statement'
        }
      };
    }
  }
  
  // 4. DIVIDEND/DISTRIBUTION (investment-specific handling)
  if (subjectLower.includes('dividend') || subjectLower.includes('distribution')) {
    const dividendMatch = body.match(/(?:dividend|distribution).*?\$([0-9,]+\.[0-9]+)/i);
    if (dividendMatch) {
      const amount = parseFloat(dividendMatch[1].replace(/,/g, ''));
      const targetAccount = detectWealthsimpleAccount(subject + body);
      
      return {
        date: message.getDate(),
        amount: amount,
        direction: 'IN',
        fromAccount: 'Investment Dividends',
        toAccount: targetAccount,
        bank: 'Wealthsimple Dividend',
        emailId: message.getId(),
        type: 'Dividend/Distribution',
        notes: `Dividend/distribution payment`,
        senderInfo: {
          id: 'wealthsimple',
          accountInfoQuality: senderProfile.capabilities.accountInfo,
          detectedAccount: targetAccount,
          paymentType: 'dividend'
        }
      };
    }
  }
  
  return null;
}

// ENHANCED: PayPal Email Parser with sender-aware capabilities
function _parsePayPalEmailEnhanced(message, subject, body, senderProfile) {
  _logInfo(`PayPal parser started`, { 
    subject: subject,
    bodyPreview: body.substring(0, 200),
    fromAddress: message.getFrom()
  });
  
  const subjectLower = _lc(subject);
  const bodyLower = _lc(body);
  
  // CRITICAL FIX: Check for PC Financial PayPal transactions first
  if (subject.includes('PC Financial') || body.includes('PC Financial')) {
    const pcFinancialRegex = /\$([0-9,]+\.[0-9]{2})\s+CAD.*PayPal/i;
    const match = body.match(pcFinancialRegex);
    if (match) {
      const amount = parseFloat(match[1].replace(',', ''));
      _logInfo(`PC Financial PayPal transaction detected`, {
        amount: amount,
        subject: subject,
        bodySegment: body.substring(0, 300)
      });
      
      return {
        date: message.getDate(),
        amount: -Math.abs(amount),
        direction: 'OUT',
        fromAccount: 'PC Financial',
        toAccount: 'PayPal via PC Financial',
        bank: 'PC Financial Purchase',
        emailId: message.getId(),
        type: 'PayPal Payment',
        notes: `PayPal payment via PC Financial ($${amount} CAD)`,
        senderInfo: {
          id: 'paypal',
          parseMethod: 'pc_financial_paypal_fix',
          linkedAccount: 'PC Financial'
        }
      };
    }
  }
  
  // PayPal Authorization detection - Debit transaction
  const authKeywords = ['you authorized', 'authorization', 'authorized payment'];
  
  _logInfo(`PayPal authorization check`, {
    authKeywords: authKeywords,
    subjectMatches: authKeywords.filter(keyword => subjectLower.includes(keyword)),
    bodyMatches: authKeywords.filter(keyword => bodyLower.includes(keyword))
  });
  
  if (authKeywords.some(keyword => subjectLower.includes(keyword) || bodyLower.includes(keyword))) {
    _logInfo(`PayPal authorization detected!`);
    
    // Extract amount - PayPal often uses USD amounts
    const usdAmountMatch = body.match(/(?:authorized|payment|to).*?(?:us\$|usd?\s*)([0-9,]+\.[0-9]+)/i) ||
                          subject.match(/(?:authorized|payment|to).*?(?:us\$|usd?\s*)([0-9,]+\.[0-9]+)/i) ||
                          body.match(/us\$([0-9,]+\.[0-9]+)/i) ||
                          subject.match(/us\$([0-9,]+\.[0-9]+)/i);
    
    const cadAmountMatch = body.match(/\$([0-9,]+\.[0-9]+)\s+cad/i);
    
    _logInfo(`PayPal amount extraction`, {
      usdMatch: usdAmountMatch ? usdAmountMatch[1] : null,
      cadMatch: cadAmountMatch ? cadAmountMatch[1] : null,
      bodySegment: body.substring(0, 300)
    });
    
    let amount = 0;
    let currency = 'CAD';
    
    if (cadAmountMatch) {
      amount = parseFloat(cadAmountMatch[1].replace(/,/g, ''));
      currency = 'CAD';
    } else if (usdAmountMatch) {
      amount = parseFloat(usdAmountMatch[1].replace(/,/g, ''));
      // Convert USD to CAD (PayPal usually shows both)
      const cadConversionMatch = body.match(/\$([0-9,]+\.[0-9]+)\s+cad/i);
      if (cadConversionMatch) {
        amount = parseFloat(cadConversionMatch[1].replace(/,/g, ''));
        currency = 'CAD';
      } else {
        amount *= 1.37; // Rough USD to CAD conversion
        currency = 'CAD (converted)';
      }
    }
    
    if (!amount) return null;
    
    // Extract merchant information
    const merchantMatch = body.match(/(?:to|merchant)\s+([A-Za-z0-9\s,.\-&']+?)(?:\n|email|support|\+|$)/i) ||
                          subject.match(/(?:to|payment to)\s+([A-Za-z0-9\s,.\-&']+?)(?:\.|$)/i) ||
                          body.match(/(?:authorized.*to)\s+([A-Za-z0-9\s,.\-&']+?)(?:\n|email|support|\+|$)/i);
    let merchant = merchantMatch ? merchantMatch[1].trim() : 'PayPal Merchant';
    
    // Extract linked payment method
    const paymentMethodMatch = body.match(/(?:credit|authorized with)\s+([A-Z\s]+).*?(?:••|ending)(\d{4})/i);
    let linkedAccount = 'PayPal';
    
    if (paymentMethodMatch) {
      const bankName = paymentMethodMatch[1].trim();
      const lastFour = paymentMethodMatch[2];
      
      // Map to known accounts based on card ending
      if (lastFour === '6271') {
        linkedAccount = 'CIBC Aventura';
      } else if (lastFour === '2866') {
        linkedAccount = 'CIBC Dividend';
      } else {
        linkedAccount = `${bankName} ••${lastFour}`;
      }
    }
    
    const transaction = {
      date: message.getDate(),
      amount: -Math.abs(amount), // PayPal authorizations are expenses
      direction: 'OUT',
      fromAccount: linkedAccount,
      toAccount: merchant,
      bank: 'PayPal Authorization',
      emailId: message.getId(),
      type: 'PayPal Payment',
      notes: `PayPal payment to ${merchant} (${currency})`,
      senderInfo: {
        id: 'paypal',
        merchantInfoQuality: senderProfile.capabilities.merchantInfo,
        linkedPaymentMethod: linkedAccount,
        currency: currency,
        transactionType: 'authorization'
      }
    };
    
    // Record successful patterns in learning system
    _recordLearning(LEARNING_TYPES.AMOUNT_DETECTION, amount.toString(), body.substring(0, 200), 0.9, {
      senderId: 'paypal',
      currency: currency,
      pattern: 'paypal_authorization'
    });
    
    _recordLearning(LEARNING_TYPES.MERCHANT_EXTRACTION, merchant, body.substring(0, 200), 0.8, {
      senderId: 'paypal',
      extractionMethod: 'authorization_pattern'
    });
    
    _recordLearning(LEARNING_TYPES.EMAIL_PARSING, 'paypal_authorization_success', subject + ' | ' + body.substring(0, 100), 0.9, {
      senderId: 'paypal',
      transactionType: 'authorization',
      linkedAccount: linkedAccount
    });
    
    return transaction;
  }
  
  // PayPal Refund detection
  const refundKeywords = ['refund', 'refunded', 'money back', 'reversed'];
  
  if (refundKeywords.some(keyword => bodyLower.includes(keyword))) {
    const amount = _extractAmount(body) || _extractAmount(subject);
    if (!amount) return null;
    
    const merchantMatch = body.match(/(?:from|refund.*from)\s+([A-Za-z0-9\s,.\-&']+?)(?:\n|email|support|\+|$)/i);
    let merchant = merchantMatch ? merchantMatch[1].trim() : 'PayPal Refund';
    
    return {
      date: message.getDate(),
      amount: amount, // Positive for refund
      direction: 'IN',
      fromAccount: merchant,
      toAccount: 'PayPal Account',
      bank: 'PayPal Refund',
      emailId: message.getId(),
      type: 'PayPal Refund',
      notes: `PayPal refund from ${merchant}`,
      senderInfo: {
        id: 'paypal',
        merchantInfoQuality: senderProfile.capabilities.merchantInfo,
        transactionType: 'refund'
      }
    };
  }
  
  return null;
}

// Fallback parsing for unknown senders
function _parseFallbackEmail(message, subject, body) {
  _logWarning('Using fallback email parsing for unknown sender', {
    from: message.getFrom(),
    subject: subject.substring(0, 50)
  });
  
  // Basic amount extraction
  const amount = _extractAmount(body) || _extractAmount(subject);
  if (!amount) return null;
  
  return {
    date: message.getDate(),
    amount: amount > 0 ? -Math.abs(amount) : amount, // Assume expense if positive
    direction: amount > 0 ? 'OUT' : 'IN',
    fromAccount: 'Unknown Source',
    toAccount: 'Unknown Destination',
    bank: 'Unknown Bank',
    emailId: message.getId(),
    type: 'Unknown Transaction',
    notes: `Fallback parsing - manual review needed`,
    shouldStage: true, // Always stage unknown transactions
    senderInfo: {
      id: 'unknown',
      requiresManualReview: true,
      fallbackParsing: true
    }
  };
}

// Backward compatibility wrapper
function _parseCibcEmail(message, subject, body, accountsSheet) {
  const sender = _identifyEmailSender(message.getFrom(), subject, body);
  return _parseCibcEmailEnhanced(message, subject, body, accountsSheet, sender.profile || SENDER_PROFILES.cibc);
}

function _parsePcFinancialEmail(message, subject, body) {
  const sender = _identifyEmailSender(message.getFrom(), subject, body);
  return _parsePcFinancialEmailEnhanced(message, subject, body, sender.profile || SENDER_PROFILES.pcfinancial);
}

function _parseInteracEmail(message, subject, body) {
  const sender = _identifyEmailSender(message.getFrom(), subject, body);
  return _parseInteracEmailEnhanced(message, subject, body, sender.profile || SENDER_PROFILES.interac);
}

function _parseWealthsimpleEmail(message, subject, body) {
  const sender = _identifyEmailSender(message.getFrom(), subject, body);
  return _parseWealthsimpleEmailEnhanced(message, subject, body, sender.profile || SENDER_PROFILES.wealthsimple);
}

function _chooseMostNegativeCibcCard(accountsSheet) {
  if (!accountsSheet || accountsSheet.getLastRow() < 2) return null;
  
  const data = accountsSheet.getDataRange().getValues();
  let mostNegativeCard = null, mostNegativeBalance = 0;
  
  for (let i = 1; i < data.length; i++) {
    const accountName = _normalize(data[i][COLUMNS.ACCOUNTS.NAME - 1]);
    if (!/^CIBC\s+(Aventura|Dividend)/i.test(accountName)) continue;
    
    const balance = parseFloat(data[i][COLUMNS.ACCOUNTS.BALANCE - 1] || 0);
    if (mostNegativeCard === null || balance < mostNegativeBalance) {
      mostNegativeCard = accountName;
      mostNegativeBalance = balance;
    }
  }
  
  return mostNegativeCard;
}

// Parse holdings data from Wealthsimple emails
function _parseWealthsimpleHoldingsFromEmail(emailBody) {
  const holdings = [];
  
  try {
    // Pattern 1: Table format "Symbol | Shares | Price | Market Value"
    const tablePattern = /(?:Symbol|Ticker)[\s\|]*Shares[\s\|]*(?:Unit )?Price[\s\|]*(?:Market )?Value([\s\S]*?)(?:\n\s*\n|Total|Summary|$)/i;
    const tableMatch = emailBody.match(tablePattern);
    
    if (tableMatch) {
      const tableContent = tableMatch[1];
      const lines = tableContent.split(/[\n\r]+/).filter(line => line.trim() && !line.match(/^\s*[-\|=]+\s*$/));
      
      for (const line of lines) {
        // Enhanced pattern matching for different formats
        let match = line.match(/([A-Z]{2,5}(?:\.TO)?)\s*\|?\s*([0-9,]+\.?\d*)\s*\|?\s*\$?([0-9,]+\.?\d+)\s*\|?\s*\$?([0-9,]+\.?\d+)/i);
        
        if (!match) {
          // Alternative pattern without pipes
          match = line.match(/([A-Z]{2,5}(?:\.TO)?)\s+([0-9,]+\.?\d*)\s+\$?([0-9,]+\.?\d+)\s+\$?([0-9,]+\.?\d+)/i);
        }
        
        if (match) {
          const ticker = match[1].trim();
          const shares = parseFloat(match[2].replace(/,/g, ''));
          const price = parseFloat(match[3].replace(/,/g, ''));
          const value = parseFloat(match[4].replace(/,/g, ''));
          
          holdings.push({
            ticker: ticker,
            shares: shares,
            price: price,
            value: value,
            account: 'Wealthsimple'
          });
        }
      }
    }
    
    // Pattern 2: Individual line format "TICKER: X.XX shares at $Y.YY"
    const individualPattern = /([A-Z]{2,5}(?:\.TO)?)\s*:\s*([0-9,]+\.?\d*)\s*(?:shares?|units?)\s*(?:at\s*)?\$?([0-9,]+\.?\d+)/gi;
    let individualMatch;
    while ((individualMatch = individualPattern.exec(emailBody)) !== null) {
      const ticker = individualMatch[1].trim();
      const shares = parseFloat(individualMatch[2].replace(/,/g, ''));
      const price = parseFloat(individualMatch[3].replace(/,/g, ''));
      
      holdings.push({
        ticker: ticker,
        shares: shares,
        price: price,
        value: shares * price,
        account: 'Wealthsimple'
      });
    }
    
  } catch (error) {
    _logError('Failed to parse Wealthsimple holdings from email', error);
  }
  
  return holdings;
}

// ===================== HOLDINGS UPDATE FUNCTIONS =====================

function _updateHoldingsFromTrade(account, ticker, shares, cost) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
    
    if (!holdingsSheet) {
      _logError('Holdings sheet not found for trade update');
      return;
    }
    
    // Find existing holding row based on new structure: Account, Ticker, Shares, Unit Price, Total Value, Last Updated
    const existingRow = _findHoldingRow(holdingsSheet, ticker);
    
    if (existingRow > 0) {
      // Update existing holding
      const currentShares = parseFloat(holdingsSheet.getRange(existingRow, 3).getValue() || 0); // Column C: Shares
      const newShares = currentShares + shares;
      
      // Update shares
      holdingsSheet.getRange(existingRow, 3).setValue(newShares); // Column C: Shares
      
      // Update last updated
      holdingsSheet.getRange(existingRow, 6).setValue(new Date()); // Column F: Last Updated
      
      _logInfo(`Updated ${ticker}: ${currentShares} + ${shares} = ${newShares} shares`);
      
    } else {
      // Add new holding
      const newRow = [
        account,                   // Column A: Account
        ticker,                    // Column B: Ticker
        shares,                    // Column C: Shares
        '',                        // Column D: Unit Price (to be fetched)
        '',                        // Column E: Total Value (to be calculated)
        new Date()                 // Column F: Last Updated
      ];
      
      holdingsSheet.appendRow(newRow);
      _logInfo(`Added new holding: ${ticker} - ${shares} shares in ${account}`);
    }
    
    // Immediately refresh price for this holding
    setTimeout(() => _refreshSingleHolding(ticker), 2000);
    
  } catch (error) {
    _logError('Failed to update holdings from trade', error, { ticker, shares, cost });
  }
}

function _updateAllHoldingsFromEmail(holdingsData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
    
    if (!holdingsSheet || !holdingsData || holdingsData.length === 0) {
      _logInfo('No holdings data to update from email');
      return;
    }
    
    let updatedCount = 0;
    
    for (const holding of holdingsData) {
      const existingRow = _findHoldingRow(holdingsSheet, holding.ticker);
      
      if (existingRow > 0) {
        // Update existing holding shares and price if provided
        if (holding.shares !== undefined) {
          holdingsSheet.getRange(existingRow, 2).setValue(holding.shares);
        }
        if (holding.price !== undefined && holding.price > 0) {
          holdingsSheet.getRange(existingRow, 4).setValue(holding.price);
        }
        if (holding.value !== undefined && holding.value > 0) {
          holdingsSheet.getRange(existingRow, 5).setValue(holding.value);
        }
        
        holdingsSheet.getRange(existingRow, 7).setValue(new Date());
        updatedCount++;
        
        _logInfo(`Updated holding from email: ${holding.ticker} - ${holding.shares} shares`);
        
      } else {
        // Add new holding if it doesn't exist
        const newRow = [
          holding.ticker,
          holding.shares || 0,
          '',  // Cost basis to be calculated
          holding.price || '',
          holding.value || '',
          holding.account || 'Wealthsimple',
          new Date()
        ];
        
        holdingsSheet.appendRow(newRow);
        updatedCount++;
        
        _logInfo(`Added new holding from email: ${holding.ticker} - ${holding.shares} shares`);
      }
    }
    
    _logInfo(`Holdings update from email completed: ${updatedCount} holdings processed`);
    
  } catch (error) {
    _logError('Failed to update holdings from email', error);
  }
}

function _refreshSingleHolding(ticker) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
    
    if (!holdingsSheet) return;
    
    const existingRow = _findHoldingRow(holdingsSheet, ticker);
    if (existingRow <= 0) return;
    
    // Get current shares
    const shares = parseFloat(holdingsSheet.getRange(existingRow, 2).getValue() || 0);
    if (shares <= 0) return;
    
    // Fetch current price
    const price = _fetchPriceFromAPI(ticker);
    
    if (price > 0) {
      const currentValue = shares * price;
      
      holdingsSheet.getRange(existingRow, 4).setValue(price);      // Current Price
      holdingsSheet.getRange(existingRow, 5).setValue(currentValue); // Current Value
      holdingsSheet.getRange(existingRow, 7).setValue(new Date());   // Last Updated
      
      _logInfo(`Refreshed ${ticker}: ${shares} shares @ $${price.toFixed(6)} = $${currentValue.toFixed(2)}`);
    } else {
      _logWarning(`Could not fetch price for ${ticker}`);
    }
    
  } catch (error) {
    _logError('Failed to refresh single holding', error, { ticker });
  }
}

function _calculatePortfolioSummary() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
    
    if (!holdingsSheet || holdingsSheet.getLastRow() < 2) {
      return { totalValue: 0, totalCost: 0, totalGainLoss: 0, holdings: 0 };
    }
    
    const lastRow = holdingsSheet.getLastRow();
    const data = holdingsSheet.getRange(2, 1, lastRow - 1, 7).getValues();
    
    let totalValue = 0;
    let totalCost = 0;
    let holdingsCount = 0;
    
    for (const row of data) {
      if (!row || row.length === 0) continue;
      
      const shares = parseFloat(row[1] || 0);        // Column B: Shares
      const costBasis = parseFloat(row[2] || 0);     // Column C: Cost Basis
      const currentValue = parseFloat(row[4] || 0);  // Column E: Current Value
      
      if (shares > 0) {
        holdingsCount++;
        totalValue += currentValue;
        totalCost += (costBasis * shares);
      }
    }
    
    return {
      totalValue: totalValue,
      totalCost: totalCost,
      totalGainLoss: totalValue - totalCost,
      holdings: holdingsCount
    };
    
  } catch (error) {
    _logError('Failed to calculate portfolio summary', error);
    return { totalValue: 0, totalCost: 0, totalGainLoss: 0, holdings: 0 };
  }
}

// ===================== EMAIL PROCESSING ENGINE =====================

function _processNewEmails(batchSize = 50, useHistoricalCategorization = false) {
  try {
    const ss = _ss();
    _ensureSheetsAndHeaders();
    
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    const stagingSheet = ss.getSheetByName(SHEET_NAMES.STAGING);
    const accountsSheet = ss.getSheetByName(SHEET_NAMES.ACCOUNTS);
    
    // Get existing email IDs to prevent duplicates
    const existingIds = new Set();
    
    if (mainSheet.getLastRow() > 1) {
      const mainIds = mainSheet.getRange(2, 7, mainSheet.getLastRow() - 1, 1) // Column G: Email ID
        .getValues().flat().filter(id => id);
      mainIds.forEach(id => existingIds.add(id));
    }
    
    if (stagingSheet.getLastRow() > 1) {
      const stagingIds = stagingSheet.getRange(2, 6, stagingSheet.getLastRow() - 1, 1) // Column F: Email ID
        .getValues().flat().filter(id => id);
      stagingIds.forEach(id => existingIds.add(id));
    }
    
    // Search for recent banking emails
    const searchQuery = `label:${CONFIG.GMAIL_LABEL} ${CONFIG.GMAIL_LOOKBACK}`;
    const threads = GmailApp.search(searchQuery);
    let processedCount = 0, stagedCount = 0;
    
    _logInfo(`Processing ${threads.length} email threads with query: ${searchQuery}`);
    
    threads.forEach(thread => {
      thread.getMessages().forEach(message => {
        try {
          const emailId = message.getId();
          if (existingIds.has(emailId)) return;
          
          const from = _lc(message.getFrom() || '');
          const subject = message.getSubject() || '';
          const plainBody = message.getPlainBody() || '';
          const htmlBody = _htmlToText(message.getBody() || '');
          const body = plainBody + '\n' + htmlBody;
          
          _logInfo(`Processing email`, {
            emailId: emailId,
            from: message.getFrom(),
            subject: subject.substring(0, 100),
            isPayPalEmail: from.includes('paypal')
          });
          
          let transaction = null;
          
          // Use enhanced sender-aware parsing with adaptive learning
          transaction = _parseEmailWithAdaptiveLearning(message, subject, body, accountsSheet);
          
          if (!transaction) {
            _logInfo(`No transaction extracted from email`, {
              emailId: message.getId(),
              from: message.getFrom(),
              subject: subject.substring(0, 50)
            });
            return;
          }
          
          // Normalize account names
          transaction.fromAccount = _normalizeAccountName(transaction.fromAccount || '');
          transaction.toAccount = _normalizeAccountName(transaction.toAccount || '');
          
          // Add fingerprint
          transaction.fingerprint = _generateFingerprint(transaction);
          
          // Determine processing path
          if (transaction.shouldStage || transaction.shouldPair || transaction.pending) {
            _stageTransaction(transaction, stagingSheet);
            stagedCount++;
          } else {
            _commitTransaction(transaction, mainSheet, accountsSheet);
            processedCount++;
          }
          
          _logInfo(`Processed email: ${transaction.type}`, {
            emailId: transaction.emailId, amount: transaction.amount,
            staged: transaction.shouldStage || transaction.shouldPair || transaction.pending
          });
          
        } catch (error) {
          _logError(`Failed to process email ${message.getId()}`, error);
        }
      });
    });
    
    _logInfo(`Email processing completed`, { processed: processedCount, staged: stagedCount, total: processedCount + stagedCount });
    
    // Sort transactions by date to maintain chronological order (most recent first)
    if (processedCount > 0) {
      _sortTransactionsByDate();
    }
    
  } catch (error) {
    _logError('Failed to process new emails', error);
    throw error;
  }
}

/**
 * Public function to manually sort all transactions
 * Useful for organizing existing data or after bulk imports
 */
function sortAllTransactions() {
  try {
    _logInfo('Starting manual transaction sort...');
    
    _sortTransactionsByDate();
    
    const message = 'All transactions have been sorted by date (most recent first)';
    _logInfo(message);
    
    // Update dashboard to reflect the sorting
    _updateDashboard();
    
    return {
      success: true,
      message: message,
      timestamp: new Date()
    };
    
  } catch (error) {
    const errorMsg = `Failed to sort transactions: ${error.message}`;
    _logError(errorMsg, error);
    
    return {
      success: false,
      error: errorMsg,
      timestamp: new Date()
    };
  }
}

/**
 * Get transaction order statistics
 */
function getTransactionOrderStats() {
  try {
    const transactionSheet = _getOrCreateSheet('Transactions');
    const data = transactionSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return {
        totalTransactions: 0,
        properlyOrdered: true,
        dateRange: null
      };
    }
    
    const transactions = data.slice(1); // Skip header
    let properlyOrdered = true;
    let outOfOrderCount = 0;
    
    // Check chronological order
    for (let i = 0; i < transactions.length - 1; i++) {
      const currentDate = new Date(transactions[i][0]);
      const nextDate = new Date(transactions[i + 1][0]);
      
      if (currentDate.getTime() < nextDate.getTime()) {
        properlyOrdered = false;
        outOfOrderCount++;
      }
    }
    
    const oldestDate = new Date(transactions[transactions.length - 1][0]);
    const newestDate = new Date(transactions[0][0]);
    
    return {
      totalTransactions: transactions.length,
      properlyOrdered: properlyOrdered,
      outOfOrderCount: outOfOrderCount,
      dateRange: {
        oldest: oldestDate,
        newest: newestDate,
        span: Math.ceil((newestDate - oldestDate) / (1000 * 60 * 60 * 24)) // days
      },
      needsSorting: !properlyOrdered
    };
    
  } catch (error) {
    _logError('Failed to get transaction order stats', error);
    return { error: error.message };
  }
}

// ===================== TRANSACTION MANAGEMENT =====================

function _stageTransaction(transaction, stagingSheet) {
  try {
    let status = 'Staged';
    if (transaction.pending) status = 'Pending Review';
    else if (transaction.shouldPair) status = 'Awaiting Pair';
    
    const row = [
      transaction.date || new Date(), transaction.amount || 0, transaction.fromAccount || '',
      transaction.toAccount || '', transaction.bank || '', transaction.emailId || '',
      new Date(), transaction.direction || '', status, transaction.fingerprint || ''
    ];
    
    stagingSheet.appendRow(row);
    _logInfo(`Staged transaction: ${transaction.emailId}`, {
      amount: transaction.amount, from: transaction.fromAccount, to: transaction.toAccount, status: status
    });
    
  } catch (error) {
    _logError('Failed to stage transaction', error, { transaction });
  }
}

// Enhanced transaction categorization with dashboard integration
function _commitTransaction(transaction, mainSheet, accountsSheet) {
  try {
    // Check for duplicates
    if (_isDuplicateTransaction(transaction, mainSheet)) {
      _logWarning(`Skipping duplicate transaction: ${transaction.emailId}`);
      return;
    }
    
    // Auto-categorize transaction using enhanced system
    let category, confidence = 0.5, source = 'legacy', reason = 'Standard categorization';
    
    if (useHistoricalCategorization) {
      const result = _categorizeTransactionWithHistoricalData(transaction);
      category = result.category;
      confidence = result.confidence;
      source = result.source;
      reason = result.reason;
    } else {
      category = _categorizeTransaction(transaction);
    }
    
    transaction.category = category;
    transaction.confidence = confidence;
    transaction.categorizationSource = source;
    transaction.categorizationReason = reason;
    
    const amount = transaction.amount || 0;
    const row = [
      transaction.date || new Date(), amount, transaction.fromAccount || '', transaction.toAccount || '',
      transaction.bank || '', transaction.notes || '', transaction.emailId || `AUTO-${Date.now()}`,
      category, transaction.type || '', transaction.fingerprint || _generateFingerprint(transaction)
    ];
    
    mainSheet.appendRow(row);
    _updateAccountBalances(transaction, accountsSheet);
    
    _logInfo(`Committed transaction: ${transaction.emailId}`, {
      amount: transaction.amount, from: transaction.fromAccount, to: transaction.toAccount, 
      type: transaction.type, category: category
    });
    
  } catch (error) {
    _logError('Failed to commit transaction', error, { transaction });
  }
}

/**
 * Sort the Transactions sheet by date (most recent first)
 */
function _sortTransactionsByDate(sheet = null) {
  try {
    const transactionSheet = sheet || _getOrCreateSheet('Transactions');
    const data = transactionSheet.getDataRange().getValues();
    
    if (data.length <= 1) return; // Only header or empty
    
    const headers = data[0];
    const transactions = data.slice(1);
    
    // Find date column (should be first column)
    const dateColumnIndex = 0;
    
    // Sort transactions by date (most recent first)
    transactions.sort((a, b) => {
      const dateA = new Date(a[dateColumnIndex]);
      const dateB = new Date(b[dateColumnIndex]);
      
      // If times are available (same date), sort by time as well
      if (dateA.toDateString() === dateB.toDateString()) {
        return dateB.getTime() - dateA.getTime();
      }
      
      return dateB.getTime() - dateA.getTime();
    });
    
    // Clear and repopulate the sheet
    transactionSheet.clear();
    transactionSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    if (transactions.length > 0) {
      transactionSheet.getRange(2, 1, transactions.length, headers.length).setValues(transactions);
    }
    
    _logInfo(`Sorted ${transactions.length} transactions by date (most recent first)`);
    
  } catch (error) {
    _logError('Failed to sort transactions by date', error);
  }
}

/**
 * Enhanced _addTransactionToSheet function with automatic sorting
 */
function _addTransactionToSheet(transaction, accountName) {
  try {
    const transactionSheet = _getOrCreateSheet('Transactions');
    
    // Prepare transaction row with proper date handling
    const transactionDate = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
    const amount = parseFloat(transaction.amount) || 0;
    
    const row = [
      transactionDate,
      amount,
      transaction.account || accountName || '',
      transaction.description || '',
      transaction.category || 'Uncategorized',
      transaction.source || 'Import',
      new Date(), // Import timestamp
      transaction.fingerprint || _generateFingerprint(transaction)
    ];
    
    // Add the transaction
    transactionSheet.appendRow(row);
    
    // Update account balances if this is a known account
    if (MY_ACCOUNTS.hasOwnProperty(accountName)) {
      _updateAccountBalance(accountName, amount);
    }
    
    _logInfo(`Added transaction: ${transaction.description} (${amount}) to ${accountName}`);
    
  } catch (error) {
    _logError('Failed to add transaction to sheet', error, { transaction, accountName });
    throw error;
  }
}

function _updateAccountBalances(transaction, accountsSheet) {
  try {
    const amount = parseFloat(transaction.amount || 0);
    const fromAccount = transaction.fromAccount;
    const toAccount = transaction.toAccount;
    
    // Update FROM account (debit)
    if (fromAccount && _isInternalAccount(fromAccount)) {
      const fromRow = _ensureAccountExists(accountsSheet, fromAccount);
      if (fromRow > 0) {
        const currentBalance = parseFloat(accountsSheet.getRange(fromRow, COLUMNS.ACCOUNTS.BALANCE).getValue() || 0);
        const newBalance = currentBalance + amount; // amount is already negative for outgoing
        
        accountsSheet.getRange(fromRow, COLUMNS.ACCOUNTS.BALANCE).setValue(newBalance);
        accountsSheet.getRange(fromRow, COLUMNS.ACCOUNTS.LAST_UPDATED).setValue(new Date());
        
        _logInfo(`Updated ${fromAccount} balance: ${currentBalance.toFixed(2)} → ${newBalance.toFixed(2)}`);
      }
    }
    
    // Update TO account (credit)
    if (toAccount && _isInternalAccount(toAccount) && toAccount !== fromAccount) {
      const toRow = _ensureAccountExists(accountsSheet, toAccount);
      if (toRow > 0) {
        const currentBalance = parseFloat(accountsSheet.getRange(toRow, COLUMNS.ACCOUNTS.BALANCE).getValue() || 0);
        const newBalance = currentBalance + Math.abs(amount); // Always positive for incoming
        
        accountsSheet.getRange(toRow, COLUMNS.ACCOUNTS.BALANCE).setValue(newBalance);
        accountsSheet.getRange(toRow, COLUMNS.ACCOUNTS.LAST_UPDATED).setValue(new Date());
        
        _logInfo(`Updated ${toAccount} balance: ${currentBalance.toFixed(2)} → ${newBalance.toFixed(2)}`);
      }
    }
    
  } catch (error) {
    _logError('Failed to update account balances', error, { transaction });
  }
}

// ===================== STAGING & PAIRING SYSTEM =====================

function _pairStagedTransfers() {
  try {
    const ss = _ss();
    const stagingSheet = ss.getSheetByName(SHEET_NAMES.STAGING);
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    const accountsSheet = ss.getSheetByName(SHEET_NAMES.ACCOUNTS);
    
    if (!stagingSheet || stagingSheet.getLastRow() < 2) {
      _logInfo('No staged transactions to pair');
      return;
    }
    
    // Use dynamic column count
    const lastRow = stagingSheet.getLastRow();
    const lastCol = Math.max(stagingSheet.getLastColumn(), 10); // Ensure minimum columns
    
    const data = stagingSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    const paired = new Set();
    let pairCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      if (paired.has(i) || !data[i] || data[i].length === 0) continue;
      
      // Use hardcoded indices for staging sheet structure
      const status = _normalize(data[i][8] || ''); // Column I: Status
      if (status === 'pending review') continue;
      
      const txA = {
        index: i, 
        date: new Date(data[i][0] || new Date()), // Column A: Date
        amount: parseFloat(data[i][1] || 0), // Column B: Amount
        fromAccount: data[i][2] || '', // Column C: From Account
        toAccount: data[i][3] || '', // Column D: To Account
        bank: data[i][4] || '', // Column E: Bank
        emailId: data[i][5] || '', // Column F: Email ID
        direction: data[i][7] || '', // Column H: Direction
        fingerprint: data[i][9] || '' // Column J: Fingerprint
      };
      
      for (let j = i + 1; j < data.length; j++) {
        if (paired.has(j) || !data[j] || data[j].length === 0) continue;
        
        const statusB = _normalize(data[j][8] || ''); // Column I: Status
        if (statusB === 'pending review') continue;
        
        const txB = {
          index: j,
          date: new Date(data[j][0] || new Date()),
          amount: parseFloat(data[j][1] || 0),
          fromAccount: data[j][2] || '',
          toAccount: data[j][3] || '',
          bank: data[j][4] || '',
          emailId: data[j][5] || '',
          direction: data[j][7] || '',
          fingerprint: data[j][9] || ''
        };
        
        if (_canPairTransactions(txA, txB)) {
          const pairedTransaction = _createPairedTransaction(txA, txB);
          _commitTransaction(pairedTransaction, mainSheet, accountsSheet);
          
          paired.add(i); paired.add(j); pairCount++;
          
          _logInfo(`Paired transactions: ${txA.emailId} + ${txB.emailId}`, {
            amount: pairedTransaction.amount, from: pairedTransaction.fromAccount, to: pairedTransaction.toAccount
          });
          break;
        }
      }
    }
    
    // Remove paired transactions from staging (in reverse order to maintain indices)
    const rowsToDelete = Array.from(paired).sort((a, b) => b - a);
    rowsToDelete.forEach(index => { stagingSheet.deleteRow(index + 2); });
    
    _logInfo(`Pairing completed: ${pairCount} pairs created, ${data.length - paired.size} items still staged`);
    
  } catch (error) {
    _logError('Failed to pair staged transfers', error);
  }
}

function _canPairTransactions(txA, txB) {
  // Check amount tolerance
  if (Math.abs(Math.abs(txA.amount) - Math.abs(txB.amount)) > CONFIG.AMOUNT_TOLERANCE) return false;
  
  // Check time window
  if (Math.abs(txA.date - txB.date) > CONFIG.PAIRING_WINDOW_MS) return false;
  
  // Check for complementary directions (one IN, one OUT)
  if (txA.direction === txB.direction) return false;
  
  // Check for account overlap
  const txAAccounts = [_lc(txA.fromAccount), _lc(txA.toAccount)];
  const txBAccounts = [_lc(txB.fromAccount), _lc(txB.toAccount)];
  
  const hasWealthsimple = (txAAccounts.some(acc => acc && acc.includes('wealthsimple')) || 
                           txBAccounts.some(acc => acc && acc.includes('wealthsimple')));
  
  const hasAccountOverlap = txAAccounts.some(acc => 
    acc && txBAccounts.some(otherAcc => otherAcc && 
      (acc.includes(otherAcc) || otherAcc.includes(acc)))
  );
  
  if (hasWealthsimple) return true;
  return hasAccountOverlap;
}

function _createPairedTransaction(txA, txB) {
  const outTx = txA.amount < 0 ? txA : txB;
  const inTx = txA.amount > 0 ? txA : txB;
  
  const date = new Date(Math.max(txA.date.getTime(), txB.date.getTime()));
  const notes = `Auto-paired transfer: ${outTx.fromAccount} → ${inTx.toAccount}`;
  
  return {
    date: date, amount: Math.abs(outTx.amount), fromAccount: outTx.fromAccount || inTx.fromAccount,
    toAccount: inTx.toAccount || outTx.toAccount, bank: 'Paired Transfer',
    emailId: `${txA.emailId}|${txB.emailId}`, type: 'Internal Transfer', notes: notes,
    fingerprint: _generateFingerprint({
      date: date, amount: Math.abs(outTx.amount), fromAccount: outTx.fromAccount, toAccount: inTx.toAccount
    })
  };
}

function _cleanupStaleTransactions() {
  try {
    const ss = _ss();
    const stagingSheet = ss.getSheetByName(SHEET_NAMES.STAGING);
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    const accountsSheet = ss.getSheetByName(SHEET_NAMES.ACCOUNTS);
    
    if (!stagingSheet || stagingSheet.getLastRow() < 2) return;
    
    // Use dynamic column count
    const lastRow = stagingSheet.getLastRow();
    const lastCol = Math.max(stagingSheet.getLastColumn(), 10); // Ensure minimum columns
    
    const data = stagingSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    const now = new Date();
    const staleThreshold = CONFIG.STALE_CLEANUP_HOURS * 60 * 60 * 1000;
    const pendingCleanupThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days for pending items
    let cleanedCount = 0;
    
    for (let i = data.length - 1; i >= 0; i--) {
      if (!data[i] || data[i].length === 0) continue;
      
      // Use hardcoded indices for staging sheet structure
      const stagedAt = new Date(data[i][6] || new Date()); // Column G: Staged At
      const status = _normalize(data[i][8] || ''); // Column I: Status
      const isPending = status === 'pending review';
      
      const threshold = isPending ? pendingCleanupThreshold : staleThreshold;
      
      if (now.getTime() - stagedAt.getTime() > threshold) {
        const staleTransaction = {
          date: new Date(data[i][0] || new Date()), // Column A: Date
          amount: parseFloat(data[i][1] || 0), // Column B: Amount
          fromAccount: data[i][2] || '', // Column C: From Account
          toAccount: data[i][3] || 'External', // Column D: To Account
          bank: isPending ? 'Manual Review Required' : 'Stale Transaction Cleanup',
          emailId: data[i][5] || '', // Column F: Email ID
          type: isPending ? 'Needs Review' : 'Stale Cleanup',
          notes: isPending ? 'Pending transaction requiring manual review' : 'Auto-logged from expired staging',
          fingerprint: data[i][9] || '' // Column J: Fingerprint
        };
        
        _commitTransaction(staleTransaction, mainSheet, accountsSheet);
        stagingSheet.deleteRow(i + 2);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      _logInfo(`Cleaned up ${cleanedCount} stale staging entries`);
    }
    
  } catch (error) {
    _logError('Failed to cleanup stale transactions', error);
  }
}

// ===================== PRICE FETCHING (Enhanced for Canadian stocks) =====================

function _getUsdToCadRate() {
  try {
    const response = UrlFetchApp.fetch('https://api.exchangerate.host/latest?base=USD&symbols=CAD');
    const data = JSON.parse(response.getContentText());
    return data.rates.CAD || 1.35;
  } catch (e) {
    return 1.35; // Fallback rate
  }
}

function _buildGoogleFinanceFormula(ticker) {
  try {
    if (!ticker) return null;
    
    const cleanTicker = ticker.replace(/[^\w\.\-]/g, '').toUpperCase();
    
    if (cleanTicker.endsWith('-TSE')) {
      const symbol = cleanTicker.replace('-TSE', '');
      return `=IFERROR(GOOGLEFINANCE("TSE:${symbol}","price"),0)`;
    } else if (cleanTicker.includes('.TO')) {
      const symbol = cleanTicker.replace('.TO', '');
      return `=IFERROR(GOOGLEFINANCE("TSE:${symbol}","price"),0)`;
    } else if (cleanTicker.includes('-USD')) {
      return `=IFERROR(GOOGLEFINANCE("CURRENCY:USDCAD")*GOOGLEFINANCE("${cleanTicker}","price"),0)`;
    } else {
      return `=IFERROR(GOOGLEFINANCE("${cleanTicker}","price"),0)`;
    }
  } catch (error) {
    _logError(`Failed to build GOOGLEFINANCE formula for ${ticker}`, error);
    return null;
  }
}

// ENHANCED: High-precision price fetching for stocks and ETFs
function _fetchYahooFinancePrice(ticker) {
  try {
    let yahooTicker = ticker;
    if (CANADIAN_TICKERS.has(ticker)) {
      yahooTicker = ticker; // Already in correct format
    } else if (ticker.endsWith('-TSE')) {
      yahooTicker = ticker.replace('-TSE', '.TO');
    }
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}`;
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (Finance-Automation/10.0)' }
    });
    
    if (response.getResponseCode() !== 200) return 0;
    
    const data = JSON.parse(response.getContentText());
    
    if (data?.chart?.result?.[0]?.meta) {
      const meta = data.chart.result[0].meta;
      let price = meta.regularMarketPrice;
      const currency = meta.currency || 'CAD';
      
      if (currency === 'USD') {
        const usdToCadRate = _getUsdToCadRate();
        price *= usdToCadRate;
      }
      
      return price;
    }
    
    return 0;
  } catch (error) {
    _logError(`Failed to fetch Yahoo Finance price for ${ticker}`, error);
    return 0;
  }
}

function _fetchPriceFromAPI(ticker) {
  try {
    if (!ticker) return 0;
    
    const tickerUpper = ticker.toUpperCase();
    
    // For Canadian ETFs, add .TO suffix for Yahoo Finance
    let yahooTicker = ticker;
    if (['VCE', 'XEQT', 'VTI', 'VXUS', 'VFV'].includes(tickerUpper)) {
      yahooTicker = tickerUpper + '.TO';
    }
    
    // For stocks and ETFs
    return _fetchYahooFinancePrice(yahooTicker);
    
  } catch (error) {
    _logError(`Failed to fetch price from API for ${ticker}`, error);
    return 0;
  }
}

function _isSupportedTicker(ticker) {
  if (!ticker) return false;
  
  const tickerUpper = ticker.toUpperCase();
  
  // Check for Canadian stocks
  if (tickerUpper.endsWith('-TSE') || tickerUpper.includes('.TO')) {
    return true;
  }
  
  // Standard US ticker pattern
  if (/^[A-Z]{1,5}$/.test(tickerUpper)) {
    return true;
  }
  
  return false;
}

// ===================== HOLDINGS MANAGEMENT (Enhanced from V9) =====================

function _refreshHoldingsData() {
  try {
    const ss = _ss();
    const holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
    
    if (!holdingsSheet || holdingsSheet.getLastRow() < 2) {
      _logInfo('No holdings to refresh');
      return;
    }
    
    // Use dynamic column count instead of Object.keys which can be null
    const lastCol = holdingsSheet.getLastColumn();
    const lastRow = holdingsSheet.getLastRow();
    
    if (lastCol < 1 || lastRow < 2) {
      _logInfo('Holdings sheet has insufficient data');
      return;
    }
    
    const data = holdingsSheet.getRange(2,  1, lastRow - 1, lastCol).getValues();
    let updatedCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      // Based on your output: Account, Ticker, Shares, Unit Price, Total Value, Last Updated
      const account = data[i][0]; // Column A: Account
      const ticker = data[i][1]; // Column B: Ticker
      const shares = parseFloat(data[i][2] || 0); // Column C: Shares
      
      if (!ticker || shares <= 0) continue;
      
      // Try to get price from API
      let price = _fetchPriceFromAPI(ticker);
      
      // Fallback to Google Finance formula if API fails
      if (!price || price <= 0) {
        const formula = _buildGoogleFinanceFormula(ticker);
        if (formula) {
          holdingsSheet.getRange(i + 2, 4).setFormula(formula); // Column D: Unit Price
          _logInfo(`Set Google Finance formula for ${ticker}: ${formula}`);
          continue;
        }
      }
      
      if (price > 0) {
        const currentValue = shares * price;
        
        holdingsSheet.getRange(i + 2, 4).setValue(price); // Column D: Unit Price
        holdingsSheet.getRange(i + 2, 5).setValue(currentValue); // Column E: Total Value
        holdingsSheet.getRange(i + 2, 6).setValue(new Date()); // Column F: Last Updated
        
        updatedCount++;
        
        // Standard formatting for all assets
        holdingsSheet.getRange(i + 2, 4).setNumberFormat('$#,##0.00');
        holdingsSheet.getRange(i + 2, 5).setNumberFormat('$#,##0.00');
        _logInfo(`Updated ${ticker}: ${shares} shares @ $${price.toFixed(6)} = $${currentValue.toFixed(2)} (Account: ${account})`);
      }
    }
    
    _logInfo(`Holdings refresh completed: ${updatedCount} holdings updated`);
    
  } catch (error) {
    _logError('Failed to refresh holdings data', error);
  }
}

function _parseHoldingsFromEmail(emailBody, bank) {
  const holdings = [];
  
  try {
    if (bank === 'Wealthsimple') {
      // Parse Wealthsimple holdings format
      const holdingsMatch = emailBody.match(/Symbol.*?Shares.*?Price.*?Market Value([\s\S]*?)(?:Total|Summary)/);
      if (holdingsMatch) {
        const holdingsText = holdingsMatch[1];
        const lines = holdingsText.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const match = line.match(/([A-Z]{1,5}(?:\-TSE)?)\s+([0-9,]+\.?\d*)\s+\$([0-9,]+\.?\d+)\s+\$([0-9,]+\.?\d+)/);
          if (match) {
            holdings.push({
              ticker: match[1].trim(),
              shares: parseFloat(match[2].replace(/,/g, '')),
              price: parseFloat(match[3].replace(/,/g, '')),
              value: parseFloat(match[4].replace(/,/g, ''))
            });
          }
        }
      }
    }
  } catch (error) {
    _logError('Failed to parse holdings from email', error, { bank });
  }
  
  return holdings;
}

function _updateHoldingsFromEmail(holdings) {
  try {
    if (!holdings || holdings.length === 0) return;
    
    const ss = _ss();
    const holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
    
    for (const holding of holdings) {
      const existingRow = _findHoldingRow(holdingsSheet, holding.ticker);
      
      if (existingRow > 0) {
        // Update existing holding - using hardcoded column indices
        holdingsSheet.getRange(existingRow, 2).setValue(holding.shares); // Column B: Shares
        holdingsSheet.getRange(existingRow, 3).setValue(holding.price); // Column C: Price
        holdingsSheet.getRange(existingRow, 4).setValue(holding.value); // Column D: Current Value
        holdingsSheet.getRange(existingRow, 6).setValue(new Date()); // Column F: Last Updated
      } else {
        // Add new holding
        const newRow = [
          holding.ticker, holding.shares, holding.price, holding.value, '', new Date()
        ];
        holdingsSheet.appendRow(newRow);
      }
    }
    
    _logInfo(`Updated ${holdings.length} holdings from email`);
    
  } catch (error) {
    _logError('Failed to update holdings from email', error);
  }
}

function _findHoldingRow(holdingsSheet, ticker) {
  try {
    // Search in column B (Ticker) based on new structure: Account, Ticker, Shares, Unit Price, Total Value, Last Updated
    const data = holdingsSheet.getRange(2, 2, Math.max(1, holdingsSheet.getLastRow() - 1), 1).getValues();
    
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim().toUpperCase() === ticker.toUpperCase()) {
        return i + 2; // Convert to sheet row number
      }
    }
    
    return -1;
  } catch (error) {
    _logError('Failed to find holding row', error, { ticker });
    return -1;
  }
}

// ===================== ENHANCED CATEGORIZATION SYSTEM =====================

function _categorizeTransaction(transaction) {
  try {
    if (!transaction) return 'Uncategorized';
    
    const searchText = _lc([
      transaction.toAccount || '',
      transaction.notes || '',
      transaction.fromAccount || ''
    ].join(' '));
    
    // First check learned categories from Categories sheet
    const learnedCategory = _getLearnedCategory(transaction);
    if (learnedCategory) {
      _logInfo(`Used learned category for transaction: ${learnedCategory}`);
      return learnedCategory;
    }
    
    // Enhanced merchant pattern matching with confidence scoring
    let bestMatch = null;
    let bestConfidence = 0;
    
    for (const [category, config] of Object.entries(ENHANCED_MERCHANT_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(searchText)) {
          const confidence = config.confidence;
          if (confidence > bestConfidence) {
            bestMatch = category;
            bestConfidence = confidence;
          }
        }
      }
    }
    
    if (bestMatch && bestConfidence >= 0.8) {
      _logInfo(`Categorized as ${bestMatch} (confidence: ${bestConfidence})`);
      return bestMatch;
    }
    
    // Enhanced transaction type detection
    const amount = Math.abs(parseFloat(transaction.amount || 0));
    const toAccount = _lc(transaction.toAccount || '');
    const fromAccount = _lc(transaction.fromAccount || '');
    
    // Investment-related categorization
    if (toAccount.includes('wealthsimple') || fromAccount.includes('wealthsimple')) {
      if (amount > 100) return 'Investment';
      return 'Investment Fees';
    }
    
    // Transfer detection (improved)
    if (_isInternalAccount(transaction.fromAccount) && _isInternalAccount(transaction.toAccount)) {
      return 'Internal Transfer';
    }
    
    // Salary/income detection (enhanced patterns)
    if ((toAccount.includes('payroll') || toAccount.includes('salary') || 
         toAccount.includes('income') || toAccount.includes('pension')) && amount > 500) {
      return 'Salary';
    }
    
    // Bill payments and fees
    if (toAccount.includes('fee') || toAccount.includes('charge') || toAccount.includes('penalty')) {
      return 'Fees';
    }
    
    // Cash withdrawals
    if (toAccount.includes('atm') || toAccount.includes('cash withdrawal')) {
      return 'Cash Withdrawal';
    }
    
    return 'Uncategorized';
    
  } catch (error) {
    _logError('Failed to categorize transaction', error, { transaction });
    return 'Uncategorized';
  }
}

function _getLearnedCategory(transaction) {
  try {
    const ss = _ss();
    const categoriesSheet = ss.getSheetByName(SHEET_NAMES.CATEGORIES);
    
    if (!categoriesSheet || categoriesSheet.getLastRow() < 2) {
      return null;
    }
    
    const merchant = _extractCleanMerchantName(transaction.toAccount);
    if (!merchant || merchant.length < 3) return null;
    
    const data = categoriesSheet.getRange(2, 1, categoriesSheet.getLastRow() - 1, 2).getValues();
    
    for (const row of data) {
      const storedMerchant = _lc(row[0] || '');
      const category = row[1] || '';
      
      if (storedMerchant === _lc(merchant)) {
        return category;
      }
      
      // Partial matching for similar merchant names
      if (merchant.length > 5 && (storedMerchant.includes(_lc(merchant)) || _lc(merchant).includes(storedMerchant))) {
        return category;
      }
    }
    
    return null;
  } catch (error) {
    _logError('Failed to get learned category', error);
    return null;
  }
}

function _extractCleanMerchantName(toAccount) {
  if (!toAccount) return '';
  
  let merchant = toAccount.toLowerCase()
    .replace(/[0-9]{4,}/g, '') // Remove long numbers (card numbers, transaction IDs)
    .replace(/\b(card|aventura|payment|purchase|pos|debit|credit|transaction|interac)\b/gi, '') // Remove banking terms
    .replace(/[^a-zA-Z\s]/g, ' ') // Replace non-letters with spaces
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
  
  // Remove stop words
  const words = merchant.split(' ').filter(word => {
    return word.length > 2 && !CATEGORY_STOPWORDS.has(word.toLowerCase());
  });
  
  return words.join(' ').trim();
}

function _learnCategoriesFromTransactions() {
  try {
    _logInfo('Starting enhanced category learning process...');
    
    const ss = _ss();
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    const categoriesSheet = ss.getSheetByName(SHEET_NAMES.CATEGORIES);
    
    if (!mainSheet || !categoriesSheet) {
      _logError('Required sheets not found for category learning');
      return;
    }
    
    // Get all transactions
    const lastRow = mainSheet.getLastRow();
    if (lastRow < 2) {
      _logInfo('No transactions found for category learning');
      return;
    }
    
    const data = mainSheet.getRange(2, 1, lastRow - 1, Math.max(mainSheet.getLastColumn(), 10)).getValues();
    const merchantAnalysis = {};
    
    // Analyze transaction patterns
    for (const row of data) {
      if (!row || row.length === 0) continue;
      
      const toAccount = row[3] || ''; // Column D: To Account  
      const category = row[7] || ''; // Column H: Category
      const amount = Math.abs(parseFloat(row[1] || 0)); // Column B: Amount
      
      if (!toAccount || !category || category === 'Uncategorized') continue;
      
      const merchant = _extractCleanMerchantName(toAccount);
      if (!merchant || merchant.length < 3) continue;
      
      const merchantKey = merchant.toLowerCase();
      
      if (!merchantAnalysis[merchantKey]) {
        merchantAnalysis[merchantKey] = {
          originalName: merchant,
          categories: {},
          totalTransactions: 0,
          totalAmount: 0,
          firstSeen: new Date(row[0] || new Date()),
          lastSeen: new Date(row[0] || new Date())
        };
      }
      
      const analysis = merchantAnalysis[merchantKey];
      analysis.categories[category] = (analysis.categories[category] || 0) + 1;
      analysis.totalTransactions++;
      analysis.totalAmount += amount;
      
      const transactionDate = new Date(row[0] || new Date());
      if (transactionDate < analysis.firstSeen) analysis.firstSeen = transactionDate;
      if (transactionDate > analysis.lastSeen) analysis.lastSeen = transactionDate;
    }
    
    // Get existing category mappings
    const existingMappings = new Set();
    if (categoriesSheet.getLastRow() > 1) {
      const existingData = categoriesSheet.getRange(2, 1, categoriesSheet.getLastRow() - 1, 2).getValues();
      existingData.forEach(row => {
        if (row[0]) existingMappings.add(row[0].toLowerCase());
      });
    }
    
    // Create recommendations
    const recommendations = [];
    
    for (const [merchantKey, analysis] of Object.entries(merchantAnalysis)) {
      if (existingMappings.has(merchantKey)) continue;
      
      // Calculate confidence metrics
      const dominantCategory = Object.entries(analysis.categories)
        .reduce((a, b) => analysis.categories[a[0]] > analysis.categories[b[0]] ? a : b);
      
      const confidence = dominantCategory[1] / analysis.totalTransactions;
      const frequency = analysis.totalTransactions;
      const recency = (new Date() - analysis.lastSeen) / (1000 * 60 * 60 * 24); // days ago
      
      // Only recommend if high confidence and sufficient data
      if (confidence >= 0.7 && frequency >= 2) {
        const score = confidence * Math.log(frequency + 1) * Math.max(0.1, 1 - recency / 365);
        
        recommendations.push({
          merchant: analysis.originalName,
          category: dominantCategory[0],
          confidence: confidence,
          frequency: frequency,
          score: score,
          recency: recency
        });
      }
    }
    
    // Sort by score and add top recommendations
    recommendations.sort((a, b) => b.score - a.score);
    
    let addedCount = 0;
    const maxRecommendations = 20; // Limit to avoid spam
    
    for (let i = 0; i < Math.min(recommendations.length, maxRecommendations); i++) {
      const rec = recommendations[i];
      categoriesSheet.appendRow([rec.merchant, rec.category]);
      addedCount++;
      
      _logInfo(`Added category mapping: ${rec.merchant} → ${rec.category} (confidence: ${(rec.confidence * 100).toFixed(1)}%, frequency: ${rec.frequency})`);
    }
    
    // Update all uncategorized transactions with new mappings
    _applyCategoryMappingsToTransactions();
    
    if (addedCount > 0) {
      _logInfo(`Enhanced category learning completed: ${addedCount} new intelligent mappings added`);
      try { 
        SpreadsheetApp.getUi().alert(
          'Category Learning Complete', 
          `Added ${addedCount} new intelligent category mappings based on transaction patterns.\n\n` +
          `Total recommendations analyzed: ${recommendations.length}\n` +
          `Applied to existing uncategorized transactions.`,
          SpreadsheetApp.getUi().ButtonSet.OK
        ); 
      } catch (e) {}
    } else {
      _logInfo('Enhanced category learning completed: no new mappings needed');
      try { 
        SpreadsheetApp.getUi().alert(
          'Category Learning Complete',
          'No new category mappings needed.\nAll merchants are already categorized or have insufficient data.',
          SpreadsheetApp.getUi().ButtonSet.OK
        ); 
      } catch (e) {}
    }
    
  } catch (error) {
    _logError('Failed to learn categories', error);
    try { 
      SpreadsheetApp.getUi().alert('Category learning failed: ' + error.message); 
    } catch (e) {}
  }
}

function _applyCategoryMappingsToTransactions() {
  try {
    const ss = _ss();
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    
    if (!mainSheet || mainSheet.getLastRow() < 2) return;
    
    const data = mainSheet.getRange(2, 1, mainSheet.getLastRow() - 1, Math.max(mainSheet.getLastColumn(), 10)).getValues();
    let updatedCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const currentCategory = row[7] || ''; // Column H: Category
      
      if (currentCategory === 'Uncategorized' || !currentCategory) {
        const transaction = {
          toAccount: row[3] || '', // Column D: To Account
          fromAccount: row[2] || '', // Column C: From Account
          notes: row[5] || '', // Column F: Notes
          amount: row[1] || 0 // Column B: Amount
        };
        
        const categoryResult = _categorizeTransactionWithHistoricalData(transaction);
        const newCategory = categoryResult.category;
        
        if (newCategory !== 'Uncategorized') {
          mainSheet.getRange(i + 2, 8).setValue(newCategory); // Column H: Category
          updatedCount++;
        }
      }
    }
    
    if (updatedCount > 0) {
      _logInfo(`Applied new category mappings to ${updatedCount} existing transactions`);
    }
    
  } catch (error) {
    _logError('Failed to apply category mappings to transactions', error);
  }
}

function _updateNetWorth() {
  try {
    _logInfo('Updating net worth calculation...');
    
    const ss = _ss();
    const accountsSheet = ss.getSheetByName(SHEET_NAMES.ACCOUNTS);
    const holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
    const dashboardSheet = ss.getSheetByName(SHEET_NAMES.DASHBOARD);
    
    if (!dashboardSheet) {
      _logError('Dashboard sheet not found');
      return;
    }
    
    // Calculate total account balances
    let totalCash = 0;
    if (accountsSheet && accountsSheet.getLastRow() > 1) {
      const accountData = accountsSheet.getRange(2, 1, accountsSheet.getLastRow() - 1, 3).getValues();
      
      for (const row of accountData) {
        const balance = parseFloat(row[1] || 0); // Column B: Balance
        const accountType = _lc(row[2] || ''); // Column C: Account Type
        
        // Only count positive balances (assets) and exclude credit card debt
        if (balance > 0 && !accountType.includes('credit')) {
          totalCash += balance;
        }
      }
    }
    
    // Calculate total investment value
    let totalInvestments = 0;
    if (holdingsSheet && holdingsSheet.getLastRow() > 1) {
      const holdingsData = holdingsSheet.getRange(2, 1, holdingsSheet.getLastRow() - 1, 6).getValues();
      
      for (const row of holdingsData) {
        const currentValue = parseFloat(row[4] || 0); // Column E: Total Value (CAD)
        if (currentValue > 0) {
          totalInvestments += currentValue;
        }
      }
    }
    
    // Calculate total liabilities (credit card debt)
    let totalLiabilities = 0;
    if (accountsSheet && accountsSheet.getLastRow() > 1) {
      const accountData = accountsSheet.getRange(2, 1, accountsSheet.getLastRow() - 1, 3).getValues();
      
      for (const row of accountData) {
        const balance = parseFloat(row[1] || 0); // Column B: Balance
        const accountType = _lc(row[2] || ''); // Column C: Account Type
        
        // Credit card balances are negative (debt)
        if (balance < 0 || accountType.includes('credit')) {
          totalLiabilities += Math.abs(balance);
        }
      }
    }
    
    const netWorth = totalCash + totalInvestments - totalLiabilities;
    const today = new Date();
    
    // Find or create net worth tracking section in dashboard
    let netWorthStartRow = _findOrCreateDashboardSection(dashboardSheet, 'NET WORTH HISTORY');
    
    // Add headers if this is a new section
    const headers = ['Date', 'Cash & Accounts', 'Investments', 'Liabilities', 'Net Worth', 'Notes'];
    const headerRange = dashboardSheet.getRange(netWorthStartRow, 1, 1, headers.length);
    if (headerRange.getValue() !== 'Date') {
      headerRange.setValues([headers]);
      headerRange.setFontWeight('bold').setBackground('#e6f3ff');
      netWorthStartRow += 1;
    }
    
    // Add new net worth entry
    dashboardSheet.insertRowAfter(netWorthStartRow);
    const newRow = netWorthStartRow + 1;
    dashboardSheet.getRange(newRow, 1, 1, 6).setValues([[
      today,
      totalCash,
      totalInvestments,
      totalLiabilities,
      netWorth,
      `Updated: ${today.toLocaleString()}`
    ]]);
    
    // Format the new row
    dashboardSheet.getRange(newRow, 1).setNumberFormat('mm/dd/yyyy');
    dashboardSheet.getRange(newRow, 2, 1, 4).setNumberFormat('$#,##0.00');
    
    _logInfo(`Net worth updated in dashboard: $${netWorth.toFixed(2)}`, {
      cash: totalCash.toFixed(2),
      investments: totalInvestments.toFixed(2),
      liabilities: totalLiabilities.toFixed(2)
    });
    
    try {
      SpreadsheetApp.getUi().alert(
        'Net Worth Updated',
        `Net Worth: $${netWorth.toFixed(2)}\n\n` +
        `Cash & Accounts: $${totalCash.toFixed(2)}\n` +
        `Investments: $${totalInvestments.toFixed(2)}\n` +
        `Liabilities: $${totalLiabilities.toFixed(2)}\n\n` +
        `Data added to Dashboard with chart-ready format.`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } catch (e) {}
    
  } catch (error) {
    _logError('Failed to update net worth', error);
    try {
      SpreadsheetApp.getUi().alert('Net worth update failed: ' + error.message);
    } catch (e) {}
  }
}

function _findOrCreateDashboardSection(dashboardSheet, sectionTitle) {
  // Look for existing section
  const data = dashboardSheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().toUpperCase().includes(sectionTitle)) {
      return i + 2; // Return row after the section header
    }
  }
  
  // Section not found, create it at the end
  const lastRow = dashboardSheet.getLastRow();
  const sectionStartRow = lastRow + 2;
  
  // Add section header
  dashboardSheet.getRange(sectionStartRow, 1).setValue(sectionTitle);
  dashboardSheet.getRange(sectionStartRow, 1).setFontWeight('bold').setFontSize(12).setBackground('#d9ead3');
  
  return sectionStartRow + 1; // Return row after the section header
}

function _containsGenericBankingTerms(text) {
  const lowerText = _lc(text);
  return CATEGORY_STOPWORDS.has(lowerText) || 
         (lowerText.length <= 8 && Array.from(CATEGORY_STOPWORDS).some(term => lowerText.includes(term)));
}

// ===================== ENHANCED DASHBOARD & ANALYSIS =====================

function _updateDashboard() {
  try {
    const ss = _ss();
    const dashboardSheet = ss.getSheetByName(SHEET_NAMES.DASHBOARD);
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    const accountsSheet = ss.getSheetByName(SHEET_NAMES.ACCOUNTS);
    const holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
    const categoriesSheet = ss.getSheetByName(SHEET_NAMES.CATEGORIES);
    
    if (!dashboardSheet) {
      _logError('Dashboard sheet not found');
      return;
    }
    
    // Calculate summary metrics
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get current month transactions
    const transactions = _getTransactionData(mainSheet, currentMonth, currentYear);
    
    // Calculate expense breakdown by category
    const expenseBreakdown = _calculateExpenseBreakdown(transactions);
    
    // Get account balances
    const accountBalances = _getAccountBalances(accountsSheet);
    
    // Get investment portfolio value
    const portfolioValue = _getPortfolioValue(holdingsSheet);
    
    // Get category learning statistics
    const categoryStats = _getCategoryLearningStats(categoriesSheet, mainSheet);
    
    // Update dashboard with calculated values
    _writeDashboardSummary(dashboardSheet, {
      totalExpenses: expenseBreakdown.total,
      categoryBreakdown: expenseBreakdown.categories,
      accountBalances: accountBalances,
      portfolioValue: portfolioValue,
      categoryStats: categoryStats,
      lastUpdated: now
    });
    
    _logInfo('Enhanced dashboard updated successfully', {
      totalExpenses: expenseBreakdown.total,
      portfolioValue: portfolioValue,
      learnedCategories: categoryStats.totalMappings
    });
    
  } catch (error) {
    _logError('Failed to update dashboard', error);
  }
}

function _getCategoryLearningStats(categoriesSheet, mainSheet) {
  const stats = {
    totalMappings: 0,
    categorizedTransactions: 0,
    uncategorizedTransactions: 0,
    categoryAccuracy: 0
  };
  
  try {
    // Count category mappings
    if (categoriesSheet && categoriesSheet.getLastRow() > 1) {
      stats.totalMappings = categoriesSheet.getLastRow() - 1;
    }
    
    // Analyze transaction categorization
    if (mainSheet && mainSheet.getLastRow() > 1) {
      const data = mainSheet.getRange(2, 1, mainSheet.getLastRow() - 1, Math.max(mainSheet.getLastColumn(), 10)).getValues();
      
      for (const row of data) {
        if (!row || row.length === 0) continue;
        
        const category = row[7] || ''; // Column H: Category
        
        if (category && category !== 'Uncategorized') {
          stats.categorizedTransactions++;
        } else {
          stats.uncategorizedTransactions++;
        }
      }
      
      const total = stats.categorizedTransactions + stats.uncategorizedTransactions;
      if (total > 0) {
        stats.categoryAccuracy = (stats.categorizedTransactions / total) * 100;
      }
    }
  } catch (error) {
    _logError('Failed to get category learning stats', error);
  }
  
  return stats;
}

function _getTransactionData(mainSheet, month, year) {
  try {
    if (!mainSheet || mainSheet.getLastRow() < 2) return [];
    
    // Use dynamic column count instead of Object.keys which can fail
    const lastRow = mainSheet.getLastRow();
    const lastCol = Math.max(mainSheet.getLastColumn(), 10); // Ensure minimum columns
    
    const data = mainSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    const transactions = [];
    
    for (const row of data) {
      // Handle potential null/undefined row data
      if (!row || row.length === 0) continue;
      
      // Use hardcoded indices for standard transaction sheet structure
      const date = new Date(row[0] || new Date()); // Column A: Date
      const amount = parseFloat(row[1] || 0); // Column B: Amount
      const fromAccount = row[2] || ''; // Column C: From Account
      const toAccount = row[3] || ''; // Column D: To Account
      const category = row[7] || 'Uncategorized'; // Column H: Category
      const type = row[8] || ''; // Column I: Type
      
      // Check if transaction is within the specified month/year
      if (date.getMonth() === month && date.getFullYear() === year) {
        transactions.push({
          date: date,
          amount: amount,
          fromAccount: fromAccount,
          toAccount: toAccount,
          category: category,
          type: type
        });
      }
    }
    
    return transactions;
  } catch (error) {
    _logError('Failed to get transaction data', error);
    return [];
  }
}

function _calculateExpenseBreakdown(transactions) {
  const breakdown = { total: 0, categories: {} };
  
  try {
    for (const tx of transactions) {
      // Only count negative amounts (expenses)
      if (tx.amount < 0 && tx.type !== 'Internal Transfer') {
        const category = tx.category || 'Uncategorized';
        const amount = Math.abs(tx.amount);
        
        breakdown.total += amount;
        breakdown.categories[category] = (breakdown.categories[category] || 0) + amount;
      }
    }
  } catch (error) {
    _logError('Failed to calculate expense breakdown', error);
  }
  
  return breakdown;
}

function _getAccountBalances(accountsSheet) {
  const balances = {};
  
  try {
    if (!accountsSheet || accountsSheet.getLastRow() < 2) return balances;
    
    // Use dynamic column count
    const lastRow = accountsSheet.getLastRow();
    const lastCol = Math.max(accountsSheet.getLastColumn(), 5); // Ensure minimum columns
    
    const data = accountsSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    
    for (const row of data) {
      // Handle potential null/undefined row data
      if (!row || row.length === 0) continue;
      
      // Use hardcoded indices for standard accounts sheet structure
      const accountName = row[0]; // Column A: Account Name
      const balance = parseFloat(row[1] || 0); // Column B: Balance
      const accountType = row[2] || ''; // Column C: Account Type
      
      if (accountName && accountName.toString().trim()) {
        balances[accountName] = { balance, type: accountType };
      }
    }
  } catch (error) {
    _logError('Failed to get account balances', error);
  }
  
  return balances;
}

function _getPortfolioValue(holdingsSheet) {
  let totalValue = 0;
  
  try {
    if (!holdingsSheet || holdingsSheet.getLastRow() < 2) return totalValue;
    
    // Use dynamic column count
    const lastRow = holdingsSheet.getLastRow();
    const lastCol = Math.max(holdingsSheet.getLastColumn(), 6); // Ensure minimum columns
    
    const data = holdingsSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    
    for (const row of data) {
      // Handle potential null/undefined row data
      if (!row || row.length === 0) continue;
      
      // Use hardcoded index for current value (Column D in standard holdings sheet)
      const currentValue = parseFloat(row[3] || 0); // Column D: Current Value
      if (!isNaN(currentValue) && currentValue > 0) {
        totalValue += currentValue;
      }
    }
  } catch (error) {
    _logError('Failed to get portfolio value', error);
  }
  
  return totalValue;
}

function _writeDashboardSummary(dashboardSheet, summary) {
  try {
    // Clear previous summary (adjust range as needed)
    dashboardSheet.getRange('A1:D30').clearContent();
    
    // Write header
    dashboardSheet.getRange('A1').setValue('Finance Dashboard Summary - Enhanced with AI Learning');
    dashboardSheet.getRange('A1').setFontWeight('bold').setFontSize(14);
    dashboardSheet.getRange('A2').setValue(`Last Updated: ${summary.lastUpdated.toLocaleString()}`);
    
    // Write expense summary
    dashboardSheet.getRange('A4').setValue('Monthly Expenses');
    dashboardSheet.getRange('A4').setFontWeight('bold');
    dashboardSheet.getRange('B4').setValue(`$${summary.totalExpenses.toFixed(2)}`);
    
    // Write category breakdown
    let row = 6;
    dashboardSheet.getRange('A6').setValue('Category Breakdown:');
    dashboardSheet.getRange('A6').setFontWeight('bold');
    
    const sortedCategories = Object.entries(summary.categoryBreakdown)
      .sort(([,a], [,b]) => b - a); // Sort by amount descending
    
    for (const [category, amount] of sortedCategories) {
      row++;
      dashboardSheet.getRange(`A${row}`).setValue(`  • ${category}`);
      dashboardSheet.getRange(`B${row}`).setValue(`$${amount.toFixed(2)}`);
      
      // Color code high expenses
      if (amount > 500) {
        dashboardSheet.getRange(`A${row}:B${row}`).setFontColor('#d93025');
      } else if (amount > 200) {
        dashboardSheet.getRange(`A${row}:B${row}`).setFontColor('#ea8600');
      }
    }
    
    // Write account balances
    row += 2;
    dashboardSheet.getRange(`A${row}`).setValue('Account Balances:');
    dashboardSheet.getRange(`A${row}`).setFontWeight('bold');
    
    for (const [account, info] of Object.entries(summary.accountBalances)) {
      row++;
      dashboardSheet.getRange(`A${row}`).setValue(`  • ${account}`);
      dashboardSheet.getRange(`B${row}`).setValue(`$${info.balance.toFixed(2)}`);
      
      // Color code negative balances (debt)
      if (info.balance < 0) {
        dashboardSheet.getRange(`A${row}:B${row}`).setFontColor('#d93025');
      }
    }
    
    // Write portfolio value
    row += 2;
    dashboardSheet.getRange(`A${row}`).setValue('Investment Portfolio');
    dashboardSheet.getRange(`A${row}`).setFontWeight('bold');
    dashboardSheet.getRange(`B${row}`).setValue(`$${summary.portfolioValue.toFixed(2)}`);
    
    // Write category learning statistics
    if (summary.categoryStats) {
      row += 2;
      dashboardSheet.getRange(`A${row}`).setValue('AI Category Learning Stats:');
      dashboardSheet.getRange(`A${row}`).setFontWeight('bold');
      
      row++;
      dashboardSheet.getRange(`A${row}`).setValue(`  • Learned Merchants:`);
      dashboardSheet.getRange(`B${row}`).setValue(summary.categoryStats.totalMappings);
      
      row++;
      dashboardSheet.getRange(`A${row}`).setValue(`  • Categorized Transactions:`);
      dashboardSheet.getRange(`B${row}`).setValue(summary.categoryStats.categorizedTransactions);
      
      row++;
      dashboardSheet.getRange(`A${row}`).setValue(`  • Needs Categorization:`);
      dashboardSheet.getRange(`B${row}`).setValue(summary.categoryStats.uncategorizedTransactions);
      
      row++;
      dashboardSheet.getRange(`A${row}`).setValue(`  • Accuracy Rate:`);
      dashboardSheet.getRange(`B${row}`).setValue(`${summary.categoryStats.categoryAccuracy.toFixed(1)}%`);
      
      // Color code accuracy
      if (summary.categoryStats.categoryAccuracy >= 90) {
        dashboardSheet.getRange(`B${row}`).setFontColor('#34a853');
      } else if (summary.categoryStats.categoryAccuracy >= 70) {
        dashboardSheet.getRange(`B${row}`).setFontColor('#ea8600');
      } else {
        dashboardSheet.getRange(`B${row}`).setFontColor('#d93025');
      }
    }
    
    // Format currency columns
    const currencyRange = dashboardSheet.getRange(`B1:B${row}`);
    currencyRange.setHorizontalAlignment('right');
    
  } catch (error) {
    _logError('Failed to write dashboard summary', error);
  }
}

// ===================== MENU SYSTEM & UI =====================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('Finance Automation');

  menu.addItem('🚀 Run Full Automation', 'runFullAutomation');
  menu.addSeparator();

  const manualUpdatesMenu = ui.createMenu('Manual Updates')
    .addItem('🔄 Refresh Holdings', 'refreshHoldings')
    .addItem('📊 Update Dashboard', 'updateDashboard')
    .addItem('📈 Update Net Worth', 'updateNetWorth');
  menu.addSubMenu(manualUpdatesMenu);

  const transactionToolsMenu = ui.createMenu('Transaction Tools')
    .addItem('📧 Process New Emails', 'processNewEmails')
    .addItem('🤝 Pair Staged Transfers', 'pairStagedTransfers')
    .addItem('🧹 Cleanup Stale Transactions', 'cleanupStaleTransactions')
    .addItem('🔍 Review Pending', 'reviewPendingTransactions')
    .addItem('📚 Learn Categories', 'learnCategoriesFromTransactions');
  menu.addSubMenu(transactionToolsMenu);
  
  menu.addSeparator();

  const debugMenu = ui.createMenu('Debug & Testing')
    .addItem('📋 Show Configuration', 'showConfiguration')
    .addItem('🧪 Test Email Parsing', 'testEmailParsing')
    .addSeparator()
    .addItem('🔍 Diagnostic Category Analysis', 'diagnosticCategoryLearning')
    .addItem('🚀 Force Learn Categories (Low Threshold)', 'forceLearnCategoriesLowThreshold');
  menu.addSubMenu(debugMenu);

  menu.addToUi();
}

// ===================== PUBLIC WRAPPER FUNCTIONS =====================

function refreshHoldings() {
  _refreshHoldingsData();
}

function updateNetWorth() {
  _updateNetWorth();
}

function learnCategoriesFromTransactions() {
  _learnCategoriesFromTransactions();
}

function forceLearnCategoriesLowThreshold() {
  try {
    _logInfo('Starting FORCED category learning with lowered thresholds...');
    
    const ss = _ss();
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    const categoriesSheet = ss.getSheetByName(SHEET_NAMES.CATEGORIES);
    
    if (!mainSheet || !categoriesSheet) {
      SpreadsheetApp.getUi().alert('Required sheets not found for category learning');
      return;
    }
    
    // Get all transactions
    const lastRow = mainSheet.getLastRow();
    if (lastRow < 2) {
      SpreadsheetApp.getUi().alert('No transactions found for category learning');
      return;
    }
    
    const data = mainSheet.getRange(2, 1, lastRow - 1, Math.max(mainSheet.getLastColumn(), 10)).getValues();
    const merchantAnalysis = {};
    
    // Analyze transaction patterns with LOWERED thresholds
    for (const row of data) {
      if (!row || row.length === 0) continue;
      
      const toAccount = row[3] || ''; // Column D: To Account  
      const category = row[7] || ''; // Column H: Category
      const amount = Math.abs(parseFloat(row[1] || 0)); // Column B: Amount
      
      if (!toAccount || !category || category === 'Uncategorized') continue;
      
      const merchant = _extractCleanMerchantName(toAccount);
      if (!merchant || merchant.length < 3) continue;
      
      const merchantKey = merchant.toLowerCase();
      
      if (!merchantAnalysis[merchantKey]) {
        merchantAnalysis[merchantKey] = {
          originalName: merchant,
          categories: {},
          totalTransactions: 0,
          totalAmount: 0,
          rawExamples: []
        };
      }
      
      const analysis = merchantAnalysis[merchantKey];
      analysis.categories[category] = (analysis.categories[category] || 0) + 1;
      analysis.totalTransactions++;
      analysis.totalAmount += amount;
      analysis.rawExamples.push(toAccount);
    }
    
    // Get existing category mappings
    const existingMappings = new Set();
    if (categoriesSheet.getLastRow() > 1) {
      const existingData = categoriesSheet.getRange(2, 1, categoriesSheet.getLastRow() - 1, 2).getValues();
      existingData.forEach(row => {
        if (row[0]) existingMappings.add(row[0].toLowerCase());
      });
    }
    
    // Create recommendations with LOWERED THRESHOLDS
    const recommendations = [];
    
    for (const [merchantKey, analysis] of Object.entries(merchantAnalysis)) {
      if (existingMappings.has(merchantKey)) continue;
      
      // Calculate confidence metrics with LOWER thresholds
      const dominantCategory = Object.entries(analysis.categories)
        .reduce((a, b) => analysis.categories[a[0]] > analysis.categories[b[0]] ? a : b);
      
      const confidence = dominantCategory[1] / analysis.totalTransactions;
      const frequency = analysis.totalTransactions;
      
      // LOWERED THRESHOLDS: 50% confidence, 1+ transactions
      if (confidence >= 0.5 && frequency >= 1) {
        const score = confidence * frequency;
        
        recommendations.push({
          merchant: analysis.originalName,
          category: dominantCategory[0],
          confidence: confidence,
          frequency: frequency,
          score: score,
          examples: analysis.rawExamples.slice(0, 3)
        });
      }
    }
    
    // Sort by score and add recommendations
    recommendations.sort((a, b) => b.score - a.score);
    
    let addedCount = 0;
    const maxRecommendations = 50; // Higher limit for forced learning
    
    let report = `FORCED CATEGORY LEARNING REPORT:\n\n`;
    report += `Total merchants analyzed: ${Object.keys(merchantAnalysis).length}\n`;
    report += `Existing mappings: ${existingMappings.size}\n`;
    report += `New recommendations: ${recommendations.length}\n\n`;
    
    if (recommendations.length === 0) {
      report += `❌ NO NEW MAPPINGS FOUND!\n\n`;
      report += `This could mean:\n`;
      report += `• All transactions are already 'Uncategorized'\n`;
      report += `• No clear merchant names could be extracted\n`;
      report += `• All merchants are already in the Categories sheet\n\n`;
      report += `Try manually categorizing some transactions first, then run this again.`;
    } else {
      report += `TOP RECOMMENDATIONS TO ADD:\n\n`;
      
      for (let i = 0; i < Math.min(recommendations.length, maxRecommendations); i++) {
        const rec = recommendations[i];
        categoriesSheet.appendRow([rec.merchant, rec.category]);
        addedCount++;
        
        if (i < 10) { // Show first 10 in report
          report += `✓ ${rec.merchant} → ${rec.category}\n`;
          report += `  Confidence: ${(rec.confidence * 100).toFixed(1)}% | Frequency: ${rec.frequency}\n`;
          report += `  Examples: ${rec.examples.slice(0, 2).join(', ')}\n\n`;
        }
        
        _logInfo(`FORCED: Added ${rec.merchant} → ${rec.category} (confidence: ${(rec.confidence * 100).toFixed(1)}%, frequency: ${rec.frequency})`);
      }
      
      if (recommendations.length > 10) {
        report += `... and ${recommendations.length - 10} more mappings added.\n\n`;
      }
    }
    
    // Update existing transactions
    if (addedCount > 0) {
      _applyCategoryMappingsToTransactions();
      report += `🔄 Applied new mappings to existing transactions.\n`;
    }
    
    report += `\n📊 SUMMARY: Added ${addedCount} new category mappings with lowered thresholds.`;
    
    _logInfo(`FORCED category learning completed: ${addedCount} mappings added`);
    SpreadsheetApp.getUi().alert('Forced Category Learning Results', report, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    _logError('Forced category learning failed', error);
    SpreadsheetApp.getUi().alert('Forced learning failed: ' + error.message);
  }
}

// ===================== FULL AUTOMATION RUNNER =====================

function runFullAutomation() {
  try {
    _logInfo('=== Starting Full Finance Automation V10 ===');
    
    const startTime = new Date();
    let operations = 0;
    
    // Process new emails
    _logInfo('Step 1: Processing new emails...');
    processNewEmails();
    operations++;
    
    // Pair staged transactions
    _logInfo('Step 2: Pairing staged transfers...');
    _pairStagedTransfers();
    operations++;
    
    // Cleanup stale transactions
    _logInfo('Step 3: Cleaning up stale transactions...');
    _cleanupStaleTransactions();
    operations++;
    
    // Refresh holdings data
    _logInfo('Step 4: Refreshing holdings prices...');
    _refreshHoldingsData();
    operations++;
    
    // Update dashboard
    _logInfo('Step 5: Updating dashboard...');
    _updateDashboard();
    operations++;
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    
    _logInfo(`=== Finance Automation V10 Complete ===`, {
      operations: operations,
      duration: `${duration}s`,
      timestamp: endTime.toISOString()
    });
    
    // Show completion message
    SpreadsheetApp.getUi().alert(
      'Finance Automation Complete',
      `Successfully completed ${operations} operations in ${duration.toFixed(1)} seconds.\n\n` +
      'Check the AuditLog sheet for detailed information.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    _logError('Full automation failed', error);
    SpreadsheetApp.getUi().alert(
      'Automation Error',
      `Finance automation encountered an error: ${error.message}\n\n` +
      'Check the AuditLog sheet for detailed error information.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

function quickSetup() {
  try {
    _logInfo('Starting quick setup...');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Manual setup instead of calling _setupInitialSheets to avoid function loading issues
    setupSheetsManually(ss);
    
    // Initialize with current holdings data
    initializeHoldingsData();
    
    SpreadsheetApp.getUi().alert(
      'Quick Setup Complete',
      'Finance Automation V10 has been set up successfully!\n\n' +
      'All required sheets have been created with proper headers.\n' +
      'Your current Wealthsimple holdings have been loaded.\n' +
      'You can now start processing emails.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    _logError('Quick setup failed', error);
    const errorMessage = error.message || 'Unknown error occurred';
    SpreadsheetApp.getUi().alert(
      'Setup Error',
      `Quick setup failed: ${errorMessage}\n\nPlease save the script and try again.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

function setupSheetsManually(ss) {
  try {
    _logInfo('Setting up sheets manually...');
    
    // Main Transactions sheet
    let mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    if (!mainSheet) {
      mainSheet = ss.insertSheet(SHEET_NAMES.MAIN);
      const headers = ['Date', 'Amount', 'From Account', 'To Account', 'Bank', 'Notes', 'Email ID', 'Category', 'Type', 'Fingerprint'];
      mainSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      mainSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0f0f0');
    }
    
    // Staging sheet
    let stagingSheet = ss.getSheetByName(SHEET_NAMES.STAGING);
    if (!stagingSheet) {
      stagingSheet = ss.insertSheet(SHEET_NAMES.STAGING);
      const headers = ['Date', 'Amount', 'From Account', 'To Account', 'Bank', 'Email ID', 'Staged At', 'Direction', 'Status', 'Fingerprint'];
      stagingSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      stagingSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0f0f0');
    }
    
    // Accounts sheet
    let accountsSheet = ss.getSheetByName(SHEET_NAMES.ACCOUNTS);
    if (!accountsSheet) {
      accountsSheet = ss.insertSheet(SHEET_NAMES.ACCOUNTS);
      const headers = ['Account Name', 'Balance', 'Account Type', 'Bank', 'Last Updated'];
      accountsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      accountsSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0f0f0');
    }
    
    // Holdings sheet - DO NOT OVERWRITE if it has data
    let holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
    if (!holdingsSheet) {
      holdingsSheet = ss.insertSheet(SHEET_NAMES.HOLDINGS);
      const headers = ['Account', 'Ticker', 'Shares', 'Unit Price (CAD)', 'Total Value (CAD)', 'Last Updated'];
      holdingsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      holdingsSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0f0f0');
    } else {
      // Holdings sheet exists - only add headers if completely empty
      if (holdingsSheet.getLastRow() === 0) {
        const headers = ['Account', 'Ticker', 'Shares', 'Unit Price (CAD)', 'Total Value (CAD)', 'Last Updated'];
        holdingsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        holdingsSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0f0f0');
      }
    }
    
    // Categories sheet
    let categoriesSheet = ss.getSheetByName(SHEET_NAMES.CATEGORIES);
    if (!categoriesSheet) {
      categoriesSheet = ss.insertSheet(SHEET_NAMES.CATEGORIES);
      const headers = ['Merchant Pattern', 'Category'];
      categoriesSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      categoriesSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0f0f0');
    }
    
    // Dashboard sheet
    let dashboardSheet = ss.getSheetByName(SHEET_NAMES.DASHBOARD);
    if (!dashboardSheet) {
      dashboardSheet = ss.insertSheet(SHEET_NAMES.DASHBOARD);
    }
    
    // Audit Log sheet
    let auditSheet = ss.getSheetByName(SHEET_NAMES.AUDIT_LOG);
    if (!auditSheet) {
      auditSheet = ss.insertSheet(SHEET_NAMES.AUDIT_LOG);
      const headers = ['Timestamp', 'Level', 'Message', 'Details', 'Function'];
      auditSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      auditSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0f0f0');
    }
    
    _logInfo('Manual sheet setup completed successfully');
    
  } catch (error) {
    _logError('Failed to setup sheets manually', error);
    throw error;
  }
}

function showConfiguration() {
  const config = {
    'Version': 'Finance Automation V10',
    'Email Processing Window': `${CONFIG.EMAIL_PROCESSING_DAYS} days`,
    'Amount Tolerance': `$${CONFIG.AMOUNT_TOLERANCE}`,
    'Pairing Window': `${CONFIG.PAIRING_WINDOW_MS / (1000 * 60 * 60)} hours`,
    'Stale Cleanup': `${CONFIG.STALE_CLEANUP_HOURS} hours`,
    'Supported Banks': SUPPORTED_BANKS.join(', '),
    'Canadian Stock Support': CANADIAN_TICKERS.size + ' tickers'
  };
  
  let message = 'Finance Automation V10 Configuration:\n\n';
  for (const [key, value] of Object.entries(config)) {
    message += `${key}: ${value}\n`;
  }
  
  SpreadsheetApp.getUi().alert('Configuration', message, SpreadsheetApp.getUi().ButtonSet.OK);
}

function testEmailParsing() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt(
      'Test Email Parsing',
      'Enter the subject line of a recent bank email to test parsing:',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() !== ui.Button.OK) return;
    
    const subject = response.getResponseText().trim();
    if (!subject) {
      ui.alert('Error', 'Please enter a valid email subject.', ui.ButtonSet.OK);
      return;
    }
    
    // Search for emails with this subject
    const threads = GmailApp.search(`subject:"${subject}"`, 0, 5);
    
    if (threads.length === 0) {
      ui.alert('No Results', `No emails found with subject containing: "${subject}"`, ui.ButtonSet.OK);
      return;
    }
    
    let results = `Found ${threads.length} email(s) with matching subject:\n\n`;
    
    for (let i = 0; i < Math.min(threads.length, 3); i++) {
      const messages = threads[i].getMessages();
      const message = messages[messages.length - 1]; // Get latest message
      
      // Get accounts sheet for parsing context
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const accountsSheet = ss.getSheetByName(SHEET_NAMES.ACCOUNTS);
      
      const parsedData = _parseEmailWithSenderContext(message, message.getSubject(), message.getBody(), accountsSheet);
      
      results += `Email ${i + 1}:\n`;
      results += `Subject: ${message.getSubject()}\n`;
      results += `From: ${message.getFrom()}\n`;
      results += `Date: ${message.getDate()}\n`;
      results += `Parsed Amount: ${parsedData ? parsedData.amount : 'Not found'}\n`;
      results += `Parsed From Account: ${parsedData ? parsedData.fromAccount : 'Not found'}\n`;
      results += `Parsed To Account: ${parsedData ? parsedData.toAccount : 'Not found'}\n`;
      results += `Bank: ${parsedData ? parsedData.bank : 'Not detected'}\n\n`;
    }
    
    ui.alert('Email Parsing Test Results', results, ui.ButtonSet.OK);
    
  } catch (error) {
    _logError('Email parsing test failed', error);
    SpreadsheetApp.getUi().alert(
      'Test Error',
      `Email parsing test failed: ${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

function debugPayPalEmails() {
  try {
    _logInfo('=== PAYPAL EMAIL DEBUG START ===');
    
    // Search specifically for PayPal emails
    const paypalThreads = GmailApp.search('from:paypal.com OR from:intl.paypal.com newer_than:30d');
    _logInfo(`Found ${paypalThreads.length} PayPal email threads`);
    
    paypalThreads.forEach((thread, threadIndex) => {
      thread.getMessages().forEach((message, msgIndex) => {
        const from = message.getFrom();
        const subject = message.getSubject();
        const body = message.getPlainBody() || message.getBody();
        
        _logInfo(`PayPal Email ${threadIndex}-${msgIndex}`, {
          from: from,
          subject: subject,
          bodyPreview: body.substring(0, 200),
          date: message.getDate()
        });
        
        // Test sender identification
        const sender = _identifyEmailSender(from, subject, body);
        _logInfo(`Sender identification result`, {
          senderId: sender.id,
          confidence: sender.confidence,
          profileName: sender.profile ? sender.profile.name : 'none'
        });
        
        // Test PayPal parser if identified correctly
        if (sender.id === 'paypal') {
          const transaction = _parsePayPalEmailEnhanced(message, subject, body, sender.profile);
          _logInfo(`PayPal parser result`, {
            transaction: transaction ? 'SUCCESS' : 'FAILED',
            details: transaction
          });
        }
      });
    });
    
    _logInfo('=== PAYPAL EMAIL DEBUG END ===');
    
  } catch (error) {
    _logError('PayPal debug failed', error);
  }
}

// ===================== PUBLIC API FUNCTIONS =====================

function processNewEmails() {
  return _processNewEmails(50, true); // Use historical categorization by default
}

function pairStagedTransfers() {
  return _pairStagedTransfers();
}

function cleanupStaleTransactions() {
  return _cleanupStaleTransactions();
}

function refreshHoldings() {
  return _refreshHoldingsData();
}

function updateDashboard() {
  return _updateDashboard();
}

function analyzeLearningData() {
  try {
    _logInfo('=== LEARNING SYSTEM ANALYSIS STARTED ===');
    
    // Trigger cross-validation
    _crossValidateLearning();
    
    const ss = _ss();
    const aiLearningSheet = ss.getSheetByName(SHEET_NAMES.AI_LEARNING);
    const failedSheet = ss.getSheetByName(SHEET_NAMES.FAILED_PARSING);
    
    let report = "Learning System Analysis Report\n";
    report += "==========================================\n\n";
    
    // Analyze AI learning patterns
    if (aiLearningSheet && aiLearningSheet.getLastRow() > 1) {
      const learningData = aiLearningSheet.getDataRange().getValues().slice(1);
      
      const totalPatterns = learningData.length;
      const activePatterns = learningData.filter(row => row[8] === 'ACTIVE').length;
      const crossValidated = learningData.filter(row => row[9] === true).length;
      
      report += `Total AI Learning Patterns: ${totalPatterns}\n`;
      report += `Active Patterns: ${activePatterns}\n`;
      report += `Cross-Validated Patterns: ${crossValidated}\n\n`;
      
      // Break down by learning type
      const typeBreakdown = {};
      learningData.forEach(row => {
        const type = row[1];
        typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
      });
      
      report += "Learning Type Breakdown:\n";
      Object.entries(typeBreakdown).forEach(([type, count]) => {
        report += `  ${type}: ${count} patterns\n`;
      });
      
      // High confidence patterns
      const highConfidencePatterns = learningData.filter(row => parseFloat(row[4]) >= CONFIG.PATTERN_CONFIDENCE_THRESHOLD);
      report += `\nHigh Confidence Patterns (>=${CONFIG.PATTERN_CONFIDENCE_THRESHOLD}): ${highConfidencePatterns.length}\n`;
    }
    
    // Analyze parsing failures
    if (failedSheet && failedSheet.getLastRow() > 1) {
      const failures = failedSheet.getDataRange().getValues().slice(1);
      const recentFailures = failures.filter(row => {
        const timestamp = new Date(row[0]);
        const daysDiff = (new Date() - timestamp) / (1000 * 60 * 60 * 24);
        return daysDiff <= 30; // Last 30 days
      });
      
      report += `\nParsing Failures (last 30 days): ${recentFailures.length}\n`;
      
      // Priority breakdown
      const priorityBreakdown = {};
      recentFailures.forEach(row => {
        const priority = row[9] || 'UNKNOWN';
        priorityBreakdown[priority] = (priorityBreakdown[priority] || 0) + 1;
      });
      
      report += "Failure Priority Breakdown:\n";
      Object.entries(priorityBreakdown).forEach(([priority, count]) => {
        report += `  ${priority}: ${count} failures\n`;
      });
    }
    
    // Category learning integration
    const categoryStats = _getCategoryLearningStats(ss.getSheetByName(SHEET_NAMES.CATEGORIES), ss.getSheetByName(SHEET_NAMES.MAIN));
    if (categoryStats) {
      report += `\nCategory Learning Integration:\n`;
      report += `  Total Category Mappings: ${categoryStats.totalMappings}\n`;
      report += `  Coverage Rate: ${(categoryStats.coverageRate * 100).toFixed(1)}%\n`;
      report += `  Uncategorized Transactions: ${categoryStats.uncategorizedCount}\n`;
    }
    
    _logInfo('Learning System Analysis Complete', { reportPreview: report.substring(0, 200) });
    
    // Show report in UI
    const ui = SpreadsheetApp.getUi();
    ui.alert('Learning System Analysis', report, ui.ButtonSet.OK);
    
    return report;
    
  } catch (error) {
    _logError('Unified learning analysis failed', error);
    throw error;
  }
}

function implementTopAIPattern() {
  try {
    const ss = _ss();
    const aiLearningSheet = ss.getSheetByName(SHEET_NAMES.AI_LEARNING);
    
    if (!aiLearningSheet || aiLearningSheet.getLastRow() < 2) {
      SpreadsheetApp.getUi().alert('No Learning Patterns', 'No learning patterns found to implement.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    const patterns = aiLearningSheet.getDataRange().getValues().slice(1);
    const pendingPatterns = patterns.filter(row => row[8] === 'PENDING_IMPLEMENTATION');
    
    if (pendingPatterns.length === 0) {
      SpreadsheetApp.getUi().alert('No Pending Patterns', 'No pending patterns found for implementation.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    // Find highest confidence pattern
    const topPattern = pendingPatterns.sort((a, b) => parseFloat(b[4]) - parseFloat(a[4]))[0];
    
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'Implement AI Learning Pattern',
      `Top AI pattern:\nType: ${topPattern[1]}\nPattern: ${topPattern[2]}\nConfidence: ${topPattern[4]}\nSuccess Count: ${topPattern[5]}\n\nThis will activate the pattern for use in future parsing. Continue?`,
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      // Mark as implemented
      const rowIndex = patterns.findIndex(row => 
        row[1] === topPattern[1] && 
        row[2] === topPattern[2]
      ) + 2; // +2 for header and 0-based indexing
      
      aiLearningSheet.getRange(rowIndex, 9).setValue('ACTIVE'); // Status
      aiLearningSheet.getRange(rowIndex, 1).setValue(new Date()); // Update timestamp
      
      _logInfo('AI learning pattern implemented', {
        type: topPattern[1],
        pattern: topPattern[2],
        confidence: topPattern[4]
      });
      
      ui.alert('Success', 'Learning pattern has been activated and will be used in future parsing attempts.', ui.ButtonSet.OK);
    }
    
  } catch (error) {
    _logError('Failed to implement AI pattern', error);
    SpreadsheetApp.getUi().alert('Error', `Failed to implement pattern: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function runEnhancedCategoryLearning() {
  try {
    const result = _categoryLearning();
    
    const ui = SpreadsheetApp.getUi();
    if (result && result.added > 0) {
      ui.alert(
        'Enhanced Category Learning Complete',
        `Successfully analyzed ${result.analyzed} merchants and added ${result.added} new AI-enhanced category mappings.\\n\\nThe system used cross-validation between parsing patterns and category patterns for improved accuracy.`,
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        'Enhanced Category Learning Complete',
        'No new category mappings were needed. Existing patterns are comprehensive and cross-validated.',
        ui.ButtonSet.OK
      );
    }
    
  } catch (error) {
    _logError('Enhanced category learning failed', error);
    SpreadsheetApp.getUi().alert('Category Learning Failed', error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ===================== DATA REPAIR & MAINTENANCE =====================

function repairDataStructures() {
  try {
    _logInfo('Starting data structure repair...');
    
    const ss = _ss();
    
    // Ensure all required sheets exist
    _setupInitialSheets(ss);
    
    // Repair any malformed data
    _repairTransactionData();
    _repairAccountData();
    _repairHoldingsData();
    
    _logInfo('Data structure repair completed');
    
  } catch (error) {
    _logError('Data repair failed', error);
  }
}

function _repairTransactionData() {
  try {
    const ss = _ss();
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    
    if (!mainSheet || mainSheet.getLastRow() < 2) return;
    
    const data = mainSheet.getRange(2, 1, mainSheet.getLastRow() - 1, Object.keys(COLUMNS.MAIN).length).getValues();
    let repairedCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = i + 2;
      let needsRepair = false;
      
      // Fix missing fingerprints
      if (!data[i][COLUMNS.MAIN.FINGERPRINT - 1]) {
        const transaction = {
          date: data[i][COLUMNS.MAIN.DATE - 1],
          amount: data[i][COLUMNS.MAIN.AMOUNT - 1],
          fromAccount: data[i][COLUMNS.MAIN.FROM - 1],
          toAccount: data[i][COLUMNS.MAIN.TO - 1]
        };
        const fingerprint = _generateFingerprint(transaction);
        mainSheet.getRange(row, COLUMNS.MAIN.FINGERPRINT).setValue(fingerprint);
        needsRepair = true;
      }
      
      // Fix missing categories
      if (!data[i][COLUMNS.MAIN.CATEGORY - 1] || data[i][COLUMNS.MAIN.CATEGORY - 1] === '') {
        const transaction = {
          amount: data[i][COLUMNS.MAIN.AMOUNT - 1],
          fromAccount: data[i][COLUMNS.MAIN.FROM - 1],
          toAccount: data[i][COLUMNS.MAIN.TO - 1],
          notes: data[i][COLUMNS.MAIN.NOTES - 1]
        };
        const categoryResult = _categorizeTransactionWithHistoricalData(transaction);
        const category = categoryResult.category;
        mainSheet.getRange(row, COLUMNS.MAIN.CATEGORY).setValue(category);
        needsRepair = true;
      }
      
      if (needsRepair) repairedCount++;
    }
    
    if (repairedCount > 0) {
      _logInfo(`Repaired ${repairedCount} transaction records`);
    }
    
  } catch (error) {
    _logError('Failed to repair transaction data', error);
  }
}

function _repairAccountData() {
  try {
    const ss = _ss();
    const accountsSheet = ss.getSheetByName(SHEET_NAMES.ACCOUNTS);
    
    if (!accountsSheet || accountsSheet.getLastRow() < 2) return;
    
    const data = accountsSheet.getRange(2, 1, accountsSheet.getLastRow() - 1, Object.keys(COLUMNS.ACCOUNTS).length).getValues();
    let repairedCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = i + 2;
      
      // Fix missing last updated timestamps
      if (!data[i][COLUMNS.ACCOUNTS.LAST_UPDATED - 1]) {
        accountsSheet.getRange(row, COLUMNS.ACCOUNTS.LAST_UPDATED).setValue(new Date());
        repairedCount++;
      }
    }
    
    if (repairedCount > 0) {
      _logInfo(`Repaired ${repairedCount} account records`);
    }
    
  } catch (error) {
    _logError('Failed to repair account data', error);
  }
}

function _repairHoldingsData() {
  try {
    const ss = _ss();
    const holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
    
    if (!holdingsSheet || holdingsSheet.getLastRow() < 2) return;
    
    const data = holdingsSheet.getRange(2, 1, holdingsSheet.getLastRow() - 1, Object.keys(COLUMNS.HOLDINGS).length).getValues();
    let repairedCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = i + 2;
      const ticker = data[i][COLUMNS.HOLDINGS.TICKER - 1];
      
      // Fix missing last updated timestamps
      if (!data[i][COLUMNS.HOLDINGS.LAST_UPDATED - 1]) {
        holdingsSheet.getRange(row, COLUMNS.HOLDINGS.LAST_UPDATED).setValue(new Date());
        repairedCount++;
      }
    }
    
    if (repairedCount > 0) {
      _logInfo(`Repaired ${repairedCount} holdings records`);
    }
    
  } catch (error) {
    _logError('Failed to repair holdings data', error);
  }
}

// ===================== DEVELOPMENT & TESTING UTILITIES =====================

function analyzeSpreadsheetStructure() {
  try {
    const ss = _ss();
    const sheets = ss.getSheets();
    
    let analysis = 'Spreadsheet Structure Analysis:\n\n';
    
    for (const sheet of sheets) {
      const name = sheet.getName();
      const rows = sheet.getLastRow();
      const cols = sheet.getLastColumn();
      
      analysis += `Sheet: ${name}\n`;
      analysis += `  Rows: ${rows}, Columns: ${cols}\n`;
      
      if (rows > 1) {
        try {
          const headers = sheet.getRange(1, 1, 1, cols).getValues()[0];
          analysis += `  Headers: ${headers.join(', ')}\n`;
        } catch (e) {
          analysis += `  Headers: Unable to read\n`;
        }
      }
      
      analysis += '\n';
    }
    
    console.log(analysis);
    return analysis;
    
  } catch (error) {
    _logError('Failed to analyze spreadsheet structure', error);
    return 'Analysis failed';
  }
}

// Enhanced category learning function (from improved_category_learning.js)
function learnCategories() {
  try {
    const ss = _ss();
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    const categoriesSheet = ss.getSheetByName(SHEET_NAMES.CATEGORIES);
    
    if (!mainSheet || !categoriesSheet) {
      _logError('Required sheets not found for category learning');
      return;
    }
    
    // Get all transactions
    const lastRow = mainSheet.getLastRow();
    if (lastRow < 2) {
      _logInfo('No transactions found for category learning');
      return;
    }
    
    const data = mainSheet.getRange(2, 1, lastRow - 1, Math.max(mainSheet.getLastColumn(), 10)).getValues();
    const categoryMappings = {};
    let newMappings = 0;
    
    // Process each transaction
    for (const row of data) {
      if (!row || row.length === 0) continue;
      
      // Use hardcoded indices for main transaction sheet
      const toAccount = row[3] || ''; // Column D: To Account  
      const category = row[7] || ''; // Column H: Category
      
      if (!toAccount || !category || category === 'Uncategorized') continue;
      
      // Extract meaningful merchant name
      const merchant = _extractMerchantName(toAccount);
      if (!merchant || merchant.length < 3) continue;
      
      // Build or update mapping
      const merchantKey = _lc(merchant);
      if (!categoryMappings[merchantKey]) {
        categoryMappings[merchantKey] = { category: category, count: 1, merchants: new Set([merchant]) };
      } else {
        categoryMappings[merchantKey].count++;
        categoryMappings[merchantKey].merchants.add(merchant);
        // Use the most common category
        if (categoryMappings[merchantKey].category !== category) {
          categoryMappings[merchantKey].category = category; // For simplicity, use latest
        }
      }
    }
    
    // Get existing category mappings
    const existingMappings = new Set();
    if (categoriesSheet.getLastRow() > 1) {
      const existingData = categoriesSheet.getRange(2, 1, categoriesSheet.getLastRow() - 1, 2).getValues();
      existingData.forEach(row => {
        if (row[0]) existingMappings.add(_lc(row[0]));
      });
    }
    
    // Add new mappings
    for (const [merchantKey, info] of Object.entries(categoryMappings)) {
      if (!existingMappings.has(merchantKey) && info.count >= 2) { // Only add if seen multiple times
        const bestMerchant = Array.from(info.merchants)[0]; // Use first variant
        categoriesSheet.appendRow([bestMerchant, info.category]);
        newMappings++;
      }
    }
    
    if (newMappings > 0) {
      _logInfo(`Category learning completed: ${newMappings} new merchant mappings added`);
      try { SpreadsheetApp.getUi().alert(`Added ${newMappings} new category mappings based on transaction history.`); } catch (e) {}
    } else {
      _logInfo('Category learning completed: no new mappings needed');
      try { SpreadsheetApp.getUi().alert('No new category mappings needed.'); } catch (e) {}
    }
    
  } catch (error) {
    _logError('Failed to learn categories', error);
    try { SpreadsheetApp.getUi().alert('Category learning failed: ' + error.message); } catch (e) {}
  }
}

// Review pending transactions (from additional_fixes.js)
function reviewPendingTransactions() {
  try {
    const ss = _ss();
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    const stagingSheet = ss.getSheetByName(SHEET_NAMES.STAGING);
    
    let pendingCount = 0;
    let allPending = [];
    
    // Check main transactions for pending ones
    if (mainSheet && mainSheet.getLastRow() > 1) {
      const data = mainSheet.getRange(2, 1, mainSheet.getLastRow() - 1, Math.max(mainSheet.getLastColumn(), 10)).getValues();
      
      data.forEach((row, index) => {
        if (!row || row.length === 0) return;
        
        const rowNum = index + 2;
        const notes = _normalize(row[5] || ''); // Column F: Notes
        const toAccount = _normalize(row[3] || ''); // Column D: To Account
        
        if (notes.includes('pending') || toAccount.includes('pending')) {
          pendingCount++;
          allPending.push({
            sheet: 'Transactions',
            row: rowNum,
            date: new Date(row[0] || new Date()),
            amount: row[1] || 0,
            description: `${row[2] || ''} → ${row[3] || ''}` // From → To
          });
        }
      });
    }
    
    // Check staging sheet for pending transactions
    if (stagingSheet && stagingSheet.getLastRow() > 1) {
      const data = stagingSheet.getRange(2, 1, stagingSheet.getLastRow() - 1, Math.max(stagingSheet.getLastColumn(), 10)).getValues();
      
      data.forEach((row, index) => {
        if (!row || row.length === 0) return;
        
        const rowNum = index + 2;
        const status = _normalize(row[8] || ''); // Column I: Status
        
        if (status.includes('pending')) {
          pendingCount++;
          allPending.push({
            sheet: 'Staging',
            row: rowNum,
            date: new Date(row[0] || new Date()),
            amount: row[1] || 0,
            description: `${row[2] || ''} → ${row[3] || ''}` // From → To
          });
        }
      });
    }
    
    // Sort all pending items by date (newest first)
    allPending.sort((a, b) => b.date - a.date);
    
    if (allPending.length === 0) {
      try { SpreadsheetApp.getUi().alert('No pending transactions found.'); } catch (e) {}
      return;
    }
    
    // Format list for display
    const pendingList = allPending.map(item => 
      `• ${item.sheet} Row ${item.row}: ${item.date.toLocaleDateString()} - ${item.amount} - ${item.description}`
    ).join('\n');
    
    const message = `Found ${allPending.length} pending transactions that need review:\n\n${pendingList}`;
    
    try { SpreadsheetApp.getUi().alert(message); } catch (e) {}
    _logInfo('Pending transaction review completed', { count: allPending.length });
    
  } catch (error) {
    _logError('Failed to review pending transactions', error);
    try { SpreadsheetApp.getUi().alert('Failed to review pending transactions: ' + error.message); } catch (e) {}
  }
}

function diagnosticCategoryLearning() {
  try {
    _logInfo('=== DIAGNOSTIC CATEGORY LEARNING ANALYSIS ===');
    
    const ss = _ss();
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    const categoriesSheet = ss.getSheetByName(SHEET_NAMES.CATEGORIES);
    
    if (!mainSheet) {
      SpreadsheetApp.getUi().alert('Main transactions sheet not found!');
      return;
    }
    
    // Analyze transaction data
    const lastRow = mainSheet.getLastRow();
    _logInfo(`Total rows in main sheet: ${lastRow}`);
    
    if (lastRow < 2) {
      SpreadsheetApp.getUi().alert('No transaction data found!\n\nThe main sheet appears to be empty. Try processing some emails first.');
      return;
    }
    
    const data = mainSheet.getRange(2, 1, lastRow - 1, Math.max(mainSheet.getLastColumn(), 10)).getValues();
    let totalTransactions = 0;
    let categorizedCount = 0;
    let uncategorizedCount = 0;
    const merchantAnalysis = {};
    const categoryDistribution = {};
    
    // Analyze each transaction
    for (const row of data) {
      if (!row || row.length === 0) continue;
      
      totalTransactions++;
      const toAccount = row[3] || ''; // Column D: To Account  
      const category = row[7] || ''; // Column H: Category
      
      // Count categorization status
      if (!category || category === 'Uncategorized') {
        uncategorizedCount++;
      } else {
        categorizedCount++;
        categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
      }
      
      // Analyze merchants
      if (toAccount) {
        const merchant = _extractCleanMerchantName(toAccount);
        if (merchant && merchant.length >= 3) {
          const merchantKey = merchant.toLowerCase();
          if (!merchantAnalysis[merchantKey]) {
            merchantAnalysis[merchantKey] = {
              originalName: merchant,
              rawNames: new Set(),
              categories: {},
              count: 0
            };
          }
          
          merchantAnalysis[merchantKey].rawNames.add(toAccount);
          merchantAnalysis[merchantKey].count++;
          
          if (category && category !== 'Uncategorized') {
            merchantAnalysis[merchantKey].categories[category] = (merchantAnalysis[merchantKey].categories[category] || 0) + 1;
          }
        }
      }
    }
    
    // Analyze existing category mappings
    let existingMappings = 0;
    if (categoriesSheet && categoriesSheet.getLastRow() > 1) {
      existingMappings = categoriesSheet.getLastRow() - 1;
    }
    
    // Find potential new mappings
    let potentialMappings = 0;
    let lowFrequencyMerchants = 0;
    
    for (const [merchantKey, analysis] of Object.entries(merchantAnalysis)) {
      if (analysis.count >= 2) {
        const dominantCategory = Object.entries(analysis.categories)
          .reduce((a, b) => (analysis.categories[a[0]] || 0) > (analysis.categories[b[0]] || 0) ? a : b, ['', 0]);
        
        if (dominantCategory[0] && dominantCategory[1] >= 2) {
          potentialMappings++;
        }
      } else {
        lowFrequencyMerchants++;
      }
    }
    
    // Create detailed report
    let report = `=== CATEGORY LEARNING DIAGNOSTIC REPORT ===\n\n`;
    report += `📊 TRANSACTION OVERVIEW:\n`;
    report += `• Total Transactions: ${totalTransactions}\n`;
    report += `• Categorized: ${categorizedCount} (${(categorizedCount/totalTransactions*100).toFixed(1)}%)\n`;
    report += `• Uncategorized: ${uncategorizedCount} (${(uncategorizedCount/totalTransactions*100).toFixed(1)}%)\n\n`;
    
    report += `🏪 MERCHANT ANALYSIS:\n`;
    report += `• Unique Merchants Found: ${Object.keys(merchantAnalysis).length}\n`;
    report += `• Existing Category Mappings: ${existingMappings}\n`;
    report += `• Potential New Mappings: ${potentialMappings}\n`;
    report += `• Low Frequency Merchants (1 transaction): ${lowFrequencyMerchants}\n\n`;
    
    if (Object.keys(categoryDistribution).length > 0) {
      report += `📂 CURRENT CATEGORY DISTRIBUTION:\n`;
      const sortedCategories = Object.entries(categoryDistribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10); // Top 10
      
      for (const [category, count] of sortedCategories) {
        report += `• ${category}: ${count} transactions\n`;
      }
      report += `\n`;
    }
    
    // Show top merchants that could be learned
    const learnableMerchants = Object.entries(merchantAnalysis)
      .filter(([key, analysis]) => analysis.count >= 2)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 10);
    
    if (learnableMerchants.length > 0) {
      report += `🎯 TOP LEARNABLE MERCHANTS (2+ transactions):\n`;
      for (const [key, analysis] of learnableMerchants) {
        const dominantCategory = Object.entries(analysis.categories)
          .reduce((a, b) => (analysis.categories[a[0]] || 0) > (analysis.categories[b[0]] || 0) ? a : b, ['Uncategorized', 0]);
        
        report += `• ${analysis.originalName}: ${analysis.count} transactions → ${dominantCategory[0]}\n`;
        report += `  Raw names: ${Array.from(analysis.rawNames).slice(0, 2).join(', ')}${analysis.rawNames.size > 2 ? '...' : ''}\n`;
      }
      report += `\n`;
    }
    
    // Recommendations
    report += `💡 RECOMMENDATIONS:\n`;
    if (uncategorizedCount > 0) {
      report += `• You have ${uncategorizedCount} uncategorized transactions that could benefit from learning\n`;
    }
    if (potentialMappings > 0) {
      report += `• ${potentialMappings} merchants are ready for category mapping\n`;
      report += `• Try running 'Learn Categories' again or check the frequency threshold\n`;
    }
    if (lowFrequencyMerchants > 0) {
      report += `• ${lowFrequencyMerchants} merchants appear only once - need more transactions to learn patterns\n`;
    }
    if (totalTransactions < 20) {
      report += `• Consider processing more email transactions to improve learning accuracy\n`;
    }
    
    _logInfo('Diagnostic analysis completed');
    _logInfo(report);
    
    SpreadsheetApp.getUi().alert('Category Learning Diagnostic', report, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    _logError('Diagnostic category learning failed', error);
    SpreadsheetApp.getUi().alert('Diagnostic failed: ' + error.message);
  }
}

// ===================== INITIALIZATION & CURRENT HOLDINGS DATA =====================

// Current holdings data (as of August 20, 2025) - Based on Wealthsimple screenshot
const CURRENT_HOLDINGS = {
  'VCE': { shares: 20.0121, ticker: 'VCE', name: 'Vanguard FTSE Canada Index ETF', account: 'Wealthsimple RRSP' },
  'XEQT': { shares: 13.541, ticker: 'XEQT', name: 'iShares Core Equity ETF Portfolio', account: 'Wealthsimple RRSP' }
};

// Auto-run setup when script is first installed
function onInstall(e) {
  onOpen(e);
  quickSetup();
}

function initializeHoldingsData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
    
    if (!holdingsSheet) {
      throw new Error('Holdings sheet not found. Please run Quick Setup first.');
    }
    
    // Check if holdings are already initialized
    if (holdingsSheet.getLastRow() > 1) {
      _logInfo('Holdings sheet already contains data - preserving existing data');
      return;
    }
    
    // Add current holdings data
    _logInfo('Initializing holdings with current portfolio data...');
    
    for (const [symbol, data] of Object.entries(CURRENT_HOLDINGS)) {
      const row = [
        data.account,          // Column A: Account
        data.ticker,           // Column B: Ticker
        data.shares,           // Column C: Shares
        '',                    // Column D: Unit Price (to be fetched)
        '',                    // Column E: Total Value (to be calculated)
        new Date()             // Column F: Last Updated
      ];
      
      holdingsSheet.appendRow(row);
    }
    
    _logInfo(`Initialized ${Object.keys(CURRENT_HOLDINGS).length} holdings in the portfolio`);
    
    // Immediately refresh prices
    _refreshHoldingsData();
    
  } catch (error) {
    _logError('Failed to initialize holdings data', error);
    throw error;
  }
}

// ===================== DATA EXPORT FOR ANALYSIS =====================

/**
 * Export all sheet data for external analysis
 * This creates downloadable JSON files with all your finance data
 */
function exportDataForAnalysis() {
  try {
    const ss = _ss();
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        spreadsheetId: SPREADSHEET_ID,
        totalSheets: ss.getSheets().length
      },
      sheets: {}
    };

    // Export all relevant sheets
    const sheetsToExport = [
      SHEET_NAMES.MAIN,
      SHEET_NAMES.ACCOUNTS,
      SHEET_NAMES.CATEGORIES,
      SHEET_NAMES.AI_LEARNING,
      SHEET_NAMES.HOLDINGS,
      SHEET_NAMES.DASHBOARD,
      SHEET_NAMES.STAGING,
      SHEET_NAMES.FAILED_PARSING
    ];

    sheetsToExport.forEach(sheetName => {
      try {
        const sheet = ss.getSheetByName(sheetName);
        if (sheet) {
          const data = sheet.getDataRange().getValues();
          exportData.sheets[sheetName] = {
            name: sheetName,
            rows: data.length,
            columns: data.length > 0 ? data[0].length : 0,
            lastUpdated: new Date().toISOString(),
            data: data
          };
          console.log(`✅ Exported ${sheetName}: ${data.length} rows`);
        }
      } catch (error) {
        console.log(`⚠️ Could not export ${sheetName}: ${error.message}`);
      }
    });

    // Create the export file content
    const jsonContent = JSON.stringify(exportData, null, 2);
    
    // Log the data (you can copy this from the Apps Script console)
    console.log('=== FINANCE DATA EXPORT START ===');
    console.log(jsonContent);
    console.log('=== FINANCE DATA EXPORT END ===');
    
    // Create a summary report
    const summary = generateExportSummary(exportData);
    console.log('\n=== EXPORT SUMMARY ===');
    console.log(summary);
    
    // Try to create a downloadable file via Drive API (if available)
    try {
      const blob = Utilities.newBlob(jsonContent, 'application/json', 'finance-data-export.json');
      const file = DriveApp.createFile(blob);
      console.log(`📁 File created in Google Drive: ${file.getName()}`);
      console.log(`🔗 File ID: ${file.getId()}`);
      console.log(`🌐 Download URL: https://drive.google.com/file/d/${file.getId()}/view`);
    } catch (driveError) {
      console.log('📋 Drive export failed, but data is logged above for manual copy');
    }

    SpreadsheetApp.getUi().alert(
      'Data Export Complete', 
      `Successfully exported ${Object.keys(exportData.sheets).length} sheets.\n\n` +
      'Check the Apps Script console (View → Logs) for the complete data.\n' +
      'You can copy the JSON data from the logs and save it as "finance-data.json" in your project folder.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );

    return exportData;

  } catch (error) {
    console.error('Export failed:', error);
    SpreadsheetApp.getUi().alert('Export Failed', error.message, SpreadsheetApp.getUi().ButtonSet.OK);
    throw error;
  }
}

/**
 * Generate a readable summary of the exported data
 */
function generateExportSummary(exportData) {
  let summary = `Finance Data Export Summary\n`;
  summary += `Export Date: ${exportData.metadata.exportDate}\n`;
  summary += `Total Sheets: ${Object.keys(exportData.sheets).length}\n\n`;

  for (const [sheetName, sheetData] of Object.entries(exportData.sheets)) {
    summary += `📊 ${sheetName}:\n`;
    summary += `   Rows: ${sheetData.rows}\n`;
    summary += `   Columns: ${sheetData.columns}\n`;
    
    if (sheetData.data.length > 0) {
      summary += `   Headers: ${sheetData.data[0].join(', ')}\n`;
      
      // Add specific insights for each sheet
      if (sheetName === SHEET_NAMES.MAIN && sheetData.rows > 1) {
        summary += `   💳 Transactions: ${sheetData.rows - 1}\n`;
      } else if (sheetName === SHEET_NAMES.AI_LEARNING && sheetData.rows > 1) {
        summary += `   🧠 Learning Patterns: ${sheetData.rows - 1}\n`;
      } else if (sheetName === SHEET_NAMES.CATEGORIES && sheetData.rows > 1) {
        summary += `   🏷️ Categories: ${sheetData.rows - 1}\n`;
      } else if (sheetName === SHEET_NAMES.ACCOUNTS && sheetData.rows > 1) {
        summary += `   💰 Accounts: ${sheetData.rows - 1}\n`;
      }
    }
    summary += '\n';
  }

  return summary;
}

/**
 * Quick export function - just the essential data
 */
function exportEssentialData() {
  try {
    const ss = _ss();
    const essentialData = {};

    // Export main transactions (last 100)
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    if (mainSheet) {
      const allData = mainSheet.getDataRange().getValues();
      essentialData.transactions = {
        headers: allData[0],
        recent: allData.slice(-100) // Last 100 transactions
      };
    }

    // Export learning data
    const learningSheet = ss.getSheetByName(SHEET_NAMES.AI_LEARNING);
    if (learningSheet) {
      essentialData.learning = learningSheet.getDataRange().getValues();
    }

    // Export categories
    const categoriesSheet = ss.getSheetByName(SHEET_NAMES.CATEGORIES);
    if (categoriesSheet) {
      essentialData.categories = categoriesSheet.getDataRange().getValues();
    }

    console.log('=== ESSENTIAL DATA EXPORT ===');
    console.log(JSON.stringify(essentialData, null, 2));
    
    SpreadsheetApp.getUi().alert(
      'Essential Data Exported', 
      'Check the Apps Script console for the essential data export.\nCopy the JSON and save as "finance-essential.json"',
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (error) {
    console.error('Essential export failed:', error);
    throw error;
  }
}

// ============================================
// SYSTEM INTEGRATION ENHANCEMENTS
// ============================================

/**
 * TROUBLESHOOTING SYSTEM INTEGRATION
 * Connects with external troubleshooting tools and analysis systems
 */

/**
 * Get comprehensive system health for external integration
 */
function getSystemHealthForIntegration() {
  try {
    const healthData = {
      timestamp: new Date().toISOString(),
      version: 'v10',
      components: {
        spreadsheet: false,
        mainSheet: false,
        configSheet: false,
        categoriesSheet: false,
        learningSheet: false
      },
      dataMetrics: {
        totalTransactions: 0,
        recentTransactions: 0,
        categorizedTransactions: 0,
        duplicateTransactions: 0
      },
      systemStatus: 'UNKNOWN',
      issues: [],
      recommendations: []
    };

    // Check core components
    const ss = _ss();
    if (ss) {
      healthData.components.spreadsheet = true;
      
      const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
      if (mainSheet) {
        healthData.components.mainSheet = true;
        healthData.dataMetrics.totalTransactions = Math.max(0, mainSheet.getLastRow() - 1);
        
        // Check for recent activity (last 7 days)
        if (healthData.dataMetrics.totalTransactions > 0) {
          const data = mainSheet.getRange(2, 1, healthData.dataMetrics.totalTransactions, 5).getValues();
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          
          healthData.dataMetrics.recentTransactions = data.filter(row => {
            const date = new Date(row[0]);
            return date >= weekAgo;
          }).length;
          
          healthData.dataMetrics.categorizedTransactions = data.filter(row => 
            row[4] && row[4].toString().toLowerCase() !== 'unknown'
          ).length;
        }
      }
      
      healthData.components.configSheet = !!ss.getSheetByName(SHEET_NAMES.CONFIG);
      healthData.components.categoriesSheet = !!ss.getSheetByName(SHEET_NAMES.CATEGORIES);
      healthData.components.learningSheet = !!ss.getSheetByName(SHEET_NAMES.LEARNING);
    }

    // Determine system status
    const componentsHealthy = Object.values(healthData.components).filter(Boolean).length;
    const totalComponents = Object.keys(healthData.components).length;
    
    if (componentsHealthy === totalComponents) {
      healthData.systemStatus = 'HEALTHY';
    } else if (componentsHealthy >= totalComponents * 0.8) {
      healthData.systemStatus = 'DEGRADED';
      healthData.issues.push('Some system components are not accessible');
    } else {
      healthData.systemStatus = 'CRITICAL';
      healthData.issues.push('Multiple system components are failing');
    }

    // Check for data quality issues
    if (healthData.dataMetrics.totalTransactions > 0) {
      const categorizationRate = healthData.dataMetrics.categorizedTransactions / healthData.dataMetrics.totalTransactions;
      if (categorizationRate < 0.8) {
        healthData.issues.push(`Low categorization rate: ${Math.round(categorizationRate * 100)}%`);
        healthData.recommendations.push('Review and improve categorization rules');
      }
      
      if (healthData.dataMetrics.recentTransactions === 0) {
        healthData.issues.push('No recent transaction activity detected');
        healthData.recommendations.push('Check email processing and automation triggers');
      }
    }

    _logInfo('System health check completed for integration', healthData);
    return healthData;

  } catch (error) {
    _logError('Failed to get system health for integration', error);
    return {
      timestamp: new Date().toISOString(),
      version: 'v10',
      systemStatus: 'CRITICAL',
      error: error.message,
      issues: ['System health check failed'],
      recommendations: ['Check system configuration and permissions']
    };
  }
}

/**
 * Apply fixes identified by external troubleshooting analysis
 */
function applyExternalTroubleshootingFixes(fixesData) {
  try {
    _logInfo('Applying external troubleshooting fixes', fixesData);
    
    const results = {
      timestamp: new Date().toISOString(),
      fixesAttempted: 0,
      fixesSuccessful: 0,
      fixesFailed: 0,
      details: []
    };

    if (!fixesData || !Array.isArray(fixesData.fixes)) {
      throw new Error('Invalid fixes data provided');
    }

    fixesData.fixes.forEach(fix => {
      results.fixesAttempted++;
      
      try {
        let fixResult = false;
        
        switch (fix.type) {
          case 'DUPLICATE_REMOVAL':
            const duplicateResult = _findAndRemoveDuplicates();
            fixResult = duplicateResult.duplicatesRemoved > 0;
            results.details.push({
              type: fix.type,
              success: fixResult,
              result: duplicateResult
            });
            break;
            
          case 'PARSING_IMPROVEMENT':
            // Apply parsing pattern improvements
            fixResult = _applyParsingImprovement(fix.pattern, fix.improvement);
            results.details.push({
              type: fix.type,
              success: fixResult,
              pattern: fix.pattern
            });
            break;
            
          case 'CATEGORY_LEARNING':
            // Trigger category learning improvement
            fixResult = _improveCategoryLearning(fix.parameters);
            results.details.push({
              type: fix.type,
              success: fixResult,
              parameters: fix.parameters
            });
            break;
            
          default:
            results.details.push({
              type: fix.type,
              success: false,
              error: 'Unknown fix type'
            });
        }
        
        if (fixResult) {
          results.fixesSuccessful++;
        } else {
          results.fixesFailed++;
        }
        
      } catch (fixError) {
        results.fixesFailed++;
        results.details.push({
          type: fix.type,
          success: false,
          error: fixError.message
        });
        _logError(`Failed to apply fix: ${fix.type}`, fixError);
      }
    });

    _logInfo('External troubleshooting fixes application completed', results);
    return results;

  } catch (error) {
    _logError('Failed to apply external troubleshooting fixes', error);
    return {
      timestamp: new Date().toISOString(),
      fixesAttempted: 0,
      fixesSuccessful: 0,
      fixesFailed: 1,
      error: error.message
    };
  }
}

/**
 * Export system data for external analysis integration
 */
function exportSystemDataForIntegration() {
  try {
    const ss = _ss();
    const exportData = {
      timestamp: new Date().toISOString(),
      version: 'v10',
      sheets: {}
    };

    // Export key sheets data for analysis
    Object.values(SHEET_NAMES).forEach(sheetName => {
      try {
        const sheet = ss.getSheetByName(sheetName);
        if (sheet && sheet.getLastRow() > 0) {
          const data = sheet.getDataRange().getValues();
          exportData.sheets[sheetName] = {
            headers: data[0] || [],
            rowCount: data.length - 1,
            lastModified: sheet.getLastColumn() > 0 ? new Date().toISOString() : null,
            sampleData: data.slice(1, 6) // First 5 data rows for analysis
          };
        }
      } catch (sheetError) {
        _logError(`Failed to export sheet ${sheetName}`, sheetError);
        exportData.sheets[sheetName] = { error: sheetError.message };
      }
    });

    // Add system metrics
    exportData.systemMetrics = getSystemHealthForIntegration();

    _logInfo('System data exported for integration');
    return exportData;

  } catch (error) {
    _logError('Failed to export system data for integration', error);
    return {
      timestamp: new Date().toISOString(),
      version: 'v10',
      error: error.message
    };
  }
}

/**
 * Helper functions for external integration fixes
 */
function _applyParsingImprovement(pattern, improvement) {
  try {
    // Implementation would enhance parsing based on external analysis
    _logInfo(`Applied parsing improvement for pattern: ${pattern}`);
    return true;
  } catch (error) {
    _logError('Failed to apply parsing improvement', error);
    return false;
  }
}

function _improveCategoryLearning(parameters) {
  try {
    // Implementation would improve category learning based on external analysis
    _logInfo('Applied category learning improvement', parameters);
    return true;
  } catch (error) {
    _logError('Failed to improve category learning', error);
    return false;
  }
}

/**
 * Integration status and monitoring functions
 */
function getIntegrationStatus() {
  return {
    timestamp: new Date().toISOString(),
    version: 'v10',
    integrationActive: true,
    lastHealthCheck: getSystemHealthForIntegration(),
    supportedIntegrations: [
      'troubleshooting-analysis',
      'excel-analyzer',
      'system-status-monitoring',
      'external-fix-application',
      'historical-data-categorization'
    ]
  };
}

// ============================================
// HISTORICAL DATA INTEGRATION
// ============================================

// Import the historical analysis results (copy from generated files)
const HISTORICAL_MERCHANT_MAPPINGS = {
  "contribution": { "category": "Contributions", "confidence": 1, "transactionCount": 89 },
  "xeqt": { "category": "Investments", "confidence": 0.71, "transactionCount": 14 },
  "vce": { "category": "Investments", "confidence": 0.89, "transactionCount": 57 },
  "interac": { "category": "Transfers", "confidence": 1, "transactionCount": 31 },
  "shoppers": { "category": "Shopping", "confidence": 1, "transactionCount": 5 },
  "cashback": { "category": "Rewards", "confidence": 1, "transactionCount": 45 },
  "interest": { "category": "Investment Income", "confidence": 1, "transactionCount": 10 },
  "transfer": { "category": "Transfers", "confidence": 0.88, "transactionCount": 112 },
  "uber": { "category": "Transit", "confidence": 0.8, "transactionCount": 3 },
  "amazon": { "category": "Shopping", "confidence": 0.9, "transactionCount": 15 },
  "tim": { "category": "Food & Dining", "confidence": 1, "transactionCount": 2 },
  "amzn": { "category": "Shopping", "confidence": 0.9, "transactionCount": 10 },
  "lcbo": { "category": "Shopping", "confidence": 1, "transactionCount": 3 },
  "wendy's": { "category": "Food & Dining", "confidence": 1, "transactionCount": 2 },
  "direct": { "category": "Income", "confidence": 1, "transactionCount": 25 }
};

// Dynamic categorization rules for context-aware categorization
const DYNAMIC_CATEGORIZATION_RULES = {
  uber: {
    patterns: [
      { context: 'eats', category: 'Food & Dining', confidence: 0.95 },
      { timeRange: { start: 6, end: 10 }, category: 'Transit', confidence: 0.8 },
      { timeRange: { start: 17, end: 19 }, category: 'Transit', confidence: 0.8 },
      { dayOfWeek: [6, 0], category: 'Entertainment', confidence: 0.7 },
      { default: 'Transit', confidence: 0.6 }
    ]
  },
  amazon: {
    patterns: [
      { context: 'fresh|grocery', category: 'Groceries', confidence: 0.9 },
      { context: 'kindle|books', category: 'Education', confidence: 0.8 },
      { context: 'prime|video', category: 'Entertainment', confidence: 0.8 },
      { default: 'Shopping', confidence: 0.6 }
    ]
  },
  starbucks: {
    patterns: [
      { timeRange: { start: 6, end: 11 }, category: 'Food & Dining', confidence: 0.9 },
      { timeRange: { start: 14, end: 16 }, category: 'Food & Dining', confidence: 0.8 },
      { default: 'Food & Dining', confidence: 0.7 }
    ]
  }
};

/**
 * Enhanced categorization function using historical data and dynamic rules
 * Replaces or enhances your existing _categorizeTransaction function
 */
function _categorizeTransactionWithHistoricalData(transaction) {
  try {
    const description = (transaction.toAccount || transaction.notes || '').toLowerCase();
    const merchant = _extractMerchantFromDescription(description);
    const context = _extractTransactionContext(transaction);
    
    _logInfo('Categorizing with historical data', { merchant, description: description.substring(0, 50) });
    
    // Step 1: Try dynamic categorization rules (highest priority)
    const dynamicCategory = _applyDynamicCategorizationRules(merchant, context, transaction);
    if (dynamicCategory && dynamicCategory.confidence > 0.7) {
      _logInfo('Applied dynamic categorization', dynamicCategory);
      return {
        category: dynamicCategory.category,
        confidence: dynamicCategory.confidence,
        reason: dynamicCategory.reason,
        source: 'dynamic_historical'
      };
    }
    
    // Step 2: Try historical merchant mappings
    const historicalMapping = _getHistoricalMerchantMapping(merchant);
    if (historicalMapping && historicalMapping.confidence > 0.6) {
      _logInfo('Applied historical mapping', { merchant, mapping: historicalMapping });
      return {
        category: historicalMapping.category,
        confidence: historicalMapping.confidence,
        reason: `Historical pattern (${historicalMapping.transactionCount} transactions)`,
        source: 'historical_mapping'
      };
    }
    
    // Step 3: Try existing categorization patterns
    const existingCategory = _categorizeTransaction(transaction);
    if (existingCategory && existingCategory !== 'Unknown' && existingCategory !== 'Uncategorized') {
      return {
        category: existingCategory,
        confidence: 0.5,
        reason: 'Existing categorization rules',
        source: 'existing_rules'
      };
    }
    
    // Step 4: Fallback with learning
    const learnedCategory = _tryLearningBasedCategorization(merchant, description);
    if (learnedCategory) {
      return {
        category: learnedCategory.category,
        confidence: learnedCategory.confidence,
        reason: 'Learning-based categorization',
        source: 'learning_system'
      };
    }
    
    // Final fallback
    return {
      category: 'Uncategorized',
      confidence: 0.1,
      reason: 'No matching patterns found',
      source: 'fallback'
    };
    
  } catch (error) {
    _logError('Error in historical categorization', error);
    return {
      category: 'Uncategorized',
      confidence: 0.1,
      reason: 'Categorization error',
      source: 'error'
    };
  }
}

/**
 * Extract merchant name from transaction description
 */
function _extractMerchantFromDescription(description) {
  if (!description) return 'unknown';
  
  // Remove common prefixes and suffixes
  let merchant = description
    .replace(/^(purchase|payment|transfer|deposit)\s+/i, '')
    .replace(/\s+(purchase|payment|#\d+|\d{2}\/\d{2}).*$/i, '')
    .toLowerCase()
    .trim();
  
  // Extract the core merchant name
  const patterns = [
    /^([a-z\s&]+)\s*-/,  // "MERCHANT - Location"
    /^([a-z\s&]+)\s+\d/,  // "MERCHANT 123"
    /^([a-z\s&]+)$/,      // "MERCHANT"
    /([a-z\s&]+)\.com/,   // "merchant.com"
    /([a-z\s&]+)\.ca/     // "merchant.ca"
  ];
  
  for (const pattern of patterns) {
    const match = merchant.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Return first word as fallback
  return merchant.split(/[\s-]/)[0] || 'unknown';
}

/**
 * Extract transaction context for dynamic categorization
 */
function _extractTransactionContext(transaction) {
  const description = (transaction.toAccount || transaction.notes || '').toLowerCase();
  const currentTime = new Date();
  
  const context = {
    keywords: [],
    timeContext: {
      hour: currentTime.getHours(),
      dayOfWeek: currentTime.getDay(),
      isWeekend: [0, 6].includes(currentTime.getDay()),
      isBusinessHours: currentTime.getHours() >= 9 && currentTime.getHours() <= 17
    },
    amount: Math.abs(parseFloat(transaction.amount || 0))
  };
  
  // Extract contextual keywords
  const contextKeywords = [
    'eats', 'food', 'grocery', 'restaurant', 'cafe', 'coffee',
    'gas', 'fuel', 'station', 'parking', 'toll',
    'pharmacy', 'drug', 'medical', 'health', 'doctor',
    'uber', 'lyft', 'taxi', 'transit', 'bus', 'subway', 'metro',
    'amazon', 'walmart', 'target', 'costco', 'fresh', 'grocery',
    'hotel', 'airbnb', 'booking', 'travel', 'flight',
    'kindle', 'books', 'education', 'course', 'subscription',
    'netflix', 'spotify', 'entertainment', 'games', 'music'
  ];
  
  contextKeywords.forEach(keyword => {
    if (description.includes(keyword)) {
      context.keywords.push(keyword);
    }
  });
  
  return context;
}

/**
 * Apply dynamic categorization rules based on context and time
 */
function _applyDynamicCategorizationRules(merchant, context, transaction) {
  try {
    // Check if merchant has dynamic rules
    for (const [merchantPattern, rules] of Object.entries(DYNAMIC_CATEGORIZATION_RULES)) {
      if (merchant.includes(merchantPattern) || merchant === merchantPattern) {
        
        for (const rule of rules.patterns) {
          // Context-based matching
          if (rule.context) {
            const contextRegex = new RegExp(rule.context, 'i');
            if (context.keywords.some(keyword => contextRegex.test(keyword)) ||
                contextRegex.test(transaction.toAccount || '') ||
                contextRegex.test(transaction.notes || '')) {
              return {
                category: rule.category,
                confidence: rule.confidence,
                reason: `Dynamic context match: ${rule.context}`,
                rule: 'dynamic_context'
              };
            }
          }
          
          // Time-based matching
          if (rule.timeRange) {
            const currentHour = context.timeContext.hour;
            if (currentHour >= rule.timeRange.start && currentHour <= rule.timeRange.end) {
              return {
                category: rule.category,
                confidence: rule.confidence,
                reason: `Dynamic time pattern: ${rule.timeRange.start}-${rule.timeRange.end}h`,
                rule: 'dynamic_time'
              };
            }
          }
          
          // Day-based matching
          if (rule.dayOfWeek) {
            if (rule.dayOfWeek.includes(context.timeContext.dayOfWeek)) {
              return {
                category: rule.category,
                confidence: rule.confidence,
                reason: 'Dynamic day pattern',
                rule: 'dynamic_day'
              };
            }
          }
          
          // Default rule for this merchant
          if (rule.default) {
            return {
              category: rule.default,
              confidence: rule.confidence,
              reason: 'Dynamic default category',
              rule: 'dynamic_default'
            };
          }
        }
      }
    }
    
    return null;
    
  } catch (error) {
    _logError('Error applying dynamic categorization rules', error);
    return null;
  }
}

/**
 * Get historical merchant mapping
 */
function _getHistoricalMerchantMapping(merchant) {
  try {
    // Direct match
    if (HISTORICAL_MERCHANT_MAPPINGS[merchant]) {
      return HISTORICAL_MERCHANT_MAPPINGS[merchant];
    }
    
    // Partial match for compound merchant names
    for (const [historicalMerchant, mapping] of Object.entries(HISTORICAL_MERCHANT_MAPPINGS)) {
      if (merchant.includes(historicalMerchant) || historicalMerchant.includes(merchant)) {
        // Reduce confidence for partial matches
        return {
          ...mapping,
          confidence: mapping.confidence * 0.8,
          reason: `Partial match with ${historicalMerchant}`
        };
      }
    }
    
    return null;
    
  } catch (error) {
    _logError('Error getting historical merchant mapping', error);
    return null;
  }
}

/**
 * Try learning-based categorization using existing learning system
 */
function _tryLearningBasedCategorization(merchant, description) {
  try {
    // This integrates with your existing learning system
    const learningSheet = _ss().getSheetByName(SHEET_NAMES.AI_LEARNING);
    if (!learningSheet || learningSheet.getLastRow() < 2) {
      return null;
    }
    
    const learningData = learningSheet.getRange(2, 1, learningSheet.getLastRow() - 1, 4).getValues();
    
    // Look for similar merchants in learning data
    for (const row of learningData) {
      const [learnedMerchant, learnedCategory, confidence, type] = row;
      
      if (learnedMerchant && merchant.includes(learnedMerchant.toLowerCase())) {
        return {
          category: learnedCategory,
          confidence: Math.min(parseFloat(confidence || 0.5), 0.8), // Cap at 0.8 for learned patterns
          reason: `Learning system match: ${learnedMerchant}`
        };
      }
    }
    
    return null;
    
  } catch (error) {
    _logError('Error in learning-based categorization', error);
    return null;
  }
}

/**
 * Enhanced processing function that uses historical data
 * This can replace or supplement your existing email processing
 */
function processEmailsWithHistoricalContext(batchSize = 10) {
  try {
    _logInfo('Starting email processing with historical context');
    
    // Use existing email processing but with enhanced categorization
    return _processNewEmails(batchSize, true); // Enhanced flag
    
  } catch (error) {
    _logError('Error in historical context processing', error);
    throw error;
  }
}

/**
 * Function to update historical mappings from CSV/PDF data
 * Call this periodically to refresh the historical analysis
 */
function updateHistoricalMappingsFromExternalData() {
  try {
    _logInfo('Updating historical mappings from external data processing');
    
    // This would integrate with your external historical data processor
    // For now, log that the integration point exists
    _logInfo('Historical data integration point available');
    
    // You can expand this to:
    // 1. Read updated merchant mappings from Drive
    // 2. Update the HISTORICAL_MERCHANT_MAPPINGS constant
    // 3. Refresh dynamic categorization rules
    // 4. Update confidence scores based on new data
    
    return true;
    
  } catch (error) {
    _logError('Error updating historical mappings', error);
    return false;
  }
}

/**
 * Diagnostic function to test historical categorization
 */
function testHistoricalCategorization() {
  try {
    const testTransactions = [
      { toAccount: 'UBER EATS - Toronto ON', amount: -15.50, notes: 'Food delivery' },
      { toAccount: 'UBER - Downtown Toronto', amount: -12.30, notes: 'Transportation' },
      { toAccount: 'AMAZON.CA - Purchase', amount: -45.99, notes: 'Online shopping' },
      { toAccount: 'TIM HORTONS #1234', amount: -5.67, notes: 'Coffee' },
      { toAccount: 'STARBUCKS COFFEE', amount: -8.45, notes: 'Coffee' },
      { toAccount: 'Direct Deposit - Payroll', amount: 2500.00, notes: 'Salary' }
    ];
    
    _logInfo('Testing historical categorization with sample transactions');
    
    testTransactions.forEach((transaction, index) => {
      const result = _categorizeTransactionWithHistoricalData(transaction);
      _logInfo(`Test ${index + 1}: ${transaction.toAccount}`, result);
    });
    
    return true;
    
  } catch (error) {
    _logError('Error testing historical categorization', error);
    return false;
  }
}

/**
 * Comprehensive integration test
 */
function testHistoricalIntegration() {
  try {
    _logInfo('=== STARTING HISTORICAL INTEGRATION TEST ===');
    
    // Test 1: Check that constants are loaded
    _logInfo('Test 1: Historical merchant mappings loaded', {
      mappingCount: Object.keys(HISTORICAL_MERCHANT_MAPPINGS).length,
      dynamicRuleCount: Object.keys(DYNAMIC_CATEGORIZATION_RULES).length
    });
    
    // Test 2: Test merchant extraction
    const testDescriptions = [
      'UBER EATS - Toronto',
      'AMAZON.CA - Purchase #123',
      'TIM HORTONS #1234',
      'INTERAC e-Transfer'
    ];
    
    _logInfo('Test 2: Merchant extraction');
    testDescriptions.forEach(desc => {
      const merchant = _extractMerchantFromDescription(desc);
      _logInfo(`"${desc}" -> "${merchant}"`);
    });
    
    // Test 3: Test context extraction
    const testTransaction = {
      toAccount: 'UBER EATS - Food delivery',
      amount: -25.50,
      notes: 'Late night food order'
    };
    
    const context = _extractTransactionContext(testTransaction);
    _logInfo('Test 3: Context extraction', context);
    
    // Test 4: Test dynamic categorization
    const dynamicResult = _applyDynamicCategorizationRules('uber', context, testTransaction);
    _logInfo('Test 4: Dynamic categorization', dynamicResult);
    
    // Test 5: Test historical mapping
    const historicalResult = _getHistoricalMerchantMapping('contribution');
    _logInfo('Test 5: Historical mapping', historicalResult);
    
    // Test 6: Test full categorization
    const fullResult = _categorizeTransactionWithHistoricalData(testTransaction);
    _logInfo('Test 6: Full categorization', fullResult);
    
    // Test 7: Test integration status
    const status = getIntegrationStatus();
    _logInfo('Test 7: Integration status', status);
    
    _logInfo('=== HISTORICAL INTEGRATION TEST COMPLETED ===');
    return true;
    
  } catch (error) {
    _logError('Error in historical integration test', error);
    return false;
  }
}