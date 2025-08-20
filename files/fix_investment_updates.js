function updateHoldingsAndBalances() {
  try {
    const ss = _ss();
    _ensureSheetsAndHeaders();
    const holdingsSheet = ss.getSheetByName(SHEET_NAMES.HOLDINGS);
    const accountsSheet = ss.getSheetByName(SHEET_NAMES.ACCOUNTS);
    
    if (!holdingsSheet || holdingsSheet.getLastRow() < 2) {
      _logInfo('Holdings sheet is empty, skipping update');
      return;
    }

    // Get all holdings data
    const holdingsData = holdingsSheet.getRange(2, 1, holdingsSheet.getLastRow() - 1, 
                         Object.keys(COLUMNS.HOLDINGS).length).getValues();
    
    // Initialize account totals object
    const accountTotals = {};
    let updatedCount = 0;
    let errorCount = 0;
    
    _logInfo(`Processing ${holdingsData.length} holdings entries`);
    
    // Process each holding
    for (let i = 0; i < holdingsData.length; i++) {
      const row = i + 2; // Adjust for 1-indexed and header row
      const account = _normalize(holdingsData[i][COLUMNS.HOLDINGS.ACCOUNT - 1]);
      const ticker = _normalize(holdingsData[i][COLUMNS.HOLDINGS.TICKER - 1]);
      const shares = parseFloat(holdingsData[i][COLUMNS.HOLDINGS.SHARES - 1] || 0);
      
      if (!account || !ticker || isNaN(shares) || shares === 0) {
        _logWarning(`Skipping invalid holding at row ${row}: ${ticker}`);
        continue;
      }
      
      _logInfo(`Processing ${ticker} in ${account}: ${shares} shares`);
      
      try {
        let price = 0;
        let priceSource = 'Unknown';
        
        // Special handling for SHIB and other small decimal cryptocurrencies
        if (ticker.toUpperCase() === 'SHIB-USD' || ticker.toUpperCase() === 'SHIB') {
          price = _fetchCryptoPriceWithPrecision(ticker);
          priceSource = 'Crypto API (High Precision)';
        } 
        // Standard price fetching for other assets
        else {
          // Try to get price from GOOGLEFINANCE formula if it exists
          const priceCell = holdingsSheet.getRange(row, COLUMNS.HOLDINGS.UNIT_PRICE_CAD);
          const currentValue = priceCell.getValue();
          
          if (typeof currentValue === 'number' && currentValue > 0) {
            price = currentValue;
            priceSource = 'Existing Cell Value';
          }
          // If no formula or value is 0, try API
          else {
            if (_isSupportedTicker(ticker)) {
              // For supported tickers, set GOOGLEFINANCE formula
              const formula = _buildGoogleFinanceFormula(ticker);
              if (formula) {
                priceCell.setFormula(formula);
                Utilities.sleep(200); // Give time for formula to calculate
                SpreadsheetApp.flush();
                
                const formulaValue = priceCell.getValue();
                if (typeof formulaValue === 'number' && formulaValue > 0) {
                  price = formulaValue;
                  priceSource = 'GOOGLEFINANCE';
                }
              }
            }
            
            // If still no price, try API
            if (price === 0) {
              price = _fetchPriceFromAPI(ticker);
              if (price > 0) {
                priceCell.setValue(price);
                priceSource = 'External API';
              }
            }
          }
        }
        
        // Calculate total value
        const totalValue = price * shares;
        
        // Update total value cell
        holdingsSheet.getRange(row, COLUMNS.HOLDINGS.TOTAL_VALUE_CAD).setValue(totalValue);
        holdingsSheet.getRange(row, COLUMNS.HOLDINGS.LAST_UPDATED).setValue(new Date());
        
        // Format cells
        holdingsSheet.getRange(row, COLUMNS.HOLDINGS.UNIT_PRICE_CAD).setNumberFormat('$#,##0.000000');
        holdingsSheet.getRange(row, COLUMNS.HOLDINGS.TOTAL_VALUE_CAD).setNumberFormat('$#,##0.00');
        
        // Add to account totals
        if (totalValue > 0) {
          if (!accountTotals[account]) accountTotals[account] = 0;
          accountTotals[account] += totalValue;
          updatedCount++;
          _logInfo(`Updated ${ticker}: ${shares} × $${price} = $${totalValue} (${priceSource})`);
        } else {
          errorCount++;
          _logWarning(`Failed to get valid price for ${ticker}`);
        }
      } catch (error) {
        errorCount++;
        _logError(`Error processing ${ticker} in ${account}`, error);
      }
      
      // Add delay to avoid API rate limits
      Utilities.sleep(200);
    }
    
    // Update account balances based on holdings
    _logInfo(`Updating account balances with totals:`, accountTotals);
    
    for (const [accountName, totalValue] of Object.entries(accountTotals)) {
      try {
        // Find account row
        const accountRow = _findAccountRow(accountsSheet, accountName);
        
        if (accountRow > 0) {
          _logInfo(`Updating ${accountName} balance to $${totalValue.toFixed(2)}`);
          
          // Update balance and last updated
          accountsSheet.getRange(accountRow, COLUMNS.ACCOUNTS.BALANCE).setValue(totalValue);
          accountsSheet.getRange(accountRow, COLUMNS.ACCOUNTS.BALANCE).setNumberFormat('$#,##0.00');
          accountsSheet.getRange(accountRow, COLUMNS.ACCOUNTS.LAST_UPDATED).setValue(new Date());
        } else {
          _logWarning(`Could not find account ${accountName} in Accounts sheet`);
        }
      } catch (error) {
        _logError(`Failed to update balance for ${accountName}`, error);
      }
    }
    
    const summary = `Holdings update completed:\n` +
                    `• ${updatedCount} holdings updated\n` +
                    `• ${errorCount} errors encountered\n` +
                    `• ${Object.keys(accountTotals).length} account balances updated`;
    
    _logInfo(summary);
    try { SpreadsheetApp.getUi().alert(summary); } catch (e) {}
    
  } catch (error) {
    _logError('Holdings and balances update failed', error);
    try { SpreadsheetApp.getUi().alert('Holdings update failed: ' + error.message); } catch (e) {}
  }
}

// Special handling for cryptocurrencies with very small values (like SHIB)
function _fetchCryptoPriceWithPrecision(ticker) {
  try {
    const cryptoId = ticker.toUpperCase().includes('SHIB') ? 'shiba-inu' : null;
    if (!cryptoId) return 0;
    
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd,cad`;
    const response = UrlFetchApp.fetch(url, { 
      muteHttpExceptions: true,
      headers: { 'Accept': 'application/json' } 
    });
    
    if (response.getResponseCode() !== 200) {
      _logError(`CoinGecko API error: ${response.getResponseCode()}`);
      return 0;
    }
    
    const data = JSON.parse(response.getContentText());
    
    // Get price in CAD if available, otherwise use USD and convert
    if (data && data[cryptoId]) {
      if (data[cryptoId].cad) {
        return parseFloat(data[cryptoId].cad);
      } else if (data[cryptoId].usd) {
        // Convert USD to CAD (approximate)
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

// Helper to build GOOGLEFINANCE formula
function _buildGoogleFinanceFormula(ticker) {
  try {
    if (!ticker) return null;
    
    // Clean up ticker
    const cleanTicker = ticker.replace(/[^\w\.\-]/g, '').toUpperCase();
    
    // Handle different ticker formats
    if (cleanTicker.endsWith('-TSE')) {
      const symbol = cleanTicker.replace('-TSE', '');
      return `=IFERROR(GOOGLEFINANCE("TSE:${symbol}","price"),0)`;
    } else if (cleanTicker.includes('.TO')) {
      const symbol = cleanTicker.replace('.TO', '');
      return `=IFERROR(GOOGLEFINANCE("TSE:${symbol}","price"),0)`;
    } else if (cleanTicker.includes('-USD')) {
      // USD assets might need special handling
      return `=IFERROR(GOOGLEFINANCE("CURRENCY:USDCAD")*GOOGLEFINANCE("${cleanTicker}","price"),0)`;
    } else {
      // Default US stocks
      return `=IFERROR(GOOGLEFINANCE("${cleanTicker}","price"),0)`;
    }
  } catch (error) {
    _logError(`Failed to build GOOGLEFINANCE formula for ${ticker}`, error);
    return null;
  }
}