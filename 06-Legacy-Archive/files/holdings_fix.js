// Modify the updateHoldingsAndBalances function to correctly handle account aggregation
function updateHoldingsAndBalances() {
  try {
    console.log('Starting holdings and balances update...');
    const ss = _ss();
    _ensureSheetsAndHeaders();
    const holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
    const accountsSheet = ss.getSheetByName(SHEET_NAMES.ACCOUNTS);
    
    if (!holdingsSheet || holdingsSheet.getLastRow() < 2) {
      console.log('Holdings sheet is empty, skipping update');
      return;
    }

    // Get all holdings data
    const data = holdingsSheet.getRange(2, 1, holdingsSheet.getLastRow() - 1, 
      Object.keys(COLUMNS.HOLDINGS).length).getValues();
    
    // Clear object to track account totals
    const accountTotals = {};
    
    // Process each holding
    for (let i = 0; i < data.length; i++) {
      const row = i + 2;
      const account = _normalize(data[i][COLUMNS.HOLDINGS.ACCOUNT - 1]);
      const ticker = _normalize(data[i][COLUMNS.HOLDINGS.TICKER - 1]);
      const shares = parseFloat(data[i][COLUMNS.HOLDINGS.SHARES - 1] || 0);
      
      // Skip invalid holdings
      if (!account || !ticker || shares === 0) {
        console.log('Skipping invalid holding:', ticker);
        continue;
      }
      
      // Get or calculate price
      let price = 0;
      try {
        // Try to get the price from the cell (which might have a GOOGLEFINANCE formula)
        const priceValue = holdingsSheet.getRange(row, COLUMNS.HOLDINGS.UNIT_PRICE_CAD).getValue();
        if (typeof priceValue === 'number' && priceValue > 0) {
          price = priceValue;
        } else {
          // If no valid price found, try to get it from API
          price = _fetchPriceFromAPI(ticker);
          if (price > 0) {
            holdingsSheet.getRange(row, COLUMNS.HOLDINGS.UNIT_PRICE_CAD).setValue(price);
          }
        }
      } catch (error) {
        console.error('Error getting price for', ticker, error);
      }
      
      // Calculate total value and update cell
      const value = price * shares;
      holdingsSheet.getRange(row, COLUMNS.HOLDINGS.TOTAL_VALUE_CAD).setValue(value);
      
      // Add to account total
      if (account && value > 0) {
        // Initialize if not exists
        if (!accountTotals[account]) accountTotals[account] = 0;
        // Add this holding's value to the account total
        accountTotals[account] += value;
        console.log(`Adding ${value} for ${ticker} to ${account}, total now: ${accountTotals[account]}`);
      }
    }
    
    // Update each account's balance
    for (const [accountName, totalValue] of Object.entries(accountTotals)) {
      if (!accountName) continue;
      
      // Find the account row
      const accountRow = _findAccountRow(accountsSheet, accountName);
      if (accountRow > 0) {
        // Update the account balance
        accountsSheet.getRange(accountRow, COLUMNS.ACCOUNTS.BALANCE).setValue(totalValue);
        accountsSheet.getRange(accountRow, COLUMNS.ACCOUNTS.BALANCE).setNumberFormat('$#,##0.00');
        accountsSheet.getRange(accountRow, COLUMNS.ACCOUNTS.LAST_UPDATED).setValue(new Date());
        console.log(`Updated ${accountName} balance to ${totalValue}`);
      } else {
        console.log(`Could not find account row for ${accountName}`);
      }
    }
    
    console.log('Holdings and balances update complete');
    
  } catch (error) {
    _logError('Failed to update holdings and balances', error);
    console.error('Holdings update failed:', error);
  }
}