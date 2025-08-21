function learnCategories() {
  try {
    const ss = _ss();
    _ensureSheetsAndHeaders();
    const txSheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
    const catSheet = ss.getSheetByName(SHEET_NAMES.CATEGORIES);
    
    // Preserve existing category mappings
    const existingCategories = {};
    if (catSheet.getLastRow() > 1) {
      const existingData = catSheet.getRange(2, 1, catSheet.getLastRow() - 1, 2).getValues();
      existingData.forEach(row => {
        if (row[0] && row[1]) existingCategories[_normalize(row[0]).toLowerCase()] = row[1];
      });
    }
    
    // Define extensive stopwords (banking terminology and common words)
    const stopwords = new Set([
      // Banking terms
      'financial', 'cibc', 'amount', 'auto', 'logged', 'aventura', 'wealthsimple', 'money',
      'pad', 'deposit', 'card', 'cash', 'credit', 'standalone', 'purchase', 'trade', 
      'unknown', 'sender', 'interac', 'transfer', 'received', 'streiffer', 'been',
      'automatically', 'deposited', 'bank', 'banking', 'charge', 'payment', 'bill', 
      'etransfer', 'transaction', 'statement', 'balance', 'online', 'account', 'fee',
      'service', 'interest', 'dividend', 'inc', 'ltd', 'corp', 'limited', 'llc',
      'confirmation', 'receipt', 'monthly', 'annual', 'quarterly', 'processed',
      'merchant', 'purchase', 'paid', 'paym', 'withdrawal', 'debit', 'credit',
      
      // Common English words
      'from', 'with', 'your', 'for', 'and', 'the', 'has', 'was', 'you', 'have', 'this',
      'that', 'are', 'had', 'not', 'been', 'were', 'they', 'but', 'also', 'their',
      'will', 'would', 'should', 'could', 'when', 'where', 'what', 'which', 'who', 'whom',
      'whose', 'how', 'why', 'because', 'though', 'although'
    ]);
    
    // Extract transactions data
    const lastRow = Math.max(0, txSheet.getLastRow() - 1);
    if (lastRow === 0) {
      try { SpreadsheetApp.getUi().alert('No transactions to analyze.'); } catch (e) {}
      return;
    }
    
    const txData = txSheet.getRange(2, 1, lastRow, 5).getValues();
    
    // Collect merchant data and manual categories
    const merchantCategoryMap = {};
    const manualCategories = new Set();
    
    txData.forEach(row => {
      const merchant = _normalize(row[COLUMNS.TRANSACTIONS.MERCHANT - 1]);
      const category = _normalize(row[COLUMNS.TRANSACTIONS.CATEGORY - 1]);
      const amount = Math.abs(parseFloat(row[COLUMNS.TRANSACTIONS.AMOUNT - 1]) || 0);
      
      if (merchant && category && category !== 'Uncategorized' && category !== 'Unknown') {
        if (!merchantCategoryMap[merchant]) merchantCategoryMap[merchant] = {};
        merchantCategoryMap[merchant][category] = (merchantCategoryMap[merchant][category] || 0) + 1;
        manualCategories.add(category);
      }
    });
    
    // Create potential keywords from merchants
    const keywordStats = {};
    
    Object.keys(merchantCategoryMap).forEach(merchant => {
      // Extract potential keywords from merchant name
      const words = merchant.toLowerCase()
                           .replace(/[^a-z0-9\s]/g, ' ')
                           .split(/\s+/)
                           .filter(w => w.length > 2 && !stopwords.has(w.toLowerCase()));
      
      // Find most common category for this merchant
      const categories = merchantCategoryMap[merchant];
      const topCategory = Object.keys(categories).sort((a, b) => categories[b] - categories[a])[0];
      
      words.forEach(word => {
        if (!keywordStats[word]) keywordStats[word] = { count: 0, categories: {} };
        keywordStats[word].count++;
        keywordStats[word].categories[topCategory] = 
          (keywordStats[word].categories[topCategory] || 0) + 1;
      });
    });
    
    // Identify meaningful keywords (appear multiple times and not in stopwords)
    const meaningfulKeywords = Object.keys(keywordStats)
      .filter(k => keywordStats[k].count >= 2 && !existingCategories[k])
      .sort((a, b) => keywordStats[b].count - keywordStats[a].count);
    
    // Prepare data for updating categories sheet
    const newEntries = [];
    
    meaningfulKeywords.forEach(keyword => {
      // Find best category for this keyword
      const categories = keywordStats[keyword].categories;
      const suggestedCategory = Object.keys(categories)
        .sort((a, b) => categories[b] - categories[a])[0];
      
      newEntries.push([keyword, suggestedCategory || '']);
    });
    
    // Also add manual categories that aren't in the categories sheet
    manualCategories.forEach(category => {
      // Create an entry with the category name as both keyword and category
      // This ensures manually entered categories get recognized
      if (!Object.values(existingCategories).includes(category)) {
        newEntries.push([category.toLowerCase(), category]);
      }
    });
    
    // Add new entries to the sheet (don't overwrite existing)
    if (newEntries.length > 0) {
      newEntries.sort((a, b) => a[0].localeCompare(b[0]));
      newEntries.forEach(entry => catSheet.appendRow(entry));
    }
    
    const message = `Category learning complete.\n\n` +
                    `• ${newEntries.length} new category keywords added\n` +
                    `• ${manualCategories.size} manual categories processed`;
                    
    try { SpreadsheetApp.getUi().alert(message); } catch (e) {}
    _logInfo('Category learning completed', { 
      newKeywords: newEntries.length, 
      manualCategories: manualCategories.size 
    });
    
  } catch (error) {
    _logError('Category learning failed', error);
    try { SpreadsheetApp.getUi().alert('Category learning failed: ' + error.message); } catch (e) {}
  }
}