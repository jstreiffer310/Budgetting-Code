/**
 * FINANCE AUTOMATION V10.0 - ULTIMATE COMPOSITE SOLUTION
 * ======================================================
 * 
 * This version combines the robust V8 framework with V9's investment tracking
 * improvements and enhanced categorization/dashboard functionality.
 * 
 * INTEGRATED FEATURES:
 * - V8's comprehensive email parsing and transaction processing engine
 * - V9's advanced investment holdings management (stocks, crypto, SHIB precision)
 * - Enhanced merchant-based categorization (avoiding generic keywords)
 * - Improved dashboard with better expense analysis
 * - Robust error handling and recovery mechanisms
 * - Complete staging and pairing system for transfers
 * - Advanced audit logging and diagnostics
 * 
 * IMPROVEMENTS OVER V8/V9:
 * - Merchant-focused categorization (not generic banking terms)
 * - Enhanced SHIB and crypto price fetching precision
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
  NETWORTH: 'NetWorthHistory',
  DASHBOARD: 'Dashboard',
  CSV_IMPORT: 'CSV_Import',
  AUDIT_LOG: 'AuditLog'
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
  CRYPTO_API_RATE_LIMIT: 300,
  YAHOO_FINANCE_RATE_LIMIT: 200
};

// Account definitions (from live analysis)
const MY_ACCOUNTS = [
  'PC Financial',
  'CIBC Aventura', 
  'CIBC Dividend',
  'Wealthsimple RRSP',
  'Wealthsimple Crypto',
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
  'crypto': 'Wealthsimple Crypto',
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

// Cryptocurrency mappings (including your SHIB holdings)
const CRYPTO_MAPPINGS = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum', 
  'DOT': 'polkadot',
  'SOL': 'solana',
  'SHIB': 'shiba-inu',
  'SHIB-USD': 'shiba-inu',
  'ADA': 'cardano',
  'MATIC': 'matic-network',
  'DOGE': 'dogecoin'
};

// Canadian stock exchanges for proper price fetching
const CANADIAN_TICKERS = new Set([
  'VCE.TO', 'XEQT.TO', 'TDB902', 'TDB900', 'VEQT.TO', 'VGRO.TO'
]);

// CSV Import profiles
const CSV_PROFILES = [
  {
    name: 'CIBC Aventura Card',
    identifyingKeyword: '4500********6271',
    accountName: 'CIBC Aventura',
    columnMap: { date: 1, description: 2, debit: 3, credit: 4 }
  },
  {
    name: 'CIBC Dividend Card',
    identifyingKeyword: '4505********2866',
    accountName: 'CIBC Dividend',
    columnMap: { date: 1, description: 2, debit: 3, credit: 4 }
  },
  {
    name: 'PC Financial Cash Account',
    identifyingKeyword: 'Card Holder Name',
    accountName: 'PC Financial',
    columnMap: { date: 4, description: 1, amount: 6 }
  }
];

// IMPROVED: Merchant-focused stopwords (avoiding generic banking terms)
const CATEGORY_STOPWORDS = new Set([
  // Generic banking/system terms (should be excluded from categorization)
  'financial', 'cibc', 'amount', 'auto', 'logged', 'money', 'deposit', 'card', 
  'cash', 'credit', 'purchase', 'trade', 'unknown', 'sender', 'interac', 
  'transfer', 'received', 'been', 'automatically', 'deposited', 'bank', 
  'payment', 'etransfer', 'transaction', 'statement', 'balance', 'online', 
  'account', 'fee', 'service', 'interest', 'dividend', 'confirmation', 
  'receipt', 'monthly', 'annual', 'quarterly', 'processed', 'paid', 'paym', 
  'withdrawal', 'debit', 'aventura', 'wealthsimple', 'streiffer',
  
  // Generic corporate terms
  'inc', 'ltd', 'corp', 'limited', 'llc', 'co', 'company', 'group', 'enterprises',
  
  // Common English words
  'from', 'with', 'your', 'for', 'and', 'the', 'has', 'was', 'you', 'have', 'this',
  'that', 'are', 'had', 'not', 'been', 'were', 'they', 'but', 'also', 'their',
  'will', 'would', 'should', 'could', 'when', 'where', 'what', 'which', 'who', 'whom'
]);

// ENHANCED: Merchant pattern recognition for better categorization
const MERCHANT_PATTERNS = {
  'grocery': /sobeys|loblaws|metro|walmart|costco|food basics|no frills|superstore/i,
  'gas': /shell|esso|petro|husky|canadian tire gas|circle k|7-eleven/i,
  'restaurant': /mcdonalds|tim hortons|subway|pizza|restaurant|cafe|bistro|grill|diner/i,
  'shopping': /amazon|ebay|walmart|target|best buy|canadian tire|home depot|lowe/i,
  'pharmacy': /shoppers drug mart|rexall|pharmacy|cvs|walgreens/i,
  'entertainment': /cineplex|netflix|spotify|disney|apple music|xbox|playstation/i,
  'transport': /uber|lyft|taxi|ttc|go transit|via rail|air canada|westjet/i,
  'utilities': /hydro|gas|water|electricity|bell|rogers|telus|internet|phone/i
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
      [SHEET_NAMES.NET_WORTH]: [
        'Date', 'Total Assets', 'Total Liabilities', 'Net Worth', 'Notes'
      ],
      [SHEET_NAMES.CSV_IMPORT]: [
        'Import Date', 'Source File', 'Records Imported', 'Status', 'Notes'
      ],
      [SHEET_NAMES.AUDIT_LOG]: [
        'Timestamp', 'Level', 'Message', 'Details', 'Function'
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

function _ensureSheetsAndHeaders() {
  const ss = _ss();
  
  function ensureSheet(name, headers) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      _logInfo(`Created sheet: ${name}`);
    }
    
    if (headers && headers.length > 0 && sheet.getLastRow() === 0) {
      const safeHeaders = headers.map(h => String(h || 'Column').trim());
      if (safeHeaders.every(h => h.length > 0)) {
        sheet.appendRow(safeHeaders);
        sheet.getRange(1, 1, 1, safeHeaders.length).setFontWeight('bold').setBackground('#f0f0f0');
        _logInfo(`Added headers to sheet: ${name}`);
      }
    }
    
    return sheet;
  }
  
  try {
    ensureSheet(SHEET_NAMES.MAIN, ['Date', 'Amount', 'From', 'To', 'Bank', 'Notes', 'EmailId', 'Category', 'Type', 'Fingerprint']);
    ensureSheet(SHEET_NAMES.ACCOUNTS, ['Account', 'Balance', 'Last Updated', 'Type']);
    ensureSheet(SHEET_NAMES.HOLDINGS, ['Account', 'Ticker', 'Shares', 'Unit Price (CAD)', 'Total Value (CAD)', 'Last Updated']);
    ensureSheet(SHEET_NAMES.STAGING, ['Date', 'Amount', 'From', 'To', 'Bank', 'EmailId', 'StagedAt', 'Direction', 'Status', 'Fingerprint']);
    ensureSheet(SHEET_NAMES.CATEGORIES, ['Keyword', 'Category']);
    ensureSheet(SHEET_NAMES.NETWORTH, ['Date', 'Net Worth']);
    ensureSheet(SHEET_NAMES.DASHBOARD, []);
    ensureSheet(SHEET_NAMES.CSV_IMPORT, []);
    ensureSheet(SHEET_NAMES.AUDIT_LOG, ['Timestamp', 'Level', 'Message', 'Context', 'User']);
    
    _logInfo('All sheets ensured successfully');
    
  } catch (error) {
    _logError('Failed to ensure sheets and headers', error);
    throw error;
  }
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

// ===================== EMAIL PARSING FRAMEWORK =====================

// IMPROVED: CIBC Email Parser
function _parseCibcEmail(message, subject, body, accountsSheet) {
  const subjectLower = _lc(subject);
  const bodyLower = _lc(body);
  
  // PAYMENT detection - Credit to card account
  const paymentKeywords = ['payment', 'payment received', 'new payment to your credit card', 'payment has been applied', 'credit card payment', 'payment processed'];
  
  if (paymentKeywords.some(keyword => subjectLower.includes(keyword))) {
    const amount = _extractAmount(body) || _extractAmount(subject);
    if (!amount) return null;
    
    let targetAccount = 'CIBC Aventura'; // Default
    if (/aventura/i.test(subject + body)) {
      targetAccount = 'CIBC Aventura';
    } else if (/dividend/i.test(subject + body)) {
      targetAccount = 'CIBC Dividend';
    } else if (accountsSheet) {
      targetAccount = _chooseMostNegativeCibcCard(accountsSheet) || 'CIBC Aventura';
    }
    
    return {
      date: message.getDate(), amount: amount, direction: 'IN', fromAccount: 'External Payment',
      toAccount: targetAccount, bank: 'CIBC Card Payment', emailId: message.getId(),
      type: 'Card Payment', notes: `Payment to ${targetAccount}`
    };
  }
  
  // PURCHASE detection - Debit from card account
  const purchaseKeywords = ['purchase', 'charge', 'authorization', 'transaction'];
  
  if (purchaseKeywords.some(keyword => subjectLower.includes(keyword)) || /purchase of|your card.*was charged|card ending in/i.test(bodyLower)) {
    const amount = _extractAmount(body) || _extractAmount(subject);
    if (!amount) return null;
    
    let cardAccount = 'CIBC Aventura'; // Default
    if (/aventura/i.test(subject + body)) {
      cardAccount = 'CIBC Aventura';
    } else if (/dividend/i.test(subject + body)) {
      cardAccount = 'CIBC Dividend';
    }
    
    const merchant = _extractText(body, /at\s+([A-Z0-9 \._\-&']+)\s+was/i) ||
                     _extractText(body, /merchant[:\s]*([^\n\r]+)/i) ||
                     _extractText(body, /for\s+\$[\d,]+\.[\d]{2}\s+at\s+([^.]+)\./i) ||
                     'Merchant';
    
    return {
      date: message.getDate(), amount: -Math.abs(amount), direction: 'OUT', fromAccount: cardAccount,
      toAccount: merchant, bank: `${cardAccount} Purchase`, emailId: message.getId(),
      type: 'Card Purchase', notes: `Purchase at ${merchant}`
    };
  }
  
  return null;
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

// IMPROVED: PC Financial Email Parser with better recipient handling
function _parsePcFinancialEmail(message, subject, body) {
  const subjectLower = _lc(subject);
  const bodyLower = _lc(body);
  
  // Purchase notice
  if (subjectLower.includes('purchase notice') || /purchase amount/i.test(bodyLower)) {
    const amount = _extractAmount(body, /purchase amount[:\s]*\$([0-9,]+\.[0-9]{2})/i) || _extractAmount(body);
    if (!amount) return null;
    
    const merchant = _extractText(body, /merchant[:\s]*([^\n\r]+)/i) ||
                     _extractText(body, /at\s+([A-Z0-9 \._\-&']+)/i) ||
                     'Merchant';
    
    // Check if this is a Wealthsimple deposit (should be staged)
    if (/wealthsimple/i.test(merchant)) {
      return {
        date: message.getDate(), amount: -Math.abs(amount), direction: 'OUT', fromAccount: 'PC Financial',
        toAccount: 'Pending Wealthsimple', bank: 'PC Financial Purchase', emailId: message.getId(),
        type: 'Transfer', shouldStage: true, notes: `Wealthsimple deposit - awaiting confirmation`
      };
    }
    
    return {
      date: message.getDate(), amount: -Math.abs(amount), direction: 'OUT', fromAccount: 'PC Financial',
      toAccount: merchant, bank: 'PC Financial Purchase', emailId: message.getId(),
      type: 'Purchase', notes: `Purchase at ${merchant}`
    };
  }
  
  // E-transfer sent - IMPROVED recipient detection
  if (subjectLower.includes('transfer to') || /e-transfer/i.test(bodyLower)) {
    const amount = _extractAmount(subject) || _extractAmount(body);
    if (!amount) return null;
    
    const recipient = _extractText(subject, /transfer to\s+(.+?)\s+has been/i) ||
                     _extractText(body, /transfer to\s+(.+?)\s+has been/i) ||
                     _extractText(body, /recipient[:\s]*([^\n\r]+)/i) ||
                     _extractText(body, /sent to[:\s]*([^\n\r]+)/i);
    
    if (!recipient) {
      return {
        date: message.getDate(), amount: -Math.abs(amount), direction: 'OUT', fromAccount: 'PC Financial',
        toAccount: 'Pending - Unknown Recipient', bank: 'PC Financial e-Transfer', emailId: message.getId(),
        type: 'External Transfer', shouldStage: true, notes: 'Unable to determine recipient - requires manual review'
      };
    }
    
    const normalizedRecipient = _normalizeAccountName(recipient);
    const isInternal = _isInternalAccount(normalizedRecipient);
    
    return {
      date: message.getDate(), amount: -Math.abs(amount), direction: 'OUT', fromAccount: 'PC Financial',
      toAccount: isInternal ? normalizedRecipient : `External to ${recipient}`, bank: 'PC Financial e-Transfer',
      emailId: message.getId(), type: isInternal ? 'Internal Transfer' : 'External Transfer',
      shouldStage: isInternal, notes: isInternal ? `Internal transfer to ${normalizedRecipient}` : `External transfer to ${recipient}`
    };
  }
  
  return null;
}

// IMPROVED: Interac Email Parser with better sender extraction
function _parseInteracEmail(message, subject, body) {
  const amount = _extractAmount(body, /sent you \$([0-9,]+\.[0-9]{2})/i) ||
                 _extractAmount(body, /amount[:\s]*\$([0-9,]+\.[0-9]{2})/i) ||
                 _extractAmount(subject, /\$([0-9,]+\.[0-9]{2})/i);
  
  if (!amount) return null;
  
  const sender = _extractText(body, /([A-Za-z0-9 .'-]+) sent you \$/i) || 
                _extractText(body, /From[:\s]*([A-Za-z0-9 .'-]+)/i) ||
                _extractText(subject, /from ([A-Za-z0-9 .'-]+)/i) ||
                'Unknown Sender';
  
  return {
    date: message.getDate(), amount: amount, direction: 'IN', fromAccount: `e-Transfer from ${sender}`,
    toAccount: 'PC Financial', bank: 'Interac Deposit', emailId: message.getId(),
    type: 'Interac', notes: `Received from ${sender}`
  };
}

// ENHANCED: Wealthsimple Email Parser with holdings integration
function _parseWealthsimpleEmail(message, subject, body) {
  const subjectLower = _lc(subject);
  const bodyLower = _lc(body);
  
  // 1. DEPOSIT/CONTRIBUTION CONFIRMATION
  if (subjectLower.includes('deposit') || /added money|deposit.*confirmed|contribution/i.test(bodyLower)) {
    const amount = _extractAmount(body, /amount[:\s]*\$([0-9,]+\.[0-9]{2})/i) || _extractAmount(subject) || _extractAmount(body);
                   
    if (!amount) return null;
    
    const accountInfo = _extractText(body, /to[:\s]*([\s\S]*?)\s*sometimes/i) || 
                        _extractText(body, /your\s+([A-Za-z]+)\s+account/i) ||
                        _extractText(body, /account type[:\s]*([^\n\r]+)/i) ||
                        '';
    
    let targetAccount = 'Wealthsimple Cash'; // Default
    if (/rrsp/i.test(accountInfo)) {
      targetAccount = 'Wealthsimple RRSP';
    } else if (/crypto/i.test(accountInfo)) {
      targetAccount = 'Wealthsimple Crypto';
    } else if (/tfsa/i.test(accountInfo)) {
      targetAccount = 'Wealthsimple TFSA';
    }
    
    // Parse any holdings data included in contribution emails
    const holdingsData = _parseWealthsimpleHoldingsFromEmail(body);
    
    const transaction = {
      date: message.getDate(), amount: amount, direction: 'IN', fromAccount: 'PC Financial',
      toAccount: targetAccount, bank: 'Wealthsimple Deposit', emailId: message.getId(),
      type: 'Investment Contribution', shouldPair: true, notes: `Contribution to ${targetAccount}`
    };
    
    if (holdingsData.length > 0) {
      transaction.holdings = holdingsData;
    }
    
    return transaction;
  }
  
  // 2. TRADE EXECUTION
  if (subjectLower.includes('order has been filled') || /shares of|purchased|bought/i.test(bodyLower)) {
    const tradeMatch = body.match(/(\d+[\d.,]*)\s+shares\s+of\s+([A-Z\.\-]+)[\s\S]+?total cost[:\s]*\$([0-9,]+\.[0-9]+)/i);
    
    if (!tradeMatch) return null;
    
    const shares = parseFloat(tradeMatch[1].replace(/,/g, ''));
    const ticker = tradeMatch[2].trim();
    const cost = parseFloat(tradeMatch[3].replace(/,/g, ''));
    
    const accountInfo = _extractText(body, /account[:\s]*([\s\S]*?)\s*time:/i) || 
                        _extractText(body, /your\s+([A-Za-z]+)\s+account/i) ||
                        '';
    
    let targetAccount = 'Wealthsimple Cash'; // Default
    if (/rrsp/i.test(accountInfo)) {
      targetAccount = 'Wealthsimple RRSP';
    } else if (/crypto/i.test(accountInfo)) {
      targetAccount = 'Wealthsimple Crypto';
    } else if (/tfsa/i.test(accountInfo)) {
      targetAccount = 'Wealthsimple TFSA';
    }
    
    // Update holdings immediately
    setTimeout(() => _updateHoldingsFromTrade(targetAccount, ticker, shares, cost), 1000);
    
    return {
      date: message.getDate(), amount: -cost, direction: 'TRADE', fromAccount: targetAccount,
      toAccount: targetAccount, bank: 'Wealthsimple Trade', emailId: message.getId(),
      type: 'Investment Purchase', notes: `Bought ${shares} shares of ${ticker}`, 
      tradeInfo: { ticker, shares, cost }
    };
  }
  
  // 3. PORTFOLIO SUMMARY/STATEMENT EMAILS
  if (subjectLower.includes('portfolio') || subjectLower.includes('statement') || subjectLower.includes('summary')) {
    const holdingsData = _parseWealthsimpleHoldingsFromEmail(body);
    
    if (holdingsData.length > 0) {
      // Process holdings update
      setTimeout(() => _updateAllHoldingsFromEmail(holdingsData), 1000);
      
      return {
        date: message.getDate(), amount: 0, direction: 'INFO', fromAccount: 'Wealthsimple',
        toAccount: 'Portfolio Update', bank: 'Wealthsimple Portfolio', emailId: message.getId(),
        type: 'Portfolio Update', notes: `Portfolio summary with ${holdingsData.length} holdings`,
        holdings: holdingsData
      };
    }
  }
  
  // 4. DIVIDEND/DISTRIBUTION
  if (subjectLower.includes('dividend') || subjectLower.includes('distribution')) {
    const dividendMatch = body.match(/(?:dividend|distribution).*?\$([0-9,]+\.[0-9]+)/i);
    if (dividendMatch) {
      const amount = parseFloat(dividendMatch[1].replace(/,/g, ''));
      
      return {
        date: message.getDate(), amount: amount, direction: 'IN', fromAccount: 'Investment Dividends',
        toAccount: 'Wealthsimple Cash', bank: 'Wealthsimple Dividend', emailId: message.getId(),
        type: 'Dividend/Distribution', notes: `Dividend/distribution payment`
      };
    }
  }
  
  return null;
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
    
    // Pattern 2: Crypto holdings (for high precision coins like SHIB)
    const cryptoPattern = /(BTC|ETH|DOT|SOL|SHIB)\s*[:,]?\s*([0-9,]+\.?\d*)\s*(?:coins?|shares?)\s*@?\s*\$?([0-9,]+\.?\d+)/gi;
    let cryptoMatch;
    while ((cryptoMatch = cryptoPattern.exec(emailBody)) !== null) {
      const symbol = cryptoMatch[1].toUpperCase();
      const shares = parseFloat(cryptoMatch[2].replace(/,/g, ''));
      const price = parseFloat(cryptoMatch[3].replace(/,/g, ''));
      
      holdings.push({
        ticker: symbol + '-USD',
        shares: shares,
        price: price,
        value: shares * price,
        account: 'Wealthsimple'
      });
    }
    
    // Pattern 3: Individual line format "TICKER: X.XX shares at $Y.YY"
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
    
    // Find existing holding row
    const existingRow = _findHoldingRow(holdingsSheet, ticker);
    
    if (existingRow > 0) {
      // Update existing holding
      const currentShares = parseFloat(holdingsSheet.getRange(existingRow, 2).getValue() || 0);
      const newShares = currentShares + shares;
      
      // Update shares
      holdingsSheet.getRange(existingRow, 2).setValue(newShares);
      
      // Update cost basis (weighted average)
      const currentCostBasis = parseFloat(holdingsSheet.getRange(existingRow, 3).getValue() || 0);
      const totalCurrentValue = currentCostBasis * currentShares;
      const newCostBasis = (totalCurrentValue + cost) / newShares;
      holdingsSheet.getRange(existingRow, 3).setValue(newCostBasis);
      
      // Update last updated
      holdingsSheet.getRange(existingRow, 7).setValue(new Date());
      
      _logInfo(`Updated ${ticker}: ${currentShares} + ${shares} = ${newShares} shares, new cost basis: ${newCostBasis.toFixed(4)}`);
      
    } else {
      // Add new holding
      const newRow = [
        ticker,                    // Column A: Ticker
        shares,                    // Column B: Shares
        cost / shares,             // Column C: Cost Basis (price per share)
        '',                        // Column D: Current Price (to be fetched)
        '',                        // Column E: Current Value (to be calculated)
        account,                   // Column F: Account
        new Date()                 // Column G: Last Updated
      ];
      
      holdingsSheet.appendRow(newRow);
      _logInfo(`Added new holding: ${ticker} - ${shares} shares at ${(cost/shares).toFixed(4)} per share`);
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
      
      // Apply special formatting for SHIB
      if (holding.ticker.includes('SHIB')) {
        const currentRow = existingRow > 0 ? existingRow : holdingsSheet.getLastRow();
        holdingsSheet.getRange(currentRow, 2).setNumberFormat('0.000000'); // Shares
        holdingsSheet.getRange(currentRow, 4).setNumberFormat('0.00000000'); // Price
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
      
      // Apply special formatting for SHIB
      if (ticker.includes('SHIB') && price < 0.01) {
        holdingsSheet.getRange(existingRow, 4).setNumberFormat('0.00000000');
      }
      
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

function _processNewEmails() {
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
    
    _logInfo(`Processing ${threads.length} email threads`);
    
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
          
          let transaction = null;
          
          // Parse based on sender
          if (from.includes('cibc')) {
            transaction = _parseCibcEmail(message, subject, body, accountsSheet);
          } else if (from.includes('pcfinancial')) {
            transaction = _parsePcFinancialEmail(message, subject, body);
          } else if (from.includes('payments.interac')) {
            transaction = _parseInteracEmail(message, subject, body);
          } else if (from.includes('wealthsimple')) {
            transaction = _parseWealthsimpleEmail(message, subject, body);
          }
          
          if (!transaction) return;
          
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
    
  } catch (error) {
    _logError('Failed to process new emails', error);
    throw error;
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

function _commitTransaction(transaction, mainSheet, accountsSheet) {
  try {
    // Check for duplicates
    if (_isDuplicateTransaction(transaction, mainSheet)) {
      _logWarning(`Skipping duplicate transaction: ${transaction.emailId}`);
      return;
    }
    
    const amount = transaction.amount || 0;
    const row = [
      transaction.date || new Date(), amount, transaction.fromAccount || '', transaction.toAccount || '',
      transaction.bank || '', transaction.notes || '', transaction.emailId || `AUTO-${Date.now()}`,
      transaction.category || '', transaction.type || '', transaction.fingerprint || _generateFingerprint(transaction)
    ];
    
    mainSheet.appendRow(row);
    _updateAccountBalances(transaction, accountsSheet);
    
    _logInfo(`Committed transaction: ${transaction.emailId}`, {
      amount: transaction.amount, from: transaction.fromAccount, to: transaction.toAccount, type: transaction.type
    });
    
  } catch (error) {
    _logError('Failed to commit transaction', error, { transaction });
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

// ===================== PRICE FETCHING (Enhanced for Canadian stocks & SHIB) =====================

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

// ENHANCED: High-precision cryptocurrency price fetching (especially for SHIB)
function _fetchCryptoPriceWithPrecision(ticker) {
  try {
    const tickerUpper = ticker.toUpperCase();
    let cryptoId = CRYPTO_MAPPINGS[tickerUpper.replace('-USD', '')] || CRYPTO_MAPPINGS[tickerUpper];
    
    if (!cryptoId) return 0;
    
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=cad&precision=18`;
    const response = UrlFetchApp.fetch(url, { 
      muteHttpExceptions: true,
      headers: { 'Accept': 'application/json' } 
    });
    
    if (response.getResponseCode() !== 200) {
      return 0;
    }
    
    const data = JSON.parse(response.getContentText());
    
    if (data && data[cryptoId] && data[cryptoId].cad) {
      return parseFloat(data[cryptoId].cad);
    }
    
    return 0;
  } catch (error) {
    _logError(`Failed to fetch crypto price for ${ticker}`, error);
    return 0;
  }
}

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
    
    // Check if it's a cryptocurrency
    for (const cryptoTicker of Object.keys(CRYPTO_MAPPINGS)) {
      if (tickerUpper.includes(cryptoTicker)) {
        return _fetchCryptoPriceWithPrecision(ticker);
      }
    }
    
    // For stocks and ETFs (including Canadian)
    return _fetchYahooFinancePrice(ticker);
    
  } catch (error) {
    _logError(`Failed to fetch price from API for ${ticker}`, error);
    return 0;
  }
}

function _isSupportedTicker(ticker) {
  if (!ticker) return false;
  
  const tickerUpper = ticker.toUpperCase();
  
  // Check if it's a cryptocurrency
  if (Object.keys(CRYPTO_MAPPINGS).some(key => tickerUpper.includes(key))) {
    return true;
  }
  
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
    
    const data = holdingsSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    let updatedCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      // Use hardcoded indices based on standard holdings sheet structure
      const ticker = data[i][0]; // Column A: Ticker
      const shares = parseFloat(data[i][1] || 0); // Column B: Shares
      
      if (!ticker || shares <= 0) continue;
      
      // Try to get price from API
      let price = _fetchPriceFromAPI(ticker);
      
      // Fallback to Google Finance formula if API fails
      if (!price || price <= 0) {
        const formula = _buildGoogleFinanceFormula(ticker);
        if (formula) {
          holdingsSheet.getRange(i + 2, 3).setFormula(formula); // Column C: Price
          _logInfo(`Set Google Finance formula for ${ticker}: ${formula}`);
          continue;
        }
      }
      
      if (price > 0) {
        const currentValue = shares * price;
        
        holdingsSheet.getRange(i + 2, 3).setValue(price); // Column C: Price
        holdingsSheet.getRange(i + 2, 4).setValue(currentValue); // Column D: Current Value
        holdingsSheet.getRange(i + 2, 6).setValue(new Date()); // Column F: Last Updated
        
        updatedCount++;
        
        // Special formatting for high-precision crypto prices (SHIB)
        if (ticker.toUpperCase().includes('SHIB') && price < 0.01) {
          const cell = holdingsSheet.getRange(i + 2, 3);
          cell.setNumberFormat('0.000000');
        }
        
        _logInfo(`Updated ${ticker}: ${shares} shares @ $${price.toFixed(6)} = $${currentValue.toFixed(2)}`);
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
    const data = holdingsSheet.getRange(2, 1, Math.max(1, holdingsSheet.getLastRow() - 1), 1).getValues();
    
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
    
    // First check for specific merchant patterns (avoiding generic banking terms)
    for (const [category, patterns] of Object.entries(MERCHANT_PATTERNS)) {
      for (const pattern of patterns) {
        if (searchText.includes(_lc(pattern))) {
          // Additional validation to avoid generic banking terms
          if (!_containsGenericBankingTerms(pattern)) {
            _logInfo(`Categorized as ${category} (merchant: ${pattern})`);
            return category;
          }
        }
      }
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

function _containsGenericBankingTerms(text) {
  const genericTerms = ['card', 'aventura', 'account', 'banking', 'transaction', 'payment', 'deposit'];
  const lowerText = _lc(text);
  
  return genericTerms.some(term => lowerText === term || 
    (lowerText.length <= 8 && lowerText.includes(term)));
}

function _learnCategoryFromHistory(transaction, categoriesSheet) {
  try {
    if (!categoriesSheet || !transaction.toAccount) return null;
    
    const merchant = _extractMerchantName(transaction.toAccount);
    if (!merchant || merchant.length < 3) return null;
    
    // Check if we have this merchant in our learning database
    const data = categoriesSheet.getRange(2, 1, Math.max(1, categoriesSheet.getLastRow() - 1), 3).getValues();
    
    for (const row of data) {
      const storedMerchant = _lc(row[0] || '');
      const category = row[1] || '';
      const confidence = parseFloat(row[2] || 0);
      
      if (storedMerchant === _lc(merchant) && confidence >= 0.8) {
        _logInfo(`Learned category for ${merchant}: ${category} (confidence: ${confidence})`);
        return category;
      }
    }
    
    return null;
  } catch (error) {
    _logError('Failed to learn category from history', error);
    return null;
  }
}

function _extractMerchantName(toAccount) {
  if (!toAccount) return '';
  
  const merchant = toAccount
    .replace(/[0-9]{4,}/g, '') // Remove long numbers
    .replace(/\b(card|aventura|payment|purchase|pos|debit|credit)\b/gi, '') // Remove banking terms
    .replace(/[^a-zA-Z\s]/g, ' ') // Replace non-letters with spaces
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
  
  return merchant.length > 2 ? merchant : '';
}

// ===================== DASHBOARD & ANALYSIS =====================

function _updateDashboard() {
  try {
    const ss = _ss();
    const dashboardSheet = ss.getSheetByName(SHEET_NAMES.DASHBOARD);
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    const accountsSheet = ss.getSheetByName(SHEET_NAMES.ACCOUNTS);
    const holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
    
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
    
    // Update dashboard with calculated values
    _writeDashboardSummary(dashboardSheet, {
      totalExpenses: expenseBreakdown.total,
      categoryBreakdown: expenseBreakdown.categories,
      accountBalances: accountBalances,
      portfolioValue: portfolioValue,
      lastUpdated: now
    });
    
    _logInfo('Dashboard updated successfully', {
      totalExpenses: expenseBreakdown.total,
      portfolioValue: portfolioValue
    });
    
  } catch (error) {
    _logError('Failed to update dashboard', error);
  }
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
    dashboardSheet.getRange('A1:D20').clearContent();
    
    // Write header
    dashboardSheet.getRange('A1').setValue('Finance Dashboard Summary');
    dashboardSheet.getRange('A2').setValue(`Last Updated: ${summary.lastUpdated.toLocaleString()}`);
    
    // Write expense summary
    dashboardSheet.getRange('A4').setValue('Monthly Expenses');
    dashboardSheet.getRange('B4').setValue(summary.totalExpenses.toFixed(2));
    
    // Write category breakdown
    let row = 6;
    dashboardSheet.getRange('A6').setValue('Category Breakdown:');
    for (const [category, amount] of Object.entries(summary.categoryBreakdown)) {
      row++;
      dashboardSheet.getRange(`A${row}`).setValue(category);
      dashboardSheet.getRange(`B${row}`).setValue(amount.toFixed(2));
    }
    
    // Write account balances
    row += 2;
    dashboardSheet.getRange(`A${row}`).setValue('Account Balances:');
    for (const [account, info] of Object.entries(summary.accountBalances)) {
      row++;
      dashboardSheet.getRange(`A${row}`).setValue(account);
      dashboardSheet.getRange(`B${row}`).setValue(info.balance.toFixed(2));
    }
    
    // Write portfolio value
    row += 2;
    dashboardSheet.getRange(`A${row}`).setValue('Investment Portfolio');
    dashboardSheet.getRange(`B${row}`).setValue(summary.portfolioValue.toFixed(2));
    
  } catch (error) {
    _logError('Failed to write dashboard summary', error);
  }
}

// ===================== MENU SYSTEM & UI =====================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('💰 Finance Automation V10')
    .addItem('🔄 Process New Emails', 'processNewEmails')
    .addSeparator()
    .addItem('🔗 Pair Staged Transfers', 'pairStagedTransfers')
    .addItem('🧹 Cleanup Stale Transactions', 'cleanupStaleTransactions')
    .addSeparator()
    .addItem('📊 Refresh Holdings Prices', 'refreshHoldingsData')
    .addItem('🏦 Initialize Current Holdings', 'initializeHoldingsData')
    .addItem('📈 Update Dashboard', 'updateDashboard')
    .addSeparator()
    .addItem('🔧 Run Full Automation', 'runFullAutomation')
    .addItem('⚡ Quick Setup', 'quickSetup')
    .addSeparator()
    .addItem('🏷️ Learn Categories', 'learnCategories')
    .addItem('� Review Pending Transactions', 'reviewPendingTransactions')
    .addSeparator()
    .addItem('�📋 Show Configuration', 'showConfiguration')
    .addItem('🧪 Test Email Parsing', 'testEmailParsing')
    .addItem('💰 Test SHIB Price', 'testShibPriceFetch')
    .addToUi();
}

// ===================== MAIN ORCHESTRATION FUNCTIONS =====================

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
      const headers = ['Ticker', 'Shares', 'Cost Basis', 'Current Price', 'Current Value', 'Account', 'Last Updated'];
      holdingsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      holdingsSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0f0f0');
    } else {
      // Holdings sheet exists - only add headers if completely empty
      if (holdingsSheet.getLastRow() === 0) {
        const headers = ['Ticker', 'Shares', 'Cost Basis', 'Current Price', 'Current Value', 'Account', 'Last Updated'];
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
    'Cryptocurrency Support': Object.keys(CRYPTO_MAPPINGS).length + ' tokens',
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
      
      const parsedData = _parseEmailContent(message.getBody(), message.getSubject());
      
      results += `Email ${i + 1}:\n`;
      results += `Subject: ${message.getSubject()}\n`;
      results += `From: ${message.getFrom()}\n`;
      results += `Date: ${message.getDate()}\n`;
      results += `Parsed Amount: ${parsedData.amount || 'Not found'}\n`;
      results += `Parsed From Account: ${parsedData.fromAccount || 'Not found'}\n`;
      results += `Parsed To Account: ${parsedData.toAccount || 'Not found'}\n`;
      results += `Bank: ${parsedData.bank || 'Not detected'}\n\n`;
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

// ===================== PUBLIC API FUNCTIONS =====================

function processNewEmails() {
  return _processNewEmails();
}

function pairStagedTransfers() {
  return _pairStagedTransfers();
}

function cleanupStaleTransactions() {
  return _cleanupStaleTransactions();
}

function refreshHoldingsData() {
  return _refreshHoldingsData();
}

function updateDashboard() {
  return _updateDashboard();
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
        const category = _categorizeTransaction(transaction);
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
      
      // Fix SHIB precision formatting
      if (ticker && ticker.toUpperCase().includes('SHIB')) {
        const priceCell = holdingsSheet.getRange(row, COLUMNS.HOLDINGS.PRICE);
        priceCell.setNumberFormat('0.000000');
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

// Test SHIB price fetching (from additional_fixes.js)
function testShibPriceFetch() {
  try {
    const price = _fetchCryptoPriceWithPrecision('SHIB-USD');
    const message = `SHIB-USD price: $${price.toFixed(8)}`;
    _logInfo(message);
    try { SpreadsheetApp.getUi().alert(message); } catch (e) {}
  } catch (error) {
    _logError('Failed to fetch SHIB price', error);
    try { SpreadsheetApp.getUi().alert('Failed to fetch SHIB price: ' + error.message); } catch (e) {}
  }
}

// ===================== INITIALIZATION & CURRENT HOLDINGS DATA =====================

// Current holdings data (as of August 20, 2025)
const CURRENT_HOLDINGS = {
  'BTC': { shares: 0.000176, ticker: 'BTC-USD', name: 'Bitcoin', account: 'Wealthsimple' },
  'DOT': { shares: 1.965129, ticker: 'DOT-USD', name: 'Polkadot', account: 'Wealthsimple' },
  'ETH': { shares: 0.006272, ticker: 'ETH-USD', name: 'Ethereum', account: 'Wealthsimple' },
  'SHIB': { shares: 693136.684119, ticker: 'SHIB-USD', name: 'Shiba Inu', account: 'Wealthsimple' },
  'SOL': { shares: 0.009404, ticker: 'SOL-USD', name: 'Solana', account: 'Wealthsimple' },
  'VCE': { shares: 20.0121, ticker: 'VCE.TO', name: 'Vanguard FTSE Canada Index ETF', account: 'Wealthsimple' },
  'XEQT': { shares: 13.541, ticker: 'XEQT.TO', name: 'iShares Core Equity ETF Portfolio', account: 'Wealthsimple' }
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
        data.ticker,           // Column A: Ticker
        data.shares,           // Column B: Shares
        '',                    // Column C: Cost Basis (to be calculated)
        '',                    // Column D: Current Price (to be fetched)
        '',                    // Column E: Current Value (to be calculated)
        data.account,          // Column F: Account
        new Date()             // Column G: Last Updated
      ];
      
      holdingsSheet.appendRow(row);
      
      // Apply special formatting for SHIB (high precision)
      if (symbol === 'SHIB') {
        const currentRow = holdingsSheet.getLastRow();
        holdingsSheet.getRange(currentRow, 2).setNumberFormat('0.000000'); // Shares
        holdingsSheet.getRange(currentRow, 4).setNumberFormat('0.00000000'); // Price
      }
    }
    
    _logInfo(`Initialized ${Object.keys(CURRENT_HOLDINGS).length} holdings in the portfolio`);
    
    // Immediately refresh prices
    _refreshHoldingsData();
    
  } catch (error) {
    _logError('Failed to initialize holdings data', error);
    throw error;
  }
}