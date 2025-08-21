/**
 * SPREADSHEET ANALYZER - Understanding Current Structure
 * This script analyzes your existing finance spreadsheet to help create V9
 */

function analyzeCurrentSpreadsheet() {
  const SPREADSHEET_ID = '1-eUeYMTeKoz2bIkHS8Jc2J9vO0Bnl8y6aHXmXGdJqg8';
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const analysis = {};
    
    // Analyze each sheet
    const sheets = ss.getSheets();
    console.log(`Found ${sheets.length} sheets:`);
    
    sheets.forEach(sheet => {
      const name = sheet.getName();
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      
      analysis[name] = {
        rows: lastRow,
        columns: lastCol,
        headers: []
      };
      
      // Get headers if they exist
      if (lastRow > 0 && lastCol > 0) {
        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        analysis[name].headers = headers;
        
        // Get a few sample rows for structure understanding
        if (lastRow > 1) {
          const sampleRows = Math.min(3, lastRow - 1);
          const sampleData = sheet.getRange(2, 1, sampleRows, lastCol).getValues();
          analysis[name].sampleData = sampleData;
        }
      }
      
      console.log(`${name}: ${lastRow} rows, ${lastCol} columns`);
      console.log(`Headers: ${analysis[name].headers.join(', ')}`);
    });
    
    // Output analysis
    console.log('\n=== FULL ANALYSIS ===');
    console.log(JSON.stringify(analysis, null, 2));
    
    return analysis;
    
  } catch (error) {
    console.error('Error analyzing spreadsheet:', error);
    return null;
  }
}

function analyzeTransactionPatterns() {
  const SPREADSHEET_ID = '1-eUeYMTeKoz2bIkHS8Jc2J9vO0Bnl8y6aHXmXGdJqg8';
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const txSheet = ss.getSheetByName('Transactions');
    
    if (!txSheet) {
      console.log('No Transactions sheet found');
      return;
    }
    
    const lastRow = txSheet.getLastRow();
    if (lastRow < 2) {
      console.log('No transaction data found');
      return;
    }
    
    // Analyze recent transactions (last 20)
    const startRow = Math.max(2, lastRow - 19);
    const numRows = lastRow - startRow + 1;
    const data = txSheet.getRange(startRow, 1, numRows, txSheet.getLastColumn()).getValues();
    
    console.log('\n=== RECENT TRANSACTIONS ANALYSIS ===');
    console.log(`Analyzing ${numRows} recent transactions:`);
    
    const patterns = {
      banks: new Set(),
      categories: new Set(),
      types: new Set(),
      amountRanges: { positive: 0, negative: 0, zero: 0 }
    };
    
    data.forEach((row, index) => {
      const actualRow = startRow + index;
      const [date, amount, from, to, bank, notes, emailId, category, type] = row;
      
      if (bank) patterns.banks.add(bank);
      if (category) patterns.categories.add(category);
      if (type) patterns.types.add(type);
      
      const numAmount = parseFloat(amount) || 0;
      if (numAmount > 0) patterns.amountRanges.positive++;
      else if (numAmount < 0) patterns.amountRanges.negative++;
      else patterns.amountRanges.zero++;
      
      console.log(`Row ${actualRow}: ${date} | ${amount} | ${from} → ${to} | ${bank} | ${category}`);
    });
    
    console.log('\n=== PATTERNS FOUND ===');
    console.log('Banks:', Array.from(patterns.banks));
    console.log('Categories:', Array.from(patterns.categories));
    console.log('Types:', Array.from(patterns.types));
    console.log('Amount Distribution:', patterns.amountRanges);
    
  } catch (error) {
    console.error('Error analyzing transactions:', error);
  }
}

function analyzeAccountsAndHoldings() {
  const SPREADSHEET_ID = '1-eUeYMTeKoz2bIkHS8Jc2J9vO0Bnl8y6aHXmXGdJqg8';
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Analyze Accounts
    const accountsSheet = ss.getSheetByName('Accounts');
    if (accountsSheet && accountsSheet.getLastRow() > 1) {
      console.log('\n=== ACCOUNTS ANALYSIS ===');
      const accountData = accountsSheet.getRange(2, 1, accountsSheet.getLastRow() - 1, accountsSheet.getLastColumn()).getValues();
      
      accountData.forEach(row => {
        const [name, balance, lastUpdated, type] = row;
        console.log(`${name}: $${balance} (${type}) - Updated: ${lastUpdated}`);
      });
    }
    
    // Analyze Holdings
    const holdingsSheet = ss.getSheetByName('Holdings');
    if (holdingsSheet && holdingsSheet.getLastRow() > 1) {
      console.log('\n=== HOLDINGS ANALYSIS ===');
      const holdingsData = holdingsSheet.getRange(2, 1, holdingsSheet.getLastRow() - 1, holdingsSheet.getLastColumn()).getValues();
      
      holdingsData.forEach(row => {
        const [account, ticker, shares, unitPrice, totalValue, lastUpdated] = row;
        console.log(`${account}: ${shares} × ${ticker} @ $${unitPrice} = $${totalValue}`);
      });
    }
    
  } catch (error) {
    console.error('Error analyzing accounts/holdings:', error);
  }
}

// Run all analyses
function runFullAnalysis() {
  console.log('Starting comprehensive spreadsheet analysis...\n');
  
  analyzeCurrentSpreadsheet();
  analyzeTransactionPatterns();
  analyzeAccountsAndHoldings();
  
  console.log('\nAnalysis complete! Check the logs above for detailed structure information.');
}
