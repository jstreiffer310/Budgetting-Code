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
  "PC Financial",
  "Wealthsimple RRSP",
  "Wealthsimple Crypto",
  "Wealthsimple Cash",
  "CIBC Aventura",
  "CIBC Dividend",
  "Cash"
];

// Keywords for your banks to help identify internal vs. external transfers.
const MY_BANK_KEYWORDS = ["PC Financial", "Wealthsimple"];

// -----------------------------------------------------------------------------------
// --- MENU & MAIN RUNNER ---
// -----------------------------------------------------------------------------------

/**
 * Creates a custom menu in the spreadsheet UI when the file is opened.
 */
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

/**
 * An onEdit trigger that runs when a user changes a value in the spreadsheet.
 * Specifically, it watches for manual balance changes on the 'Accounts' sheet
 * and logs a "Manual Correction" transaction.
 * @param {Object} e The event object.
 */
function onEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  
  // Check if the edit was on the 'Balance' column of the 'Accounts' sheet.
  if (sheet.getName() === ACCOUNTS_SHEET_NAME && range.getColumn() === 2 && range.getRow() > 1) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const txSheet = ss.getSheetByName(MAIN_SHEET_NAME);
    
    const accountName = sheet.getRange(range.getRow(), 1).getValue();
    const oldValue = parseFloat(e.oldValue || 0);
    const newValue = parseFloat(e.value || 0);
    const difference = newValue - oldValue;

    // Only log a transaction if the change is significant.
    if (Math.abs(difference) > 0.001) {
      txSheet.appendRow([
        new Date(),
        difference,
        "Manual Correction",
        accountName,
        "Manual Adjustment",
        `Balance changed from ${oldValue.toFixed(2)} to ${newValue.toFixed(2)}`,
        `MANUAL-${new Date().getTime()}`,
        "Correction",
        "Adjustment"
      ]);
      // Update the 'Last Updated' timestamp for the account.
      sheet.getRange(range.getRow(), 3).setValue(new Date());
      _updateTotalNetWorth(txSheet, sheet);
    }
  }
}

/**
 * Main function to process new transactions from emails.
 * It cleans up old staging entries, logs new emails, updates net worth,
 * and applies learned categories.
 */
function processNewTransactions() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const accountsSheet = ss.getSheetByName(ACCOUNTS_SHEET_NAME);
    const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);

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
 * Fetches the latest market prices for tickers listed in the 'Holdings' sheet
 * and updates their corresponding account balances.
 * NOTE: This relies on web scraping Yahoo Finance, which can be fragile.
 */
function updateInvestmentValues() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const holdingsSheet = ss.getSheetByName(HOLDINGS_SHEET_NAME);
  const accountsSheet = ss.getSheetByName(ACCOUNTS_SHEET_NAME);

  if (!holdingsSheet || holdingsSheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert("The 'Holdings' sheet is empty or missing.");
    return;
  }
  
  const holdingsData = holdingsSheet.getRange(2, 1, holdingsSheet.getLastRow() - 1, 3).getValues();
  const accountTotals = {};

  holdingsData.forEach(row => {
    const accountName = row[0];
    const ticker = row[1];
    const shares = parseFloat(row[2]);

    if (!accountName || !ticker || isNaN(shares)) return;

    try {
      // Fetch content from Yahoo Finance for the given ticker.
      const url = `https://finance.yahoo.com/quote/${ticker}`;
      const response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});
      const content = response.getContentText();
      
      // Use regex to find the regular market price from the page content.
      const priceMatch = content.match(new RegExp(`"${ticker}":{[^}]+"regularMarketPrice":{.*?"fmt":"([\\d,]+\\.\\d+)"`));

      if (priceMatch && priceMatch[1]) {
        const price = parseFloat(priceMatch[1].replace(/,/g, ''));
        const value = shares * price;
        accountTotals[accountName] = (accountTotals[accountName] || 0) + value;
      } else {
        Logger.log(`Could not find price for ticker: ${ticker}`);
      }
    } catch (e) {
      Logger.log(`Error fetching data for ${ticker}: ${e.message}`);
    }
  });

  // Update the balances in the 'Accounts' sheet.
  const accountData = accountsSheet.getDataRange().getValues();
  const accountMap = new Map(accountData.slice(1).map((row, i) => [row[0], i + 2]));

  for (const [accountName, totalValue] of Object.entries(accountTotals)) {
    if (accountMap.has(accountName)) {
      const rowIndex = accountMap.get(accountName);
      accountsSheet.getRange(rowIndex, 2).setValue(totalValue);
      accountsSheet.getRange(rowIndex, 3).setValue(new Date());
    }
  }

  SpreadsheetApp.getUi().alert("Investment values have been updated.");
  _updateTotalNetWorth(ss.getSheetByName(MAIN_SHEET_NAME), accountsSheet);
}

/**
 * Imports transactions from data pasted into the 'CSV_Import' sheet.
 * It auto-detects the bank format based on predefined profiles.
 */
function importFromCsv() {
  // Define profiles for different CSV formats.
  const CSV_PROFILES = [
    { name: "CIBC Aventura Card", identifyingKeyword: "4500********6271", accountName: "CIBC Aventura", columnMap: { date: 1, description: 2, debit: 3, credit: 4 } },
    { name: "CIBC Dividend Card", identifyingKeyword: "4505********2866", accountName: "CIBC Dividend", columnMap: { date: 1, description: 2, debit: 3, credit: 4 } },
    { name: "PC Financial Cash Account", identifyingKeyword: "Card Holder Name", accountName: "PC Financial", columnMap: { date: 4, description: 1, amount: 6 } },
    { name: "PC Financial Savings Account", identifyingKeyword: "Transfer In", accountName: "PC Financial", columnMap: { date: 3, description: 1, amount: 5 } },
    { name: "Wealthsimple RRSP", identifyingKeyword: "Vanguard FTSE Canada Index ETF", accountName: "Wealthsimple RRSP", columnMap: { date: 1, description: 3, amount: 4 } },
    { name: "Wealthsimple Crypto", identifyingKeyword: "Dogecoin", accountName: "Wealthsimple Crypto", columnMap: { date: 1, description: 3, amount: 4 } }
  ];

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const importSheet = ss.getSheetByName(CSV_IMPORT_SHEET_NAME);
  const txSheet = ss.getSheetByName(MAIN_SHEET_NAME);

  if (!importSheet || importSheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert("The 'CSV_Import' sheet is empty.");
    return;
  }

  const importData = importSheet.getRange(1, 1, importSheet.getLastRow(), importSheet.getLastColumn()).getValues();
  
  // Auto-detect the CSV profile.
  let detectedProfile = null;
  for (const row of importData) {
    const rowText = row.join(" ").toLowerCase();
    for (const profile of CSV_PROFILES) {
      if (rowText.includes(profile.identifyingKeyword.toLowerCase())) {
        detectedProfile = profile;
        break;
      }
    }
    if (detectedProfile) break;
  }

  if (!detectedProfile) {
    SpreadsheetApp.getUi().alert("Could not identify the bank from the CSV data. Please check your CSV_PROFILES configuration.");
    return;
  }
  SpreadsheetApp.getUi().alert(`Detected "${detectedProfile.name}" format. Starting import...`);

  // Use a Set for efficient de-duplication of transactions.
  const existingTxData = txSheet.getDataRange().getValues();
  const existingTxSet = new Set(existingTxData.map(r => `${new Date(r[0]).toDateString()}|${parseFloat(r[1]).toFixed(2)}|${r[3]}`));
  
  let importedCount = 0;

  importData.forEach(row => {
    const { date, description, debit, credit, amount: singleAmountCol } = detectedProfile.columnMap;
    
    const dateValue = row[date - 1];
    const txDate = new Date(dateValue);
    
    if (isNaN(txDate.getTime())) return; // Skip invalid dates.

    const txDesc = row[description - 1];
    let amount;

    // Handle CSVs with a single amount column vs. separate debit/credit columns.
    if (singleAmountCol) {
        amount = parseFloat(row[singleAmountCol - 1] || 0);
    } else {
        const debitAmount = parseFloat(row[debit - 1] || 0);
        const creditAmount = parseFloat(row[credit - 1] || 0);
        amount = creditAmount - debitAmount;
    }

    if (isNaN(amount) || !txDesc || amount === 0) return; // Skip invalid rows.

    // Create a unique key to prevent duplicate entries.
    const uniqueKey = `${txDate.toDateString()}|${amount.toFixed(2)}|${txDesc}`;
    
    if (!existingTxSet.has(uniqueKey)) {
      const fromAccount = amount < 0 ? detectedProfile.accountName : txDesc;
      const toAccount = amount > 0 ? detectedProfile.accountName : txDesc;
      
      txSheet.appendRow([
        txDate,
        amount,
        fromAccount,
        toAccount,
        "CSV Import",
        `Imported from ${detectedProfile.name}`,
        `CSV-${new Date().getTime()}`,
        "",
        "CSV Import"
      ]);
      importedCount++;
    }
  });

  importSheet.clearContents();
  SpreadsheetApp.getUi().alert(`Import complete. Added ${importedCount} new transaction(s) for "${detectedProfile.name}".`);
}

/**
 * Scans transaction descriptions to find common merchant names and suggests them
 * as new keywords in the 'Categories' sheet.
 */
function suggestCategoriesFromTransactions() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const txSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  let catSheet = ss.getSheetByName(CATEGORIES_SHEET_NAME);

  if (!catSheet) {
    catSheet = ss.insertSheet(CATEGORIES_SHEET_NAME);
    catSheet.appendRow(["Keyword", "Category"]);
  }

  if (!txSheet || txSheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert("The 'Transactions' sheet is empty.");
    return;
  }

  const txData = txSheet.getRange(2, 4, txSheet.getLastRow() - 1, 1).getValues();
  const merchantCounts = {};
  const commonWords = new Set(['payment', 'transfer', 'inc', 'ltd', 'corp', 'on', 'toronto', 'thank', 'you', 'ltd/ltée', 'e-transfer']);

  txData.forEach(row => {
    const description = (row[0] || "").toLowerCase();
    let cleanDescription = description.replace(/internet banking|e-transfer from|payment thank you\/paiemen t merci|external to/g, '').trim();
    const potentialMerchants = cleanDescription.split(/\s{2,}|,|-/); 

    potentialMerchants.forEach(merchant => {
      let cleanMerchant = merchant.replace(/[\*#\d-]/g, ' ').trim();
      if (cleanMerchant.length > 3 && !commonWords.has(cleanMerchant.toLowerCase())) {
        merchantCounts[cleanMerchant] = (merchantCounts[cleanMerchant] || 0) + 1;
      }
    });
  });

  const existingCats = catSheet.getLastRow() > 1 ? catSheet.getRange(2, 1, catSheet.getLastRow() - 1, 1).getValues().flat().map(c => c.toLowerCase()) : [];
  const sortedMerchants = Object.entries(merchantCounts).sort((a, b) => b[1] - a[1]);
  
  let suggestionsAdded = 0;
  sortedMerchants.forEach(([merchant, count]) => {
    // Only suggest merchants that appear more than once and aren't already listed.
    if (count > 1 && !existingCats.includes(merchant.toLowerCase())) {
      catSheet.appendRow([merchant.toUpperCase(), ""]);
      suggestionsAdded++;
    }
  });

  SpreadsheetApp.getUi().alert(`${suggestionsAdded} new category keywords suggested. Please go to the 'Categories' sheet to assign categories.`);
}

/**
 * Logs the total net worth for the current day. If a log for today already exists,
 * it updates it; otherwise, it appends a new row.
 * @param {Sheet} accountsSheet The 'Accounts' sheet object.
 */
function _logNetWorthHistory(accountsSheet) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(NETWORTH_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(NETWORTH_SHEET_NAME).appendRow(["Date", "Net Worth"]);

  const today = new Date().toDateString();
  const lastRow = sheet.getLastRow();
  const balances = accountsSheet.getRange(2, 2, accountsSheet.getLastRow() - 1, 1).getValues();
  const totalNetWorth = balances.reduce((sum, row) => sum + parseFloat(row[0] || 0), 0);

  if (lastRow > 1 && new Date(sheet.getRange(lastRow, 1).getValue()).toDateString() === today) {
    // Update today's entry.
    sheet.getRange(lastRow, 2).setValue(totalNetWorth);
  } else {
    // Add a new entry for today.
    sheet.appendRow([new Date(), totalNetWorth]);
  }
}

/**
 * Automatically assigns categories to transactions based on keywords
 * defined in the 'Categories' sheet.
 */
function learnCategories() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const txSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const catSheet = ss.getSheetByName(CATEGORIES_SHEET_NAME);

  if (!catSheet || catSheet.getLastRow() < 2) return;
  if (!txSheet || txSheet.getLastRow() < 2) return;

  const txData = txSheet.getDataRange().getValues();
  const catData = catSheet.getRange(2, 1, catSheet.getLastRow() - 1, 2).getValues();
  const catMap = new Map(catData.map(r => [r[0].toLowerCase(), r[1]]));

  for (let i = 1; i < txData.length; i++) {
    const toAccount = (txData[i][3] || "").toLowerCase();
    const categoryCell = txSheet.getRange(i + 1, 8); // Column H for Category

    // Only categorize if the cell is empty.
    if (!categoryCell.getValue()) {
      for (let [keyword, category] of catMap.entries()) {
        if (toAccount.includes(keyword)) {
          categoryCell.setValue(category);
          break; // Stop after the first match.
        }
      }
    }
  }
}

/**
 * [FIXED] Deletes and rebuilds the 'Dashboard' sheet with updated charts.
 */
function buildDashboard() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let dash = ss.getSheetByName(DASHBOARD_SHEET_NAME);
  if (dash) {
    ss.deleteSheet(dash);
  }
  dash = ss.insertSheet(DASHBOARD_SHEET_NAME, 0);
  dash.getRange("A1").setValue("Financial Dashboard").setFontSize(14).setFontWeight("bold");

  const charts = [];
  const txSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const nwSheet = ss.getSheetByName(NETWORTH_SHEET_NAME);

  // Create Expenses Pie Chart (Last 30 Days)
  if (txSheet && txSheet.getLastRow() > 1) {
    const txData = txSheet.getRange(2, 1, txSheet.getLastRow() - 1, 8).getValues();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const expenseData = txData
      .filter(r => new Date(r[0]) >= cutoff && r[1] < 0)
      .reduce((acc, row) => {
        const category = row[7] || "Uncategorized";
        const amount = Math.abs(row[1]);
        acc[category] = (acc[category] || 0) + amount;
        return acc;
      }, {});

    if (Object.keys(expenseData).length > 0) {
      // Create a 2D array for the chart data, including headers.
      const chartData = [["Category", "Amount"]];
      for (const [category, amount] of Object.entries(expenseData)) {
        chartData.push([category, amount]);
      }

      // Write the data to a temporary location on the dashboard sheet.
      const dataRange = dash.getRange(2, 10, chartData.length, 2); // Start at J2
      dataRange.setValues(chartData);

      // Build the chart using the range we just created.
      const pieChart = dash.newChart()
        .setChartType(Charts.ChartType.PIE)
        .addRange(dataRange) // Use addRange instead of setDataTable
        .setOption('title', 'Expenses by Category (Last 30 Days)')
        .setPosition(2, 1, 0, 0)
        .build();
      charts.push(pieChart);
      
      // Optionally hide the data columns to keep the dashboard clean.
      dash.hideColumns(10, 2); // Hides columns J and K
    }
  }

  // Create Net Worth Over Time Line Chart
  if (nwSheet && nwSheet.getLastRow() > 1) {
    charts.push(
      dash.newChart()
      .setChartType(Charts.ChartType.LINE)
      .addRange(nwSheet.getRange(1, 1, nwSheet.getLastRow(), 2))
      .setOption('title', 'Net Worth Over Time')
      .setPosition(20, 1, 0, 0)
      .build()
    );
  }

  charts.forEach(c => dash.insertChart(c));
}


/**
 * Applies conditional formatting rules to the 'Transactions' and 'Accounts' sheets.
 */
function applyConditionalFormatting() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const txSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const accSheet = ss.getSheetByName(ACCOUNTS_SHEET_NAME);

  // Format 'Transactions' amounts (red for negative, green for positive).
  if (txSheet) {
    const txRange = txSheet.getRange("B2:B" + txSheet.getMaxRows());
    txSheet.clearConditionalFormatRules();
    const txRules = [
      SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setFontColor("#FF0000").setRanges([txRange]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setFontColor("#008000").setRanges([txRange]).build()
    ];
    txSheet.setConditionalFormatRules(txRules);
  }

  // Format 'Accounts' balances (red background for negative, green for positive).
  if (accSheet) {
    const accRange = accSheet.getRange("B2:B" + accSheet.getMaxRows());
    accSheet.clearConditionalFormatRules();
    const accRules = [
      SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setBackground("#f8d7da").setRanges([accRange]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setBackground("#d4edda").setRanges([accRange]).build()
    ];
    accSheet.setConditionalFormatRules(accRules);
  }
}

// -----------------------------------------------------------------------------------
// --- CORE HELPER FUNCTIONS & PARSERS ---
// -----------------------------------------------------------------------------------

/**
 * Scans Gmail for new transaction emails and routes them to the appropriate parser.
 * @param {Spreadsheet} ss The active spreadsheet object.
 */
function _logNewEmails(ss) {
  const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const stagingSheet = ss.getSheetByName(STAGING_SHEET_NAME);
  const accountsSheet = ss.getSheetByName(ACCOUNTS_SHEET_NAME);

  if (!mainSheet || !stagingSheet || !accountsSheet) {
    throw new Error("A required sheet is missing. Check config names.");
  }

  // Get all existing email IDs to prevent duplicates.
  const mainSheetIds = mainSheet.getLastRow() > 1 ? mainSheet.getRange(2, 7, mainSheet.getLastRow() - 1, 1).getValues().flat() : [];
  const stagingSheetIds = stagingSheet.getLastRow() > 1 ? stagingSheet.getRange(2, 7, stagingSheet.getLastRow() - 1, 1).getValues().flat() : [];
  const loggedIds = new Set([...mainSheetIds, ...stagingSheetIds]);

  const threads = GmailApp.search('label:Transfers newer_than:3d');
  
  threads.forEach(thread => {
    thread.getMessages().forEach(message => {
      try {
        const id = message.getId();
        if (loggedIds.has(id)) return;

        const fromEmail = message.getFrom().toLowerCase();
        const subject = message.getSubject();
        let parsedData;
        
        // --- ROUTING LOGIC BASED ON SENDER EMAIL ---
        
        if (fromEmail.includes("pcfinancial.ca")) {
            if (subject.includes("purchase notice")) {
                parsedData = _parsePcMoneyPurchase(message);
                if (parsedData) {
                    // If it's a transfer to another of my accounts, stage it for pairing.
                    if (!parsedData.merchant || (parsedData.merchant && parsedData.merchant.toLowerCase().includes("wealthsimple"))) {
                        stagingSheet.appendRow([ new Date(), parsedData.amount, parsedData.fromAccount, parsedData.toAccount, parsedData.bank, parsedData.emailId, new Date() ]);
                    } else {
                        mainSheet.appendRow([ parsedData.date, parsedData.amount, parsedData.fromAccount, parsedData.merchant, parsedData.bank, "Auto-logged (PAD)", parsedData.emailId, "", "PAD" ]);
                        _updateAccountBalances(parsedData, accountsSheet);
                    }
                }
            } else if (subject.includes("bill payment")) {
                // Bill payments are currently not handled, add parser if needed.
            } else if (subject.includes("transfer to")) {
                parsedData = _parsePcInteracTransfer(message);
                if (parsedData) {
                    // This logic attempts to pair outgoing transfers with incoming deposits.
                    // This is for internal transfers between your own accounts.
                    // It's not yet implemented, but the structure is here.
                }
            }
        } else if (fromEmail.includes("payments.interac.ca")) {
            parsedData = _parseInteracCatchEmail(message);
            if (parsedData) {
                mainSheet.appendRow([ parsedData.date, parsedData.amount, parsedData.fromAccount, parsedData.toAccount, parsedData.bank, `Auto-logged (Standalone)`, parsedData.emailId, "", parsedData.transferType ]);
                _updateAccountBalances(parsedData, accountsSheet);
            }
        } else if (fromEmail.includes("o.wealthsimple.com")) { 
            parsedData = _parseWealthsimpleDeposit(message);
            if (parsedData) {
                // Attempt to pair this deposit with a staged withdrawal.
                // This completes the tracking of an internal transfer.
            }
        } else if (fromEmail.includes("support@wealthsimple.com") && subject.includes("order has been filled")) {
            parsedData = _parseWealthsimpleTrade(message);
            if (parsedData) {
                mainSheet.appendRow([ parsedData.date, parsedData.amount, parsedData.fromAccount, parsedData.toAccount, parsedData.bank, `Auto-logged (Trade)`, parsedData.emailId, "", parsedData.transferType ]);
                _updateAccountBalances(parsedData, accountsSheet);
            }
        } else if (fromEmail.includes("cibc")) {
            parsedData = _parseCibcCreditCardPurchase(message);
            if (parsedData) {
                mainSheet.appendRow([ parsedData.date, parsedData.amount, parsedData.fromAccount, parsedData.toAccount, parsedData.bank, "Auto-logged (Purchase)", parsedData.emailId, "", "Purchase" ]);
                _updateAccountBalances(parsedData, accountsSheet);
            }
        }
      } catch (e) {
        Logger.log(`-> ERROR processing message ID ${message.getId()}: ${e.message}`);
      }
    });
  });
}

/**
 * Cleans up entries in the 'Staging' sheet that are older than 24 hours.
 * These are assumed to be unmatched transfers and are logged as bill payments.
 * @param {Spreadsheet} ss The active spreadsheet object.
 */
function _cleanupStaleStagingEntries(ss) {
  const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const stagingSheet = ss.getSheetByName(STAGING_SHEET_NAME);
  const accountsSheet = ss.getSheetByName(ACCOUNTS_SHEET_NAME);
  if (!stagingSheet || stagingSheet.getLastRow() < 2) return;

  const stagingData = stagingSheet.getDataRange().getValues();
  const now = new Date();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  
  for (let i = stagingData.length - 1; i >= 1; i--) {
    const row = stagingData[i];
    const timestamp = new Date(row[6]);
    if (now.getTime() - timestamp.getTime() > twentyFourHours) {
      const staleData = { 
          date: new Date(row[0]), 
          amount: row[1], 
          fromAccount: row[2], 
          toAccount: "Bill Payment (Payee Unknown)",
          bank: "PC Financial Bill Payment", 
          emailId: row[5] 
      };
      mainSheet.appendRow([ staleData.date, staleData.amount, staleData.fromAccount, staleData.toAccount, staleData.bank, "Auto-logged (Stale)", staleData.emailId, "", "Bill Payment" ]);
      _updateAccountBalances(staleData, accountsSheet);
      stagingSheet.deleteRow(i + 1);
    }
  }
}

/**
 * Updates the balances of the 'from' and 'to' accounts for a given transaction.
 * @param {Object} parsedData The parsed transaction data.
 * @param {Sheet} accountsSheet The 'Accounts' sheet object.
 */
function _updateAccountBalances(parsedData, accountsSheet) {
  const accountData = accountsSheet.getDataRange().getValues();
  const { fromAccount, toAccount, amount } = parsedData;

  const findRowIndex = (accountNameToFind) => {
      if (!accountNameToFind) return -1;
      const lowerCaseNameToFind = accountNameToFind.toLowerCase();
      for (let i = 1; i < accountData.length; i++) {
          const currentAccountName = accountData[i][0].toLowerCase();
          if (lowerCaseNameToFind === currentAccountName) {
              return i + 1;
          }
      }
      return -1;
  };

  const fromRowIndex = findRowIndex(fromAccount);
  if (fromRowIndex !== -1) {
    const currentBalance = parseFloat(accountsSheet.getRange(fromRowIndex, 2).getValue()) || 0;
    accountsSheet.getRange(fromRowIndex, 2).setValue(currentBalance + amount); 
    accountsSheet.getRange(fromRowIndex, 3).setValue(new Date());
  }

  const toRowIndex = findRowIndex(toAccount);
  if (toRowIndex !== -1) {
    const currentBalance = parseFloat(accountsSheet.getRange(toRowIndex, 2).getValue()) || 0;
    // For internal transfers, the 'to' account should receive a positive amount.
    const amountToAdd = (fromAccount && MY_ACCOUNTS.some(acc => fromAccount.toLowerCase().includes(acc.toLowerCase()))) ? Math.abs(amount) : amount;
    accountsSheet.getRange(toRowIndex, 2).setValue(currentBalance + amountToAdd);
    accountsSheet.getRange(toRowIndex, 3).setValue(new Date());
  }
}

/**
 * Updates the total net worth display cell on the main sheet.
 * @param {Sheet} mainSheet The 'Transactions' sheet object.
 * @param {Sheet} accountsSheet The 'Accounts' sheet object.
 */
function _updateTotalNetWorth(mainSheet, accountsSheet) {
    if (accountsSheet.getLastRow() < 2) return;
    const balances = accountsSheet.getRange(2, 2, accountsSheet.getLastRow() - 1, 1).getValues();
    const totalNetWorth = balances.reduce((sum, row) => sum + parseFloat(row[0] || 0), 0);
    
    mainSheet.getRange("L1").setValue(totalNetWorth).setNumberFormat("$#,##0.00");
    mainSheet.getRange("K1").setValue("Total Net Worth:").setFontWeight("bold");
}

/**
 * Parses a generic Interac e-Transfer deposit email.
 * @param {Message} message The Gmail message object.
 * @return {Object|null} Parsed data or null if parsing fails.
 */
function _parseInteracCatchEmail(message) {
  const body = message.getPlainBody();
  const subject = message.getSubject();
  const amountMatch = body.match(/sent you \$([0-9,]+\.\d{2})/i);
  const senderMatch = body.match(/(.*) sent you \$/i);
  if (!amountMatch) return null;

  const senderName = senderMatch ? senderMatch[1].trim() : "Unknown Sender";
  const senderBank = subject;
  
  let transferType = "External Transfer";
  if (MY_BANK_KEYWORDS.some(bank => senderBank.toLowerCase().includes(bank.toLowerCase()))) {
    transferType = "Internal Transfer";
  }

  return { date: message.getDate(), amount: parseFloat(amountMatch[1].replace(/,/g, '')), fromAccount: `e-Transfer from ${senderName}`, toAccount: "Your Bank Account", bank: `Interac Deposit (${subject})`, transferType: transferType, emailId: message.getId() };
}

/**
 * Parses a PC Financial Money Account purchase notification email.
 * @param {Message} message The Gmail message object.
 * @return {Object|null} Parsed data or null if parsing fails.
 */
function _parsePcMoneyPurchase(message) {
  const contentToSearch = message.getPlainBody() + " " + message.getBody();
  const amountMatch = contentToSearch.match(/Purchase amount[:\s]*\$([0-9,]+\.\d{2})/i);
  const dateMatch = contentToSearch.match(/Transaction date[:\s]*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
  const merchantMatch = contentToSearch.match(/Merchant:\s*(.+)/i);
  if (!amountMatch) return null;

  return { date: dateMatch ? new Date(dateMatch[1]) : message.getDate(), amount: parseFloat(amountMatch[1].replace(/,/g, '')) * -1, fromAccount: "PC Financial", toAccount: null, bank: "PC Money Purchase", merchant: merchantMatch ? merchantMatch[1].trim() : null, emailId: message.getId() };
}

/**
 * Parses a PC Financial Interac e-Transfer sent email.
 * @param {Message} message The Gmail message object.
 * @return {Object|null} Parsed data or null if parsing fails.
 */
function _parsePcInteracTransfer(message) {
  const subject = message.getSubject();
  const amountMatch = subject.match(/Your\s*\$([0-9,]+\.\d{2})\s*transfer/i);
  const recipientMatch = subject.match(/transfer\s+to\s+(.*)\s+has been/i);
  const dateMatch = message.getPlainBody().match(/([A-Za-z]{3}\s+\d{1,2},\s+\d{4})/i);
  if (!amountMatch || !recipientMatch) return null;

  const rawRecipient = recipientMatch[1].trim();
  let toAccount, transferType;
  if (MY_ACCOUNTS.some(acc => rawRecipient.toLowerCase().includes(acc.toLowerCase()))) {
    toAccount = rawRecipient;
    transferType = "Internal Transfer";
  } else {
    toAccount = `External to ${rawRecipient}`;
    transferType = "External Transfer";
  }

  return { date: dateMatch ? new Date(dateMatch[1]) : message.getDate(), amount: parseFloat(amountMatch[1].replace(/,/g, '')) * -1, fromAccount: null, toAccount: toAccount, bank: "PC Financial e-Transfer", transferType: transferType, emailId: message.getId() };
}

/**
 * Parses a Wealthsimple deposit confirmation email.
 * @param {Message} message The Gmail message object.
 * @return {Object|null} Parsed data or null if parsing fails.
 */
function _parseWealthsimpleDeposit(message) {
  const body = message.getPlainBody();
  const amountMatch = body.match(/Amount:\s*\$([0-9,]+\.\d{2})\s*CAD/i);
  const toMatch = body.match(/To:\s*([\s\S]*?)\s*Sometimes/i);
  if (!amountMatch || !toMatch) return null;

  const fromAccount = "PC Financial"; // Assuming deposits come from PCF
  const rawToAccount = toMatch[1].replace(/\n/g, ' ').trim().toLowerCase();
  
  let finalToAccount = "Wealthsimple";
  if (rawToAccount.includes('rrsp')) {
      finalToAccount = 'Wealthsimple RRSP';
  } else if (rawToAccount.includes('crypto')) {
      finalToAccount = 'Wealthsimple Crypto';
  } else if (rawToAccount.includes('cash')) {
      finalToAccount = 'Wealthsimple Cash';
  }

  return {
    date: message.getDate(),
    amount: parseFloat(amountMatch[1].replace(/,/g, '')),
    fromAccount: fromAccount,
    toAccount: finalToAccount,
    bank: "Wealthsimple Deposit",
    transferType: "Internal Transfer",
    emailId: message.getId()
  };
}

/**
 * Parses a Wealthsimple trade confirmation email.
 * @param {Message} message The Gmail message object.
 * @return {Object|null} Parsed data or null if parsing fails.
 */
function _parseWealthsimpleTrade(message) {
  try {
    const body = message.getPlainBody();
    const tradeDetailsMatch = body.match(/(\d+\.?\d*)\s+shares\s+of\s+([A-Z\.]+)\s+at an average price of [\s\S]+?Total cost:\s*\$([0-9,]+\.\d+)\s*[\s\S]+?Account:\s*([\s\S]*?)\s*Time:/i);
    if (!tradeDetailsMatch) return null;

    const shares = parseFloat(tradeDetailsMatch[1]);
    const ticker = tradeDetailsMatch[2].trim();
    const amount = parseFloat(tradeDetailsMatch[3].replace(/,/g, '')) * -1;
    const rawToAccount = tradeDetailsMatch[4].replace(/\n/g, ' ').trim().toLowerCase();
    const fromAccount = "Cash"; // Trades are from cash within the investment account
    
    let finalToAccount = "Wealthsimple Trade";
    if (rawToAccount.includes('rrsp')) {
        finalToAccount = 'Wealthsimple RRSP';
    } else if (rawToAccount.includes('crypto')) {
        finalToAccount = 'Wealthsimple Crypto';
    }
    
    _updateHoldings(finalToAccount, ticker, shares);

    return {
      date: message.getDate(),
      amount: amount,
      fromAccount: fromAccount,
      toAccount: finalToAccount,
      bank: "Wealthsimple Trade",
      transferType: "Internal Transfer",
      emailId: message.getId()
    };
  } catch (e) {
    Logger.log(`Failed to parse Wealthsimple Trade. Subject: "${message.getSubject()}" Error: ${e.message}`);
    return null;
  }
}

/**
 * Updates the number of shares for a given ticker in the 'Holdings' sheet.
 * @param {string} accountName The account holding the asset.
 * @param {string} ticker The ticker symbol.
 * @param {number} sharesToAdd The number of shares to add (can be negative for sells).
 */
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

  if (!found) {
    sheet.appendRow([accountName, ticker, sharesToAdd]);
  }
}

/**
 * [COMPLETED] Parses a CIBC credit card purchase notification email.
 * @param {Message} message The Gmail message object.
 * @return {Object|null} Parsed data or null if parsing fails.
 */
function _parseCibcCreditCardPurchase(message) {
    const body = message.getPlainBody();
    
    // Use regex to find the key details from the email body.
    const amountMatch = body.match(/Amount:\s*\$([0-9,]+\.\d{2})/i);
    const merchantMatch = body.match(/at\s+([A-Z0-9\s\.\-\_&']+)\s+was/i);
    const cardMatch = body.match(/CIBC\s+(Aventura|Dividend)\s+.*ending\s+in\s+(\d{4})/i);
  
    // If any piece of information is missing, we can't log the transaction.
    if (!amountMatch || !merchantMatch || !cardMatch) {
      Logger.log(`CIBC Parser: Could not match all required fields. Amount: ${!!amountMatch}, Merchant: ${!!merchantMatch}, Card: ${!!cardMatch}`);
      return null;
    }
  
    // Extract and clean the data. Purchases are recorded as negative amounts.
    const amount = parseFloat(amountMatch[1].replace(/,/g, '')) * -1;
    const merchant = merchantMatch[1].trim();
    const cardType = cardMatch[1].trim(); // This will be "Aventura" or "Dividend".
    
    const fromAccount = `CIBC ${cardType}`;
  
    // A final check to ensure the parsed account name exists in our config.
    if (!MY_ACCOUNTS.includes(fromAccount)) {
        Logger.log(`CIBC Parser: Parsed account "${fromAccount}" is not in the MY_ACCOUNTS list.`);
        return null;
    }
  
    return {
      date: message.getDate(),
      amount: amount,
      fromAccount: fromAccount,
      toAccount: merchant,
      bank: `CIBC ${cardType} Purchase`,
      emailId: message.getId()
    };
}
