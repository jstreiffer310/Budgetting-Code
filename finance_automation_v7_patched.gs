*** Begin Patch
*** Add File: finance_automation_v7_patched.gs
+/*
+ * FINANCE AUTOMATION V7 - PATCHED
+ * - Robust _ss() to avoid premature openById calls
+ * - setupPermissions helper to trigger OAuth
+ * - Removed AUTO_RUN default (disabled)
+ * - Fixed column name mismatches (PRICE -> UNIT_PRICE_CAD, VALUE -> TOTAL_VALUE_CAD)
+ * - Improved category learning (non-destructive + stopwords)
+ * - Safer Interac/PC Financial parsing (don't invent recipients)
+ * - SHIB mapping included and preserved small-decimal precision
+ * - Stubs for helper functions included so the file is self-contained. Replace stubs as you integrate.
+ */
+
+// ----------------- CONFIG / CONSTANTS -----------------
+const SPREADSHEET_ID = 'PUT_YOUR_SPREADSHEET_ID_HERE'; // <-- set your ID or leave blank if this is container-bound
+
+const CONFIG = {
+  PRICE_FETCH_RETRY_DELAY: 500,
+  PRICE_FETCH_MAX_RETRIES: 3,
+  CRYPTO_API_RATE_LIMIT: 300,
+  YAHOO_FINANCE_RATE_LIMIT: 200
+};
+
+const ENHANCED_CONFIG = Object.assign({}, CONFIG, {
+  PRICE_FETCH_RETRY_DELAY: 500,
+  PRICE_FETCH_MAX_RETRIES: 3,
+  CRYPTO_API_RATE_LIMIT: 300,
+  YAHOO_FINANCE_RATE_LIMIT: 200
+});
+
+const SHEET_NAMES = {
+  HOLDINGS: 'Holdings',
+  ACCOUNTS: 'Accounts',
+  TRANSACTIONS: 'Transactions',
+  CATEGORIES: 'Categories',
+  DASHBOARD: 'Dashboard'
+};
+
+// Column indexes used in the script. Adjust to match your sheets.
+const COLUMNS = {
+  HOLDINGS: {
+    ACCOUNT: 1,
+    TICKER: 2,
+    SHARES: 3,
+    UNIT_PRICE_CAD: 4, // was PRICE
+    TOTAL_VALUE_CAD: 5, // was VALUE
+    LAST_UPDATED: 6
+  },
+  ACCOUNTS: {
+    NAME: 1,
+    BALANCE: 2,
+    LAST_UPDATED: 3
+  },
+  TRANSACTIONS: {
+    DATE: 1,
+    MERCHANT: 2,
+    AMOUNT: 3,
+    CATEGORY: 4,
+    NOTES: 5
+  }
+};
+
+// ----------------- UTILITY / HELPERS -----------------
+function _ss() {
+  try {
+    // Prefer the active spreadsheet in container-bound context
+    if (typeof SpreadsheetApp !== 'undefined') {
+      try {
+        const active = SpreadsheetApp.getActiveSpreadsheet();
+        if (active && (!SPREADSHEET_ID || active.getId() === SPREADSHEET_ID)) {
+          return active;
+        }
+      } catch (e) {
+        // ignore and try openById
+      }
+    }
+
+    if (!SPREADSHEET_ID) {
+      throw new Error('SPREADSHEET_ID is not set. If this is container-bound, leave SPREADSHEET_ID blank.');
+    }
+
+    return SpreadsheetApp.openById(SPREADSHEET_ID);
+  } catch (error) {
+    const helpMsg = [
+      'Cannot access spreadsheet: ' + (error && error.message ? error.message : error),
+      '',
+      'Likely causes & fixes:',
+      '1) You need to grant the script permission to access Google Sheets. Open the script editor and run "setupPermissions" to trigger the OAuth consent flow.',
+      '2) If this script is standalone, ensure the manifest (appsscript.json) contains the proper scopes or bind the script to the spreadsheet.',
+      '',
+      'Run the Setup Permissions function in the script editor (select it from the function dropdown and click Run) and authorize the required scopes.'
+    ].join('\n');
+
+    // Log and rethrow a friendly error
+    try { console.error(helpMsg, error); } catch (e) {}
+    throw new Error(helpMsg);
+  }
+}
+
+function setupPermissions() {
+  try {
+    // Touch the services to trigger OAuth scopes
+    if (!SPREADSHEET_ID) {
+      // Try to touch active spreadsheet first (container-bound)
+      const a = SpreadsheetApp.getActiveSpreadsheet();
+      if (!a) throw new Error('No active spreadsheet found and SPREADSHEET_ID not set.');
+    } else {
+      SpreadsheetApp.openById(SPREADSHEET_ID);
+    }
+
+    // Touch other services used by the script
+    try { GmailApp.getInboxThreads(0, 1); } catch (e) {}
+    try { DriveApp.getRootFolder(); } catch (e) {}
+
+    try { SpreadsheetApp.getUi().alert('✅ Permissions setup completed. Please re-open the spreadsheet or re-run the script functions now.'); } catch (e) {}
+    _logInfo('Permissions setup completed successfully');
+    return true;
+  } catch (err) {
+    try { SpreadsheetApp.getUi().alert('❌ Permission setup failed: ' + (err && err.message ? err.message : err)); } catch (e) {}
+    _logError('Permission setup failed', err);
+    return false;
+  }
+}
+
+function _normalize(s) {
+  if (s === null || s === undefined) return '';
+  return String(s).toString().trim();
+}
+
+function _findAccountRow(sheet, accountName) {
+  try {
+    const data = sheet.getRange(2, 1, Math.max(0, sheet.getLastRow() - 1), 1).getValues();
+    for (let i = 0; i < data.length; i++) {
+      if (_normalize(data[i][0]).toLowerCase() === accountName.toLowerCase()) return i + 2;
+    }
+    return -1;
+  } catch (e) {
+    return -1;
+  }
+}
+
+function _logInfo(title, obj) {
+  try { console.log('[INFO]', title, obj || ''); } catch (e) {}
+}
+function _logError(title, err) {
+  try { console.error('[ERROR]', title, err); } catch (e) {}
+}
+
+function _ensureSheetsAndHeaders() {
+  const ss = _ss();
+  // Ensure required sheets exist; create if missing with minimal headers
+  const ensure = (name, headers) => {
+    let s = ss.getSheetByName(name);
+    if (!s) s = ss.insertSheet(name);
+    const existingHeaders = s.getRange(1, 1, 1, Math.max(1, headers.length)).getValues()[0];
+    let needSet = false;
+    for (let i = 0; i < headers.length; i++) {
+      if ((existingHeaders[i] || '') !== headers[i]) {
+        needSet = true; break;
+      }
+    }
+    if (needSet) s.getRange(1, 1, 1, headers.length).setValues([headers]);
+  };
+
+  ensure(SHEET_NAMES.HOLDINGS, ['Account','Ticker','Shares','Unit Price (CAD)','Total Value (CAD)','Last Updated']);
+  ensure(SHEET_NAMES.ACCOUNTS, ['Account','Balance','Last Updated']);
+  ensure(SHEET_NAMES.TRANSACTIONS, ['Date','Merchant','Amount','Category','Notes']);
+  ensure(SHEET_NAMES.CATEGORIES, ['Keyword','Category']);
+  ensure(SHEET_NAMES.DASHBOARD, ['Metric','Value']);
+}
+
+function _extractText(text, re) {
+  if (!text) return null;
+  const m = String(text).match(re);
+  if (m && m[1]) return m[1].trim();
+  return null;
+}
+
+function _safeExecute(fn, context) {
+  try { return fn.call(context); } catch (e) { _logError('Safe exec failed', e); return null; }
+}
+
+// ----------------- PRICE FETCHING -----------------
+function _isSupportedTicker(ticker) {
+  const tickerUpper = String(ticker || '').toUpperCase();
+  if (!tickerUpper) return false;
+
+  if (tickerUpper.includes('-TSE') || tickerUpper.includes('.TO')) return true;
+  if (/^[A-Z]{1,5}$/.test(tickerUpper)) return true;
+  const supportedCrypto = ['BTC-USD','ETH-USD','BTC-CAD','ETH-CAD','SHIB-USD'];
+  if (supportedCrypto.includes(tickerUpper)) return true;
+  return false;
+}
+
+function _fetchPriceFromAPI(ticker) {
+  try {
+    const tickerUpper = String(ticker || '').toUpperCase();
+    if (!tickerUpper) return 0;
+    if (tickerUpper.includes('-USD') || tickerUpper.includes('-CAD')) return _fetchCryptoPrice(tickerUpper);
+    if (tickerUpper.includes('-TSE') || tickerUpper.includes('.TO')) return _fetchCanadianStockPrice(tickerUpper);
+    return _fetchUSStockPrice(tickerUpper);
+  } catch (error) {
+    console.error('Failed to fetch price for', ticker, error);
+    return 0;
+  }
+}
+
+function _fetchCryptoPrice(ticker) {
+  try {
+    const parts = ticker.split('-');
+    if (parts.length !== 2) return 0;
+    const crypto = parts[0].toUpperCase();
+    const currency = parts[1].toLowerCase();
+
+    const cryptoMap = {
+      'BTC': 'bitcoin',
+      'ETH': 'ethereum',
+      'DOT': 'polkadot',
+      'SOL': 'solana',
+      'SHIB': 'shiba-inu',
+      'ADA': 'cardano',
+      'MATIC': 'matic-network',
+      'DOGE': 'dogecoin'
+    };
+
+    const cryptoId = cryptoMap[crypto];
+    if (!cryptoId) {
+      console.log('Unknown crypto:', crypto);
+      return 0;
+    }
+
+    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=' + encodeURIComponent(cryptoId) + '&vs_currencies=' + encodeURIComponent(currency) + '&include_24hr_change=false';
+
+    const response = UrlFetchApp.fetch(url, { method: 'GET', muteHttpExceptions: true, headers: { 'Accept': 'application/json', 'User-Agent': 'Finance-Automation-Script' } });
+    if (response.getResponseCode && response.getResponseCode() !== 200) {
+      console.error('CoinGecko API error:', response.getResponseCode());
+      return 0;
+    }
+    const data = JSON.parse(response.getContentText());
+    if (data && data[cryptoId] && data[cryptoId][currency]) {
+      // Preserve precision for tiny coins like SHIB
+      const price = parseFloat(String(data[cryptoId][currency]));
+      return price || 0;
+    }
+    return 0;
+  } catch (error) {
+    console.error('Crypto price fetch failed for', ticker, error);
+    return 0;
+  }
+}
+
+function _fetchCanadianStockPrice(ticker) {
+  try {
+    let yahooTicker = ticker.replace('-TSE', '.TO');
+    if (!yahooTicker.includes('.TO') && !yahooTicker.includes('.V')) yahooTicker += '.TO';
+    return _fetchYahooPrice(yahooTicker);
+  } catch (error) { console.error(error); return 0; }
+}
+
+function _fetchUSStockPrice(ticker) {
+  try { return _fetchYahooPrice(ticker); } catch (e) { console.error(e); return 0; }
+}
+
+function _fetchYahooPrice(yahooTicker) {
+  try {
+    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(yahooTicker);
+    const response = UrlFetchApp.fetch(url, { method: 'GET', muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Finance-Script/1.0)' } });
+    if (response.getResponseCode && response.getResponseCode() !== 200) {
+      console.error('Yahoo Finance API error:', response.getResponseCode());
+      return 0;
+    }
+    const data = JSON.parse(response.getContentText());
+    if (data && data.chart && data.chart.result && data.chart.result[0] && data.chart.result[0].meta && data.chart.result[0].meta.regularMarketPrice) {
+      return parseFloat(data.chart.result[0].meta.regularMarketPrice) || 0;
+    }
+    return 0;
+  } catch (error) { console.error('Yahoo Finance fetch failed for', yahooTicker, error); return 0; }
+}
+
+// ----------------- HOLDINGS UPDATE -----------------
+function updateHoldingsAndBalances() {
+  try {
+    console.log('Starting holdings and balances update...');
+    const ss = _ss();
+    _ensureSheetsAndHeaders();
+    const holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
+    const accountsSheet = ss.getSheetByName(SHEET_NAMES.ACCOUNTS);
+    if (!holdingsSheet || holdingsSheet.getLastRow() < 2) {
+      console.log('Holdings sheet is empty, skipping update');
+      return;
+    }
+
+    const numCols = Object.keys(COLUMNS.HOLDINGS).length;
+    const data = holdingsSheet.getRange(2, 1, holdingsSheet.getLastRow() - 1, numCols).getValues();
+    const accountTotals = {};
+    let updatedCount = 0;
+    let errorCount = 0;
+
+    const delay = (ms) => Utilities.sleep(ms);
+
+    for (let i = 0; i < data.length; i++) {
+      const row = i + 2;
+      const account = _normalize(data[i][COLUMNS.HOLDINGS.ACCOUNT - 1]);
+      const ticker = _normalize(data[i][COLUMNS.HOLDINGS.TICKER - 1]);
+      const shares = parseFloat(data[i][COLUMNS.HOLDINGS.SHARES - 1] || 0);
+      if (!account || !ticker || shares === 0) { console.log('Skipping invalid holding:', ticker); continue; }
+
+      let price = 0;
+      let priceMethod = 'None';
+
+      try {
+        if (_isSupportedTicker(ticker)) {
+          console.log('Trying GOOGLEFINANCE for', ticker);
+          const priceCell = holdingsSheet.getRange(row, COLUMNS.HOLDINGS.UNIT_PRICE_CAD);
+          let formula = '';
+          if (ticker.includes('-TSE')) {
+            const symbol = ticker.replace('-TSE', '');
+            formula = '=IFERROR(GOOGLEFINANCE(\"TSE:' + symbol + '\",\"price\"),0)';
+          } else if (ticker.includes('-USD') || ticker.includes('-CAD')) {
+            formula = '=IFERROR(GOOGLEFINANCE(\"' + ticker + '\",\"price\"),0)';
+          } else {
+            formula = '=IFERROR(GOOGLEFINANCE(\"' + ticker + '\",\"price\"),0)';
+          }
+          priceCell.setFormula(formula);
+          delay(500);
+          const priceValue = priceCell.getValue();
+          if (typeof priceValue === 'number' && priceValue > 0) {
+            price = priceValue; priceMethod = 'GOOGLEFINANCE';
+          } else {
+            console.log('GOOGLEFINANCE failed for', ticker, 'trying API...');
+            price = _fetchPriceFromAPI(ticker);
+            if (price > 0) { priceCell.setValue(price); priceMethod = 'API'; }
+          }
+        } else {
+          console.log('Using API for', ticker);
+          price = _fetchPriceFromAPI(ticker);
+          if (price > 0) {
+            holdingsSheet.getRange(row, COLUMNS.HOLDINGS.UNIT_PRICE_CAD).setValue(price);
+            priceMethod = 'API';
+          }
+        }
+
+        const value = (price && shares) ? price * shares : 0;
+        holdingsSheet.getRange(row, COLUMNS.HOLDINGS.TOTAL_VALUE_CAD).setValue(value);
+        holdingsSheet.getRange(row, COLUMNS.HOLDINGS.LAST_UPDATED).setValue(new Date());
+        holdingsSheet.getRange(row, COLUMNS.HOLDINGS.UNIT_PRICE_CAD).setNumberFormat('$#,##0.00####');
+        holdingsSheet.getRange(row, COLUMNS.HOLDINGS.TOTAL_VALUE_CAD).setNumberFormat('$#,##0.00');
+
+        if (value > 0) {
+          accountTotals[account] = (accountTotals[account] || 0) + value;
+          updatedCount++;
+          console.log('Updated', ticker, shares, '×', price, '=', value, '(', priceMethod, ')');
+        } else {
+          errorCount++; console.log('Failed to get price for', ticker);
+        }
+
+        delay(200);
+      } catch (error) {
+        console.error('Error processing', ticker, error);
+        errorCount++;
+        holdingsSheet.getRange(row, COLUMNS.HOLDINGS.UNIT_PRICE_CAD).setValue('ERROR');
+        holdingsSheet.getRange(row, COLUMNS.HOLDINGS.LAST_UPDATED).setValue(new Date());
+      }
+    }
+
+    for (const [accountName, totalValue] of Object.entries(accountTotals)) {
+      try {
+        const accountRow = _findAccountRow(accountsSheet, accountName);
+        if (accountRow > 0) {
+          accountsSheet.getRange(accountRow, COLUMNS.ACCOUNTS.BALANCE).setValue(totalValue);
+          accountsSheet.getRange(accountRow, COLUMNS.ACCOUNTS.BALANCE).setNumberFormat('$#,##0.00');
+          accountsSheet.getRange(accountRow, COLUMNS.ACCOUNTS.LAST_UPDATED).setValue(new Date());
+          console.log('Updated', accountName, 'balance:', totalValue);
+        }
+      } catch (error) {
+        console.error('Failed to update account balance for', accountName, error);
+      }
+    }
+
+    const totalAccountValue = Object.values(accountTotals).reduce((a, b) => a + b, 0);
+    const message = 'Holdings update completed!\n\n' + 'Successfully updated: ' + updatedCount + '\n' + 'Errors: ' + errorCount + '\n' + 'Total account value: $' + totalAccountValue.toFixed(2);
+    console.log(message);
+    try { SpreadsheetApp.getUi().alert(message); } catch (e) {}
+    _logInfo('Holdings update completed', { updated: updatedCount, errors: errorCount, totalValue: totalAccountValue });
+  } catch (error) {
+    console.error('Holdings update failed:', error);
+    _logError('Failed to update holdings and balances', error);
+    try { SpreadsheetApp.getUi().alert('❌ Holdings update failed. Check execution logs for details.'); } catch (e) {}
+  }
+}
+
+// ----------------- MANUAL REFRESH -----------------
+function manualPriceRefresh() {
+  try {
+    console.log('Starting manual price refresh...');
+    const ss = _ss();
+    const holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
+    if (!holdingsSheet || holdingsSheet.getLastRow() < 2) { try { SpreadsheetApp.getUi().alert('No holdings found to refresh.'); } catch (e) {} return; }
+
+    const numCols = Object.keys(COLUMNS.HOLDINGS).length;
+    const data = holdingsSheet.getRange(2, 1, holdingsSheet.getLastRow() - 1, numCols).getValues();
+    let refreshedCount = 0;
+    for (let i = 0; i < data.length; i++) {
+      const row = i + 2;
+      const ticker = _normalize(data[i][COLUMNS.HOLDINGS.TICKER - 1]);
+      const shares = parseFloat(data[i][COLUMNS.HOLDINGS.SHARES - 1] || 0);
+      if (!ticker || shares === 0) continue;
+      console.log('Refreshing price for:', ticker);
+      const price = _fetchPriceFromAPI(ticker);
+      if (price > 0) {
+        holdingsSheet.getRange(row, COLUMNS.HOLDINGS.UNIT_PRICE_CAD).setValue(price);
+        holdingsSheet.getRange(row, COLUMNS.HOLDINGS.TOTAL_VALUE_CAD).setValue(price * shares);
+        holdingsSheet.getRange(row, COLUMNS.HOLDINGS.LAST_UPDATED).setValue(new Date());
+        holdingsSheet.getRange(row, COLUMNS.HOLDINGS.UNIT_PRICE_CAD).setNumberFormat('$#,##0.00####');
+        holdingsSheet.getRange(row, COLUMNS.HOLDINGS.TOTAL_VALUE_CAD).setNumberFormat('$#,##0.00');
+        refreshedCount++;
+        console.log('Refreshed', ticker, price);
+      } else { console.log('Failed to refresh', ticker); }
+      Utilities.sleep(300);
+    }
+    try { SpreadsheetApp.getUi().alert('✅ Manual price refresh completed!\n\nRefreshed ' + refreshedCount + ' prices.'); } catch (e) {}
+  } catch (error) { console.error('Manual price refresh failed:', error); try { SpreadsheetApp.getUi().alert('❌ Manual price refresh failed. Check logs.'); } catch (e) {} }
+}
+
+// ----------------- TESTING -----------------
+function testSinglePriceFetch() {
+  const testTickers = ['BTC-USD','ETH-USD','SHIB-USD','VCE-TSE','DOT-USD','SOL-USD'];
+  const results = [];
+  testTickers.forEach(ticker => {
+    try {
+      console.log('Testing', ticker, '...');
+      const price = _fetchPriceFromAPI(ticker);
+      const result = ticker + ': $' + (price > 0 ? price.toFixed(6) : 'FAILED');
+      results.push(result);
+      console.log(result);
+      Utilities.sleep(500);
+    } catch (e) { results.push(ticker + ': ERROR'); }
+  });
+  const message = 'Price Fetch Test Results:\n\n' + results.join('\n');
+  try { SpreadsheetApp.getUi().alert(message); } catch (e) { console.log(message); }
+}
+
+// ----------------- CATEGORIES LEARNING -----------------
+function learnCategories() {
+  try {
+    const ss = _ss();
+    _ensureSheetsAndHeaders();
+    const txSheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
+    const catSheet = ss.getSheetByName(SHEET_NAMES.CATEGORIES);
+    const lastRow = Math.max(0, txSheet.getLastRow() - 1);
+    if (lastRow === 0) { try { SpreadsheetApp.getUi().alert('No transactions to analyze.'); } catch (e) {} return; }
+
+    // Gather existing keywords
+    const existing = (catSheet.getRange(1,1,Math.max(1,catSheet.getLastRow()),1).getValues() || []).map(r => _normalize(r[0]).toLowerCase()).filter(x => x);
+    const stopwords = new Set(['amount','auto','logged','money','deposit','card','cash','credit','purchase','trade','unknown','sender','interac','you\'ve','received','from','been','automatically','to','of','the','and','for']);
+
+    const notes = txSheet.getRange(2, COLUMNS.TRANSACTIONS.NOTES, lastRow, 1).getValues().flat();
+    const merchants = txSheet.getRange(2, COLUMNS.TRANSACTIONS.MERCHANT, lastRow, 1).getValues().flat();
+    const pool = notes.concat(merchants).map(x => _normalize(x)).filter(x => x);
+
+    const freq = {};
+    pool.forEach(text => {
+      text.split(/[^A-Za-z0-9&\-']+/).forEach(tok => {
+        const t = tok.toLowerCase().trim();
+        if (!t || t.length < 3) return;
+        if (stopwords.has(t)) return;
+        if (/^\d+$/.test(t)) return;
+        freq[t] = (freq[t] || 0) + 1;
+      });
+    });
+
+    const candidates = Object.keys(freq).filter(k => freq[k] >= 2 && existing.indexOf(k) === -1);
+    candidates.sort((a,b) => freq[b] - freq[a]);
+    const appendLimit = Math.min(candidates.length, 200);
+    for (let i = 0; i < appendLimit; i++) {
+      catSheet.appendRow([candidates[i], '']);
+    }
+    try { SpreadsheetApp.getUi().alert('Added ' + appendLimit + ' category keyword candidates (check the Categories sheet).'); } catch (e) {}
+  } catch (e) { console.error('learnCategories failed', e); try { SpreadsheetApp.getUi().alert('learnCategories failed - see logs'); } catch (e2) {} }
+}
+
+// ----------------- EMAIL / INTERAC PARSING (SAFE) -----------------
+function _parseInteracEmail(subject, body) {
+  // Return null / staged result if recipient cannot be confidently parsed
+  const recipient = _extractText(subject, /received from\s+(.+?)\b/i) || _extractText(body, /received from\s+(.+?)\b/i);
+  if (!recipient) return { toAccount: 'Pending - Unknown Recipient', shouldStage: true };
+  return { toAccount: _normalize(recipient), shouldStage: false };
+}
+
+function _parsePcFinancialEmail(subject, body) {
+  const recipient = _extractText(subject, /transfer to\s+(.+?)\s+has been/i) || _extractText(body, /transfer to\s+(.+?)\s+has been/i);
+  if (!recipient) return { toAccount: 'Pending - Unknown Recipient', shouldStage: true };
+  return { toAccount: _normalize(recipient), shouldStage: false };
+}
+
+// ----------------- MENU & ON OPEN -----------------
+function onOpen() {
+  try {
+    const ss = _ss();
+    _ensureSheetsAndHeaders();
+    const menu = SpreadsheetApp.getUi().createMenu('💰 Finance Automation V7 (Patched)')
+      .addItem('🔧 Setup Permissions', 'setupPermissions')
+      .addSeparator()
+      .addItem('🔄 Process All', 'processEverything')
+      .addSeparator()
+      .addItem('📧 Process New Emails', 'processNewEmails')
+      .addItem('📊 Update Holdings & Balances', 'updateHoldingsAndBalances')
+      .addItem('🔄 Manual Price Refresh', 'manualPriceRefresh')
+      .addItem('🔗 Pair Staged Transfers', 'pairStagedTransfers')
+      .addSeparator()
+      .addItem('📈 Rebuild Dashboard', 'buildDashboard')
+      .addItem('🏷️ Learn Categories', 'learnCategories')
+      .addItem('💡 Suggest Categories', 'suggestCategoriesFromTransactions')
+      .addSeparator()
+      .addItem('📁 Import from CSV', 'importFromCsv')
+      .addItem('🎨 Apply Formatting', 'applyConditionalFormatting')
+      .addItem('🧹 Clean Stale Transactions', 'cleanupStaleTransactions')
+      .addSeparator()
+      .addItem('🧪 Test Price Fetching', 'testSinglePriceFetch')
+      .addItem('🛠️ System Diagnostics', 'runSystemDiagnostics')
+      .addItem('📋 Show Configuration', 'showConfiguration');
+    menu.addToUi();
+    _logInfo('Finance Automation V7 menu loaded successfully');
+  } catch (error) {
+    console.error('Failed to create menu:', error);
+    try {
+      SpreadsheetApp.getUi().alert('Finance Automation V7 Setup Error\n\nThere was an issue setting up the system. Error: ' + (error && error.message ? error.message : error) + '\n\nPlease run the "Setup Permissions" function first.');
+    } catch (alertError) { console.error('Could not show error alert:', alertError); }
+  }
+}
+
+// ----------------- STUBS / PLACEHOLDERS FOR BROADER SYSTEM -----------------
+// The functions below are included as safe placeholders so the patched file is complete.
+// Replace these with your production implementations as needed.
+
+function processEverything() { _logInfo('processEverything called'); try { SpreadsheetApp.getUi().alert('processEverything not implemented in patched file — run individual steps.'); } catch (e) {} }
+function processNewEmails() { _logInfo('processNewEmails called'); try { SpreadsheetApp.getUi().alert('processNewEmails not implemented in patched file.'); } catch (e) {} }
+function pairStagedTransfers() { _logInfo('pairStagedTransfers called'); try { SpreadsheetApp.getUi().alert('pairStagedTransfers not implemented in patched file.'); } catch (e) {} }
+function buildDashboard() { _logInfo('buildDashboard called'); }
+function suggestCategoriesFromTransactions() { _logInfo('suggestCategoriesFromTransactions called'); }
+function importFromCsv() { _logInfo('importFromCsv called'); }
+function applyConditionalFormatting() { _logInfo('applyConditionalFormatting called'); }
+function cleanupStaleTransactions() { _logInfo('cleanupStaleTransactions called'); }
+function runSystemDiagnostics() { _logInfo('runSystemDiagnostics called'); }
+function showConfiguration() { _logInfo('showConfiguration called', {SPREADSHEET_ID: SPREADSHEET_ID}); }
+
+// ----------------- NOTES -----------------
+// - AUTO_RUN has been removed/disabled intentionally. If you want a controlled auto-run,
+//   add a boolean flag at the top and ensure you've authorized the script and tested manually.
+// - After pasting this script into Apps Script editor:
+//     1) Set SPREADSHEET_ID if this is not a container-bound script.
+//     2) Run `setupPermissions()` from the function dropdown and authorize.
+//     3) Run `updateHoldingsAndBalances()` or `testSinglePriceFetch()` to verify functionality.
+// - Replace placeholder/stub functions with your real implementations where indicated.
+
+// End of patched file
*** End Patch
