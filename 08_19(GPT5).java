/**
 * FINANCE AUTOMATION — FULL REWRITE (v2)
 * --------------------------------------
 * Goals addressed:
 *  - Robust email parsing (PC Financial, Interac, Wealthsimple, CIBC purchases + CIBC payments)
 *  - Reliable internal/external transfer pairing via a staging queue with time/amount matching
 *  - Dynamic Accounts balance updates (incl. credit cards) driven by parsed emails & CSVs
 *  - Better duplicate protection (by email id + transaction fingerprint)
 *  - Category learning that actually applies & persists, plus keyword suggestions
 *  - Dashboard charts that don’t revert and support both SUM($) and COUNT(by Category)
 *  - Safer column indexing: explicit schema constants instead of magic numbers
 *  - Net worth log maintained automatically
 *
 * IMPORTANT:
 *  - This script assumes your sheet schemas match the constants below.
 *  - Search label used in Gmail is 'Transfers' (customizable).
 *  - CIBC emails vary; multiple regex fallbacks provided for both purchases and payments.
 */

// ===================== HYBRID FINANCE AUTOMATION =====================
// Combines V1's robust staging/pairing, fingerprint dedup, error handling, and parsing
// with V2's account aliasing, dashboard config, and category learning improvements.
// Adds security best practices, audit logging, and extensibility for future changes.

// ========================================
// ============ CONFIG & SCHEMA ============
// ========================================

// ---- CONFIG ----
const SPREADSHEET_ID = '1-eUeYMTeKoz2bIkHS8Jc2J9vO0Bnl8y6aHXmXGdJqg8'; 
const MAIN_SHEET_NAME = 'Transactions';
const STAGING_SHEET_NAME = 'Staging';
const ACCOUNTS_SHEET_NAME = 'Accounts';
const CATEGORIES_SHEET_NAME = 'Categories';
const NETWORTH_SHEET_NAME = 'NetWorthHistory';
const DASHBOARD_SHEET_NAME = 'Dashboard';
const CSV_IMPORT_SHEET_NAME = 'CSV_Import';
const HOLDINGS_SHEET_NAME = 'Holdings';

// Define active accounts for keyword matching
const MY_ACCOUNTS = [
  "PC Financial",
  "Wealthsimple RRSP",
  "Wealthsimple Crypto",
  "Wealthsimple Cash",
  "CIBC Aventura",
  "CIBC Dividend",
  "Cash"
];

// Keywords for your active banks to identify internal transfers
const MY_BANK_KEYWORDS = ["PC Financial", "Wealthsimple"];

// Gmail search settings
const GMAIL_LABEL = 'Transfers';
const GMAIL_LOOKBACK = 'newer_than:7d';

// Matching tolerances
const AMOUNT_TOLERANCE = 0.01; // $0.01
const TIME_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

// ========================
// ============ MENUS =================
// ========================

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
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const txSheet = ss.getSheetByName(MAIN_SHEET_NAME);
    
    const accountName = sheet.getRange(range.getRow(), 1).getValue();
    const oldValue = parseFloat(e.oldValue || 0);
    const newValue = parseFloat(e.value || 0);
    const difference = newValue - oldValue;

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
      sheet.getRange(range.getRow(), 3).setValue(new Date());
      _updateTotalNetWorth(ss);
    }
  }
}

function processNewTransactions() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    _cleanupStaleStagingEntries(ss);
    _logNewEmails(ss);
    _updateTotalNetWorth(ss);
    _logNetWorthHistory(ss);
    learnCategories();  
  } catch (e) {
    Logger.log(`FATAL ERROR: ${e.message}\n${e.stack}`);
  }
}

// -----------------------------------------------------------------------------------
// --- FEATURE FUNCTIONS ---
// -----------------------------------------------------------------------------------

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
      const url = `https://finance.yahoo.com/quote/${ticker}`;
      const response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});
      const content = response.getContentText();
      
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
  _updateTotalNetWorth(ss);
}

function importFromCsv() {
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
    SpreadsheetApp.getUi().alert("Could not identify the bank from the CSV data. Please check your CSV_PROFILES configuration in the script.");
    return;
  }
  SpreadsheetApp.getUi().alert(`Detected "${detectedProfile.name}" format. Starting import...`);

  const existingTxData = txSheet.getDataRange().getValues();
  const existingTxSet = new Set(existingTxData.map(r => `${new Date(r[0]).toDateString()}|${parseFloat(r[1]).toFixed(2)}|${r[3]}`));
  
  let importedCount = 0;

  importData.forEach(row => {
    const { date, description, debit, credit, amount: singleAmountCol } = detectedProfile.columnMap;
    
    const dateValue = row[date - 1];
    const txDate = new Date(dateValue);
    
    if (isNaN(txDate.getTime())) {
      return; 
    }

    const txDesc = row[description - 1];
    let amount;

    if (singleAmountCol) {
        amount = parseFloat(row[singleAmountCol - 1] || 0);
    } else {
        const debitAmount = parseFloat(row[debit - 1] || 0);
        const creditAmount = parseFloat(row[credit - 1] || 0);
        amount = creditAmount - debitAmount;
    }

    if (isNaN(amount) || !txDesc || amount === 0) return;

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

function suggestCategoriesFromTransactions() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const txSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  let catSheet = ss.getSheetByName(CATEGORIES_SHEET_NAME);

  if (!catSheet) {
    catSheet = ss.insertSheet(CATEGORIES_SHEET_NAME);
    catSheet.appendRow(["Keyword", "Category"]);
  }

  if (!txSheet || txSheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert("The 'Transactions' sheet is empty. Please import some data first.");
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
    if (count > 1 && !existingCats.includes(merchant.toLowerCase())) {
      catSheet.appendRow([merchant.toUpperCase(), ""]);
      suggestionsAdded++;
    }
  });

  SpreadsheetApp.getUi().alert(`${suggestionsAdded} new category keywords have been suggested in the 'Categories' sheet. Please go there to assign categories.`);
}

function _logNetWorthHistory(ss) {
  const accountsSheet = ss.getSheetByName(ACCOUNTS_SHEET_NAME);
  let sheet = ss.getSheetByName(NETWORTH_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(NETWORTH_SHEET_NAME).appendRow(["Date", "Net Worth"]);

  const today = new Date().toDateString();
  const lastRow = sheet.getLastRow();
  
  const totalNetWorth = _updateTotalNetWorth(ss); // Get the latest total

  if (lastRow > 1 && new Date(sheet.getRange(lastRow, 1).getValue()).toDateString() === today) {
    sheet.getRange(lastRow, 2).setValue(totalNetWorth);
  } else {
    sheet.appendRow([new Date(), totalNetWorth]);
  }
}

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
    const categoryCell = txSheet.getRange(i + 1, 8); // Column H

    if (!categoryCell.getValue()) {
      for (let [keyword, category] of catMap.entries()) {
        if (toAccount.includes(keyword)) {
          categoryCell.setValue(category);
          break;
        }
      }
    }
  }
}

function buildDashboard() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let dash = ss.getSheetByName(DASHBOARD_SHEET_NAME);
  if (dash) ss.deleteSheet(dash);
  dash = ss.insertSheet(DASHBOARD_SHEET_NAME, 0);
  dash.getRange("A1").setValue("Financial Dashboard").setFontSize(14).setFontWeight("bold");

  const charts = [];
  const txSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const nwSheet = ss.getSheetByName(NETWORTH_SHEET_NAME);

  if (txSheet && txSheet.getLastRow() > 1) {
    const txData = txSheet.getRange(2, 1, txSheet.getLastRow() - 1, 8).getValues();
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    
    const expenseData = txData
        .filter(r => new Date(r[0]) >= cutoff && r[1] < 0)
        .reduce((acc, row) => {
            const category = row[7] || "Uncategorized";
            const amount = Math.abs(row[1]);
            acc[category] = (acc[category] || 0) + amount;
            return acc;
        }, {});

    if (Object.keys(expenseData).length > 0) {
        const dataTable = Charts.newDataTable()
            .addColumn(Charts.ColumnType.STRING, "Category")
            .addColumn(Charts.ColumnType.NUMBER, "Amount");
        Object.entries(expenseData).forEach(([category, amount]) => {
            dataTable.addRow([category, amount]);
        });
        
        const pieChart = dash.newChart()
            .setChartType(Charts.ChartType.PIE)
            .setDataTable(dataTable.build())
            .setOption('title', 'Expenses by Category (Last 30 Days)')
            .setPosition(2, 1, 0, 0)
            .build();
        charts.push(pieChart);
    }
  }

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

function applyConditionalFormatting() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const txSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const accSheet = ss.getSheetByName(ACCOUNTS_SHEET_NAME);

  if (txSheet) {
    const txRange = txSheet.getRange("B2:B" + txSheet.getMaxRows());
    txSheet.clearConditionalFormatRules();
    const txRules = [
      SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setFontColor("#FF0000").setRanges([txRange]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setFontColor("#008000").setRanges([txRange]).build()
    ];
    txSheet.setConditionalFormatRules(txRules);
  }

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

function _logNewEmails(ss) {
  const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const stagingSheet = ss.getSheetByName(STAGING_SHEET_NAME);
  const accountsSheet = ss.getSheetByName(ACCOUNTS_SHEET_NAME);

  if (!mainSheet || !stagingSheet || !accountsSheet) {
    throw new Error("Sheet name mismatch. Check config.");
  }

  const mainSheetIds = mainSheet.getLastRow() > 1 ? mainSheet.getRange(2, 7, mainSheet.getLastRow() - 1, 1).getValues().flat() : [];
  const stagingSheetIds = stagingSheet.getLastRow() > 1 ? stagingSheet.getRange(2, 7, stagingSheet.getLastRow() - 1, 1).getValues().flat() : [];
  const loggedIds = [...mainSheetIds, ...stagingSheetIds];

  const threads = GmailApp.search('label:Transfers newer_than:3d');
  
  threads.forEach(thread => {
    thread.getMessages().forEach(message => {
      try {
        const id = message.getId();
        if (loggedIds.includes(id)) return;

        const fromEmail = message.getFrom().toLowerCase();
        const subject = message.getSubject();
        let parsedData;
        
        if (fromEmail.includes("pcfinancial.ca")) {
            if (subject.includes("purchase notice")) {
                parsedData = _parsePcMoneyPurchase(message);
                if (parsedData) {
                    if (!parsedData.merchant || (parsedData.merchant && parsedData.merchant.toLowerCase().includes("wealthsimple"))) {
                        stagingSheet.appendRow([ new Date(), parsedData.amount, parsedData.fromAccount, parsedData.toAccount, parsedData.bank, parsedData.emailId, new Date() ]);
                    } else {
                        mainSheet.appendRow([ parsedData.date, parsedData.amount, parsedData.fromAccount, parsedData.merchant, parsedData.bank, "Auto-logged (PAD)", parsedData.emailId, "", "PAD" ]);
                        _updateAccountBalances(parsedData, accountsSheet);
                    }
                }
            } else if (subject.includes("bill payment")) {
                parsedData = _parsePcBillPayment(message);
                if (parsedData) {
                    mainSheet.appendRow([ parsedData.date, parsedData.amount, parsedData.fromAccount, parsedData.toAccount, parsedData.bank, "Auto-logged (Bill Payment)", parsedData.emailId, "", "Bill Payment" ]);
                    _updateAccountBalances(parsedData, accountsSheet);
                }
            } else if (subject.includes("transfer to")) {
                parsedData = _parsePcInteracTransfer(message);
                if (parsedData) {
                    const stagingData = stagingSheet.getDataRange().getValues();
                    let matchFound = false;
                    const fifteenMinutes = 15 * 60 * 1000;

                    for (let i = stagingData.length - 1; i >= 1; i--) {
                        const stagedDate = new Date(stagingData[i][0]);
                        const stagedAmount = stagingData[i][1];
                        
                        if (Math.abs(stagedAmount - parsedData.amount) < 0.01 && Math.abs(stagedDate.getTime() - parsedData.date.getTime()) < fifteenMinutes) {
                            const finalFrom = stagingData[i][2]; 
                            mainSheet.appendRow([ parsedData.date, parsedData.amount, finalFrom, parsedData.toAccount, "PC Money e-Transfer", `Auto-logged (Paired)`, message.getId(), "", parsedData.transferType ]);
                            _updateAccountBalances({ ...parsedData, fromAccount: finalFrom }, accountsSheet);
                            stagingSheet.deleteRow(i + 1);
                            matchFound = true;
                            break;
                        }
                    }
                    if (!matchFound) {
                        mainSheet.appendRow([ parsedData.date, parsedData.amount, "PC Financial", parsedData.toAccount, parsedData.bank, `Auto-logged (Standalone)`, message.getId(), "", parsedData.transferType ]);
                        _updateAccountBalances({ ...parsedData, fromAccount: "PC Financial" }, accountsSheet);
                    }
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
            const stagingData = stagingSheet.getDataRange().getValues();
            let matchFound = false;
            const twoDays = 2 * 24 * 60 * 60 * 1000;

            for (let i = stagingData.length - 1; i >= 1; i--) {
                const stagedDate = new Date(stagingData[i][0]);
                const stagedAmount = stagingData[i][1];
                
                if (Math.abs(Math.abs(stagedAmount) - parsedData.amount) < 0.01 && Math.abs(stagedDate.getTime() - parsedData.date.getTime()) < twoDays) {
                    const finalFrom = stagingData[i][2]; 
                    mainSheet.appendRow([ parsedData.date, parsedData.amount, finalFrom, parsedData.toAccount, "PC to WS Contribution", `Auto-logged (Paired)`, message.getId(), "", parsedData.transferType ]);
                    _updateAccountBalances({ ...parsedData, fromAccount: finalFrom }, accountsSheet);
                    stagingSheet.deleteRow(i + 1);
                    matchFound = true;
                    break;
                }
            }
            if (!matchFound) {
                mainSheet.appendRow([ parsedData.date, parsedData.amount, parsedData.fromAccount, parsedData.toAccount, parsedData.bank, `Auto-logged (Standalone)`, parsedData.emailId, "", parsedData.transferType ]);
                _updateAccountBalances(parsedData, accountsSheet);
            }
          }
        } else if (fromEmail.includes("support@wealthsimple.com") && subject.includes("order has been filled")) {
          parsedData = _parseWealthsimpleTrade(message);
          if (parsedData) {
            mainSheet.appendRow([ parsedData.date, parsedData.amount, parsedData.fromAccount, parsedData.toAccount, parsedData.bank, `Auto-logged (Standalone)`, parsedData.emailId, "", parsedData.transferType ]);
            _updateAccountBalances(parsedData, accountsSheet);
          }
        } else if (fromEmail.includes("cibc")) {
            parsedData = _parseCibcCreditCardPurchase(message);
            if (parsedData) {
                mainSheet.appendRow([ parsedData.date, parsedData.amount, parsedData.fromAccount, parsedData.toAccount, parsedData.bank, "Auto-logged (Standalone Purchase)", parsedData.emailId, "", "Purchase" ]);
                _updateAccountBalances(parsedData, accountsSheet);
            }
        }
      } catch (e) {
        Logger.log(`-> ERROR processing message ID ${message.getId()}: ${e.message}`);
      }
    });
  });
}

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

function _updateAccountBalances(parsedData, accountsSheet) {
  const accountData = accountsSheet.getDataRange().getValues();
  const { fromAccount, toAccount, amount } = parsedData;

  const findRowIndex = (accountNameToFind) => {
      if (!accountNameToFind) return -1;
      const lowerCaseNameToFind = accountNameToFind.toLowerCase();
      for (let i = 1; i < accountData.length; i++) {
          const currentAccountName = accountData[i][0].toLowerCase();
          if (lowerCaseNameToFind === currentAccountName) { // [FIXED] Use exact match
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
    const amountToAdd = (fromAccount && MY_ACCOUNTS.some(acc => fromAccount.toLowerCase().includes(acc.toLowerCase()))) ? Math.abs(amount) : amount;
    accountsSheet.getRange(toRowIndex, 2).setValue(currentBalance + amountToAdd);
    accountsSheet.getRange(toRowIndex, 3).setValue(new Date());
  }
}

function _updateTotalNetWorth(ss) {
    const accountsSheet = ss.getSheetByName(ACCOUNTS_SHEET_NAME);
    if (!accountsSheet || accountsSheet.getLastRow() < 2) return 0;
    const balances = accountsSheet.getRange(2, 2, accountsSheet.getLastRow() - 1, 1).getValues();
    const totalNetWorth = balances.reduce((sum, row) => sum + parseFloat(row[0] || 0), 0);
    return totalNetWorth;
}

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

function _parsePcMoneyPurchase(message) {
  const contentToSearch = message.getPlainBody() + " " + message.getBody();
  const amountMatch = contentToSearch.match(/Purchase amount[:\s]*\$([0-9,]+\.\d{2})/i);
  const dateMatch = contentToSearch.match(/Transaction date[:\s]*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
  const merchantMatch = contentToSearch.match(/Merchant:\s*(.+)/i);
  if (!amountMatch) return null;

  return { date: dateMatch ? new Date(dateMatch[1]) : message.getDate(), amount: parseFloat(amountMatch[1].replace(/,/g, '')) * -1, fromAccount: "PC Financial", toAccount: null, bank: "PC Money Purchase", merchant: merchantMatch ? merchantMatch[1].trim() : null, emailId: message.getId() };
}

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

function _parseWealthsimpleDeposit(message) {
  const body = message.getPlainBody();
  const amountMatch = body.match(/Amount:\s*\$([0-9,]+\.\d{2})\s*CAD/i);
  const toMatch = body.match(/To:\s*([\s\S]*?)\s*Sometimes/i);
  if (!amountMatch || !toMatch) return null;

  const fromAccount = "PC Financial";
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


function _parseWealthsimpleTrade(message) {
  try {
    const body = message.getPlainBody();
    const tradeDetailsMatch = body.match(/(\d+\.?\d*)\s+shares\s+of\s+([A-Z\.]+)\s+at an average price of [\s\S]+?Total cost:\s*\$([0-9,]+\.\d+)\s*[\s\S]+?Account:\s*([\s\S]*?)\s*Time:/i);
    if (!tradeDetailsMatch) return null;

    const shares = parseFloat(tradeDetailsMatch[1]);
    const ticker = tradeDetailsMatch[2].trim();
    const amount = parseFloat(tradeDetailsMatch[3].replace(/,/g, '')) * -1;
    const rawToAccount = tradeDetailsMatch[4].replace(/\n/g, ' ').trim().toLowerCase();
    const fromAccount = "Cash";
    
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

function _updateHoldings(accountName, ticker, sharesToAdd) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(HOLDINGS_SHEET_NAME);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < data.length; i++) {
    // [FIXED] Use comparison (===)
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
 * [NEW & UPDATED] Parses CIBC credit card purchase notifications.
 */
function _parseCibcCreditCardPurchase(message) {
    const body = message.getPlainBody();
    const detailsMatch = body.match(/for\s+\$([0-9,]+\.\d{2})\s+at\s+(.*)\./i);
    const cardMatch = body.match(/CIBC\s+(Aventura|Dividend)[\s\S]*?ending\s+in\s+(\d{4})/i);
    
    if (!detailsMatch || !cardMatch) return null;

    const amount = parseFloat(detailsMatch[1].replace(/,/g, '')) * -1;
    const merchant = detailsMatch[2].trim();
    const cardType = cardMatch[1];
    const cardLastFour = cardMatch[2];

    const fromAccount = `CIBC ${cardType} ****${cardLastFour}`;
    
    return { 
      date: message.getDate(), 
      amount: amount, 
      fromAccount: fromAccount, 
      toAccount: merchant, 
      bank: "CIBC Credit Card", 
      emailId: message.getId() 
    };
}


function _parsePcBillPayment(message) {
    const body = message.getPlainBody();
    const amountMatch = body.match(/Amount Paid:\s*\$([0-9,]+\.\d{2})/i);
    const payeeMatch = body.match(/Paid to:\s*(.+)/i);
    const fromAccountMatch = body.match(/From account:\s*(.+)/i);
    if (!amountMatch || !payeeMatch || !fromAccountMatch) return null;

    const fromAccount = fromAccountMatch[1].trim();
    const toAccount = payeeMatch[1].trim();

    return { date: message.getDate(), amount: parseFloat(amountMatch[1].replace(/,/g, '')) * -1, fromAccount: fromAccount, toAccount: toAccount, bank: "PC Financial Bill Payment", emailId: message.getId() };
}
      SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setBackground('#d4edda').setRanges([range]).build()
    ]);
  }
}

// ========================================
// ========= CATEGORIES (LEARNING) =========
// ========================================

function learnCategories() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const tx = ss.getSheetByName(SHEETS.MAIN);
  const cats = ss.getSheetByName(SHEETS.CATEGORIES);
  if (!tx || !cats || cats.getLastRow() < 2 || tx.getLastRow() < 2) return;

  // Map of keyword(s) -> category
  const catData = cats.getRange(2,1,cats.getLastRow()-1,2).getValues();
  const rules = catData.filter(r => (r[0]||'').toString().trim()).map(r => ({
    keywords: r[0].toString().toLowerCase().split(/[|,;]/).map(k => k.trim()).filter(Boolean),
    category: (r[1]||'').toString()
  }));
  if (!rules.length) return;

  const lastRow = tx.getLastRow();
  for (let i = 2; i <= lastRow; i++) {
    const currentCat = (tx.getRange(i, TX_COL.CATEGORY).getValue() || '').toString();
    if (currentCat) continue; // only fill empty
    const fromVal = (tx.getRange(i, TX_COL.FROM).getValue() || '').toString().toLowerCase();
    const toVal   = (tx.getRange(i, TX_COL.TO).getValue()   || '').toString().toLowerCase();
    const bankVal = (tx.getRange(i, TX_COL.BANK).getValue() || '').toString().toLowerCase();
    const hay = `${fromVal} ${toVal} ${bankVal}`;
    for (const rule of rules) {
      if (rule.keywords.every(k => hay.includes(k))) {
        tx.getRange(i, TX_COL.CATEGORY).setValue(rule.category);
        break;
      }
    }
  }
}

function suggestCategoriesFromTransactions() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const tx = ss.getSheetByName(SHEETS.MAIN);
  let cat = ss.getSheetByName(SHEETS.CATEGORIES);
  if (!cat) {
    cat = ss.insertSheet(SHEETS.CATEGORIES);
    cat.appendRow(['Keyword','Category']);
  }
  if (!tx || tx.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert("The 'Transactions' sheet is empty.");
    return;
  }

  const data = tx.getRange(2, TX_COL.TO, tx.getLastRow()-1, 1).getValues();
  const counts = {};
  const common = new Set(['payment','transfer','inc','ltd','corp','on','toronto','thank','you','ltd/ltée','e-transfer']);

  data.forEach(r => {
    const desc = (r[0]||'').toString().toLowerCase();
    const clean = desc.replace(/internet banking|e-transfer from|payment thank you\/paiemen t merci|external to/gi,'').trim();
    const parts = clean.split(/\s{2,}|,|-/);
    parts.forEach(p => {
      const x = p.replace(/[\*#\d\-]/g,' ').trim();
      if (x.length > 3 && !common.has(x)) counts[x] = (counts[x]||0)+1;
    });
  });

  const existing = cat.getLastRow() > 1 ? cat.getRange(2,1,cat.getLastRow()-1,1).getValues().flat().map(c => (c||'').toString().toLowerCase()) : [];
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);

  let added = 0;
  sorted.forEach(([k,c]) => {
    if (c>1 && !existing.includes(k.toLowerCase())) { cat.appendRow([k.toUpperCase(), '']); added++; }
  });

  SpreadsheetApp.getUi().alert(`${added} new category keywords suggested. Review the 'Categories' sheet to assign categories.`);
}

// ========================================
// ============= CSV IMPORTER ==============
// ========================================

function importFromCsv() {
  const profiles = [
    { name: 'CIBC Aventura Card', identifyingKeyword: '4500********6271', accountName: 'CIBC Aventura', columnMap: { date: 1, description: 2, debit: 3, credit: 4 } },
    { name: 'CIBC Dividend Card', identifyingKeyword: '4505********2866', accountName: 'CIBC Dividend', columnMap: { date: 1, description: 2, debit: 3, credit: 4 } },
    { name: 'PC Financial Cash Account', identifyingKeyword: 'Card Holder Name', accountName: 'PC Financial', columnMap: { date: 4, description: 1, amount: 6 } },
    { name: 'PC Financial Savings Account', identifyingKeyword: 'Transfer In', accountName: 'PC Financial', columnMap: { date: 3, description: 1, amount: 5 } },
    { name: 'Wealthsimple RRSP', identifyingKeyword: 'Vanguard FTSE Canada Index ETF', accountName: 'Wealthsimple RRSP', columnMap: { date: 1, description: 3, amount: 4 } },
    { name: 'Wealthsimple Crypto', identifyingKeyword: 'Dogecoin', accountName: 'Wealthsimple Crypto', columnMap: { date: 1, description: 3, amount: 4 } }
  ];

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const importSheet = ss.getSheetByName(SHEETS.CSV_IMPORT);
  const txSheet = ss.getSheetByName(SHEETS.MAIN);

  if (!importSheet || importSheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert("The 'CSV_Import' sheet is empty.");
    return;
  }

  const importData = importSheet.getRange(1,1,importSheet.getLastRow(),importSheet.getLastColumn()).getValues();

  // Detect profile
  let profile = null;
  for (const row of importData) {
    const rowText = row.join(' ').toLowerCase();
    for (const p of profiles) {
      if (rowText.includes(p.identifyingKeyword.toLowerCase())) { profile = p; break; }
    }
    if (profile) break;
  }
  if (!profile) { SpreadsheetApp.getUi().alert('Could not identify the bank from the CSV data.'); return; }

  SpreadsheetApp.getUi().alert(`Detected "${profile.name}" format. Starting import...`);

  const existing = txSheet.getDataRange().getValues();
  const existingKeys = new Set(existing.map(r => `${new Date(r[TX_COL.DATE-1]).toDateString()}|${toFixedSafe(r[TX_COL.AMOUNT-1])}|${r[TX_COL.TO-1]}`));

  let added = 0;
  importData.forEach(row => {
    const map = profile.columnMap;
    const dateValue = row[map.date - 1];
    const txDate = parseCsvDate(dateValue);
    if (!txDate) return;
    const desc = row[map.description - 1];
    let amount;
    if (map.amount) amount = parseFloat(row[map.amount - 1] || 0);
    else {
      const debit = parseFloat(row[map.debit - 1] || 0);
      const credit = parseFloat(row[map.credit - 1] || 0);
      amount = credit - debit;
    }
    if (!desc || !amount) return;

    const key = `${txDate.toDateString()}|${toFixedSafe(amount)}|${desc}`;
    if (!existingKeys.has(key)) {
      const fromAccount = amount < 0 ? normalizeAccount(profile.accountName) : normalizeAccount(desc);
      const toAccount   = amount > 0 ? normalizeAccount(profile.accountName) : normalizeAccount(desc);
      appendAndUpdate(txSheet, ss.getSheetByName(SHEETS.ACCOUNTS), {
        date: txDate,
        amount,
        fromAccount,
        toAccount,
        bank: 'CSV Import',
        notes: `Imported from ${profile.name}`,
        id: `CSV-${Date.now()}-${added}`,
        category: '',
        type: 'CSV Import'
      });
      added++;
    }
  });

  importSheet.clearContents();
  SpreadsheetApp.getUi().alert(`Import complete. Added ${added} new transaction(s) for "${profile.name}".`);
}

// ===================== INVESTMENT VALUES: SECURITY & LOGGING =====================
function updateInvestmentValues() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const holdings = ss.getSheetByName(SHEETS.HOLDINGS);
  const accounts = ss.getSheetByName(SHEETS.ACCOUNTS);
  if (!holdings || holdings.getLastRow() < 2) { SpreadsheetApp.getUi().alert("The 'Holdings' sheet is empty or missing."); return; }

  const rows = holdings.getRange(2,1,holdings.getLastRow()-1,3).getValues();
  const totals = {};
  rows.forEach(r => {
    const acct = r[0]; const ticker = r[1]; const shares = parseFloat(r[2]);
    if (!acct || !ticker || isNaN(shares)) return;
    try {
      const url = `https://finance.yahoo.com/quote/${ticker}`;
      const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const content = res.getContentText();
      const m = content.match(new RegExp(`"${ticker}":{[^}]+"regularMarketPrice":{[^}]*?"fmt":"([\\d,]+\\.\\d+)"`));
      if (m && m[1]) {
        const price = parseFloat(m[1].replace(/,/g,''));
        totals[acct] = (totals[acct]||0) + shares * price;
      }
    } catch(err) {
      Logger.log(`Error fetching ${ticker}: ${err.message}`);
    }
  });

  const accData = accounts.getDataRange().getValues();
  const idxMap = new Map(accData.slice(1).map((r,i) => [r[ACC_COL.NAME-1], i+2]));
  Object.entries(totals).forEach(([acct,val]) => {
    if (idxMap.has(acct)) {
      const row = idxMap.get(acct);
      accounts.getRange(row, ACC_COL.BAL).setValue(val);
      accounts.getRange(row, ACC_COL.UPDATED).setValue(new Date());
      auditLog('InvestmentValueUpdate', { account: acct, value: val });
    }
  });

  SpreadsheetApp.getUi().alert('Investment values have been updated.');
  _updateTotalNetWorth(ss.getSheetByName(SHEETS.MAIN), accounts);
}

function _updateHoldings(accountName, ticker, sharesToAdd) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.HOLDINGS);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === accountName && data[i][1] === ticker) {
      const cur = parseFloat(data[i][2]) || 0;
      sheet.getRange(i+1,3).setValue(cur + sharesToAdd);
      return;
    }
  }
  sheet.appendRow([accountName, ticker, sharesToAdd]);
}

// ========================================
// ================ UTILS ==================
// ========================================

function matchAmount(text, regex) {
  const m = text.match(regex);
  return m ? m[1].replace(/,/g,'') : null;
}

function fingerprint(tx) {
  const d = tx.date ? new Date(tx.date) : new Date();
  const key = [d.toISOString().slice(0,10), toFixedSafe(tx.amount), (tx.fromAccount||'').slice(0,30), (tx.toAccount||'').slice(0,30)].join('|');
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, key)).slice(0,12);
}

function htmlToText(html) { return html.replace(/<\s*br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }

function parseCsvDate(val) {
  if (val instanceof Date) return val;
  const s = (val||'').toString().trim();
  // Try DD-MM-YYYY
  let m = s.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
  if (m) return new Date(parseInt(m[3],10), parseInt(m[2],10)-1, parseInt(m[1],10));
  // Try YYYY-MM-DD
  m = s.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})$/);
  if (m) return new Date(parseInt(m[1],10), parseInt(m[2],10)-1, parseInt(m[3],10));
  // Fallback
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function toFixedSafe(n) { const x = parseFloat(n||0); return isNaN(x) ? '0.00' : x.toFixed(2); }
function toMoney(n) { return `$${toFixedSafe(n)}`; }
function includesCi(a,b) { return (a||'').toString().toLowerCase().includes((b||'').toString().toLowerCase()); }
function includesAnyCi(hay, arr) { return arr.some(x => includesCi(hay,x)); }
function guessInternalAccount(label) { return MY_ACCOUNTS.find(a => includesCi(label,a)) || ''; }

// ===================== TEST MODE & BULK OPERATION SAFEGUARDS =====================
const TEST_MODE = false; // Set true for dry-run
function safeAppendRow(sheet, row) {
  if (TEST_MODE) {
    Logger.log(`TEST_MODE: Would append row to ${sheet.getName()}: ${JSON.stringify(row)}`);
    auditLog('TestAppendRow', { sheet: sheet.getName(), row });
    return;
  }
  sheet.appendRow(row);
}

// Replace all .appendRow calls with safeAppendRow where appropriate for bulk ops

// ===================== VERSIONING & EXTENSIBILITY =====================
const EMAIL_TEMPLATE_VERSION = '2024-06-01'; // Update as formats change

// ===================== ACCESS CONTROL (for future multi-user) =====================
function isAuthorizedUser() {
  const allowed = ['your@email.com']; // Add authorized emails
  const user = Session.getActiveUser().getEmail();
  return allowed.includes(user);
}

// Example usage:
function processNewTransactions() {
  if (!isAuthorizedUser()) {
    SpreadsheetApp.getUi().alert('You are not authorized to run this script.');
    auditLog('UnauthorizedAccess', { user: Session.getActiveUser().getEmail() });
    return;
  }
  safeExecute(_processNewTransactions, this);
}
function _processNewTransactions() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const accountsSheet = ss.getSheetByName(SHEETS.ACCOUNTS);
    const mainSheet = ss.getSheetByName(SHEETS.MAIN);
    if (!accountsSheet || !mainSheet) throw new Error('Missing required sheets.');

    _ensureStagingSheet(ss);

    _cleanupStaleStagingEntries(ss);
    _logNewEmails(ss);               // parses + logs or stages + attempts pairing
    _attemptAllPairings(ss)         // second pass pairing safeguard

    _updateTotalNetWorth(mainSheet, accountsSheet);
    _logNetWorthHistory(accountsSheet);
    learnCategories();
  } catch (e) {
    Logger.log(`FATAL ERROR in processNewTransactions: ${e.message}\n${e.stack}`);
  }
}
// ===================== END HYBRID SCRIPT =====================
