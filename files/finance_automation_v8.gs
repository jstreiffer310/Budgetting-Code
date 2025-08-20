/**
 * FINANCE AUTOMATION V8.00 - COMPREHENSIVE UPGRADE
 * ===============================================
 * 
 * Significant improvements in this version:
 * - Fixed category classification to avoid unhelpful/generic keywords
 * - Proper investment value aggregation for Wealthsimple accounts
 * - Enhanced dashboard with proper category recognition from manual entries
 * - Fixed SHIB and other small-decimal cryptocurrency price fetching
 * - Improved transfer recipient detection for Interac/PC Financial
 * - Added transaction review system for pending/unclear items
 * - Comprehensive error handling and recovery mechanisms
 * 
 * Last Updated: 2025-08-20
 * Author: jstreiffer310 (with AI assistance)
 */

// ===================== CONFIGURATION & CONSTANTS =====================

const SPREADSHEET_ID = '1-eUeYMTeKoz2bIkHS8Jc2J9vO0Bnl8y6aHXmXGdJqg8';

// Sheet names
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

// Column schemas - explicit indexing to prevent magic number issues
const COLUMNS = {
  TRANSACTIONS: {
    DATE: 1,
    AMOUNT: 2,
    FROM: 3,
    TO: 4,
    BANK: 5,
    NOTES: 6,
    EMAIL_ID: 7,
    CATEGORY: 8,
    TYPE: 9,
    FINGERPRINT: 10
  },
  ACCOUNTS: {
    NAME: 1,
    BALANCE: 2,
    LAST_UPDATED: 3,
    TYPE: 4
  },
  HOLDINGS: {
    ACCOUNT: 1,
    TICKER: 2,
    SHARES: 3,
    UNIT_PRICE_CAD: 4,     // Price per share/unit in CAD
    TOTAL_VALUE_CAD: 5,    // Total value (price × shares) in CAD
    LAST_UPDATED: 6
  },
  STAGING: {
    DATE: 1,
    AMOUNT: 2,
    FROM: 3,
    TO: 4,
    BANK: 5,
    EMAIL_ID: 6,
    STAGED_AT: 7,
    DIRECTION: 8,
    STATUS: 9,
    FINGERPRINT: 10
  }
};

// Configuration constants
const CONFIG = {
  GMAIL_LABEL: 'Transfers',
  GMAIL_LOOKBACK: 'newer_than:7d',
  PAIRING_WINDOW_MS: 48 * 60 * 60 * 1000, // 48 hours
  AMOUNT_TOLERANCE: 0.01,
  STALE_CLEANUP_HOURS: 72, // Clean up staging entries after 72 hours
  PIE_MODE: 'AMOUNT', // 'AMOUNT' or 'COUNT'
  MAX_PROCESSING_ATTEMPTS: 3,
  DASHBOARD_ANALYSIS_DAYS: 30,
  CRYPTO_API_RATE_LIMIT: 300,
  YAHOO_FINANCE_RATE_LIMIT: 200
};

// Account definitions - CRITICAL: Only these accounts get balance updates
const MY_ACCOUNTS = [
  'PC Financial',
  'Wealthsimple RRSP', 
  'Wealthsimple Crypto',
  'Wealthsimple Cash',
  'CIBC Aventura',
  'CIBC Dividend'
];

// Account normalization aliases
const ACCOUNT_ALIASES = {
  'pc money': 'PC Financial',
  'pc financial': 'PC Financial',
  'aventura': 'CIBC Aventura',
  'dividend': 'CIBC Dividend',
  'rrsp': 'Wealthsimple RRSP',
  'crypto': 'Wealthsimple Crypto',
  'wealthsimple': 'Wealthsimple',
  'cash': '' // CRITICAL: Empty string prevents "Cash" phantom accounts
};

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

// Cryptocurrency mappings for API calls
const CRYPTO_MAPPINGS = {
  'BTC-USD': 'bitcoin',
  'ETH-USD': 'ethereum',
  'DOT-USD': 'polkadot',
  'SOL-USD': 'solana',
  'SHIB-USD': 'shiba-inu',
  'ADA-USD': 'cardano',
  'MATIC-USD': 'matic-network',
  'DOGE-USD': 'dogecoin',
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SHIB': 'shiba-inu'
};

// Extensive stopwords list for category learning
const CATEGORY_STOPWORDS = new Set([
  // Banking terms
  'financial', 'cibc', 'amount', 'auto', 'logged', 'aventura', 'wealthsimple', 'money',
  'pad', 'deposit', 'card', 'cash', 'credit', 'standalone', 'purchase', 'trade', 
  'unknown', 'sender', 'interac', 'transfer', 'received', 'streiffer', 'been',
  'automatically', 'deposited', 'bank', 'banking', 'charge', 'payment', 'bill', 
  'etransfer', 'transaction', 'statement', 'balance', 'online', 'account', 'fee',
  'service', 'interest', 'dividend', 'inc', 'ltd', 'corp', 'limited', 'llc',
  'confirmation', 'receipt', 'monthly', 'annual', 'quarterly', 'processed',
  'merchant', 'purchase', 'paid', 'paym', 'withdrawal', 'debit', 'credit',
  
  // Common English words
  'from', 'with', 'your', 'for', 'and', 'the', 'has', 'was', 'you', 'have', 'this',
  'that', 'are', 'had', 'not', 'been', 'were', 'they', 'but', 'also', 'their',
  'will', 'would', 'should', 'could', 'when', 'where', 'what', 'which', 'who', 'whom',
  'whose', 'how', 'why', 'because', 'though', 'although'
]);

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
      // Only append headers if sheet is truly empty
      if (auditSheet.getLastRow() === 0) {
        auditSheet.appendRow(['Timestamp', 'Level', 'Message', 'Context', 'User']);
        auditSheet.getRange(1, 1, 1, 5).setFontWeight('bold');
      }
    }
    
    // Ensure all values are non-empty strings
    const timestamp = new Date();
    const safeLevel = String(level || 'INFO').trim() || 'INFO';
    const safeMessage = String(message || 'No message').trim() || 'No message';
    const safeContext = JSON.stringify(context || {});
    const safeUser = Session.getActiveUser().getEmail() || 'Unknown User';
    
    // Verify we have valid data before appending
    if (timestamp && safeLevel && safeMessage) {
      auditSheet.appendRow([
        timestamp,
        safeLevel,
        safeMessage,
        safeContext,
        safeUser
      ]);
    }
  } catch (error) {
    // Silent fail for audit logging to prevent infinite loops
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

// ===================== UTILITY FUNCTIONS =====================
function _lc(s) {
  return (s || '').toString().trim().toLowerCase();
}

function _normalize(s) {
  if (s === null || s === undefined) return '';
  try {
    // Convert to string, normalize unicode, remove diacritics, collapse spaces
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

// ===================== SHEETS UTILITY FUNCTION =====================
function _ss() {
  try {
    // Prefer the active spreadsheet in container-bound context
    if (typeof SpreadsheetApp !== 'undefined') {
      try {
        const active = SpreadsheetApp.getActiveSpreadsheet();
        if (active && (!SPREADSHEET_ID || active.getId() === SPREADSHEET_ID)) {
          return active;
        }
      } catch (e) {
        // ignore and try openById
      }
    }
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_ID is not set. If this is container-bound, leave SPREADSHEET_ID blank.');
    }
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (error) {
    const helpMsg = [
      'Cannot access spreadsheet: ' + (error && error.message ? error.message : error),
      '',
      'Likely causes & fixes:',
      '1) You need to grant the script permission to access Google Sheets. Open the script editor and run "setupPermissions" to trigger the OAuth consent flow.',
      '2) If this script is standalone, ensure the manifest (appsscript.json) contains the proper scopes or bind the script to the spreadsheet.',
      '',
      'Run the Setup Permissions function in the script editor (select it from the function dropdown and click Run) and authorize the required scopes.'
    ].join('\n');
    try { console.error(helpMsg, error); } catch (e) {}
    throw new Error(helpMsg);
  }
}

// ===================== SHEET MANAGEMENT =====================
function _ensureSheetsAndHeaders() {
  const ss = _ss();
  
  function ensureSheet(name, headers) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      console.log(`Created sheet: ${name}`);
    }
    
    // Only add headers if sheet is completely empty AND headers are provided
    if (headers && headers.length > 0 && sheet.getLastRow() === 0) {
      // Ensure all header values are non-empty strings
      const safeHeaders = headers.map(h => String(h || 'Column').trim());
      if (safeHeaders.every(h => h.length > 0)) {
        sheet.appendRow(safeHeaders);
        sheet.getRange(1, 1, 1, safeHeaders.length).setFontWeight('bold').setBackground('#f0f0f0');
        console.log(`Added headers to sheet: ${name}`);
      }
    }
    
    return sheet;
  }
  
  try {
    // Create all required sheets with proper headers
    ensureSheet(SHEET_NAMES.MAIN, [
      'Date', 'Amount', 'From', 'To', 'Bank', 'Notes', 'EmailId', 'Category', 'Type', 'Fingerprint'
    ]);
    
    ensureSheet(SHEET_NAMES.ACCOUNTS, [
      'Account', 'Balance', 'Last Updated', 'Type'
    ]);
    
    ensureSheet(SHEET_NAMES.HOLDINGS, [
      'Account', 'Ticker', 'Shares', 'Unit Price (CAD)', 'Total Value (CAD)', 'Last Updated'
    ]);
    
    ensureSheet(SHEET_NAMES.STAGING, [
      'Date', 'Amount', 'From', 'To', 'Bank', 'EmailId', 'StagedAt', 'Direction', 'Status', 'Fingerprint'
    ]);
    
    ensureSheet(SHEET_NAMES.CATEGORIES, ['Keyword', 'Category']);
    ensureSheet(SHEET_NAMES.NETWORTH, ['Date', 'Net Worth']);
    ensureSheet(SHEET_NAMES.DASHBOARD, []); // No headers for dashboard
    ensureSheet(SHEET_NAMES.CSV_IMPORT, []); // No headers for CSV import
    ensureSheet(SHEET_NAMES.AUDIT_LOG, ['Timestamp', 'Level', 'Message', 'Context', 'User']);
    
    console.log('All sheets and headers ensured successfully');
    
  } catch (error) {
    console.error('Failed to ensure sheets and headers:', error);
    throw error;
  }
}

// ===================== ACCOUNT MANAGEMENT =====================
function _normalizeAccountName(name) {
  if (!name) return '';
  
  const normalized = _normalize(name);
  const lowered = _lc(normalized);
  
  // CRITICAL: Check for "cash" and return empty string to prevent phantom accounts
  if (lowered === 'cash') return '';
  
  // Check aliases first
  for (const [alias, canonical] of Object.entries(ACCOUNT_ALIASES)) {
    if (lowered.includes(alias)) {
      return canonical || ''; // Return empty string if canonical is empty
    }
  }
  
  // Exact match with known accounts
  const exactMatch = MY_ACCOUNTS.find(acc => _lc(acc) === lowered);
  if (exactMatch) return exactMatch;
  
  // Partial match with known accounts
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
  
  // Exact match first
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

// ===================== TRANSACTION FINGERPRINTING & DEDUPLICATION =====================
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
  if (!mainSheet || mainSheet.getLastRow() < 2) return false;
  
  const data = mainSheet.getRange(2, 1, mainSheet.getLastRow() - 1, Object.keys(COLUMNS.TRANSACTIONS).length).getValues();
  const newFingerprint = _generateFingerprint(transaction);
  
  return data.some(row => {
    // Check by email ID first (most reliable)
    if (transaction.emailId && _normalize(row[COLUMNS.TRANSACTIONS.EMAIL_ID - 1]) === transaction.emailId) {
      return true;
    }
    
    // Check by fingerprint
    if (row[COLUMNS.TRANSACTIONS.FINGERPRINT - 1] === newFingerprint) {
      return true;
    }
    
    // Legacy check for transactions without fingerprints
    const existingDate = row[COLUMNS.TRANSACTIONS.DATE - 1] ? 
      new Date(row[COLUMNS.TRANSACTIONS.DATE - 1]).toDateString() : '';
    const transactionDate = transaction.date ? 
      new Date(transaction.date).toDateString() : '';
    const existingAmount = parseFloat(row[COLUMNS.TRANSACTIONS.AMOUNT - 1] || 0);
    const transactionAmount = parseFloat(transaction.amount || 0);
    
    return existingDate === transactionDate &&
           Math.abs(existingAmount - transactionAmount) < CONFIG.AMOUNT_TOLERANCE &&
           _normalize(row[COLUMNS.TRANSACTIONS.FROM - 1]) === _normalize(transaction.fromAccount) &&
           _normalize(row[COLUMNS.TRANSACTIONS.TO - 1]) === _normalize(transaction.toAccount);
  });
}

// ===================== EMAIL PARSING FRAMEWORK =====================
// IMPROVED: CIBC Email Parser
function _parseCibcEmail(message, subject, body, accountsSheet) {
  const subjectLower = _lc(subject);
  const bodyLower = _lc(body);
  
  // PAYMENT detection - Credit to card account (subject line priority)
  const paymentKeywords = [
    'payment', 'payment received', 'new payment to your credit card',
    'payment has been applied', 'credit card payment', 'payment processed'
  ];
  
  if (paymentKeywords.some(keyword => subjectLower.includes(keyword))) {
    const amount = _extractAmount(body) || _extractAmount(subject);
    if (!amount) return null;
    
    // Determine target card account
    let targetAccount = 'CIBC Aventura'; // Default
    
    if (/aventura/i.test(subject + body)) {
      targetAccount = 'CIBC Aventura';
    } else if (/dividend/i.test(subject + body)) {
      targetAccount = 'CIBC Dividend';
    } else if (accountsSheet) {
      // Choose card with most negative balance (most debt)
      targetAccount = _chooseMostNegativeCibcCard(accountsSheet) || 'CIBC Aventura';
    }
    
    return {
      date: message.getDate(),
      amount: amount,
      direction: 'IN',
      fromAccount: 'External Payment',
      toAccount: targetAccount,
      bank: 'CIBC Card Payment',
      emailId: message.getId(),
      type: 'Card Payment',
      notes: `Payment to ${targetAccount}`
    };
  }
  
  // PURCHASE detection - Debit from card account
  const purchaseKeywords = ['purchase', 'charge', 'authorization', 'transaction'];
  
  if (purchaseKeywords.some(keyword => subjectLower.includes(keyword)) ||
      /purchase of|your card.*was charged|card ending in/i.test(bodyLower)) {
    
    const amount = _extractAmount(body) || _extractAmount(subject);
    if (!amount) return null;
    
    // Determine card account
    let cardAccount = 'CIBC Aventura'; // Default
    
    if (/aventura/i.test(subject + body)) {
      cardAccount = 'CIBC Aventura';
    } else if (/dividend/i.test(subject + body)) {
      cardAccount = 'CIBC Dividend';
    }
    
    // Extract merchant name with multiple fallback patterns
    const merchant = _extractText(body, /at\s+([A-Z0-9 \._\-&']+)\s+was/i) ||
                     _extractText(body, /merchant[:\s]*([^\n\r]+)/i) ||
                     _extractText(body, /for\s+\$[\d,]+\.[\d]{2}\s+at\s+([^.]+)\./i) ||
                     'Merchant';
    
    return {
      date: message.getDate(),
      amount: -Math.abs(amount), // Negative for expenses
      direction: 'OUT',
      fromAccount: cardAccount,
      toAccount: merchant,
      bank: `${cardAccount} Purchase`,
      emailId: message.getId(),
      type: 'Card Purchase',
      notes: `Purchase at ${merchant}`
    };
  }
  
  return null;
}

function _chooseMostNegativeCibcCard(accountsSheet) {
  if (!accountsSheet || accountsSheet.getLastRow() < 2) return null;
  
  const data = accountsSheet.getDataRange().getValues();
  let mostNegativeCard = null;
  let mostNegativeBalance = 0;
  
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
    const amount = _extractAmount(body, /purchase amount[:\s]*\$([0-9,]+\.[0-9]{2})/i) ||
                   _extractAmount(body);
    if (!amount) return null;
    
    const merchant = _extractText(body, /merchant[:\s]*([^\n\r]+)/i) ||
                     _extractText(body, /at\s+([A-Z0-9 \._\-&']+)/i) ||
                     'Merchant';
    
    // Check if this is a Wealthsimple deposit (should be staged)
    if (/wealthsimple/i.test(merchant)) {
      return {
        date: message.getDate(),
        amount: -Math.abs(amount),
        direction: 'OUT',
        fromAccount: 'PC Financial',
        toAccount: 'Pending Wealthsimple',
        bank: 'PC Financial Purchase',
        emailId: message.getId(),
        type: 'Transfer',
        shouldStage: true,
        notes: `Wealthsimple deposit - awaiting confirmation`
      };
    }
    
    return {
      date: message.getDate(),
      amount: -Math.abs(amount),
      direction: 'OUT',
      fromAccount: 'PC Financial',
      toAccount: merchant,
      bank: 'PC Financial Purchase',
      emailId: message.getId(),
      type: 'Purchase',
      notes: `Purchase at ${merchant}`
    };
  }
  
  // E-transfer sent - IMPROVED recipient detection
  if (subjectLower.includes('transfer to') || /e-transfer/i.test(bodyLower)) {
    const amount = _extractAmount(subject) || _extractAmount(body);
    if (!amount) return null;
    
    // Try multiple patterns to extract recipient
    const recipient = _extractText(subject, /transfer to\s+(.+?)\s+has been/i) ||
                     _extractText(body, /transfer to\s+(.+?)\s+has been/i) ||
                     _extractText(body, /recipient[:\s]*([^\n\r]+)/i) ||
                     _extractText(body, /sent to[:\s]*([^\n\r]+)/i);
    
    // If we can't determine recipient, mark as pending
    if (!recipient) {
      return {
        date: message.getDate(),
        amount: -Math.abs(amount),
        direction: 'OUT',
        fromAccount: 'PC Financial',
        toAccount: 'Pending - Unknown Recipient',
        bank: 'PC Financial e-Transfer',
        emailId: message.getId(),
        type: 'External Transfer',
        shouldStage: true,
        notes: 'Unable to determine recipient - requires manual review'
      };
    }
    
    // Check if this is an internal transfer
    const normalizedRecipient = _normalizeAccountName(recipient);
    const isInternal = _isInternalAccount(normalizedRecipient);
    
    return {
      date: message.getDate(),
      amount: -Math.abs(amount),
      direction: 'OUT',
      fromAccount: 'PC Financial',
      toAccount: isInternal ? normalizedRecipient : `External to ${recipient}`,
      bank: 'PC Financial e-Transfer',
      emailId: message.getId(),
      type: isInternal ? 'Internal Transfer' : 'External Transfer',
      shouldStage: isInternal,
      notes: isInternal ? `Internal transfer to ${normalizedRecipient}` : `External transfer to ${recipient}`
    };
  }
  
  return null;
}

// IMPROVED: Interac Email Parser with better sender extraction
function _parseInteracEmail(message, subject, body) {
  // Multiple patterns to extract amount
  const amount = _extractAmount(body, /sent you \$([0-9,]+\.[0-9]{2})/i) ||
                 _extractAmount(body, /amount[:\s]*\$([0-9,]+\.[0-9]{2})/i) ||
                 _extractAmount(subject, /\$([0-9,]+\.[0-9]{2})/i);
  
  if (!amount) return null;
  
  // Multiple patterns to extract sender
  const sender = _extractText(body, /([A-Za-z0-9 .'-]+) sent you \$/i) || 
                _extractText(body, /From[:\s]*([A-Za-z0-9 .'-]+)/i) ||
                _extractText(subject, /from ([A-Za-z0-9 .'-]+)/i) ||
                'Unknown Sender';
  
  return {
    date: message.getDate(),
    amount: amount,
    direction: 'IN',
    fromAccount: `e-Transfer from ${sender}`,
    toAccount: 'PC Financial', // Default deposit account
    bank: 'Interac Deposit',
    emailId: message.getId(),
    type: 'Interac',
    notes: `Received from ${sender}`
  };
}

// IMPROVED: Wealthsimple Email Parser with better account detection
function _parseWealthsimpleEmail(message, subject, body) {
  const subjectLower = _lc(subject);
  const bodyLower = _lc(body);
  
  // Deposit confirmation
  if (subjectLower.includes('deposit') || /added money|deposit.*confirmed/i.test(bodyLower)) {
    const amount = _extractAmount(body, /amount[:\s]*\$([0-9,]+\.[0-9]{2})/i) ||
                   _extractAmount(subject) ||
                   _extractAmount(body);
                   
    if (!amount) return null;
    
    // Determine target account with multiple patterns
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
    
    return {
      date: message.getDate(),
      amount: amount,
      direction: 'IN',
      fromAccount: 'PC Financial',
      toAccount: targetAccount,
      bank: 'Wealthsimple Deposit',
      emailId: message.getId(),
      type: 'Deposit',
      shouldPair: true,
      notes: `Deposit to ${targetAccount}`
    };
  }
  
  // Trade execution
  if (subjectLower.includes('order has been filled') || /shares of/i.test(bodyLower)) {
    const tradeMatch = body.match(/(\d+[\d.,]*)\s+shares\s+of\s+([A-Z\.\-]+)[\s\S]+?total cost[:\s]*\$([0-9,]+\.[0-9]+)/i);
    
    if (!tradeMatch) return null;
    
    const shares = parseFloat(tradeMatch[1].replace(/,/g, ''));
    const ticker = tradeMatch[2].trim();
    const cost = parseFloat(tradeMatch[3].replace(/,/g, ''));
    
    // Determine account with multiple patterns
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
    
    // Update holdings (will be implemented in holdings management section)
    _updateHoldingsQuantity(targetAccount, ticker, shares);
    
    return {
      date: message.getDate(),
      amount: -cost, // Negative because it's spending cash to buy securities
      direction: 'TRADE',
      fromAccount: targetAccount,
      toAccount: targetAccount, // Same account, different asset
      bank: 'Wealthsimple Trade',
      emailId: message.getId(),
      type: 'Trade',
      notes: `Bought ${shares} shares of ${ticker}`,
      tradeInfo: { ticker, shares, cost }
    };
  }
  
  return null;
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
      const mainIds = mainSheet.getRange(2, COLUMNS.TRANSACTIONS.EMAIL_ID, mainSheet.getLastRow() - 1, 1)
        .getValues()
        .flat()
        .filter(id => id);
      mainIds.forEach(id => existingIds.add(id));
    }
    
    if (stagingSheet.getLastRow() > 1) {
      const stagingIds = stagingSheet.getRange(2, COLUMNS.STAGING.EMAIL_ID, stagingSheet.getLastRow() - 1, 1)
        .getValues()
        .flat()
        .filter(id => id);
      stagingIds.forEach(id => existingIds.add(id));
    }
    
    // Search for recent banking emails
    const searchQuery = `label:${CONFIG.GMAIL_LABEL} ${CONFIG.GMAIL_LOOKBACK}`;
    const threads = GmailApp.search(searchQuery);
    let processedCount = 0;
    let stagedCount = 0;
    
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
            emailId: transaction.emailId,
            amount: transaction.amount,
            staged: transaction.shouldStage || transaction.shouldPair || transaction.pending
          });
          
        } catch (error) {
          _logError(`Failed to process email ${message.getId()}`, error);
        }
      });
    });
    
    _logInfo(`Email processing completed`, {
      processed: processedCount,
      staged: stagedCount,
      total: processedCount + stagedCount
    });
    
  } catch (error) {
    _logError('Failed to process new emails', error);
    throw error;
  }
}

// ===================== TRANSACTION MANAGEMENT =====================
function _stageTransaction(transaction, stagingSheet) {
  try {
    // Determine status based on transaction properties
    let status = 'Staged';
    if (transaction.pending) status = 'Pending Review';
    else if (transaction.shouldPair) status = 'Awaiting Pair';
    
    const row = [
      transaction.date || new Date(),
      transaction.amount || 0,
      transaction.fromAccount || '',
      transaction.toAccount || '',
      transaction.bank || '',
      transaction.emailId || '',
      new Date(), // Staged at
      transaction.direction || '',
      status,
      transaction.fingerprint || ''
    ];
    
    stagingSheet.appendRow(row);
    
    _logInfo(`Staged transaction: ${transaction.emailId}`, {
      amount: transaction.amount,
      from: transaction.fromAccount,
      to: transaction.toAccount,
      status: status
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
    
    // Prepare transaction row with proper amount handling
    const amount = transaction.amount || 0;
    
    const row = [
      transaction.date || new Date(),
      amount,
      transaction.fromAccount || '',
      transaction.toAccount || '',
      transaction.bank || '',
      transaction.notes || '',
      transaction.emailId || `AUTO-${Date.now()}`,
      transaction.category || '',
      transaction.type || '',
      transaction.fingerprint || _generateFingerprint(transaction)
    ];
    
    mainSheet.appendRow(row);
    
    // Update account balances
    _updateAccountBalances(transaction, accountsSheet);
    
    _logInfo(`Committed transaction: ${transaction.emailId}`, {
      amount: transaction.amount,
      from: transaction.fromAccount,
      to: transaction.toAccount,
      type: transaction.type
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
    
    const data = stagingSheet.getRange(2, 1, stagingSheet.getLastRow() - 1, Object.keys(COLUMNS.STAGING).length).getValues();
    const paired = new Set();
    let pairCount = 0;
    
    // Skip transactions with "Pending Review" status
    const eligibleTransactions = data.map((row, index) => ({
      index,
      status: _normalize(row[COLUMNS.STAGING.STATUS - 1])
    })).filter(tx => tx.status !== 'Pending Review');
    
    for (let i = 0; i < data.length; i++) {
      // Skip already paired transactions or pending review items
      if (paired.has(i) || _normalize(data[i][COLUMNS.STAGING.STATUS - 1]) === 'Pending Review') continue;
      
      const txA = {
        index: i,
        date: new Date(data[i][COLUMNS.STAGING.DATE - 1]),
        amount: parseFloat(data[i][COLUMNS.STAGING.AMOUNT - 1] || 0),
        fromAccount: data[i][COLUMNS.STAGING.FROM - 1],
        toAccount: data[i][COLUMNS.STAGING.TO - 1],
        bank: data[i][COLUMNS.STAGING.BANK - 1],
        emailId: data[i][COLUMNS.STAGING.EMAIL_ID - 1],
        direction: data[i][COLUMNS.STAGING.DIRECTION - 1],
        fingerprint: data[i][COLUMNS.STAGING.FINGERPRINT - 1]
      };
      
      // Look for matching transaction
      for (let j = i + 1; j < data.length; j++) {
        // Skip already paired transactions or pending review items
        if (paired.has(j) || _normalize(data[j][COLUMNS.STAGING.STATUS - 1]) === 'Pending Review') continue;
        
        const txB = {
          index: j,
          date: new Date(data[j][COLUMNS.STAGING.DATE - 1]),
          amount: parseFloat(data[j][COLUMNS.STAGING.AMOUNT - 1] || 0),
          fromAccount: data[j][COLUMNS.STAGING.FROM - 1],
          toAccount: data[j][COLUMNS.STAGING.TO - 1],
          bank: data[j][COLUMNS.STAGING.BANK - 1],
          emailId: data[j][COLUMNS.STAGING.EMAIL_ID - 1],
          direction: data[j][COLUMNS.STAGING.DIRECTION - 1],
          fingerprint: data[j][COLUMNS.STAGING.FINGERPRINT - 1]
        };
        
        // Check if transactions can be paired
        if (_canPairTransactions(txA, txB)) {
          // Create paired transfer
          const pairedTransaction = _createPairedTransaction(txA, txB);
          _commitTransaction(pairedTransaction, mainSheet, accountsSheet);
          
          paired.add(i);
          paired.add(j);
          pairCount++;
          
          _logInfo(`Paired transactions: ${txA.emailId} + ${txB.emailId}`, {
            amount: pairedTransaction.amount,
            from: pairedTransaction.fromAccount,
            to: pairedTransaction.toAccount
          });
          break;
        }
      }
    }
    
    // Remove paired transactions from staging (in reverse order to maintain indices)
    const rowsToDelete = Array.from(paired).sort((a, b) => b - a);
    rowsToDelete.forEach(index => {
      stagingSheet.deleteRow(index + 2);
    });
    
    _logInfo(`Pairing completed: ${pairCount} pairs created, ${data.length - paired.size} items still staged`);
    
  } catch (error) {
    _logError('Failed to pair staged transfers', error);
  }
}

function _canPairTransactions(txA, txB) {
  // Check amount tolerance
  if (Math.abs(Math.abs(txA.amount) - Math.abs(txB.amount)) > CONFIG.AMOUNT_TOLERANCE) {
    return false;
  }
  
  // Check time window
  if (Math.abs(txA.date - txB.date) > CONFIG.PAIRING_WINDOW_MS) {
    return false;
  }
  
  // Check for complementary directions (one IN, one OUT)
  if (txA.direction === txB.direction) {
    return false;
  }
  
  // Check for account overlap (at least one account should match)
  const txAAccounts = [_lc(txA.fromAccount), _lc(txA.toAccount)];
  const txBAccounts = [_lc(txB.fromAccount), _lc(txB.toAccount)];
  
  // Special handling for Wealthsimple accounts
  const hasWealthsimple = (txAAccounts.some(acc => acc && acc.includes('wealthsimple')) || 
                           txBAccounts.some(acc => acc && acc.includes('wealthsimple')));
  
  // Standard overlap check
  const hasAccountOverlap = txAAccounts.some(acc => 
    acc && txBAccounts.some(otherAcc => otherAcc && 
      (acc.includes(otherAcc) || otherAcc.includes(acc)))
  );
  
  // For Wealthsimple transfers, we're more lenient because account types might be detected differently
  if (hasWealthsimple) {
    return true;
  }
  
  return hasAccountOverlap;
}

function _createPairedTransaction(txA, txB) {
  // Determine which is outgoing and which is incoming
  const outTx = txA.amount < 0 ? txA : txB;
  const inTx = txA.amount > 0 ? txA : txB;
  
  // Use the later date
  const date = new Date(Math.max(txA.date.getTime(), txB.date.getTime()));
  
  // Create merged notes for better traceability
  const notes = `Auto-paired transfer: ${outTx.fromAccount} → ${inTx.toAccount}`;
  
  return {
    date: date,
    amount: Math.abs(outTx.amount), // Always positive for transfers
    fromAccount: outTx.fromAccount || inTx.fromAccount,
    toAccount: inTx.toAccount || outTx.toAccount,
    bank: 'Paired Transfer',
    emailId: `${txA.emailId}|${txB.emailId}`,
    type: 'Internal Transfer',
    notes: notes,
    fingerprint: _generateFingerprint({
      date: date,
      amount: Math.abs(outTx.amount),
      fromAccount: outTx.fromAccount,
      toAccount: inTx.toAccount
    })
  };
}

function _cleanupStaleTransactions() {
  try {
    const ss = _ss();
    const stagingSheet = ss.getSheetByName(SHEET_NAMES.STAGING);
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    const accountsSheet = ss.getSheetByName(SHEET_NAMES.ACCOUNTS);
    
    if (!stagingSheet || stagingSheet.getLastRow() < 2) {
      return;
    }
    
    const data = stagingSheet.getRange(2, 1, stagingSheet.getLastRow() - 1, Object.keys(COLUMNS.STAGING).length).getValues();
    const now = new Date();
    const staleThreshold = CONFIG.STALE_CLEANUP_HOURS * 60 * 60 * 1000;
    const pendingCleanupThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days for pending items
    let cleanedCount = 0;
    
    // Process in reverse order to maintain row indices
    for (let i = data.length - 1; i >= 0; i--) {
      const stagedAt = new Date(data[i][COLUMNS.STAGING.STAGED_AT - 1]);
      const status = _normalize(data[i][COLUMNS.STAGING.STATUS - 1]);
      const isPending = status === 'Pending Review';
      
      // Use a longer threshold for pending items
      const threshold = isPending ? pendingCleanupThreshold : staleThreshold;
      
      if (now.getTime() - stagedAt.getTime() > threshold) {
        // Create transaction from stale staging entry
        const staleTransaction = {
          date: new Date(data[i][COLUMNS.STAGING.DATE - 1]),
          amount: parseFloat(data[i][COLUMNS.STAGING.AMOUNT - 1] || 0),
          fromAccount: data[i][COLUMNS.STAGING.FROM - 1] || '',
          toAccount: data[i][COLUMNS.STAGING.TO - 1] || 'External',
          bank: isPending ? 'Manual Review Required' : 'Stale Transaction Cleanup',
          emailId: data[i][COLUMNS.STAGING.EMAIL_ID - 1] || '',
          type: isPending ? 'Needs Review' : 'Stale Cleanup',
          notes: isPending ? 'Pending transaction requiring manual review' : 'Auto-logged from expired staging',
          fingerprint: data[i][COLUMNS.STAGING.FINGERPRINT - 1] || ''
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

// ===================== HOLDINGS MANAGEMENT =====================
function _getUsdToCadRate() {
  try {
    const response = UrlFetchApp.fetch('https://api.exchangerate.host/latest?base=USD&symbols=CAD');
    const data = JSON.parse(response.getContentText());
    return data.rates.CAD || 1.35;
  } catch (e) {
    return 1.35;
  }
}

// IMPROVED: Better ticker support and formula building
function _buildGoogleFinanceFormula(ticker) {
  try {
    if (!ticker) return null;
    
    const cleanTicker = ticker.replace(/[^\w\.\-]/g, '').toUpperCase();
    
    if (cleanTicker.endsWith('-TSE')) {
      const symbol = cleanTicker.replace('-TSE', '');
      return `=IFERROR(GOOGLEFINANCE("TSE:${symbol}","price"),0)`;
    } 
    else if (cleanTicker.includes('.TO')) {
      const symbol = cleanTicker.replace('.TO', '');
      return `=IFERROR(GOOGLEFINANCE("TSE:${symbol}","price"),0)`;
    } 
    else if (cleanTicker.includes('-USD')) {
      // For USD assets, apply exchange rate
      return `=IFERROR(GOOGLEFINANCE("CURRENCY:USDCAD")*GOOGLEFINANCE("${cleanTicker}","price"),0)`;
    } 
    else {
      // Regular US stocks
      return `=IFERROR(GOOGLEFINANCE("${cleanTicker}","price"),0)`;
    }
  } catch (error) {
    _logError(`Failed to build GOOGLEFINANCE formula for ${ticker}`, error);
    return null;
  }
}

// IMPROVED: Better cryptocurrency support
function _fetchCryptoPriceWithPrecision(ticker) {
  try {
    const tickerUpper = ticker.toUpperCase();
    let cryptoId = null;
    
    // Find correct ID for the cryptocurrency
    for (const [cryptoTicker, id] of Object.entries(CRYPTO_MAPPINGS)) {
      if (tickerUpper.includes(cryptoTicker)) {
        cryptoId = id;
        break;
      }
    }
    
    if (!cryptoId) return 0;
    
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd,cad&precision=18`;
    const response = UrlFetchApp.fetch(url, { 
      muteHttpExceptions: true,
      headers: { 'Accept': 'application/json' } 
    });
    
    if (response.getResponseCode() !== 200) {
      _logError(`CoinGecko API error: ${response.getResponseCode()}`);
      return 0;
    }
    
    const data = JSON.parse(response.getContentText());
    
    // Get price in CAD if available, otherwise convert from USD
    if (data && data[cryptoId]) {
      if (data[cryptoId].cad) {
        return parseFloat(data[cryptoId].cad);
      } else if (data[cryptoId].usd) {
        const usdToCadRate = _getUsdToCadRate();
        return parseFloat(data[cryptoId].usd) * usdToCadRate;
      }
    }
    
    return 0;
  } catch (error) {
    _logError(`Failed to fetch crypto price for ${ticker}`, error);
    return 0;
  }
}

// IMPROVED: Better Yahoo Finance API handling
function _fetchYahooFinancePrice(ticker) {
  try {
    // Handle different ticker formats
    let yahooTicker = ticker;
    if (ticker.includes('-TSE')) {
      yahooTicker = ticker.replace('-TSE', '.TO');
    }
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}`;
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Finance-Automation/8.0)'
      }
    });
    
    if (response.getResponseCode() !== 200) {
      return 0;
    }
    
    const data = JSON.parse(response.getContentText());
    
    if (data && data.chart && data.chart.result && 
        data.chart.result[0] && data.chart.result[0].meta) {
      
      const meta = data.chart.result[0].meta;
      let price = meta.regularMarketPrice;
      const currency = meta.currency || 'USD';
      
      // Convert USD prices to CAD
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
    
    // Special handling for cryptocurrencies
    for (const cryptoTicker of Object.keys(CRYPTO_MAPPINGS)) {
      if (tickerUpper.includes(cryptoTicker)) {
        return _fetchCryptoPriceWithPrecision(ticker);
      }
    }
    
    // For stocks and ETFs, try Yahoo Finance
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

function _updateHoldingsQuantity(accountName, ticker, sharesDelta) {
  try {
    const ss = _ss();
    const holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
    
    if (!holdingsSheet) {
      _logWarning('Holdings sheet not found');
      return;
    }
    
    const data = holdingsSheet.getDataRange().getValues();
    let found = false;
    
    // Look for existing holding
    for (let i = 1; i < data.length; i++) {
      if (_lc(data[i][COLUMNS.HOLDINGS.ACCOUNT - 1]) === _lc(accountName) && 
          _lc(data[i][COLUMNS.HOLDINGS.TICKER - 1]) === _lc(ticker)) {
        
        const currentShares = parseFloat(data[i][COLUMNS.HOLDINGS.SHARES - 1] || 0);
        const newShares = currentShares + sharesDelta;
        
        holdingsSheet.getRange(i + 1, COLUMNS.HOLDINGS.SHARES).setValue(newShares);
        holdingsSheet.getRange(i + 1, COLUMNS.HOLDINGS.LAST_UPDATED).setValue(new Date());
        
        _logInfo(`Updated ${ticker} in ${accountName}: ${currentShares} → ${newShares} shares`);
        found = true;
        break;
      }
    }
    
    // Add new holding if not found
    if (!found) {
      holdingsSheet.appendRow([
        accountName,
        ticker,
        sharesDelta,
        0, // Unit price will be updated by price fetching
        0, // Total value will be calculated
        new Date()
      ]);
      _logInfo(`Added new holding: ${sharesDelta} shares of ${ticker} in ${accountName}`);
    }
    
  } catch (error) {
    _logError('Failed to update holdings quantity', error);
  }
}

// IMPROVED: Better investment account balance calculation
function updateHoldingsAndBalances() {
  try {
    const ss = _ss();
    const holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
    const accountsSheet = ss.getSheetByName(SHEET_NAMES.ACCOUNTS);

    // Update headers for clarity
    holdingsSheet.getRange(1, 1, 1, 6).setValues([
      ['Account', 'Ticker', 'Shares', '