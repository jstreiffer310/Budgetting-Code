function learnCategories() {
  try {
    const ss = _ss();
    _ensureSheetsAndHeaders();
    const txSheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
    const catSheet = ss.getSheetByName(SHEET_NAMES.CATEGORIES);
    const lastRow = Math.max(0, txSheet.getLastRow() - 1);
    
    if (lastRow === 0) {
      try { SpreadsheetApp.getUi().alert('No transactions to analyze.'); } catch (e) {}
      return;
    }

    // Expanded stopwords list to filter out generic terms
    const stopwords = new Set([
      // Common banking terms
      'amount', 'auto', 'logged', 'money', 'deposit', 'card', 'cash', 'credit', 'purchase',
      'trade', 'unknown', 'sender', 'interac', 'received', 'transfer', 'payment', 'transaction',
      'bank', 'banking', 'charge', 'balance', 'online', 'merchant', 'store', 'shop', 'inc',
      'ltd', 'account', 'service', 'fee', 'interest',
      
      // Common English words
      'you\'ve', 'been', 'automatically', 'from', 'been', 'automatically', 'to', 'of', 'the',
      'and', 'for', 'with', 'your', 'this', 'that', 'these', 'those', 'has', 'have', 'had',
      'will', 'would', 'should', 'could', 'was', 'were', 'there', 'here', 'what', 'when',
      'where', 'why', 'how', 'which', 'who', 'whom'
    ]);

    // Get transaction data
    const data = txSheet.getRange(2, 1, lastRow, 5).getValues();
    
    // Create mappings to find merchant clusters
    const merchantToAmount = {};
    const merchantToFrequency = {};
    const potentialCategories = {};
    
    // First pass: gather merchant data
    data.forEach((row, index) => {
      const merchant = _normalize(row[COLUMNS.TRANSACTIONS.MERCHANT - 1]).toLowerCase();
      const amount = Math.abs(parseFloat(row[COLUMNS.TRANSACTIONS.AMOUNT - 1]) || 0);
      const existingCategory = _normalize(row[COLUMNS.TRANSACTIONS.CATEGORY - 1]);
      
      if (!merchant || merchant.length < 2) return;
      
      // Track merchant frequencies and amounts
      merchantToFrequency[merchant] = (merchantToFrequency[merchant] || 0) + 1;
      merchantToAmount[merchant] = (merchantToAmount[merchant] || 0) + amount;
      
      // Collect existing categories (user-defined)
      if (existingCategory && existingCategory.length > 1) {
        if (!potentialCategories[merchant]) potentialCategories[merchant] = {};
        potentialCategories[merchant][existingCategory] = 
          (potentialCategories[merchant][existingCategory] || 0) + 1;
      }
    });
    
    // Identify meaningful keywords from merchants
    const meaningfulKeywords = {};
    Object.keys(merchantToFrequency).forEach(merchant => {
      // Skip very common merchants or ones with minimal spending
      if (merchantToFrequency[merchant] <= 1 || merchantToAmount[merchant] < 5) return;
      
      // Extract keywords from merchant name
      merchant.split(/[\s\-_\.]+/).forEach(word => {
        const cleaned = word.replace(/[^a-z0-9]/gi, '').toLowerCase();
        if (!cleaned || cleaned.length < 3 || stopwords.has(cleaned) || /^\d+$/.test(cleaned)) return;
        
        // Track keyword frequency
        meaningfulKeywords[cleaned] = (meaningfulKeywords[cleaned] || 0) + merchantToFrequency[merchant];
      });
    });
    
    // Get existing keywords from the categories sheet
    const existingKeywords = {};
    if (catSheet.getLastRow() > 1) {
      const catData = catSheet.getRange(2, 1, catSheet.getLastRow() - 1, 2).getValues();
      catData.forEach(row => {
        const keyword = _normalize(row[0]).toLowerCase();
        const category = _normalize(row[1]);
        if (keyword) existingKeywords[keyword] = category;
      });
    }
    
    // Filter and sort meaningful keywords
    const newKeywords = Object.keys(meaningfulKeywords)
      .filter(k => !existingKeywords[k] && meaningfulKeywords[k] >= 2)
      .sort((a, b) => meaningfulKeywords[b] - meaningfulKeywords[a]);
    
    // Limit to top keywords and add to sheet
    const appendLimit = Math.min(newKeywords.length, 50);
    let appendCount = 0;
    
    for (let i = 0; i < appendLimit; i++) {
      const keyword = newKeywords[i];
      
      // Try to guess a category based on similar merchants
      let suggestedCategory = '';
      
      // Look for most frequent category used with this keyword
      Object.keys(merchantToFrequency).forEach(merchant => {
        if (merchant.includes(keyword) && potentialCategories[merchant]) {
          const categories = potentialCategories[merchant];
          const bestCategory = Object.keys(categories)
            .sort((a, b) => categories[b] - categories[a])[0];
          if (bestCategory) suggestedCategory = bestCategory;
        }
      });
      
      catSheet.appendRow([keyword, suggestedCategory]);
      appendCount++;
    }
    
    try {
      SpreadsheetApp.getUi().alert(
        `Added ${appendCount} meaningful category keywords.\n\n` + 
        `These were selected from merchants with multiple transactions or significant spending amounts.`
      );
    } catch (e) {}
    
  } catch (e) {
    console.error('learnCategories failed', e);
    try { SpreadsheetApp.getUi().alert('Category learning failed - see logs'); } catch (e2) {}
  }
}