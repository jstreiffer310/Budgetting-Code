// ---- CONFIG ----
// The unique ID of your Google Spreadsheet.
const SPREADSHEET_ID = '1-eUeYMTeKoz2bIkHS8Jc2J9vO0Bnl8y6aHXmXGdJqg8';
const MAIN_SHEET_NAME = 'Transactions';
const STAGING_SHEET_NAME = 'Staging';
const ACCOUNTS_SHEET_NAME = 'Accounts';
const CATEGORIES_SHEET_NAME = 'Categories';
const NETWORTH_SHEET_NAME = 'NetWorthHistory';
const DASHBOARD_SHEET_NAME = 'Dashboard';
const CSV_IMPORT_SHEET_NAME = 'CSV_Import';
const HOLDINGS_SHEET_NAME = 'Holdings';

// Define your active accounts. This is crucial for matching transactions correctly.
const MY_ACCOUNTS = [
  'PC Financial',
  'Wealthsimple RRSP',
  'Wealthsimple Crypto',
  'Wealthsimple Cash',
  'CIBC Aventura',
  'CIBC Dividend',
  'Cash'
];

// Optional: map common aliases to canonical account names
const ACCOUNT_ALIASES = {
  'pc money': 'PC Financial',
  'pc financial money': 'PC Financial',
  'aventura': 'CIBC Aventura',
  'cibc aventura': 'CIBC Aventura',
  'cibc dividend': 'CIBC Dividend',
  'ws rrsp': 'Wealthsimple RRSP',
  'ws crypto': 'Wealthsimple Crypto',
  'ws cash': 'Wealthsimple Cash'
};

// Keywords for your banks to help identify internal vs. external transfers.
const MY_BANK_KEYWORDS = ['PC Financial', 'Wealthsimple', 'CIBC'];

// Choose which metric the single pie chart should display: 'COUNT' or 'AMOUNT'
const PIE_MODE = 'COUNT';

// -----------------------------------------------------------------------------------
// --- MENU & MAIN RUNNER ---
// -----------------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Automation')
    .addItem('Process New Emails', 'processNewTransactions')
    .addSeparator()
    .addItem('Import from CSV', 'importFromCsv')
    .addItem('Suggest Categories from Transactions', 'suggestCategoriesFromTransactions')
    .addSeparator()
    .addItem('Update Investment Values', 'updateInvestmentValues')
    .addSeparator()
    .addItem('Rebuild Dashboard', 'buildDashboard')
    .addItem('Update Categories', 'learnCategories')
    .addItem('Apply Formatting', 'applyConditionalFormatting')
    .addToUi();
}

function onEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() === ACCOUNTS_SHEET_NAME && range.getColumn() === 2 && range.getRow() > 1) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const txSheet = ss.getSheetByName(MAIN_SHEET_NAME);

    const accountName = sheet.getRange(range.getRow(), 1).getValue();
    const oldValue = parseFloat(e.oldValue || 0);
    const newValue = parseFloat(e.value || 0);
    const difference = newValue - oldValue;

    if (Math.abs(difference) > 0.001) {
      txSheet.appendRow([
        new Date(),
        difference,
        'Manual Correction',
        accountName,
        'Manual Adjustment',
        `Balance changed from ${oldValue.toFixed(2)} to ${newValue.toFixed(2)}`,
        `MANUAL-${new Date().getTime()}`,
        'Correction',
        'Adjustment'
      ]);
      sheet.getRange(range.getRow(), 3).setValue(new Date());
      _updateTotalNetWorth(txSheet, sheet);
    }
  }
}

function processNewTransactions() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const accountsSheet = ss.getSheetByName(ACCOUNTS_SHEET_NAME);
    const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);

    _ensureSheetsExist(ss);
    _cleanupStaleStagingEntries(ss);
    _logNewEmails(ss);
    _updateTotalNetWorth(mainSheet, accountsSheet);
    _logNetWorthHistory(accountsSheet);
    learnCategories();
  } catch (e) {
    Logger.log(`FATAL ERROR in processNewTransactions: ${e.message}\n${e.stack}`);
  }
}

// -----------------------------------------------------------------------------------
// --- FEATURE FUNCTIONS ---
// -----------------------------------------------------------------------------------

/**
 * Uses prices already present in the Holdings sheet (e.g., GOOGLEFINANCE in column D)
 * to roll up account totals. No web scraping.
 */
function updateInvestmentValues() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const holdingsSheet = ss.getSheetByName(HOLDINGS_SHEET_NAME);
  const accountsSheet = ss.getSheetByName(ACCOUNTS_SHEET_NAME);

  if (!holdingsSheet || holdingsSheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert("The 'Holdings' sheet is empty or missing.");
    return;
  }

  // Expected columns: A=Account, B=Ticker, C=Shares, D=Price (via GOOGLEFINANCE)
  const lastRow = holdingsSheet.getLastRow();
  const range = holdingsSheet.getRange(2, 1, lastRow - 1, Math.min(4, holdingsSheet.getLastColumn()));
  const holdingsData = range.getValues();

  const accountTotals = {};
  holdingsData.forEach(row => {
    const accountName = (row[0] || '').toString().trim();
    const shares = parseFloat(row[2]);
    const price = parseFloat(row[3]);
    if (!accountName || isNaN(shares) || isNaN(price)) return;
    const value = shares * price;
    accountTotals[accountName] = (accountTotals[accountName] || 0) + value;
  });

  // Update balances in the Accounts sheet
  const accountData = accountsSheet.getDataRange().getValues();
  const nameToRow = new Map(accountData.slice(1).map((r, i) => [r[0], i + 2]));

  for (const [acct, total] of Object.entries(accountTotals)) {
    const rowIndex = _findAccountRowByNameOrAlias(acct, accountsSheet);
    if (rowIndex !== -1) {
      accountsSheet.getRange(rowIndex, 2).setValue(total);
      accountsSheet.getRange(rowIndex, 3).setValue(new Date());
    }
  }

  SpreadsheetApp.getUi().alert('Investment values have been rolled up from Holdings.');
  _updateTotalNetWorth(ss.getSheetByName(MAIN_SHEET_NAME), accountsSheet);
}

function importFromCsv() {
  const CSV_PROFILES = [
    { name: 'CIBC Aventura Card', identifyingKeyword: '4500********6271', accountName: 'CIBC Aventura', columnMap: { date: 1, description: 2, debit: 3, credit: 4 } },
    { name: 'CIBC Dividend Card', identifyingKeyword: '4505********2866', accountName: 'CIBC Dividend', columnMap: { date: 1, description: 2, debit: 3, credit: 4 } },
    { name: 'PC Financial Cash Account', identifyingKeyword: 'Card Holder Name', accountName: 'PC Financial', columnMap: { date: 4, description: 1, amount: 6 } },
    { name: 'PC Financial Savings Account', identifyingKeyword: 'Transfer In', accountName: 'PC Financial', columnMap: { date: 3, description: 1, amount: 5 } },
    { name: 'Wealthsimple RRSP', identifyingKeyword: 'Vanguard FTSE Canada Index ETF', accountName: 'Wealthsimple RRSP', columnMap: { date: 1, description: 3, amount: 4 } },
    { name: 'Wealthsimple Crypto', identifyingKeyword: 'Dogecoin', accountName: 'Wealthsimple Crypto', columnMap: { date: 1, description: 3, amount: 4 } }
  ];

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const importSheet = ss.getSheetByName(CSV_IMPORT_SHEET_NAME);
  const txSheet = ss.getSheetByName(MAIN_SHEET_NAME);

  if (!importSheet || importSheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert("The 'CSV_Import' sheet is empty.");
    return;
  }

  const importData = importSheet.getRange(1, 1, importSheet.getLastRow(), importSheet.getLastColumn()).getValues();

  let detectedProfile = null;
  for (const row of importData) {
    const rowText = row.join(' ').toLowerCase();
    for (const profile of CSV_PROFILES) {
      if (rowText.includes(profile.identifyingKeyword.toLowerCase())) {
        detectedProfile = profile;
        break;
      }
    }
    if (detectedProfile) break;
  }

  if (!detectedProfile) {
    SpreadsheetApp.getUi().alert('Could not identify the bank from the CSV data. Please check your CSV_PROFILES configuration.');
    return;
  }
  SpreadsheetApp.getUi().alert(`Detected "${detectedProfile.name}" format. Starting import...`);

  const existingTxData = txSheet.getDataRange().getValues();
  const existingTxSet = new Set(existingTxData.map(r => `${new Date(r[0]).toDateString()}|${parseFloat(r[1] || 0).toFixed(2)}|${r[2]}|${r[3]}`));

  let importedCount = 0;

  importData.forEach(row => {
    const { date, description, debit, credit, amount: singleAmountCol } = detectedProfile.columnMap;

    const dateValue = row[date - 1];
    let txDate = new Date(dateValue);

    // Robust parse DD-MM-YYYY
    if (isNaN(txDate.getTime()) && typeof dateValue === 'string' && /\d{2}-\d{2}-\d{4}/.test(dateValue)) {
      const parts = dateValue.split('-');
      txDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
    if (isNaN(txDate.getTime())) return;

    const txDesc = (row[description - 1] || '').toString();
    let amount;

    if (singleAmountCol) {
      amount = parseFloat(row[singleAmountCol - 1] || 0);
    } else {
      const debitAmount = parseFloat(row[debit - 1] || 0);
      const creditAmount = parseFloat(row[credit - 1] || 0);
      amount = creditAmount - debitAmount;
    }

    if (isNaN(amount) || !txDesc || amount === 0) return;

    const fromAccount = amount < 0 ? detectedProfile.accountName : txDesc;
    const toAccount = amount > 0 ? detectedProfile.accountName : txDesc;

    const uniqueKey = `${txDate.toDateString()}|${amount.toFixed(2)}|${fromAccount}|${toAccount}`;
    if (!existingTxSet.has(uniqueKey)) {
      txSheet.appendRow([
        txDate,
        amount,
        fromAccount,
        toAccount,
        'CSV Import',
        `Imported from ${detectedProfile.name}`,
        `CSV-${new Date().getTime()}`,
        '',
        'CSV Import'
      ]);
      importedCount++;
    }
  });

  importSheet.clearContents();
  SpreadsheetApp.getUi().alert(`Import complete. Added ${importedCount} new transaction(s) for "${detectedProfile.name}".`);
}

function suggestCategoriesFromTransactions() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const txSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  let catSheet = ss.getSheetByName(CATEGORIES_SHEET_NAME);

  if (!catSheet) {
    catSheet = ss.insertSheet(CATEGORIES_SHEET_NAME);
    catSheet.appendRow(['Keyword', 'Category']);
  }

  if (!txSheet || txSheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert("The 'Transactions' sheet is empty.");
    return;
  }

  const txData = txSheet.getRange(2, 1, txSheet.getLastRow() - 1, 8).getValues();
  const merchantCounts = {};
  const commonWords = new Set(['payment', 'transfer', 'inc', 'ltd', 'corp', 'on', 'toronto', 'thank', 'you', 'ltd/ltée', 'e-transfer']);

  txData.forEach(row => {
    const searchText = ([row[2], row[3], row[4], row[5]].join(' ') || '').toLowerCase();
    let clean = searchText.replace(/internet banking|e-transfer from|payment thank you\/paiemen t merci|external to/gi, '').trim();
    const potentialMerchants = clean.split(/\s{2,}|,|-/);

    potentialMerchants.forEach(merchant => {
      let m = merchant.replace(/[\*#\d-]/g, ' ').trim();
      if (m.length > 3 && !commonWords.has(m.toLowerCase())) {
        merchantCounts[m] = (merchantCounts[m] || 0) + 1;
      }
    });
  });

  const existingCats = catSheet.getLastRow() > 1 ? catSheet.getRange(2, 1, catSheet.getLastRow() - 1, 1).getValues().flat().map(c => (c || '').toString().toLowerCase()) : [];
  const sorted = Object.entries(merchantCounts).sort((a, b) => b[1] - a[1]);

  let suggestions = 0;
  sorted.forEach(([merchant, count]) => {
    if (count > 1 && !existingCats.includes(merchant.toLowerCase())) {
      catSheet.appendRow([merchant.toUpperCase(), '']);
      suggestions++;
    }
  });

  SpreadsheetApp.getUi().alert(`${suggestions} new category keywords suggested. Please go to the 'Categories' sheet to assign categories.`);
}

function _logNetWorthHistory(accountsSheet) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(NETWORTH_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(NETWORTH_SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(['Date', 'Net Worth']);

  const today = new Date().toDateString();
  const lastRow = sheet.getLastRow();
  const balances = accountsSheet.getRange(2, 2, accountsSheet.getLastRow() - 1, 1).getValues();
  const totalNetWorth = balances.reduce((sum, row) => sum + parseFloat(row[0] || 0), 0);

  if (lastRow > 1 && new Date(sheet.getRange(lastRow, 1).getValue()).toDateString() === today) {
    sheet.getRange(lastRow, 2).setValue(totalNetWorth);
  } else {
    sheet.appendRow([new Date(), totalNetWorth]);
  }
}

/**
 * Improved categorizer: searches across From/To/Bank/Notes, leaves existing labels alone.
 */
function learnCategories() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const txSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const catSheet = ss.getSheetByName(CATEGORIES_SHEET_NAME);

  if (!catSheet || catSheet.getLastRow() < 2) return;
  if (!txSheet || txSheet.getLastRow() < 2) return;

  const txData = txSheet.getDataRange().getValues();
  const catData = catSheet.getRange(2, 1, catSheet.getLastRow() - 1, 2).getValues();
  const rules = catData
    .filter(r => r[0] && r[1])
    .map(r => ({ key: r[0].toString().toLowerCase(), cat: r[1] }));

  for (let i = 1; i < txData.length; i++) {
    const row = txData[i];
    const existing = (row[7] || '').toString().trim();
    if (existing) continue; // respect manual labels

    const searchText = ([row[2], row[3], row[4], row[5]].join(' ') || '').toLowerCase();
    for (const rule of rules) {
      // allow multiple keywords separated by '|' or ';'
      const parts = rule.key.split(/\||;/).map(s => s.trim()).filter(Boolean);
      const matches = parts.some(p => p && searchText.indexOf(p) !== -1);
      if (matches) {
        txSheet.getRange(i + 1, 8).setValue(rule.cat); // Column H
        break;
      }
    }
  }
}

/**
 * Build dashboard with a SINGLE pie chart (mode = COUNT or AMOUNT) + Net Worth line.
 */
function buildDashboard() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let dash = ss.getSheetByName(DASHBOARD_SHEET_NAME);
  if (dash) ss.deleteSheet(dash);
  dash = ss.insertSheet(DASHBOARD_SHEET_NAME, 0);
  dash.getRange('A1').setValue('Financial Dashboard').setFontSize(14).setFontWeight('bold');

  const txSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const nwSheet = ss.getSheetByName(NETWORTH_SHEET_NAME);

  // Build data helpers for the selected pie mode
  if (txSheet && txSheet.getLastRow() > 1) {
    const tx = txSheet.getRange(2, 1, txSheet.getLastRow() - 1, 8).getValues();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const spendByCategory = {};
    const countByCategory = {};

    tx.forEach(r => {
      const d = new Date(r[0]);
      const amt = parseFloat(r[1] || 0);
      const cat = (r[7] || 'Uncategorized').toString();
      if (isNaN(d.getTime()) || d < cutoff) return;
      if (amt < 0) {
        spendByCategory[cat] = (spendByCategory[cat] || 0) + Math.abs(amt);
        countByCategory[cat] = (countByCategory[cat] || 0) + 1;
      }
    });

    const headers = [['Category', PIE_MODE === 'COUNT' ? 'Count' : 'Amount']];
    const dataRows = Object.entries(PIE_MODE === 'COUNT' ? countByCategory : spendByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => [k, v]);

    if (dataRows.length) {
      const table = headers.concat(dataRows);
      const startCol = 10; // J
      const range = dash.getRange(2, startCol, table.length, 2);
      range.setValues(table);

      const pieTitle = PIE_MODE === 'COUNT' ? 'Transactions by Category (Count, 30 days)' : 'Expenses by Category ($, 30 days)';
      const pie = dash.newChart()
        .setChartType(Charts.ChartType.PIE)
        .addRange(range)
        .setOption('title', pieTitle)
        .setPosition(2, 1, 0, 0)
        .build();
      dash.insertChart(pie);

      // hide helper cols
      dash.hideColumns(startCol, 2);
    }
  }

  // Net Worth line
  if (nwSheet && nwSheet.getLastRow() > 1) {
    const line = dash.newChart()
      .setChartType(Charts.ChartType.LINE)
      .addRange(nwSheet.getRange(1, 1, nwSheet.getLastRow(), 2))
      .setOption('title', 'Net Worth Over Time')
      .setPosition(20, 1, 0, 0)
      .build();
    dash.insertChart(line);
  }
}

function applyConditionalFormatting() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const txSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const accSheet = ss.getSheetByName(ACCOUNTS_SHEET_NAME);

  if (txSheet) {
    const txRange = txSheet.getRange('B2:B' + txSheet.getMaxRows());
    txSheet.clearConditionalFormatRules();
    const txRules = [
      SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setFontColor('#FF0000').setRanges([txRange]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setFontColor('#008000').setRanges([txRange]).build()
    ];
    txSheet.setConditionalFormatRules(txRules);
  }

  if (accSheet) {
    const accRange = accSheet.getRange('B2:B' + accSheet.getMaxRows());
    accSheet.clearConditionalFormatRules();
    const accRules = [
      SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setBackground('#f8d7da').setRanges([accRange]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setBackground('#d4edda').setRanges([accRange]).build()
    ];
    accSheet.setConditionalFormatRules(accRules);
  }
}

// -----------------------------------------------------------------------------------
// --- CORE HELPER FUNCTIONS & PARSERS ---
// -----------------------------------------------------------------------------------

function _logNewEmails(ss) {
  const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const stagingSheet = ss.getSheetByName(STAGING_SHEET_NAME);
  const accountsSheet = ss.getSheetByName(ACCOUNTS_SHEET_NAME);

  if (!mainSheet || !stagingSheet || !accountsSheet) throw new Error('A required sheet is missing. Check config names.');

  const mainSheetIds = mainSheet.getLastRow() > 1 ? mainSheet.getRange(2, 7, mainSheet.getLastRow() - 1, 1).getValues().flat() : [];
  const stagingSheetIds = stagingSheet.getLastRow() > 1 ? stagingSheet.getRange(2, 7, stagingSheet.getLastRow() - 1, 1).getValues().flat() : [];
  const loggedIds = new Set([...mainSheetIds, ...stagingSheetIds]);

  const threads = GmailApp.search('label:Transfers newer_than:5d');

  threads.forEach(thread => {
    thread.getMessages().forEach(message => {
      try {
        const id = message.getId();
        if (loggedIds.has(id)) return;

        const fromEmail = (message.getFrom() || '').toLowerCase();
        const subject = (message.getSubject() || '').toLowerCase();
        let parsedData = null;

        if (fromEmail.includes('pcfinancial.ca') || fromEmail.includes('account.pcfinancial.ca')) {
          if (subject.includes('purchase notice')) {
            parsedData = _parsePcMoneyPurchase(message);
            if (parsedData) {
              if (!parsedData.merchant || (parsedData.merchant && parsedData.merchant.toLowerCase().includes('wealthsimple'))) {
                stagingSheet.appendRow([new Date(), parsedData.amount, parsedData.fromAccount, parsedData.toAccount, parsedData.bank, parsedData.emailId, new Date()]);
              } else {
                parsedData.toAccount = parsedData.merchant || 'Merchant';
                _commitTransaction(mainSheet, accountsSheet, parsedData, 'PAD');
              }
            }
          } else if (subject.includes('transfer to')) {
            const t = _parsePcInteracTransfer(message);
            if (t) stagingSheet.appendRow([new Date(), t.amount, t.fromAccount, t.toAccount, t.bank, t.emailId, new Date()]);
          } else if (subject.includes('bill payment')) {
            // Optional: parse PCF bill payment notice if available and stage
          }
        } else if (fromEmail.includes('payments.interac.ca')) {
          parsedData = _parseInteracCatchEmail(message);
          if (parsedData) _commitTransaction(mainSheet, accountsSheet, parsedData, parsedData.transferType);
        } else if (fromEmail.includes('o.wealthsimple.com') || fromEmail.includes('support@wealthsimple.com')) {
          if (subject.includes('order has been filled')) {
            parsedData = _parseWealthsimpleTrade(message);
            if (parsedData) _commitTransaction(mainSheet, accountsSheet, parsedData, parsedData.transferType);
          } else if (subject.includes('deposit')) {
            parsedData = _parseWealthsimpleDeposit(message);
            if (parsedData) stagingSheet.appendRow([new Date(), parsedData.amount, parsedData.fromAccount, parsedData.toAccount, parsedData.bank, parsedData.emailId, new Date()]);
          }
        } else if (fromEmail.includes('cibc')) {
          if (subject.includes('purchase')) {
            parsedData = _parseCibcCreditCardPurchase(message);
            if (parsedData) _commitTransaction(mainSheet, accountsSheet, parsedData, 'Purchase');
          } else if (subject.includes('new payment to your credit card') || subject.includes('payment received') || subject.includes('payment has been applied') || subject.includes('credit card payment')) {
            parsedData = _parseCibcCardPayment(message, accountsSheet);
            if (parsedData) _commitTransaction(mainSheet, accountsSheet, parsedData, 'Credit Card Payment');
          }
        }
      } catch (e) {
        Logger.log(`-> ERROR processing message ID ${message.getId()}: ${e.message}`);
      }
    });
  });
}

function _commitTransaction(mainSheet, accountsSheet, parsedData, transferType) {
  if (!parsedData) return;

  // Normalize account names
  parsedData.fromAccount = _normalizeAccountName(parsedData.fromAccount);
  parsedData.toAccount = _normalizeAccountName(parsedData.toAccount);

  mainSheet.appendRow([
    parsedData.date || new Date(),
    parsedData.amount,
    parsedData.fromAccount || '',
    parsedData.toAccount || '',
    parsedData.bank || '',
    parsedData.notes || '',
    parsedData.emailId || `AUTO-${new Date().getTime()}`,
    parsedData.category || '',
    transferType || ''
  ]);

  _updateAccountBalances(parsedData, accountsSheet);
}

function _cleanupStaleStagingEntries(ss) {
  const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const stagingSheet = ss.getSheetByName(STAGING_SHEET_NAME);
  const accountsSheet = ss.getSheetByName(ACCOUNTS_SHEET_NAME);
  if (!stagingSheet || stagingSheet.getLastRow() < 2) return;

  const data = stagingSheet.getDataRange().getValues();
  const now = new Date();
  const windowMs = 48 * 60 * 60 * 1000; // 48 hours pairing window

  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const stamp = new Date(row[6]);
    if (now.getTime() - stamp.getTime() > windowMs) {
      const stale = {
        date: new Date(row[0]),
        amount: row[1],
        fromAccount: row[2],
        toAccount: row[3] || 'External Deposit',
        bank: row[4] || 'Staged',
        emailId: row[5],
        notes: 'Auto-logged (Stale)'
      };
      _commitTransaction(mainSheet, accountsSheet, stale, 'Stale');
      stagingSheet.deleteRow(i + 1);
    }
  }
}

function _updateAccountBalances(parsedData, accountsSheet) {
  const { fromAccount, toAccount, amount } = parsedData;
  const fromRow = _findAccountRowByNameOrAlias(fromAccount, accountsSheet);
  const toRow = _findAccountRowByNameOrAlias(toAccount, accountsSheet);

  if (fromRow !== -1) {
    const bal = parseFloat(accountsSheet.getRange(fromRow, 2).getValue()) || 0;
    accountsSheet.getRange(fromRow, 2).setValue(bal + amount);
    accountsSheet.getRange(fromRow, 3).setValue(new Date());
  }

  if (toRow !== -1) {
    // If both sides are our accounts, treat as internal transfer and add ABS(amount) to the destination.
    const fromIsMine = !!_findAccountRowByNameOrAlias(fromAccount, accountsSheet);
    const amtToAdd = fromIsMine ? Math.abs(amount) : amount;
    const balTo = parseFloat(accountsSheet.getRange(toRow, 2).getValue()) || 0;
    accountsSheet.getRange(toRow, 2).setValue(balTo + amtToAdd);
    accountsSheet.getRange(toRow, 3).setValue(new Date());
  }
}

function _updateTotalNetWorth(mainSheet, accountsSheet) {
  if (accountsSheet.getLastRow() < 2) return;
  const balances = accountsSheet.getRange(2, 2, accountsSheet.getLastRow() - 1, 1).getValues();
  const totalNetWorth = balances.reduce((sum, row) => sum + parseFloat(row[0] || 0), 0);

  mainSheet.getRange('L1').setValue(totalNetWorth).setNumberFormat('$#,##0.00');
  mainSheet.getRange('K1').setValue('Total Net Worth:').setFontWeight('bold');
}

// ------------------------- Parsers -------------------------

function _parseInteracCatchEmail(message) {
  const body = (message.getPlainBody() || '') + ' ' + (message.getBody() || '');
  const subject = message.getSubject() || '';
  const amountMatch = body.match(/sent you \$([0-9,]+\.[0-9]{2})/i) || body.match(/Amount:\s*\$([0-9,]+\.[0-9]{2})/i);
  const senderMatch = body.match(/([A-Za-z0-9 .'-]+) sent you \$/i);
  if (!amountMatch) return null;

  const senderName = senderMatch ? senderMatch[1].trim() : 'Unknown Sender';
  const senderBank = subject;

  let transferType = 'External Transfer';
  if (MY_BANK_KEYWORDS.some(bank => senderBank.toLowerCase().includes(bank.toLowerCase()))) transferType = 'Internal Transfer';

  return {
    date: message.getDate(),
    amount: parseFloat(amountMatch[1].replace(/,/g, '')),
    fromAccount: `e-Transfer from ${senderName}`,
    toAccount: 'PC Financial',
    bank: `Interac Deposit (${subject})`,
    transferType: transferType,
    emailId: message.getId()
  };
}

function _parsePcMoneyPurchase(message) {
  const text = (message.getPlainBody() || '') + ' ' + (message.getBody() || '');
  const amountMatch = text.match(/Purchase amount[:\s]*\$([0-9,]+\.[0-9]{2})/i);
  const dateMatch = text.match(/Transaction date[:\s]*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
  const merchantMatch = text.match(/Merchant:\s*([^\n\r]+)/i);
  if (!amountMatch) return null;

  return {
    date: dateMatch ? new Date(dateMatch[1]) : message.getDate(),
    amount: parseFloat(amountMatch[1].replace(/,/g, '')) * -1,
    fromAccount: 'PC Financial',
    toAccount: merchantMatch ? merchantMatch[1].trim() : '',
    bank: 'PC Money Purchase',
    merchant: merchantMatch ? merchantMatch[1].trim() : '',
    emailId: message.getId()
  };
}

function _parsePcInteracTransfer(message) {
  const subject = message.getSubject() || '';
  const body = (message.getPlainBody() || '') + ' ' + (message.getBody() || '');
  const amountMatch = subject.match(/\$([0-9,]+\.[0-9]{2})/i) || body.match(/\$([0-9,]+\.[0-9]{2})/i);
  const recipientMatch = subject.match(/transfer\s+to\s+(.+)\s+has been/i) || body.match(/to\s+([A-Za-z0-9 .'-]+)\s+has been/i);
  const dateMatch = body.match(/([A-Za-z]{3}\s+\d{1,2},\s+\d{4})/i);
  if (!amountMatch || !recipientMatch) return null;

  const rawRecipient = recipientMatch[1].trim();
  let toAccount, transferType;
  if (MY_ACCOUNTS.some(acc => rawRecipient.toLowerCase().includes(acc.toLowerCase()))) {
    toAccount = rawRecipient;
    transferType = 'Internal Transfer';
  } else {
    toAccount = `External to ${rawRecipient}`;
    transferType = 'External Transfer';
  }

  return {
    date: dateMatch ? new Date(dateMatch[1]) : message.getDate(),
    amount: parseFloat(amountMatch[1].replace(/,/g, '')) * -1,
    fromAccount: 'PC Financial',
    toAccount: toAccount,
    bank: 'PC Financial e-Transfer',
    transferType: transferType,
    emailId: message.getId()
  };
}

function _parseWealthsimpleDeposit(message) {
  const body = (message.getPlainBody() || '') + ' ' + (message.getBody() || '');
  const amountMatch = body.match(/Amount:\s*\$([0-9,]+\.[0-9]{2})\s*CAD/i);
  const toMatch = body.match(/To:\s*([\s\S]*?)\s*Sometimes/i);
  if (!amountMatch || !toMatch) return null;

  const fromAccount = 'PC Financial';
  const rawTo = toMatch[1].replace(/\n/g, ' ').trim().toLowerCase();

  let finalTo = 'Wealthsimple';
  if (rawTo.includes('rrsp')) finalTo = 'Wealthsimple RRSP';
  else if (rawTo.includes('crypto')) finalTo = 'Wealthsimple Crypto';
  else if (rawTo.includes('cash')) finalTo = 'Wealthsimple Cash';

  return {
    date: message.getDate(),
    amount: parseFloat(amountMatch[1].replace(/,/g, '')),
    fromAccount: fromAccount,
    toAccount: finalTo,
    bank: 'Wealthsimple Deposit',
    transferType: 'Internal Transfer',
    emailId: message.getId()
  };
}

function _parseWealthsimpleTrade(message) {
  try {
    const body = (message.getPlainBody() || '') + ' ' + (message.getBody() || '');
    const m = body.match(/(\d+\.?\d*)\s+shares\s+of\s+([A-Z\.]+)[\s\S]+?Total cost:\s*\$([0-9,]+\.[0-9]+)[\s\S]+?Account:\s*([\s\S]*?)\s*Time:/i);
    if (!m) return null;

    const shares = parseFloat(m[1]);
    const ticker = m[2].trim();
    const amount = parseFloat(m[3].replace(/,/g, '')) * -1;
    const acctRaw = m[4].replace(/\n/g, ' ').trim().toLowerCase();
    const fromAccount = 'Cash';

    let finalTo = 'Wealthsimple Trade';
    if (acctRaw.includes('rrsp')) finalTo = 'Wealthsimple RRSP';
    else if (acctRaw.includes('crypto')) finalTo = 'Wealthsimple Crypto';

    _updateHoldings(finalTo, ticker, shares);

    return {
      date: message.getDate(),
      amount: amount,
      fromAccount: fromAccount,
      toAccount: finalTo,
      bank: 'Wealthsimple Trade',
      transferType: 'Internal Transfer',
      emailId: message.getId()
    };
  } catch (e) {
    Logger.log(`Failed to parse Wealthsimple Trade. Subject: "${message.getSubject()}" Error: ${e.message}`);
    return null;
  }
}

/**
 * CIBC purchase
 */
function _parseCibcCreditCardPurchase(message) {
  const body = (message.getPlainBody() || '') + ' ' + (message.getBody() || '');
  const amountMatch = body.match(/Amount:\s*\$([0-9,]+\.[0-9]{2})/i) || body.match(/\$([0-9,]+\.[0-9]{2})\s*(CAD)?/i);
  const merchantMatch = body.match(/at\s+([A-Z0-9 \._\-&']+)\s+was/i) || body.match(/Merchant:\s*([^\n\r]+)/i);
  const cardMatch = body.match(/CIBC\s+(Aventura|Dividend)/i);
  if (!amountMatch || !cardMatch) return null;

  const amount = parseFloat((amountMatch[1] || '0').replace(/,/g, '')) * -1;
  const merchant = merchantMatch ? merchantMatch[1].trim() : 'Merchant';
  const cardType = cardMatch[1].trim();
  const fromAccount = `CIBC ${cardType}`;
  if (!MY_ACCOUNTS.includes(fromAccount)) return null;

  return {
    date: message.getDate(),
    amount: amount,
    fromAccount: fromAccount,
    toAccount: merchant,
    bank: `CIBC ${cardType} Purchase`,
    emailId: message.getId()
  };
}

/**
 * NEW: CIBC credit card payment posted email.
 * Accepts subjects like "New payment to your credit card", "Payment received", etc.
 * Tries to infer the correct CIBC card account and credits it by +amount (reducing negative balance towards 0).
 */
function _parseCibcCardPayment(message, accountsSheet) {
  const subject = (message.getSubject() || '').toLowerCase();
  const body = ((message.getPlainBody() || '') + ' ' + (message.getBody() || '')).replace(/\s+/g, ' ');

  const amountMatch = body.match(/payment\s+of\s*\$([0-9,]+\.[0-9]{2})/i) ||
                      body.match(/Amount:\s*\$([0-9,]+\.[0-9]{2})/i) ||
                      subject.match(/\$([0-9,]+\.[0-9]{2})/i);

  // Card hint
  const aventura = /aventura/i.test(body) || /aventura/i.test(subject);
  const dividend = /dividend/i.test(body) || /dividend/i.test(subject);

  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

  // pick card account
  let toAccount = null;
  if (aventura) toAccount = 'CIBC Aventura';
  else if (dividend) toAccount = 'CIBC Dividend';
  else {
    // Heuristic: if only one CIBC card exists or has negative balance, pick that.
    const rows = accountsSheet.getDataRange().getValues();
    const cibcRows = rows.slice(1).filter(r => (r[0] || '').toString().toLowerCase().startsWith('cibc '));
    if (cibcRows.length === 1) toAccount = rows[rows.indexOf(cibcRows[0]) + 0][0];
    else {
      // Prefer the one with the more negative balance
      let best = null; let bestBal = 0;
      for (let i = 1; i < rows.length; i++) {
        const name = (rows[i][0] || '').toString();
        if (!/^CIBC\s/i.test(name)) continue;
        const bal = parseFloat(rows[i][1] || 0);
        if (best === null || bal < bestBal) { best = name; bestBal = bal; }
      }
      toAccount = best || 'CIBC Aventura';
    }
  }

  return {
    date: message.getDate(),
    amount: amount, // crediting the card (liability decreases -> balance moves toward 0)
    fromAccount: '',
    toAccount: toAccount,
    bank: 'CIBC Credit Card Payment',
    notes: 'Auto-logged (Payment Posted)',
    emailId: message.getId()
  };
}

function _updateHoldings(accountName, ticker, sharesToAdd) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(HOLDINGS_SHEET_NAME);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === accountName && data[i][1] === ticker) {
      const currentShares = parseFloat(data[i][2]) || 0;
      sheet.getRange(i + 1, 3).setValue(currentShares + sharesToAdd);
      found = true;
      break;
    }
  }
  if (!found) sheet.appendRow([accountName, ticker, sharesToAdd]);
}

// ------------------------- Utilities -------------------------

function _findAccountRowByNameOrAlias(name, accountsSheet) {
  if (!name) return -1;
  const target = _normalizeAccountName(name).toLowerCase();
  const data = accountsSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const curr = (data[i][0] || '').toString().toLowerCase();
    if (curr === target) return i + 1;
  }
  // fuzzy contains match if exact not found
  for (let i = 1; i < data.length; i++) {
    const curr = (data[i][0] || '').toString().toLowerCase();
    if (target && (curr.includes(target) || target.includes(curr))) return i + 1;
  }
  return -1;
}

function _normalizeAccountName(name) {
  if (!name) return name;
  const low = name.toString().toLowerCase().trim();
  for (const [alias, canonical] of Object.entries(ACCOUNT_ALIASES)) {
    if (low.includes(alias)) return canonical;
  }
  // Fall back to the closest known account by exact name
  const hit = MY_ACCOUNTS.find(a => low.includes(a.toLowerCase()));
  return hit || name;
}

function _ensureSheetsExist(ss) {
  const ensure = (name, headers) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (headers && sh.getLastRow() === 0) sh.appendRow(headers);
  };
  ensure(MAIN_SHEET_NAME, ['Date', 'Amount', 'From', 'To', 'Bank', 'Notes', 'EmailId', 'Category', 'Type']);
  ensure(ACCOUNTS_SHEET_NAME, ['Account', 'Balance', 'Last Updated']);
  ensure(CATEGORIES_SHEET_NAME, ['Keyword', 'Category']);
  ensure(STAGING_SHEET_NAME, ['Date', 'Amount', 'From', 'To', 'Bank', 'EmailId', 'StagedAt']);
  ensure(NETWORTH_SHEET_NAME, ['Date', 'Net Worth']);
  ensure(HOLDINGS_SHEET_NAME, ['Account', 'Ticker', 'Shares', 'Price']);
  ensure(CSV_IMPORT_SHEET_NAME);
  ensure(DASHBOARD_SHEET_NAME);
}

