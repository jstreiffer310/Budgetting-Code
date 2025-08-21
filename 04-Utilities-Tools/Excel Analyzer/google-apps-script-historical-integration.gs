/**
 * HISTORICAL DATA INTEGRATION FOR FINANCE AUTOMATION V10
 * 
 * This file integrates the historical data analysis with your existing finance automation system.
 * Add these functions to your finance_automation_v10.gs file to enable dynamic categorization
 * based on historical patterns and trends.
 */

// ============================================
// HISTORICAL DATA INTEGRATION
// ============================================

// Import the historical analysis results (copy from generated files)
const HISTORICAL_MERCHANT_MAPPINGS = {
  "contribution": { "category": "Contributions", "confidence": 1, "transactionCount": 89 },
  "xeqt": { "category": "Investments", "confidence": 0.71, "transactionCount": 14 },
  "vce": { "category": "Investments", "confidence": 0.89, "transactionCount": 57 },
  "interac": { "category": "Transfers", "confidence": 1, "transactionCount": 31 },
  "shoppers": { "category": "Shopping", "confidence": 1, "transactionCount": 5 },
  "cashback": { "category": "Rewards", "confidence": 1, "transactionCount": 45 },
  "interest": { "category": "Investment Income", "confidence": 1, "transactionCount": 10 },
  "transfer": { "category": "Transfers", "confidence": 0.88, "transactionCount": 112 },
  "uber": { "category": "Transit", "confidence": 0.8, "transactionCount": 3 },
  "amazon": { "category": "Shopping", "confidence": 0.9, "transactionCount": 15 },
  "tim": { "category": "Food & Dining", "confidence": 1, "transactionCount": 2 },
  "amzn": { "category": "Shopping", "confidence": 0.9, "transactionCount": 10 },
  "lcbo": { "category": "Shopping", "confidence": 1, "transactionCount": 3 },
  "wendy's": { "category": "Food & Dining", "confidence": 1, "transactionCount": 2 },
  "direct": { "category": "Income", "confidence": 1, "transactionCount": 25 }
};

// Dynamic categorization rules for context-aware categorization
const DYNAMIC_CATEGORIZATION_RULES = {
  uber: {
    patterns: [
      { context: 'eats', category: 'Food & Dining', confidence: 0.95 },
      { timeRange: { start: 6, end: 10 }, category: 'Transit', confidence: 0.8 },
      { timeRange: { start: 17, end: 19 }, category: 'Transit', confidence: 0.8 },
      { dayOfWeek: [6, 0], category: 'Entertainment', confidence: 0.7 },
      { default: 'Transit', confidence: 0.6 }
    ]
  },
  amazon: {
    patterns: [
      { context: 'fresh|grocery', category: 'Groceries', confidence: 0.9 },
      { context: 'kindle|books', category: 'Education', confidence: 0.8 },
      { context: 'prime|video', category: 'Entertainment', confidence: 0.8 },
      { default: 'Shopping', confidence: 0.6 }
    ]
  },
  starbucks: {
    patterns: [
      { timeRange: { start: 6, end: 11 }, category: 'Food & Dining', confidence: 0.9 },
      { timeRange: { start: 14, end: 16 }, category: 'Food & Dining', confidence: 0.8 },
      { default: 'Food & Dining', confidence: 0.7 }
    ]
  }
};

/**
 * Enhanced categorization function using historical data and dynamic rules
 * Replaces or enhances your existing _categorizeTransaction function
 */
function _categorizeTransactionWithHistoricalData(transaction) {
  try {
    const description = (transaction.description || '').toLowerCase();
    const merchant = _extractMerchantFromDescription(description);
    const context = _extractTransactionContext(transaction);
    
    _logInfo('Categorizing with historical data', { merchant, description: description.substring(0, 50) });
    
    // Step 1: Try dynamic categorization rules (highest priority)
    const dynamicCategory = _applyDynamicCategorizationRules(merchant, context, transaction);
    if (dynamicCategory && dynamicCategory.confidence > 0.7) {
      _logInfo('Applied dynamic categorization', dynamicCategory);
      return {
        category: dynamicCategory.category,
        confidence: dynamicCategory.confidence,
        reason: dynamicCategory.reason,
        source: 'dynamic_historical'
      };
    }
    
    // Step 2: Try historical merchant mappings
    const historicalMapping = _getHistoricalMerchantMapping(merchant);
    if (historicalMapping && historicalMapping.confidence > 0.6) {
      _logInfo('Applied historical mapping', { merchant, mapping: historicalMapping });
      return {
        category: historicalMapping.category,
        confidence: historicalMapping.confidence,
        reason: `Historical pattern (${historicalMapping.transactionCount} transactions)`,
        source: 'historical_mapping'
      };
    }
    
    // Step 3: Try existing categorization patterns
    const existingCategory = _categorizeTransaction(transaction);
    if (existingCategory && existingCategory !== 'Unknown') {
      return {
        category: existingCategory,
        confidence: 0.5,
        reason: 'Existing categorization rules',
        source: 'existing_rules'
      };
    }
    
    // Step 4: Fallback with learning
    const learnedCategory = _tryLearningBasedCategorization(merchant, description);
    if (learnedCategory) {
      return {
        category: learnedCategory.category,
        confidence: learnedCategory.confidence,
        reason: 'Learning-based categorization',
        source: 'learning_system'
      };
    }
    
    // Final fallback
    return {
      category: 'Uncategorized',
      confidence: 0.1,
      reason: 'No matching patterns found',
      source: 'fallback'
    };
    
  } catch (error) {
    _logError('Error in historical categorization', error);
    return {
      category: 'Uncategorized',
      confidence: 0.1,
      reason: 'Categorization error',
      source: 'error'
    };
  }
}

/**
 * Extract merchant name from transaction description
 */
function _extractMerchantFromDescription(description) {
  if (!description) return 'unknown';
  
  // Remove common prefixes and suffixes
  let merchant = description
    .replace(/^(purchase|payment|transfer|deposit)\s+/i, '')
    .replace(/\s+(purchase|payment|#\d+|\d{2}\/\d{2}).*$/i, '')
    .toLowerCase()
    .trim();
  
  // Extract the core merchant name
  const patterns = [
    /^([a-z\s&]+)\s*-/,  // "MERCHANT - Location"
    /^([a-z\s&]+)\s+\d/,  // "MERCHANT 123"
    /^([a-z\s&]+)$/,      // "MERCHANT"
    /([a-z\s&]+)\.com/,   // "merchant.com"
    /([a-z\s&]+)\.ca/     // "merchant.ca"
  ];
  
  for (const pattern of patterns) {
    const match = merchant.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Return first word as fallback
  return merchant.split(/[\s-]/)[0] || 'unknown';
}

/**
 * Extract transaction context for dynamic categorization
 */
function _extractTransactionContext(transaction) {
  const description = (transaction.description || '').toLowerCase();
  const currentTime = new Date();
  
  const context = {
    keywords: [],
    timeContext: {
      hour: currentTime.getHours(),
      dayOfWeek: currentTime.getDay(),
      isWeekend: [0, 6].includes(currentTime.getDay()),
      isBusinessHours: currentTime.getHours() >= 9 && currentTime.getHours() <= 17
    },
    amount: Math.abs(parseFloat(transaction.amount || 0))
  };
  
  // Extract contextual keywords
  const contextKeywords = [
    'eats', 'food', 'grocery', 'restaurant', 'cafe', 'coffee',
    'gas', 'fuel', 'station', 'parking', 'toll',
    'pharmacy', 'drug', 'medical', 'health', 'doctor',
    'uber', 'lyft', 'taxi', 'transit', 'bus', 'subway', 'metro',
    'amazon', 'walmart', 'target', 'costco', 'fresh', 'grocery',
    'hotel', 'airbnb', 'booking', 'travel', 'flight',
    'kindle', 'books', 'education', 'course', 'subscription',
    'netflix', 'spotify', 'entertainment', 'games', 'music'
  ];
  
  contextKeywords.forEach(keyword => {
    if (description.includes(keyword)) {
      context.keywords.push(keyword);
    }
  });
  
  return context;
}

/**
 * Apply dynamic categorization rules based on context and time
 */
function _applyDynamicCategorizationRules(merchant, context, transaction) {
  try {
    // Check if merchant has dynamic rules
    for (const [merchantPattern, rules] of Object.entries(DYNAMIC_CATEGORIZATION_RULES)) {
      if (merchant.includes(merchantPattern) || merchant === merchantPattern) {
        
        for (const rule of rules.patterns) {
          // Context-based matching
          if (rule.context) {
            const contextRegex = new RegExp(rule.context, 'i');
            if (context.keywords.some(keyword => contextRegex.test(keyword)) ||
                contextRegex.test(transaction.description || '')) {
              return {
                category: rule.category,
                confidence: rule.confidence,
                reason: `Dynamic context match: ${rule.context}`,
                rule: 'dynamic_context'
              };
            }
          }
          
          // Time-based matching
          if (rule.timeRange) {
            const currentHour = context.timeContext.hour;
            if (currentHour >= rule.timeRange.start && currentHour <= rule.timeRange.end) {
              return {
                category: rule.category,
                confidence: rule.confidence,
                reason: `Dynamic time pattern: ${rule.timeRange.start}-${rule.timeRange.end}h`,
                rule: 'dynamic_time'
              };
            }
          }
          
          // Day-based matching
          if (rule.dayOfWeek) {
            if (rule.dayOfWeek.includes(context.timeContext.dayOfWeek)) {
              return {
                category: rule.category,
                confidence: rule.confidence,
                reason: 'Dynamic day pattern',
                rule: 'dynamic_day'
              };
            }
          }
          
          // Default rule for this merchant
          if (rule.default) {
            return {
              category: rule.default,
              confidence: rule.confidence,
              reason: 'Dynamic default category',
              rule: 'dynamic_default'
            };
          }
        }
      }
    }
    
    return null;
    
  } catch (error) {
    _logError('Error applying dynamic categorization rules', error);
    return null;
  }
}

/**
 * Get historical merchant mapping
 */
function _getHistoricalMerchantMapping(merchant) {
  try {
    // Direct match
    if (HISTORICAL_MERCHANT_MAPPINGS[merchant]) {
      return HISTORICAL_MERCHANT_MAPPINGS[merchant];
    }
    
    // Partial match for compound merchant names
    for (const [historicalMerchant, mapping] of Object.entries(HISTORICAL_MERCHANT_MAPPINGS)) {
      if (merchant.includes(historicalMerchant) || historicalMerchant.includes(merchant)) {
        // Reduce confidence for partial matches
        return {
          ...mapping,
          confidence: mapping.confidence * 0.8,
          reason: `Partial match with ${historicalMerchant}`
        };
      }
    }
    
    return null;
    
  } catch (error) {
    _logError('Error getting historical merchant mapping', error);
    return null;
  }
}

/**
 * Try learning-based categorization using existing learning system
 */
function _tryLearningBasedCategorization(merchant, description) {
  try {
    // This integrates with your existing learning system
    const learningSheet = _ss().getSheetByName(SHEET_NAMES.LEARNING);
    if (!learningSheet || learningSheet.getLastRow() < 2) {
      return null;
    }
    
    const learningData = learningSheet.getRange(2, 1, learningSheet.getLastRow() - 1, 4).getValues();
    
    // Look for similar merchants in learning data
    for (const row of learningData) {
      const [learnedMerchant, learnedCategory, confidence, type] = row;
      
      if (learnedMerchant && merchant.includes(learnedMerchant.toLowerCase())) {
        return {
          category: learnedCategory,
          confidence: Math.min(parseFloat(confidence || 0.5), 0.8), // Cap at 0.8 for learned patterns
          reason: `Learning system match: ${learnedMerchant}`
        };
      }
    }
    
    return null;
    
  } catch (error) {
    _logError('Error in learning-based categorization', error);
    return null;
  }
}

/**
 * Enhanced processing function that uses historical data
 * This can replace or supplement your existing email processing
 */
function processEmailsWithHistoricalContext(batchSize = 10) {
  try {
    _logInfo('Starting email processing with historical context');
    
    // Get your existing email processing logic
    const threads = GmailApp.getInboxThreads(0, batchSize);
    let processedCount = 0;
    let categorizedCount = 0;
    
    threads.forEach(thread => {
      try {
        const messages = thread.getMessages();
        
        messages.forEach(message => {
          const transaction = _parseEmail(message);
          
          if (transaction) {
            // Use enhanced categorization
            const categoryResult = _categorizeTransactionWithHistoricalData(transaction);
            
            if (categoryResult && categoryResult.category !== 'Uncategorized') {
              transaction.category = categoryResult.category;
              transaction.confidence = categoryResult.confidence;
              transaction.categorizationSource = categoryResult.source;
              transaction.categorizationReason = categoryResult.reason;
              
              categorizedCount++;
            }
            
            // Process transaction as usual
            _addTransactionToSheet(transaction);
            processedCount++;
          }
        });
        
      } catch (messageError) {
        _logError('Error processing message', messageError);
      }
    });
    
    _logInfo('Historical context processing completed', {
      processed: processedCount,
      categorized: categorizedCount,
      categorizationRate: (categorizedCount / processedCount * 100).toFixed(1) + '%'
    });
    
    return {
      processed: processedCount,
      categorized: categorizedCount,
      categorizationRate: categorizedCount / processedCount
    };
    
  } catch (error) {
    _logError('Error in historical context processing', error);
    throw error;
  }
}

/**
 * Function to update historical mappings from CSV/PDF data
 * Call this periodically to refresh the historical analysis
 */
function updateHistoricalMappingsFromExternalData() {
  try {
    _logInfo('Updating historical mappings from external data processing');
    
    // This would integrate with your external historical data processor
    // For now, log that the integration point exists
    _logInfo('Historical data integration point available');
    
    // You can expand this to:
    // 1. Read updated merchant mappings from Drive
    // 2. Update the HISTORICAL_MERCHANT_MAPPINGS constant
    // 3. Refresh dynamic categorization rules
    // 4. Update confidence scores based on new data
    
    return true;
    
  } catch (error) {
    _logError('Error updating historical mappings', error);
    return false;
  }
}

/**
 * Diagnostic function to test historical categorization
 */
function testHistoricalCategorization() {
  try {
    const testTransactions = [
      { description: 'UBER EATS - Toronto ON', amount: -15.50 },
      { description: 'UBER - Downtown Toronto', amount: -12.30 },
      { description: 'AMAZON.CA - Purchase', amount: -45.99 },
      { description: 'TIM HORTONS #1234', amount: -5.67 },
      { description: 'STARBUCKS COFFEE', amount: -8.45 },
      { description: 'Direct Deposit - Payroll', amount: 2500.00 }
    ];
    
    _logInfo('Testing historical categorization with sample transactions');
    
    testTransactions.forEach((transaction, index) => {
      const result = _categorizeTransactionWithHistoricalData(transaction);
      _logInfo(`Test ${index + 1}: ${transaction.description}`, result);
    });
    
    return true;
    
  } catch (error) {
    _logError('Error testing historical categorization', error);
    return false;
  }
}

// ============================================
// INTEGRATION INSTRUCTIONS
// ============================================

/**
 * TO INTEGRATE WITH YOUR EXISTING SYSTEM:
 * 
 * 1. Copy this entire file content into your finance_automation_v10.gs
 * 
 * 2. Update your main email processing function to use:
 *    processEmailsWithHistoricalContext() instead of processEmails()
 * 
 * 3. Replace _categorizeTransaction() calls with:
 *    _categorizeTransactionWithHistoricalData()
 * 
 * 4. Test with: testHistoricalCategorization()
 * 
 * 5. Monitor categorization accuracy and update rules as needed
 * 
 * 6. Periodically run the historical data processor to refresh mappings
 */
