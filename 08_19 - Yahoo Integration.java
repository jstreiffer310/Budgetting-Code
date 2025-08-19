// --- Adjustment: use GOOGLEFINANCE instead of Yahoo scraping in Holdings updater ---

function updateHoldings() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const holdingsSheet = ss.getSheetByName(HOLDINGS_SHEET_NAME);
  const accountsSheet = ss.getSheetByName(ACCOUNTS_SHEET_NAME);

  const data = holdingsSheet.getRange(2, 1, holdingsSheet.getLastRow() - 1, 3).getValues();
  let total = 0;

  data.forEach((row, i) => {
    const symbol = row[0];
    const qty = row[1];

    if (!symbol || !qty) return;

    // Use GOOGLEFINANCE in-sheet instead of fetching from Yahoo
    const formulaCell = holdingsSheet.getRange(i + 2, 3);
    formulaCell.setFormula(`=GOOGLEFINANCE("${symbol}", "price")`);

    const price = formulaCell.getValue();
    if (price && !isNaN(price)) {
      total += price * qty;
    }
  });

  // Update in Accounts sheet
  const rows = accountsSheet.getRange(2, 1, accountsSheet.getLastRow() - 1, 2).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === 'Investments') {
      accountsSheet.getRange(i + 2, 2).setValue(total);
      break;
    }
  }
}
