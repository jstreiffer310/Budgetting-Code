function buildDashboard() {
  try {
    const ss = _ss();
    const dashboardSheet = ss.getSheetByName(SHEET_NAMES.DASHBOARD);
    const transactionsSheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
    const categoriesSheet = ss.getSheetByName(SHEET_NAMES.CATEGORIES);
    
    // Clear existing dashboard content
    dashboardSheet.clear();
    
    // Set dashboard title
    dashboardSheet.getRange(1, 1).setValue('Finance Dashboard');
    dashboardSheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
    dashboardSheet.getRange(1, 1, 1, 5).merge();
    
    // Get last 30 days of transactions
    const lastRow = transactionsSheet.getLastRow();
    if (lastRow <= 1) {
      dashboardSheet.getRange(3, 1).setValue('No transaction data available');
      return;
    }
    
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const txData = transactionsSheet.getRange(2, 1, lastRow - 1, 5).getValues();
    
    // Get category mappings from Categories sheet
    const categoryMappings = {};
    if (categoriesSheet.getLastRow() > 1) {
      const catData = categoriesSheet.getRange(2, 1, categoriesSheet.getLastRow() - 1, 2).getValues();
      catData.forEach(row => {
        const keyword = _normalize(row[0]).toLowerCase();
        const category = _normalize(row[1]);
        if (keyword && category) categoryMappings[keyword] = category;
      });
    }
    
    // Process transactions to extract category data
    const categoryData = {};
    const manualCategories = new Set();
    let totalExpense = 0;
    let totalIncome = 0;
    let filteredTransactions = 0;
    
    // Process each transaction
    txData.forEach(row => {
      const date = new Date(row[COLUMNS.TRANSACTIONS.DATE - 1]);
      const amount = parseFloat(row[COLUMNS.TRANSACTIONS.AMOUNT - 1] || 0);
      const merchant = _normalize(row[COLUMNS.TRANSACTIONS.MERCHANT - 1]);
      let category = _normalize(row[COLUMNS.TRANSACTIONS.CATEGORY - 1]);
      
      // Skip transactions outside time range or with invalid amounts
      if (date < thirtyDaysAgo || isNaN(amount) || amount === 0) return;
      
      filteredTransactions++;
      
      // Track income/expense totals
      if (amount > 0) {
        totalIncome += amount;
      } else {
        totalExpense += Math.abs(amount);
      }
      
      // Only process expenses for the pie chart
      if (amount >= 0) return;
      
      // If no category is assigned, try to find one based on merchant
      if (!category || category === 'Uncategorized' || category === 'Unknown') {
        if (merchant) {
          // Look for keyword matches in the merchant name
          const merchantLower = merchant.toLowerCase();
          let bestMatch = '';
          
          Object.keys(categoryMappings).forEach(keyword => {
            if (merchantLower.includes(keyword) && keyword.length > bestMatch.length) {
              bestMatch = keyword;
              category = categoryMappings[keyword];
            }
          });
        }
        
        // If still no category, use "Uncategorized"
        if (!category) category = 'Uncategorized';
      } else {
        // Track manual categories to ensure they're included in the Categories sheet
        manualCategories.add(category);
      }
      
      // Add to category data
      if (!categoryData[category]) categoryData[category] = { amount: 0, count: 0 };
      categoryData[category].amount += Math.abs(amount);
      categoryData[category].count++;
    });
    
    // Sort categories by amount
    const sortedCategories = Object.keys(categoryData)
      .sort((a, b) => categoryData[b].amount - categoryData[a].amount);
    
    // Create summary section
    dashboardSheet.getRange(3, 1).setValue('30-Day Summary');
    dashboardSheet.getRange(3, 1).setFontWeight('bold');
    
    dashboardSheet.getRange(4, 1).setValue('Total Income:');
    dashboardSheet.getRange(4, 2).setValue(totalIncome).setNumberFormat('$#,##0.00');
    
    dashboardSheet.getRange(5, 1).setValue('Total Expenses:');
    dashboardSheet.getRange(5, 2).setValue(totalExpense).setNumberFormat('$#,##0.00');
    
    dashboardSheet.getRange(6, 1).setValue('Net Cash Flow:');
    dashboardSheet.getRange(6, 2).setValue(totalIncome - totalExpense).setNumberFormat('$#,##0.00');
    
    dashboardSheet.getRange(7, 1).setValue('Transactions:');
    dashboardSheet.getRange(7, 2).setValue(filteredTransactions);
    
    // Create data for pie chart
    dashboardSheet.getRange(9, 1).setValue('Expense Categories');
    dashboardSheet.getRange(9, 1).setFontWeight('bold');
    
    dashboardSheet.getRange(10, 1).setValue('Category');
    dashboardSheet.getRange(10, 2).setValue('Amount');
    dashboardSheet.getRange(10, 3).setValue('Percentage');
    dashboardSheet.getRange(10, 4).setValue('Count');
    
    dashboardSheet.getRange(10, 1, 1, 4).setFontWeight('bold').setBackground('#f0f0f0');
    
    // Populate category data
    sortedCategories.forEach((category, index) => {
      const row = 11 + index;
      const amount = categoryData[category].amount;
      const percentage = totalExpense > 0 ? amount / totalExpense : 0;
      
      dashboardSheet.getRange(row, 1).setValue(category);
      dashboardSheet.getRange(row, 2).setValue(amount).setNumberFormat('$#,##0.00');
      dashboardSheet.getRange(row, 3).setValue(percentage).setNumberFormat('0.0%');
      dashboardSheet.getRange(row, 4).setValue(categoryData[category].count);
    });
    
    // Create pie chart
    if (sortedCategories.length > 0) {
      const dataRange = dashboardSheet.getRange(10, 1, sortedCategories.length + 1, 2);
      
      const chart = dashboardSheet.newChart()
        .setChartType(Charts.ChartType.PIE)
        .addRange(dataRange)
        .setPosition(3, 5, 0, 0)
        .setOption('title', 'Expense Categories')
        .setOption('pieSliceText', 'percentage')
        .setOption('legend', { position: 'right' })
        .setOption('width', 500)
        .setOption('height', 300)
        .build();
      
      dashboardSheet.insertChart(chart);
    }
    
    // Add manually entered categories to Categories sheet if not already present
    if (manualCategories.size > 0) {
      const existingCategories = new Set(Object.values(categoryMappings));
      let newCategoriesAdded = 0;
      
      manualCategories.forEach(category => {
        if (!existingCategories.has(category)) {
          // Add the category as both keyword and category value
          categoriesSheet.appendRow([category.toLowerCase(), category]);
          newCategoriesAdded++;
        }
      });
      
      if (newCategoriesAdded > 0) {
        _logInfo(`Added ${newCategoriesAdded} manual categories to Categories sheet`);
      }
    }
    
    // Add last update timestamp
    dashboardSheet.getRange(sortedCategories.length + 12, 1).setValue('Last Updated:');
    dashboardSheet.getRange(sortedCategories.length + 12, 2).setValue(new Date());
    
    _logInfo('Dashboard built successfully', {
      categories: sortedCategories.length,
      transactions: filteredTransactions,
      income: totalIncome,
      expenses: totalExpense
    });
    
  } catch (error) {
    _logError('Failed to build dashboard', error);
    try { SpreadsheetApp.getUi().alert('Dashboard build failed: ' + error.message); } catch (e) {}
  }
}