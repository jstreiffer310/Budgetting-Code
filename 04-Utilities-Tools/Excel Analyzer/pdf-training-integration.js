// PDF Training Integration for Excel Analyzer
// Integrates PDF-extracted training data with Excel analysis workflow

const fs = require('fs');
const path = require('path');

class PDFTrainingIntegration {
  constructor(excelAnalyzer) {
    this.excelAnalyzer = excelAnalyzer;
    this.pdfTrainingData = null;
    this.loadPDFTrainingData();
  }

  /**
   * Load PDF training data if available
   */
  loadPDFTrainingData() {
    const trainingFiles = [
      './pdf_training_data.json',
      './pdf_excel_integration.json',
      '../pdf_training_data.json'
    ];

    for (const file of trainingFiles) {
      try {
        if (fs.existsSync(file)) {
          this.pdfTrainingData = JSON.parse(fs.readFileSync(file, 'utf8'));
          console.log(`📚 PDF training data loaded from: ${file}`);
          
          if (this.pdfTrainingData.extraction_metadata) {
            const metadata = this.pdfTrainingData.extraction_metadata;
            console.log(`   📊 ${metadata.total_transactions} transactions, ${metadata.unique_merchants} merchants`);
          }
          
          return true;
        }
      } catch (error) {
        console.warn(`⚠️ Could not load PDF training from ${file}:`, error.message);
      }
    }

    console.log('📋 No PDF training data found - analysis will proceed without PDF insights');
    return false;
  }

  /**
   * Enhanced analysis that incorporates PDF training insights
   */
  enhanceAnalysisWithPDFTraining(analysis) {
    if (!this.pdfTrainingData) {
      return analysis;
    }

    console.log('🔗 Integrating PDF training insights...');

    // Add PDF training context to analysis
    analysis.pdfTrainingIntegration = {
      trainingDataAvailable: true,
      merchantMappings: Object.keys(this.pdfTrainingData.merchant_mappings || {}).length,
      categoriesLearned: Object.keys(this.pdfTrainingData.category_patterns || {}).length,
      totalTrainingTransactions: this.pdfTrainingData.extraction_metadata?.total_transactions || 0
    };

    // Enhance transaction analysis with PDF insights
    for (const [sheetName, sheet] of Object.entries(analysis.sheets)) {
      if (sheet.transactionAnalysis) {
        sheet.transactionAnalysis.pdfEnhancedInsights = this.generatePDFInsights(sheet);
      }
    }

    // Add PDF-specific insights
    analysis.insights = this.enhanceInsightsWithPDF(analysis.insights);

    return analysis;
  }

  /**
   * Generate PDF-specific insights for transaction data
   */
  generatePDFInsights(sheet) {
    if (!this.pdfTrainingData || !this.pdfTrainingData.merchant_mappings) {
      return null;
    }

    const insights = {
      knownMerchants: 0,
      predictableCategories: 0,
      highConfidenceMappings: 0,
      trainingCoverage: 0
    };

    // This would analyze actual transaction data against PDF training
    // For now, provide training data statistics
    const merchantMappings = this.pdfTrainingData.merchant_mappings;
    
    insights.knownMerchants = Object.keys(merchantMappings).length;
    insights.highConfidenceMappings = Object.values(merchantMappings)
      .filter(mapping => mapping.confidence > 0.8).length;
    
    // Calculate predicted categorization accuracy
    const totalMappings = Object.keys(merchantMappings).length;
    if (totalMappings > 0) {
      insights.trainingCoverage = (insights.highConfidenceMappings / totalMappings) * 100;
    }

    return insights;
  }

  /**
   * Enhance analysis insights with PDF training context
   */
  enhanceInsightsWithPDF(existingInsights) {
    if (!this.pdfTrainingData) {
      return existingInsights;
    }

    const pdfInsights = [...existingInsights];

    // Add PDF training specific insights
    const metadata = this.pdfTrainingData.extraction_metadata;
    if (metadata) {
      pdfInsights.push(`📚 PDF Training: ${metadata.total_transactions} transactions analyzed from credit card statements`);
      pdfInsights.push(`🏪 Merchant Intelligence: ${metadata.unique_merchants} merchants mapped with categorization patterns`);
      
      if (metadata.categories_found > 0) {
        pdfInsights.push(`🎯 Category Training: ${metadata.categories_found} categories learned from statement patterns`);
      }
    }

    // Analyze training quality
    if (this.pdfTrainingData.merchant_mappings) {
      const highConfidenceMerchants = Object.values(this.pdfTrainingData.merchant_mappings)
        .filter(m => m.confidence > 0.8).length;
      
      if (highConfidenceMerchants > 0) {
        pdfInsights.push(`⭐ High-Confidence Mappings: ${highConfidenceMerchants} merchants with reliable categorization`);
      }
    }

    // Integration recommendations
    if (this.pdfTrainingData.categorization_rules) {
      const ruleCount = Object.keys(this.pdfTrainingData.categorization_rules).length;
      pdfInsights.push(`🧠 Smart Rules: ${ruleCount} categorization rules ready for Google Apps Script integration`);
    }

    return pdfInsights;
  }

  /**
   * Generate PDF training integration report
   */
  generatePDFIntegrationReport() {
    if (!this.pdfTrainingData) {
      return `
## 📚 PDF Training Integration

⚠️ **No PDF Training Data Available**

To enable PDF training integration:
1. Run \`python pdf_test.py [your_credit_card_statement.pdf]\`
2. This will generate training data from your credit card statements
3. Re-run the Excel Analyzer to see enhanced categorization insights

**Benefits of PDF Training:**
- 🎯 Automatic merchant categorization based on your actual spending patterns
- 📊 Higher accuracy transaction categorization
- 🧠 Smart rules generation for Google Apps Script
- 📈 Improved analysis insights based on historical data
`;
    }

    const metadata = this.pdfTrainingData.extraction_metadata;
    const merchantCount = Object.keys(this.pdfTrainingData.merchant_mappings || {}).length;
    const ruleCount = Object.keys(this.pdfTrainingData.categorization_rules || {}).length;

    return `
## 📚 PDF Training Integration

✅ **PDF Training Data Active**

### 📊 Training Dataset
- **Transactions Analyzed**: ${metadata?.total_transactions || 0}
- **Unique Merchants**: ${metadata?.unique_merchants || 0}
- **Categories Identified**: ${metadata?.categories_found || 0}
- **Generated**: ${metadata?.generated_at ? new Date(metadata.generated_at).toLocaleString() : 'Unknown'}

### 🏪 Merchant Intelligence
- **Mapped Merchants**: ${merchantCount}
- **High-Confidence Mappings**: ${Object.values(this.pdfTrainingData.merchant_mappings || {}).filter(m => m.confidence > 0.8).length}
- **Categorization Rules**: ${ruleCount}

### 🎯 Top Trained Merchants
${this.getTopMerchantsReport()}

### 🔗 Integration Status
- ✅ PDF training data loaded and active
- ✅ Merchant mappings available for categorization
- ✅ Google Apps Script integration code generated
- ✅ Enhanced analysis insights enabled

### 📈 Next Steps
1. **Google Apps Script**: Copy \`pdf_gas_integration.gs\` content to your finance automation script
2. **Test Integration**: Process new transactions to verify improved categorization
3. **Update Training**: Re-run PDF extraction monthly to update merchant patterns
`;
  }

  /**
   * Get top merchants report
   */
  getTopMerchantsReport() {
    if (!this.pdfTrainingData?.merchant_mappings) {
      return 'No merchant data available';
    }

    const merchants = Object.entries(this.pdfTrainingData.merchant_mappings)
      .sort((a, b) => b[1].transaction_count - a[1].transaction_count)
      .slice(0, 10);

    return merchants.map(([merchant, data]) => 
      `- **${merchant}**: ${data.category} (${data.transaction_count} transactions, ${(data.confidence * 100).toFixed(0)}% confidence)`
    ).join('\n');
  }

  /**
   * Export enhanced categorization for Google Apps Script
   */
  exportEnhancedGASIntegration() {
    if (!this.pdfTrainingData) {
      return false;
    }

    const gasCode = `
// Enhanced PDF Training Integration
// Generated: ${new Date().toISOString()}

/**
 * Enhanced categorization using combined Excel and PDF training data
 */
function _categorizeTransactionWithFullTraining(transaction) {
  // Try PDF training first (most specific)
  const pdfResult = _categorizeWithPDFTraining(transaction.description, transaction.amount);
  
  if (pdfResult.confidence > 0.7) {
    _logSystemEvent('CATEGORIZATION', 'SUCCESS', 
      \`PDF Training: \${transaction.description} → \${pdfResult.category} (\${pdfResult.confidence})\`);
    return {
      category: pdfResult.category,
      source: 'pdf_training',
      confidence: pdfResult.confidence
    };
  }
  
  // Fall back to existing system
  const existingResult = _categorizeTransaction(transaction);
  
  _logSystemEvent('CATEGORIZATION', 'FALLBACK', 
    \`Using existing system: \${transaction.description} → \${existingResult}\`);
  
  return {
    category: existingResult,
    source: 'existing_system',
    confidence: 0.6
  };
}

// Integration metadata
const PDF_TRAINING_STATS = ${JSON.stringify(this.pdfTrainingData.extraction_metadata, null, 2)};
`;

    fs.writeFileSync('./enhanced_gas_integration.gs', gasCode);
    console.log('✅ Enhanced Google Apps Script integration exported to: enhanced_gas_integration.gs');
    return true;
  }
}

module.exports = PDFTrainingIntegration;
