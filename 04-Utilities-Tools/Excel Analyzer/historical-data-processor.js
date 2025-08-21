const fs = require('fs-extra');
const path = require('path');
const csv = require('csv-parser');
const pdf = require('pdf-parse');

/**
 * HISTORICAL DATA PROCESSOR & CATEGORIZATION TRAINER
 * 
 * This system processes CSV and PDF transaction files to:
 * 1. Extract and normalize transaction data
 * 2. Identify patterns and trends for dynamic categorization
 * 3. Train the categorization system with historical context
 * 4. Generate intelligent categorization rules (e.g., Uber = Transit vs Food)
 * 5. Integrate with existing finance automation system
 */

class HistoricalDataProcessor {
  constructor() {
    this.transactions = [];
    this.patterns = new Map();
    this.merchantAnalysis = new Map();
    this.categorySuggestions = new Map();
    this.timeBasedPatterns = new Map();
    this.locationPatterns = new Map();
    this.contextualRules = new Map();
    
    // Account mapping based on file patterns
    this.accountMapping = {
      'HQ6M6XX49CAD': 'Investment Account',
      'WK3F00V35CAD': 'Primary Cash Account',
      'WK57XZN37CAD': 'Secondary Cash Account',
      'WK76V7014CAD': 'Additional Account'
    };

    // Transaction type mapping
    this.transactionTypeMapping = {
      'SPEND': 'Purchase',
      'CONT': 'Contribution',
      'BUY': 'Investment Purchase',
      'SELL': 'Investment Sale',
      'INT': 'Interest Earned',
      'TRFOUT': 'Transfer Out',
      'TRFIN': 'Transfer In',
      'E_TRFOUT': 'E-Transfer Out',
      'E_TRFIN': 'E-Transfer In',
      'AFT_IN': 'Direct Deposit',
      'CASHBACK': 'Cash Back',
      'FEE': 'Fee',
      'DIV': 'Dividend'
    };

    // Categorization rules for dynamic learning
    this.dynamicCategorizationRules = {
      contextualMerchants: {
        'uber': {
          patterns: [
            { context: 'eats', category: 'Food & Dining', confidence: 0.95 },
            { timeRange: { start: 6, end: 10 }, category: 'Transit', confidence: 0.8 }, // Morning commute
            { timeRange: { start: 17, end: 19 }, category: 'Transit', confidence: 0.8 }, // Evening commute
            { dayOfWeek: [6, 0], category: 'Entertainment', confidence: 0.7 }, // Weekend
            { default: 'Transit', confidence: 0.6 }
          ]
        },
        'amazon': {
          patterns: [
            { context: 'fresh|grocery', category: 'Groceries', confidence: 0.9 },
            { context: 'kindle|books', category: 'Education', confidence: 0.8 },
            { context: 'prime|video', category: 'Entertainment', confidence: 0.8 },
            { default: 'Shopping', confidence: 0.6 }
          ]
        },
        'starbucks': {
          patterns: [
            { timeRange: { start: 6, end: 11 }, category: 'Food & Dining', confidence: 0.9 },
            { timeRange: { start: 14, end: 16 }, category: 'Food & Dining', confidence: 0.8 },
            { default: 'Food & Dining', confidence: 0.7 }
          ]
        }
      }
    };
  }

  /**
   * Main processing function - analyzes all historical data
   */
  async processAllHistoricalData(downloadsPath = 'C:\\Users\\jstre\\Downloads') {
    console.log('🔍 Starting Historical Data Processing...\n');
    
    const results = {
      timestamp: new Date().toISOString(),
      processedFiles: [],
      totalTransactions: 0,
      patterns: {},
      categorySuggestions: {},
      trainingData: {},
      integration: {}
    };

    try {
      // Step 1: Process CSV files
      const csvResults = await this.processCSVFiles(downloadsPath);
      results.processedFiles.push(...csvResults.files);
      results.totalTransactions += csvResults.transactionCount;

      // Step 2: Process PDF files
      const pdfResults = await this.processPDFFiles(downloadsPath);
      results.processedFiles.push(...pdfResults.files);

      // Step 3: Analyze patterns and generate categorization rules
      const patternAnalysis = await this.analyzeTransactionPatterns();
      results.patterns = patternAnalysis;

      // Step 4: Generate dynamic categorization training data
      const trainingData = await this.generateCategorizationTrainingData();
      results.trainingData = trainingData;

      // Step 5: Create integration code for Google Apps Script
      const integrationCode = await this.generateGoogleAppsScriptIntegration();
      results.integration = integrationCode;

      // Step 6: Export results
      await this.exportResults(results);

      console.log('✅ Historical Data Processing Complete!');
      console.log(`📊 Processed ${results.totalTransactions} transactions from ${results.processedFiles.length} files`);
      
      return results;

    } catch (error) {
      console.error('❌ Historical data processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Process all CSV transaction files
   */
  async processCSVFiles(downloadsPath) {
    console.log('📄 Processing CSV transaction files...');
    
    const csvFiles = fs.readdirSync(downloadsPath)
      .filter(file => file.startsWith('monthly-statement-transactions-') && file.endsWith('.csv'))
      .map(file => path.join(downloadsPath, file));

    console.log(`📂 Found ${csvFiles.length} CSV files to process`);

    const results = {
      files: [],
      transactionCount: 0
    };

    for (const csvFile of csvFiles) {
      try {
        const fileInfo = this.parseCSVFileName(csvFile);
        console.log(`   Processing: ${fileInfo.account} - ${fileInfo.period}`);

        const transactions = await this.readCSVFile(csvFile);
        
        // Normalize and enrich transactions
        const processedTransactions = transactions.map(tx => this.normalizeTransaction(tx, fileInfo));
        
        this.transactions.push(...processedTransactions);
        results.transactionCount += processedTransactions.length;
        
        results.files.push({
          path: csvFile,
          account: fileInfo.account,
          period: fileInfo.period,
          transactionCount: processedTransactions.length,
          processed: true
        });

        console.log(`     ✅ Processed ${processedTransactions.length} transactions`);

      } catch (error) {
        console.error(`     ❌ Failed to process ${csvFile}:`, error.message);
        results.files.push({
          path: csvFile,
          processed: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Process PDF statement files
   */
  async processPDFFiles(downloadsPath) {
    console.log('📋 Processing PDF statement files...');
    
    const pdfFiles = fs.readdirSync(downloadsPath)
      .filter(file => file.startsWith('onlineStatement') && file.endsWith('.pdf'))
      .map(file => path.join(downloadsPath, file));

    console.log(`📂 Found ${pdfFiles.length} PDF files to process`);

    const results = {
      files: [],
      additionalContext: {}
    };

    for (const pdfFile of pdfFiles) {
      try {
        console.log(`   Processing: ${path.basename(pdfFile)}`);
        
        const pdfBuffer = fs.readFileSync(pdfFile);
        const pdfData = await pdf(pdfBuffer);
        
        // Extract transaction details and additional context
        const extractedData = this.extractPDFTransactionData(pdfData.text);
        
        if (extractedData.transactions.length > 0) {
          console.log(`     ✅ Extracted ${extractedData.transactions.length} transactions with enhanced context`);
          
          // Merge PDF context with existing transactions
          this.enhanceTransactionsWithPDFContext(extractedData);
        }

        results.files.push({
          path: pdfFile,
          transactions: extractedData.transactions.length,
          contextData: extractedData.contextData,
          processed: true
        });

      } catch (error) {
        console.error(`     ❌ Failed to process ${pdfFile}:`, error.message);
        results.files.push({
          path: pdfFile,
          processed: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Parse CSV file name to extract account and period information
   */
  parseCSVFileName(filePath) {
    const fileName = path.basename(filePath);
    const match = fileName.match(/monthly-statement-transactions-([A-Z0-9]+)-(\d{4}-\d{2}-\d{2})\.csv/);
    
    if (match) {
      const accountCode = match[1];
      const date = match[2];
      
      return {
        account: this.accountMapping[accountCode] || accountCode,
        accountCode: accountCode,
        period: date,
        year: parseInt(date.substr(0, 4)),
        month: parseInt(date.substr(5, 2))
      };
    }
    
    return {
      account: 'Unknown',
      accountCode: 'UNKNOWN',
      period: 'Unknown',
      year: null,
      month: null
    };
  }

  /**
   * Read and parse CSV file
   */
  async readCSVFile(filePath) {
    return new Promise((resolve, reject) => {
      const transactions = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          transactions.push(row);
        })
        .on('end', () => {
          resolve(transactions);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Normalize transaction data from CSV
   */
  normalizeTransaction(csvRow, fileInfo) {
    const transaction = {
      // Core transaction data
      id: this.generateTransactionId(csvRow, fileInfo),
      date: new Date(csvRow.date),
      amount: parseFloat(csvRow.amount || 0),
      balance: parseFloat(csvRow.balance || 0),
      currency: csvRow.currency || 'CAD',
      
      // Transaction details
      type: csvRow.transaction,
      typeDescription: this.transactionTypeMapping[csvRow.transaction] || csvRow.transaction,
      description: csvRow.description || '',
      
      // Account information
      account: fileInfo.account,
      accountCode: fileInfo.accountCode,
      
      // Temporal context
      year: fileInfo.year,
      month: fileInfo.month,
      dayOfWeek: new Date(csvRow.date).getDay(),
      hour: new Date(csvRow.date).getHours(),
      
      // Extracted merchant and context
      merchant: this.extractMerchant(csvRow.description),
      context: this.extractContext(csvRow.description),
      
      // Categorization
      suggestedCategory: this.suggestCategory(csvRow),
      confidence: 0.5,
      
      // Source tracking
      source: 'CSV',
      sourceFile: fileInfo
    };

    // Apply dynamic categorization rules
    transaction.dynamicCategory = this.applyDynamicCategorization(transaction);
    
    return transaction;
  }

  /**
   * Extract merchant name from transaction description
   */
  extractMerchant(description) {
    if (!description) return 'Unknown';
    
    // Common patterns for merchant extraction
    const patterns = [
      /^([A-Z\s&]+)\s*-/,  // "MERCHANT NAME - Location"
      /^([A-Z\s&]+)\s+\d/,  // "MERCHANT NAME 123"
      /^([A-Z\s&]+)$/,      // "MERCHANT NAME"
      /([A-Za-z\s&]+)\.com/, // "merchant.com"
      /([A-Za-z\s&]+)\.ca/   // "merchant.ca"
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1].trim().toLowerCase();
      }
    }
    
    // Fallback: use first few words
    return description.split(/[\s-]/)[0].toLowerCase();
  }

  /**
   * Extract context from transaction description
   */
  extractContext(description) {
    if (!description) return {};
    
    const context = {
      original: description,
      normalized: description.toLowerCase(),
      keywords: []
    };
    
    // Extract location information
    const locationPatterns = [
      /([A-Z]{2}\s+\d{5})/,  // State + ZIP
      /([A-Z][a-z]+,\s+[A-Z]{2})/,  // City, State
      /(#\d+)/  // Store number
    ];
    
    locationPatterns.forEach(pattern => {
      const match = description.match(pattern);
      if (match) {
        context.location = match[1];
      }
    });
    
    // Extract contextual keywords
    const keywords = [
      'eats', 'food', 'grocery', 'restaurant', 'cafe', 'coffee',
      'gas', 'fuel', 'station',
      'pharmacy', 'drug', 'medical',
      'uber', 'lyft', 'taxi', 'transit',
      'amazon', 'walmart', 'target', 'costco',
      'hotel', 'airbnb', 'booking',
      'parking', 'meter'
    ];
    
    keywords.forEach(keyword => {
      if (description.toLowerCase().includes(keyword)) {
        context.keywords.push(keyword);
      }
    });
    
    return context;
  }

  /**
   * Apply dynamic categorization rules based on context
   */
  applyDynamicCategorization(transaction) {
    const merchant = transaction.merchant.toLowerCase();
    
    // Check if merchant has dynamic rules
    for (const [merchantPattern, rules] of Object.entries(this.dynamicCategorizationRules.contextualMerchants)) {
      if (merchant.includes(merchantPattern)) {
        
        for (const rule of rules.patterns) {
          // Context-based matching
          if (rule.context && transaction.context.keywords.some(keyword => keyword.includes(rule.context))) {
            return {
              category: rule.category,
              confidence: rule.confidence,
              reason: `Context match: ${rule.context}`,
              rule: 'dynamic_context'
            };
          }
          
          // Time-based matching
          if (rule.timeRange && transaction.hour >= rule.timeRange.start && transaction.hour <= rule.timeRange.end) {
            return {
              category: rule.category,
              confidence: rule.confidence,
              reason: `Time pattern: ${rule.timeRange.start}-${rule.timeRange.end}`,
              rule: 'dynamic_time'
            };
          }
          
          // Day of week matching
          if (rule.dayOfWeek && rule.dayOfWeek.includes(transaction.dayOfWeek)) {
            return {
              category: rule.category,
              confidence: rule.confidence,
              reason: `Day pattern: ${rule.dayOfWeek}`,
              rule: 'dynamic_day'
            };
          }
          
          // Default rule
          if (rule.default) {
            return {
              category: rule.default,
              confidence: rule.confidence,
              reason: 'Default merchant category',
              rule: 'dynamic_default'
            };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Generate unique transaction ID
   */
  generateTransactionId(csvRow, fileInfo) {
    const dateStr = csvRow.date.replace(/-/g, '');
    const amountStr = Math.abs(parseFloat(csvRow.amount || 0) * 100).toString();
    const accountStr = fileInfo.accountCode.substr(-4);
    
    return `${dateStr}_${amountStr}_${accountStr}`;
  }

  /**
   * Basic category suggestion (enhanced by dynamic rules)
   */
  suggestCategory(csvRow) {
    const type = csvRow.transaction;
    const description = (csvRow.description || '').toLowerCase();
    
    // Investment transactions
    if (type === 'BUY' || type === 'SELL') return 'Investments';
    if (type === 'DIV') return 'Investment Income';
    if (type === 'INT') return 'Interest Income';
    
    // Transfer transactions
    if (type === 'TRFOUT' || type === 'TRFIN' || type === 'E_TRFOUT' || type === 'E_TRFIN') {
      return 'Transfers';
    }
    
    // Direct deposits
    if (type === 'AFT_IN') return 'Income';
    
    // Cash back
    if (type === 'CASHBACK') return 'Rewards';
    
    // Spending - use description analysis
    if (type === 'SPEND') {
      if (description.includes('gas') || description.includes('fuel') || description.includes('esso') || description.includes('shell')) {
        return 'Transportation';
      }
      if (description.includes('grocery') || description.includes('food') || description.includes('restaurant')) {
        return 'Food & Dining';
      }
      if (description.includes('pharmacy') || description.includes('medical') || description.includes('health')) {
        return 'Healthcare';
      }
      return 'Shopping';
    }
    
    return 'Uncategorized';
  }

  /**
   * Extract transaction data from PDF content
   */
  extractPDFTransactionData(pdfText) {
    const transactions = [];
    const contextData = {};
    
    // This is a simplified extraction - would need to be enhanced based on actual PDF format
    const lines = pdfText.split('\n');
    
    // Look for transaction patterns in PDF
    const transactionPattern = /(\d{4}-\d{2}-\d{2})\s+(.+?)\s+([-\d,]+\.\d{2})/;
    
    lines.forEach(line => {
      const match = line.match(transactionPattern);
      if (match) {
        transactions.push({
          date: match[1],
          description: match[2].trim(),
          amount: parseFloat(match[3].replace(/,/g, '')),
          source: 'PDF'
        });
      }
    });
    
    return {
      transactions,
      contextData
    };
  }

  /**
   * Enhance existing transactions with PDF context
   */
  enhanceTransactionsWithPDFContext(pdfData) {
    // Match PDF transactions with CSV transactions and add additional context
    pdfData.transactions.forEach(pdfTx => {
      const matchingTransaction = this.transactions.find(tx => 
        Math.abs(new Date(tx.date) - new Date(pdfTx.date)) < 24 * 60 * 60 * 1000 && // Same day
        Math.abs(tx.amount - pdfTx.amount) < 0.01 // Same amount
      );
      
      if (matchingTransaction) {
        matchingTransaction.pdfContext = {
          enhancedDescription: pdfTx.description,
          additionalDetails: pdfTx.details || {}
        };
      }
    });
  }

  /**
   * Analyze transaction patterns for categorization training
   */
  async analyzeTransactionPatterns() {
    console.log('🧠 Analyzing transaction patterns...');
    
    const analysis = {
      merchantPatterns: {},
      temporalPatterns: {},
      amountPatterns: {},
      categoryDistribution: {},
      dynamicRules: {}
    };

    // Analyze merchant patterns
    const merchantGroups = new Map();
    this.transactions.forEach(tx => {
      if (!merchantGroups.has(tx.merchant)) {
        merchantGroups.set(tx.merchant, []);
      }
      merchantGroups.get(tx.merchant).push(tx);
    });

    merchantGroups.forEach((transactions, merchant) => {
      if (transactions.length >= 3) { // Only analyze merchants with multiple transactions
        const categories = transactions.map(tx => tx.suggestedCategory);
        const amounts = transactions.map(tx => Math.abs(tx.amount));
        const times = transactions.map(tx => tx.hour);
        const days = transactions.map(tx => tx.dayOfWeek);
        
        analysis.merchantPatterns[merchant] = {
          transactionCount: transactions.length,
          averageAmount: amounts.reduce((a, b) => a + b, 0) / amounts.length,
          commonCategories: this.getMostFrequent(categories),
          commonTimes: this.getMostFrequent(times),
          commonDays: this.getMostFrequent(days),
          dynamicCategory: transactions.find(tx => tx.dynamicCategory)?.dynamicCategory
        };
      }
    });

    console.log(`   📊 Analyzed ${merchantGroups.size} unique merchants`);
    console.log(`   🎯 ${Object.keys(analysis.merchantPatterns).length} merchants have analyzable patterns`);

    return analysis;
  }

  /**
   * Generate categorization training data for Google Apps Script
   */
  async generateCategorizationTrainingData() {
    console.log('🎯 Generating categorization training data...');
    
    const trainingData = {
      merchantMappings: {},
      contextualRules: {},
      temporalPatterns: {},
      confidenceScores: {},
      dynamicRules: {}
    };

    // Generate merchant mappings with high confidence
    this.transactions.forEach(tx => {
      if (tx.dynamicCategory && tx.dynamicCategory.confidence > 0.8) {
        if (!trainingData.merchantMappings[tx.merchant]) {
          trainingData.merchantMappings[tx.merchant] = [];
        }
        
        trainingData.merchantMappings[tx.merchant].push({
          category: tx.dynamicCategory.category,
          confidence: tx.dynamicCategory.confidence,
          reason: tx.dynamicCategory.reason,
          context: tx.context,
          temporal: {
            hour: tx.hour,
            dayOfWeek: tx.dayOfWeek,
            month: tx.month
          }
        });
      }
    });

    // Generate dynamic categorization rules
    Object.entries(this.dynamicCategorizationRules.contextualMerchants).forEach(([merchant, rules]) => {
      trainingData.dynamicRules[merchant] = {
        patterns: rules.patterns,
        usage: this.transactions.filter(tx => tx.merchant.includes(merchant)).length,
        accuracy: this.calculateRuleAccuracy(merchant, rules)
      };
    });

    console.log(`   🎯 Generated ${Object.keys(trainingData.merchantMappings).length} merchant mappings`);
    console.log(`   🧠 Created ${Object.keys(trainingData.dynamicRules).length} dynamic rules`);

    return trainingData;
  }

  /**
   * Generate Google Apps Script integration code
   */
  async generateGoogleAppsScriptIntegration() {
    console.log('🔗 Generating Google Apps Script integration...');
    
    const integrationCode = `/**
 * HISTORICAL DATA INTEGRATION FOR DYNAMIC CATEGORIZATION
 * Generated from ${this.transactions.length} historical transactions
 * Generated on: ${new Date().toISOString()}
 */

// Enhanced merchant categorization mappings from historical analysis
const HISTORICAL_MERCHANT_MAPPINGS = ${JSON.stringify(this.generateMerchantMappings(), null, 2)};

// Dynamic categorization rules based on historical patterns
const DYNAMIC_CATEGORIZATION_RULES = ${JSON.stringify(this.generateDynamicRules(), null, 2)};

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
            reason: \`Dynamic context: \${rule.context}\`,
            source: 'dynamic_context'
          };
        }
        
        // Time-based rules
        if (rule.timeRange && currentHour >= rule.timeRange.start && currentHour <= rule.timeRange.end) {
          return {
            category: rule.category,
            confidence: rule.confidence,
            reason: \`Dynamic time pattern: \${rule.timeRange.start}-\${rule.timeRange.end}\`,
            source: 'dynamic_time'
          };
        }
        
        // Day-based rules
        if (rule.dayOfWeek && rule.dayOfWeek.includes(currentDay)) {
          return {
            category: rule.category,
            confidence: rule.confidence,
            reason: \`Dynamic day pattern: weekend/weekday\`,
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
      totalHistoricalTransactions: ${this.transactions.length}
    };
    
    _logInfo('Historical data loaded successfully', stats);
    return stats;
    
  } catch (error) {
    _logError('Failed to load historical categorization data', error);
    return null;
  }
}`;

    return {
      code: integrationCode,
      merchantMappings: Object.keys(this.generateMerchantMappings()).length,
      dynamicRules: Object.keys(this.generateDynamicRules()).length
    };
  }

  /**
   * Helper functions
   */
  getMostFrequent(array) {
    const frequency = {};
    array.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([item, count]) => ({ item, count }));
  }

  calculateRuleAccuracy(merchant, rules) {
    const merchantTransactions = this.transactions.filter(tx => tx.merchant.includes(merchant));
    if (merchantTransactions.length === 0) return 0;
    
    let correctPredictions = 0;
    merchantTransactions.forEach(tx => {
      const predicted = this.applyDynamicCategorization(tx);
      if (predicted && predicted.category === tx.suggestedCategory) {
        correctPredictions++;
      }
    });
    
    return correctPredictions / merchantTransactions.length;
  }

  generateMerchantMappings() {
    const mappings = {};
    
    // Group transactions by merchant and find the most common category
    const merchantGroups = new Map();
    this.transactions.forEach(tx => {
      if (!merchantGroups.has(tx.merchant)) {
        merchantGroups.set(tx.merchant, []);
      }
      merchantGroups.get(tx.merchant).push(tx);
    });

    merchantGroups.forEach((transactions, merchant) => {
      if (transactions.length >= 2) { // At least 2 transactions for pattern
        const categories = transactions.map(tx => tx.suggestedCategory);
        const mostCommon = this.getMostFrequent(categories)[0];
        
        if (mostCommon && mostCommon.count >= Math.ceil(transactions.length * 0.6)) { // 60% consistency
          mappings[merchant] = {
            category: mostCommon.item,
            confidence: mostCommon.count / transactions.length,
            transactionCount: transactions.length,
            lastSeen: Math.max(...transactions.map(tx => tx.date.getTime()))
          };
        }
      }
    });

    return mappings;
  }

  generateDynamicRules() {
    // Return the enhanced dynamic rules with actual usage data
    const enhancedRules = {};
    
    Object.entries(this.dynamicCategorizationRules.contextualMerchants).forEach(([merchant, rules]) => {
      const usage = this.transactions.filter(tx => tx.merchant.includes(merchant));
      
      enhancedRules[merchant] = {
        patterns: rules.patterns,
        historicalUsage: usage.length,
        accuracy: this.calculateRuleAccuracy(merchant, rules),
        lastUpdated: new Date().toISOString()
      };
    });
    
    return enhancedRules;
  }

  /**
   * Export all results to files
   */
  async exportResults(results) {
    console.log('📤 Exporting results...');
    
    try {
      // Export comprehensive analysis
      fs.writeFileSync('./historical-data-analysis.json', JSON.stringify(results, null, 2));
      
      // Export training data for Google Apps Script
      if (results.integration && results.integration.code) {
        fs.writeFileSync('./historical-categorization-training.gs', results.integration.code);
      }
      
      // Export merchant mappings
      fs.writeFileSync('./merchant-mappings.json', JSON.stringify(this.generateMerchantMappings(), null, 2));
      
      // Export dynamic rules
      fs.writeFileSync('./dynamic-categorization-rules.json', JSON.stringify(this.generateDynamicRules(), null, 2));
      
      // Export processed transactions for further analysis
      fs.writeFileSync('./processed-transactions.json', JSON.stringify(this.transactions, null, 2));
      
      // Generate summary report
      const summaryReport = this.generateSummaryReport(results);
      fs.writeFileSync('./historical-data-summary.md', summaryReport);
      
      console.log('✅ All results exported successfully!');
      console.log('📄 Files created:');
      console.log('   - historical-data-analysis.json');
      console.log('   - historical-categorization-training.gs');
      console.log('   - merchant-mappings.json');
      console.log('   - dynamic-categorization-rules.json');
      console.log('   - processed-transactions.json');
      console.log('   - historical-data-summary.md');
      
    } catch (error) {
      console.error('❌ Failed to export results:', error.message);
      throw error;
    }
  }

  /**
   * Generate human-readable summary report
   */
  generateSummaryReport(results) {
    const merchantCount = Object.keys(this.generateMerchantMappings()).length;
    const dynamicRuleCount = Object.keys(this.generateDynamicRules()).length;
    
    return `# Historical Data Processing Report

**Processing Date**: ${new Date().toLocaleString()}
**Total Transactions Processed**: ${results.totalTransactions.toLocaleString()}
**Files Processed**: ${results.processedFiles.length}

## Account Summary

${Object.entries(this.accountMapping).map(([code, name]) => {
  const accountTransactions = this.transactions.filter(tx => tx.accountCode === code);
  return `- **${name}** (${code}): ${accountTransactions.length.toLocaleString()} transactions`;
}).join('\n')}

## Categorization Intelligence

### Merchant Mappings Generated
- **Total Merchants Analyzed**: ${merchantCount}
- **High-Confidence Mappings**: ${Object.values(this.generateMerchantMappings()).filter(m => m.confidence > 0.8).length}
- **Dynamic Rules Created**: ${dynamicRuleCount}

### Dynamic Categorization Examples

#### Uber Transactions
- **Context "eats"** → Food & Dining (95% confidence)
- **Morning hours (6-10 AM)** → Transit (80% confidence)  
- **Evening hours (5-7 PM)** → Transit (80% confidence)
- **Weekend** → Entertainment (70% confidence)
- **Default** → Transit (60% confidence)

#### Amazon Transactions  
- **Context "fresh|grocery"** → Groceries (90% confidence)
- **Context "kindle|books"** → Education (80% confidence)
- **Context "prime|video"** → Entertainment (80% confidence)
- **Default** → Shopping (60% confidence)

#### Starbucks Transactions
- **Morning hours (6-11 AM)** → Food & Dining (90% confidence)
- **Afternoon hours (2-4 PM)** → Food & Dining (80% confidence)
- **Default** → Food & Dining (70% confidence)

## Integration Status

### Files Generated for Integration
1. **historical-categorization-training.gs** - Ready to import into Google Apps Script
2. **merchant-mappings.json** - Merchant-to-category mappings with confidence scores
3. **dynamic-categorization-rules.json** - Context-aware categorization rules

### Next Steps
1. Import historical-categorization-training.gs into your Google Apps Script project
2. Update your categorization function to use categorizeTransactionWithHistoricalData()
3. Test the enhanced categorization with new transactions
4. Monitor accuracy and adjust rules as needed

## Historical Data Insights

### Transaction Volume by Month
${this.generateMonthlyVolumeReport()}

### Top Merchants by Transaction Count
${this.generateTopMerchantsReport()}

### Category Distribution
${this.generateCategoryDistributionReport()}

---

*This report was automatically generated by the Historical Data Processor. The categorization intelligence will continuously improve as more data is processed.*
`;
  }

  generateMonthlyVolumeReport() {
    const monthlyVolume = {};
    this.transactions.forEach(tx => {
      if (tx.year && tx.month) {
        const key = `${tx.year}-${tx.month.toString().padStart(2, '0')}`;
        monthlyVolume[key] = (monthlyVolume[key] || 0) + 1;
      }
    });

    return Object.entries(monthlyVolume)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => `- **${month}**: ${count.toLocaleString()} transactions`)
      .join('\n');
  }

  generateTopMerchantsReport() {
    const merchantCounts = {};
    this.transactions.forEach(tx => {
      merchantCounts[tx.merchant] = (merchantCounts[tx.merchant] || 0) + 1;
    });

    return Object.entries(merchantCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([merchant, count]) => `- **${merchant}**: ${count} transactions`)
      .join('\n');
  }

  generateCategoryDistributionReport() {
    const categoryCount = {};
    this.transactions.forEach(tx => {
      const category = tx.dynamicCategory?.category || tx.suggestedCategory;
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .map(([category, count]) => `- **${category}**: ${count} transactions (${(count/this.transactions.length*100).toFixed(1)}%)`)
      .join('\n');
  }
}

// Export for use as module
module.exports = HistoricalDataProcessor;

// Main execution function
async function main() {
  const processor = new HistoricalDataProcessor();
  
  try {
    const results = await processor.processAllHistoricalData();
    
    console.log('\n🎉 Historical Data Processing Complete!');
    console.log('🔗 Ready to integrate with your finance automation system!');
    
  } catch (error) {
    console.error('❌ Processing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
