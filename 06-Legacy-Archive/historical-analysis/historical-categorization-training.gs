/**
 * HISTORICAL DATA INTEGRATION FOR DYNAMIC CATEGORIZATION
 * Generated from 449 historical transactions
 * Generated on: 2025-08-21T04:07:33.623Z
 */

// Enhanced merchant categorization mappings from historical analysis
const HISTORICAL_MERCHANT_MAPPINGS = {
  "contribution": {
    "category": "Uncategorized",
    "confidence": 1,
    "transactionCount": 89,
    "lastSeen": 1753920000000
  },
  "xeqt": {
    "category": "Investments",
    "confidence": 0.7142857142857143,
    "transactionCount": 14,
    "lastSeen": 1751500800000
  },
  "vce": {
    "category": "Investments",
    "confidence": 0.8947368421052632,
    "transactionCount": 57,
    "lastSeen": 1753401600000
  },
  "swap": {
    "category": "Uncategorized",
    "confidence": 1,
    "transactionCount": 2,
    "lastSeen": 1752192000000
  },
  "fee": {
    "category": "Uncategorized",
    "confidence": 1,
    "transactionCount": 2,
    "lastSeen": 1752192000000
  },
  "interac": {
    "category": "Transfers",
    "confidence": 1,
    "transactionCount": 31,
    "lastSeen": 1752624000000
  },
  "deposit": {
    "category": "Uncategorized",
    "confidence": 1,
    "transactionCount": 3,
    "lastSeen": 1727049600000
  },
  "shoppers": {
    "category": "Shopping",
    "confidence": 1,
    "transactionCount": 5,
    "lastSeen": 1734566400000
  },
  "cashback": {
    "category": "Rewards",
    "confidence": 1,
    "transactionCount": 45,
    "lastSeen": 1734912000000
  },
  "interest": {
    "category": "Interest Income",
    "confidence": 1,
    "transactionCount": 10,
    "lastSeen": 1751328000000
  },
  "transfer": {
    "category": "Transfers",
    "confidence": 0.875,
    "transactionCount": 112,
    "lastSeen": 1753920000000
  },
  "uber": {
    "category": "Shopping",
    "confidence": 1,
    "transactionCount": 3,
    "lastSeen": 1733443200000
  },
  "amazon": {
    "category": "Shopping",
    "confidence": 1,
    "transactionCount": 5,
    "lastSeen": 1733356800000
  },
  "tim": {
    "category": "Shopping",
    "confidence": 1,
    "transactionCount": 2,
    "lastSeen": 1733356800000
  },
  "amzn": {
    "category": "Shopping",
    "confidence": 0.9,
    "transactionCount": 10,
    "lastSeen": 1737072000000
  },
  "lcbo/rao": {
    "category": "Shopping",
    "confidence": 1,
    "transactionCount": 3,
    "lastSeen": 1734825600000
  },
  "wendy's": {
    "category": "Shopping",
    "confidence": 1,
    "transactionCount": 2,
    "lastSeen": 1734566400000
  },
  "online": {
    "category": "Uncategorized",
    "confidence": 1,
    "transactionCount": 7,
    "lastSeen": 1753660800000
  },
  "acevaper": {
    "category": "Shopping",
    "confidence": 1,
    "transactionCount": 2,
    "lastSeen": 1734220800000
  },
  "paddle.net*": {
    "category": "Shopping",
    "confidence": 1,
    "transactionCount": 2,
    "lastSeen": 1736899200000
  },
  "direct": {
    "category": "Income",
    "confidence": 1,
    "transactionCount": 25,
    "lastSeen": 1753920000000
  },
  "cash": {
    "category": "Rewards",
    "confidence": 1,
    "transactionCount": 2,
    "lastSeen": 1736985600000
  }
};

// Dynamic categorization rules based on historical patterns
const DYNAMIC_CATEGORIZATION_RULES = {
  "uber": {
    "patterns": [
      {
        "context": "eats",
        "category": "Food & Dining",
        "confidence": 0.95
      },
      {
        "timeRange": {
          "start": 6,
          "end": 10
        },
        "category": "Transit",
        "confidence": 0.8
      },
      {
        "timeRange": {
          "start": 17,
          "end": 19
        },
        "category": "Transit",
        "confidence": 0.8
      },
      {
        "dayOfWeek": [
          6,
          0
        ],
        "category": "Entertainment",
        "confidence": 0.7
      },
      {
        "default": "Transit",
        "confidence": 0.6
      }
    ],
    "historicalUsage": 3,
    "accuracy": 0,
    "lastUpdated": "2025-08-21T04:07:33.624Z"
  },
  "amazon": {
    "patterns": [
      {
        "context": "fresh|grocery",
        "category": "Groceries",
        "confidence": 0.9
      },
      {
        "context": "kindle|books",
        "category": "Education",
        "confidence": 0.8
      },
      {
        "context": "prime|video",
        "category": "Entertainment",
        "confidence": 0.8
      },
      {
        "default": "Shopping",
        "confidence": 0.6
      }
    ],
    "historicalUsage": 5,
    "accuracy": 1,
    "lastUpdated": "2025-08-21T04:07:33.624Z"
  },
  "starbucks": {
    "patterns": [
      {
        "timeRange": {
          "start": 6,
          "end": 11
        },
        "category": "Food & Dining",
        "confidence": 0.9
      },
      {
        "timeRange": {
          "start": 14,
          "end": 16
        },
        "category": "Food & Dining",
        "confidence": 0.8
      },
      {
        "default": "Food & Dining",
        "confidence": 0.7
      }
    ],
    "historicalUsage": 0,
    "accuracy": 0,
    "lastUpdated": "2025-08-21T04:07:33.624Z"
  }
};

/**
 * Enhanced categorization function using historical data
 */
function categorizeTransactionWithHistoricalData(transaction) {
  const merchant = _extractMerchant(transaction.description || '').toLowerCase();
  const context = _extractTransactionContext(transaction);
  
  // First, try dynamic rules
  const dynamicCategory = _applyDynamicCategorizationRules(merchant, context, transaction);
  if (dynamicCategory) {
    return dynamicCategory;
  }
  
  // Fallback to historical mappings
  if (HISTORICAL_MERCHANT_MAPPINGS[merchant]) {
    const mapping = HISTORICAL_MERCHANT_MAPPINGS[merchant];
    return {
      category: mapping.category,
      confidence: mapping.confidence,
      reason: 'Historical pattern match',
      source: 'historical_data'
    };
  }
  
  // Final fallback to existing categorization
  return _categorizeTransaction(transaction);
}

/**
 * Apply dynamic categorization rules with context
 */
function _applyDynamicCategorizationRules(merchant, context, transaction) {
  const currentHour = new Date().getHours();
  const currentDay = new Date().getDay();
  
  for (const [merchantPattern, rules] of Object.entries(DYNAMIC_CATEGORIZATION_RULES)) {
    if (merchant.includes(merchantPattern)) {
      
      for (const rule of rules.patterns) {
        // Context-based rules
        if (rule.context && context.keywords.some(keyword => keyword.includes(rule.context))) {
          return {
            category: rule.category,
            confidence: rule.confidence,
            reason: `Dynamic context: ${rule.context}`,
            source: 'dynamic_context'
          };
        }
        
        // Time-based rules
        if (rule.timeRange && currentHour >= rule.timeRange.start && currentHour <= rule.timeRange.end) {
          return {
            category: rule.category,
            confidence: rule.confidence,
            reason: `Dynamic time pattern: ${rule.timeRange.start}-${rule.timeRange.end}`,
            source: 'dynamic_time'
          };
        }
        
        // Day-based rules
        if (rule.dayOfWeek && rule.dayOfWeek.includes(currentDay)) {
          return {
            category: rule.category,
            confidence: rule.confidence,
            reason: `Dynamic day pattern: weekend/weekday`,
            source: 'dynamic_day'
          };
        }
      }
      
      // Default rule for this merchant
      const defaultRule = rules.patterns.find(r => r.default);
      if (defaultRule) {
        return {
          category: defaultRule.default,
          confidence: defaultRule.confidence,
          reason: 'Dynamic default for merchant',
          source: 'dynamic_default'
        };
      }
    }
  }
  
  return null;
}

/**
 * Extract transaction context for dynamic categorization
 */
function _extractTransactionContext(transaction) {
  const description = (transaction.description || '').toLowerCase();
  
  const context = {
    keywords: [],
    timeContext: {
      hour: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      isWeekend: [0, 6].includes(new Date().getDay())
    }
  };
  
  // Extract contextual keywords
  const contextKeywords = [
    'eats', 'food', 'grocery', 'restaurant', 'cafe', 'coffee',
    'gas', 'fuel', 'station', 'parking',
    'pharmacy', 'drug', 'medical', 'health',
    'uber', 'lyft', 'taxi', 'transit', 'bus', 'subway',
    'amazon', 'walmart', 'target', 'costco',
    'hotel', 'airbnb', 'booking', 'travel'
  ];
  
  contextKeywords.forEach(keyword => {
    if (description.includes(keyword)) {
      context.keywords.push(keyword);
    }
  });
  
  return context;
}

/**
 * Integration function to load historical categorization data
 */
function loadHistoricalCategorizationData() {
  try {
    _logInfo('Loading historical categorization data...');
    
    const stats = {
      merchantMappings: Object.keys(HISTORICAL_MERCHANT_MAPPINGS).length,
      dynamicRules: Object.keys(DYNAMIC_CATEGORIZATION_RULES).length,
      totalHistoricalTransactions: 449
    };
    
    _logInfo('Historical data loaded successfully', stats);
    return stats;
    
  } catch (error) {
    _logError('Failed to load historical categorization data', error);
    return null;
  }
}