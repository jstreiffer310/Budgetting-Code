// Improved helper for finding pending transactions that need review
function reviewPendingTransactions() {
  try {
    const ss = _ss();
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    const stagingSheet = ss.getSheetByName(SHEET_NAMES.STAGING);
    
    let pendingCount = 0;
    let mainPending = [];
    let stagingPending = [];
    
    // Check main transactions for pending ones
    if (mainSheet && mainSheet.getLastRow() > 1) {
      const data = mainSheet.getRange(2, 1, mainSheet.getLastRow() - 1, 
                 Object.keys(COLUMNS.TRANSACTIONS).length).getValues();
      
      data.forEach((row, index) => {
        const rowNum = index + 2;
        const notes = _normalize(row[COLUMNS.TRANSACTIONS.NOTES - 1]);
        
        if (notes.toLowerCase().includes('pending') || 
            _normalize(row[COLUMNS.TRANSACTIONS.TO - 1]).toLowerCase().includes('pending')) {
          pendingCount++;
          mainPending.push({
            sheet: 'Transactions',
            row: rowNum,
            date: new Date(row[COLUMNS.TRANSACTIONS.DATE - 1]),
            amount: row[COLUMNS.TRANSACTIONS.AMOUNT - 1],
            description: `${row[COLUMNS.TRANSACTIONS.FROM - 1]} → ${row[COLUMNS.TRANSACTIONS.TO - 1]}`
          });
        }
      });
    }
    
    // Check staging sheet for pending transactions
    if (stagingSheet && stagingSheet.getLastRow() > 1) {
      const data = stagingSheet.getRange(2, 1, stagingSheet.getLastRow() - 1, 
                 Object.keys(COLUMNS.STAGING).length).getValues();
      
      data.forEach((row, index) => {
        const rowNum = index + 2;
        const status = _normalize(row[COLUMNS.STAGING.STATUS - 1]);
        
        if (status.toLowerCase().includes('pending')) {
          pendingCount++;
          stagingPending.push({
            sheet: 'Staging',
            row: rowNum,
            date: new Date(row[COLUMNS.STAGING.DATE - 1]),
            amount: row[COLUMNS.STAGING.AMOUNT - 1],
            description: `${row[COLUMNS.STAGING.FROM - 1]} → ${row[COLUMNS.STAGING.TO - 1]}`
          });
        }
      });
    }
    
    // Sort all pending items by date (newest first)
    const allPending = [...mainPending, ...stagingPending].sort((a, b) => b.date - a.date);
    
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

// Add this to your menu
function onOpen() {
  try {
    const ss = _ss();
    _ensureSheetsAndHeaders();
    const ui = SpreadsheetApp.getUi();
    
    const menu = ui.createMenu('💰 Finance Automation V7')
      .addItem('🔄 Process All', 'processEverything')
      .addSeparator()
      .addItem('📧 Process New Emails', 'processNewEmails')
      .addItem('📊 Update Holdings & Balances', 'updateHoldingsAndBalances')
      .addItem('🔗 Pair Staged Transfers', 'pairStagedTransfers')
      .addSeparator()
      .addItem('📈 Rebuild Dashboard', 'buildDashboard')
      .addItem('🏷️ Learn Categories', 'learnCategories')
      .addItem('🔍 Review Pending Transactions', 'reviewPendingTransactions')
      .addSeparator()
      .addItem('📁 Import from CSV', 'importFromCsv')
      .addItem('🧹 Clean Stale Transactions', 'cleanupStaleTransactions')
      .addSeparator()
      .addItem('🧪 Test Price Fetching', 'testSinglePriceFetch')
      .addItem('🛠️ System Diagnostics', 'runSystemDiagnostics');
    
    menu.addToUi();
    _logInfo('Finance Automation V7 menu loaded successfully');
    
  } catch (error) {
    _logError('Failed to create menu', error);
  }
}

// Test function to verify SHIB price fetching
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