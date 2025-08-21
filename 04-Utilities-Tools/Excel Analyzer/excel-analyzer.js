const XLSX = require('xlsx');
const fs = require('fs-extra');
const path = require('path');

class ExcelAnalyzer {
  constructor() {
    this.workbook = null;
    this.sheets = {};
  }

  /**
   * Load an Excel file and parse all sheets
   */
  loadExcel(filePath) {
    try {
      console.log(`📊 Loading Excel file: ${filePath}`);
      this.workbook = XLSX.readFile(filePath);
      
      // Parse all sheets
      this.workbook.SheetNames.forEach(sheetName => {
        console.log(`📋 Processing sheet: ${sheetName}`);
        const worksheet = this.workbook.Sheets[sheetName];
        this.sheets[sheetName] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      });
      
      console.log(`✅ Successfully loaded ${Object.keys(this.sheets).length} sheets`);
      return true;
    } catch (error) {
      console.error('❌ Error loading Excel file:', error.message);
      return false;
    }
  }

  /**
   * Get sheet names
   */
  getSheetNames() {
    return Object.keys(this.sheets);
  }

  /**
   * Get data from a specific sheet
   */
  getSheetData(sheetName) {
    return this.sheets[sheetName] || null;
  }

  /**
   * Analyze the finance automation results
   */
  analyzeFinanceData() {
    const analysis = {
      summary: {},
      sheets: {},
      insights: []
    };

    // Analyze each sheet
    for (const [sheetName, data] of Object.entries(this.sheets)) {
      if (data.length === 0) continue;

      const sheetAnalysis = {
        name: sheetName,
        rows: data.length,
        columns: data[0] ? data[0].length : 0,
        headers: data[0] || [],
        sampleData: data.slice(1, 6), // First 5 data rows
        lastUpdated: this.findLastUpdatedDate(data)
      };

      // Special analysis for known finance sheets
      if (sheetName.toLowerCase().includes('transaction')) {
        sheetAnalysis.transactionAnalysis = this.analyzeTransactions(data);
      } else if (sheetName.toLowerCase().includes('categor')) {
        sheetAnalysis.categoryAnalysis = this.analyzeCategories(data);
      } else if (sheetName.toLowerCase().includes('learning') || sheetName.toLowerCase().includes('ai')) {
        sheetAnalysis.learningAnalysis = this.analyzeLearningData(data);
      } else if (sheetName.toLowerCase().includes('account')) {
        sheetAnalysis.accountAnalysis = this.analyzeAccounts(data);
      }

      analysis.sheets[sheetName] = sheetAnalysis;
    }

    // Generate overall insights
    analysis.insights = this.generateInsights(analysis.sheets);
    
    return analysis;
  }

  /**
   * Analyze transaction data
   */
  analyzeTransactions(data) {
    if (data.length < 2) return null;

    const headers = data[0];
    const transactions = data.slice(1);
    
    const analysis = {
      totalTransactions: transactions.length,
      dateRange: this.getDateRange(transactions, headers),
      categories: this.getUniqueValues(transactions, headers, 'category'),
      merchants: this.getUniqueValues(transactions, headers, 'merchant'),
      amounts: this.getAmountStatistics(transactions, headers),
      recentTransactions: transactions.slice(-10) // Last 10 transactions
    };

    return analysis;
  }

  /**
   * Analyze category learning data
   */
  analyzeLearningData(data) {
    if (data.length < 2) return null;

    const headers = data[0];
    const learningEntries = data.slice(1);
    
    return {
      totalPatterns: learningEntries.length,
      learningTypes: this.getUniqueValues(learningEntries, headers, 'type'),
      confidenceLevels: this.getConfidenceStats(learningEntries, headers),
      recentLearning: learningEntries.slice(-5)
    };
  }

  /**
   * Analyze categories
   */
  analyzeCategories(data) {
    if (data.length < 2) return null;

    const headers = data[0];
    const categories = data.slice(1);
    
    return {
      totalCategories: categories.length,
      categoryList: categories.map(row => row[0]).filter(Boolean),
      mappings: categories.filter(row => row.length > 1)
    };
  }

  /**
   * Analyze accounts
   */
  analyzeAccounts(data) {
    if (data.length < 2) return null;

    const headers = data[0];
    const accounts = data.slice(1);
    
    return {
      totalAccounts: accounts.length,
      accountTypes: this.getUniqueValues(accounts, headers, 'type'),
      balances: this.getAmountStatistics(accounts, headers, 'balance')
    };
  }

  /**
   * Helper methods
   */
  findLastUpdatedDate(data) {
    // Look for date columns and find the most recent date
    const dateRegex = /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/;
    let latestDate = null;

    data.forEach(row => {
      row.forEach(cell => {
        if (typeof cell === 'string' && dateRegex.test(cell)) {
          const date = new Date(cell);
          if (!isNaN(date.getTime()) && (!latestDate || date > latestDate)) {
            latestDate = date;
          }
        }
      });
    });

    return latestDate ? latestDate.toISOString().split('T')[0] : null;
  }

  getDateRange(data, headers) {
    const dateCol = this.findColumnIndex(headers, ['date', 'timestamp', 'created']);
    if (dateCol === -1) return null;

    const dates = data.map(row => new Date(row[dateCol])).filter(d => !isNaN(d.getTime()));
    if (dates.length === 0) return null;

    return {
      earliest: Math.min(...dates),
      latest: Math.max(...dates),
      range: `${new Date(Math.min(...dates)).toLocaleDateString()} - ${new Date(Math.max(...dates)).toLocaleDateString()}`
    };
  }

  getUniqueValues(data, headers, columnName) {
    const colIndex = this.findColumnIndex(headers, [columnName]);
    if (colIndex === -1) return [];

    const values = data.map(row => row[colIndex]).filter(Boolean);
    return [...new Set(values)];
  }

  getAmountStatistics(data, headers, columnName = 'amount') {
    const colIndex = this.findColumnIndex(headers, [columnName]);
    if (colIndex === -1) return null;

    const amounts = data.map(row => parseFloat(row[colIndex])).filter(n => !isNaN(n));
    if (amounts.length === 0) return null;

    return {
      total: amounts.reduce((a, b) => a + b, 0),
      average: amounts.reduce((a, b) => a + b, 0) / amounts.length,
      min: Math.min(...amounts),
      max: Math.max(...amounts),
      count: amounts.length
    };
  }

  getConfidenceStats(data, headers) {
    const confCol = this.findColumnIndex(headers, ['confidence']);
    if (confCol === -1) return null;

    const confidences = data.map(row => parseFloat(row[confCol])).filter(n => !isNaN(n));
    if (confidences.length === 0) return null;

    return {
      average: confidences.reduce((a, b) => a + b, 0) / confidences.length,
      high: confidences.filter(c => c > 0.8).length,
      medium: confidences.filter(c => c > 0.5 && c <= 0.8).length,
      low: confidences.filter(c => c <= 0.5).length
    };
  }

  findColumnIndex(headers, possibleNames) {
    for (const name of possibleNames) {
      const index = headers.findIndex(header => 
        header && header.toLowerCase().includes(name.toLowerCase())
      );
      if (index !== -1) return index;
    }
    return -1;
  }

  generateInsights(sheets) {
    const insights = [];

    // Check for learning system activity
    const learningSheets = Object.values(sheets).filter(s => 
      s.learningAnalysis && s.learningAnalysis.totalPatterns > 0
    );
    if (learningSheets.length > 0) {
      insights.push(`🧠 Learning system is active with ${learningSheets[0].learningAnalysis.totalPatterns} patterns learned`);
    }

    // Check transaction volume
    const transactionSheets = Object.values(sheets).filter(s => s.transactionAnalysis);
    if (transactionSheets.length > 0) {
      const totalTransactions = transactionSheets.reduce((sum, s) => sum + s.transactionAnalysis.totalTransactions, 0);
      insights.push(`💳 Processing ${totalTransactions} total transactions`);
    }

    // Check category coverage
    const categorySheets = Object.values(sheets).filter(s => s.categoryAnalysis);
    if (categorySheets.length > 0) {
      insights.push(`📊 ${categorySheets[0].categoryAnalysis.totalCategories} categories configured`);
    }

    return insights;
  }

  /**
   * Export analysis to JSON file
   */
  exportAnalysis(analysis, outputPath = './finance-analysis.json') {
    try {
      fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
      console.log(`📄 Analysis exported to: ${outputPath}`);
      return true;
    } catch (error) {
      console.error('❌ Error exporting analysis:', error.message);
      return false;
    }
  }

  /**
   * Generate readable report
   */
  generateReport(analysis) {
    let report = `
# Finance Automation Analysis Report
Generated: ${new Date().toLocaleString()}

## Summary
`;

    // Add insights
    if (analysis.insights.length > 0) {
      report += '\n### Key Insights\n';
      analysis.insights.forEach(insight => {
        report += `- ${insight}\n`;
      });
    }

    // Add sheet details
    report += '\n## Sheet Analysis\n';
    for (const [sheetName, sheet] of Object.entries(analysis.sheets)) {
      report += `\n### ${sheetName}\n`;
      report += `- Rows: ${sheet.rows}\n`;
      report += `- Columns: ${sheet.columns}\n`;
      
      if (sheet.headers.length > 0) {
        report += `- Headers: ${sheet.headers.join(', ')}\n`;
      }

      if (sheet.lastUpdated) {
        report += `- Last Updated: ${sheet.lastUpdated}\n`;
      }

      // Add specific analysis
      if (sheet.transactionAnalysis) {
        const ta = sheet.transactionAnalysis;
        report += `- Total Transactions: ${ta.totalTransactions}\n`;
        if (ta.dateRange) {
          report += `- Date Range: ${ta.dateRange.range}\n`;
        }
        if (ta.categories.length > 0) {
          report += `- Categories: ${ta.categories.length} unique (${ta.categories.slice(0, 5).join(', ')}${ta.categories.length > 5 ? '...' : ''})\n`;
        }
      }

      if (sheet.learningAnalysis) {
        const la = sheet.learningAnalysis;
        report += `- Learning Patterns: ${la.totalPatterns}\n`;
        if (la.confidenceLevels) {
          report += `- High Confidence Patterns: ${la.confidenceLevels.high}\n`;
        }
      }
    }

    return report;
  }
}

// Main execution
async function main() {
  const analyzer = new ExcelAnalyzer();
  
  // Look for Excel files in current directory
  const files = fs.readdirSync('.');
  const excelFiles = files.filter(file => 
    file.endsWith('.xlsx') || file.endsWith('.xls') || file.endsWith('.csv')
  );

  if (excelFiles.length === 0) {
    console.log('📁 No Excel files found in current directory.');
    console.log('💡 Please place your Excel file in this folder and run again.');
    console.log('   Supported formats: .xlsx, .xls, .csv');
    return;
  }

  console.log(`📋 Found ${excelFiles.length} file(s): ${excelFiles.join(', ')}`);
  
  // Process the first Excel file found
  const excelFile = excelFiles[0];
  
  if (analyzer.loadExcel(excelFile)) {
    console.log('\n🔍 Analyzing finance data...');
    const analysis = analyzer.analyzeFinanceData();
    
    // Export detailed analysis
    analyzer.exportAnalysis(analysis);
    
    // Generate and save readable report
    const report = analyzer.generateReport(analysis);
    fs.writeFileSync('./finance-report.md', report);
    
    console.log('\n📊 Analysis complete!');
    console.log('📄 Files created:');
    console.log('   - finance-analysis.json (detailed data)');
    console.log('   - finance-report.md (readable report)');
    
    // Display quick summary
    console.log('\n📋 Quick Summary:');
    analysis.insights.forEach(insight => console.log(`   ${insight}`));
    
    console.log(`\n📊 Sheets processed: ${Object.keys(analysis.sheets).length}`);
    Object.keys(analysis.sheets).forEach(name => 
      console.log(`   - ${name} (${analysis.sheets[name].rows} rows)`)
    );
  }
}

// Export for use as module
module.exports = ExcelAnalyzer;

// INTEGRATION ENHANCEMENT: Add cross-system integration utilities
class SystemIntegrationHelper {
  /**
   * Check for troubleshooting data and integrate insights
   */
  static loadTroubleshootingIntegration() {
    try {
      if (fs.existsSync('./troubleshooting-data.json')) {
        const troubleshootingData = JSON.parse(fs.readFileSync('./troubleshooting-data.json', 'utf8'));
        console.log('🔧 Troubleshooting integration data loaded');
        return troubleshootingData;
      }
    } catch (error) {
      console.warn('⚠️ Could not load troubleshooting integration:', error.message);
    }
    return null;
  }

  /**
   * Enhanced main function with cross-system integration
   */
  static async runIntegratedAnalysis() {
    console.log('🔄 Running integrated system analysis...\n');
    
    // Load troubleshooting context
    const troubleshootingData = this.loadTroubleshootingIntegration();
    
    // Find Excel files
    const files = fs.readdirSync('.').filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'));
    
    if (files.length === 0) {
      console.log('📁 No Excel files found in current directory.');
      console.log('💡 Place an Excel file in this directory and run again.');
      return;
    }

    const excelFile = files[0];
    console.log(`📊 Analyzing: ${excelFile}`);
    
    const analyzer = new ExcelAnalyzer();
    
    if (analyzer.loadExcel(excelFile)) {
      let analysis = analyzer.analyzeFinanceData();
      
      // INTEGRATION: Enhance analysis with troubleshooting context
      if (troubleshootingData) {
        analysis = this.enhanceAnalysisWithTroubleshooting(analysis, troubleshootingData);
      }
      
      // Export enhanced analysis
      analyzer.exportAnalysis(analysis, './integrated-analysis.json');
      
      // Generate integrated report
      const report = this.generateIntegratedReport(analysis, troubleshootingData);
      fs.writeFileSync('./integrated-report.md', report);
      
      console.log('\n📊 Integrated analysis complete!');
      console.log('📄 Files created:');
      console.log('   - integrated-analysis.json (enhanced data)');
      console.log('   - integrated-report.md (comprehensive report)');
      
      // Display enhanced summary
      this.displayIntegratedSummary(analysis, troubleshootingData);
      
    } else {
      console.error('❌ Failed to analyze Excel file');
      process.exit(1);
    }
  }

  /**
   * Enhance analysis with troubleshooting insights
   */
  static enhanceAnalysisWithTroubleshooting(analysis, troubleshootingData) {
    analysis.integrationContext = {
      troubleshootingTimestamp: troubleshootingData.timestamp,
      criticalIssues: troubleshootingData.criticalIssues?.length || 0,
      parsingFailures: troubleshootingData.parsingFailures?.length || 0,
      learningProblems: troubleshootingData.learningProblems?.length || 0,
      systemHealth: troubleshootingData.criticalIssues?.length > 0 ? 'CRITICAL' : 'STABLE'
    };

    // Enhance insights with troubleshooting context
    if (troubleshootingData.criticalIssues?.length > 0) {
      analysis.insights.unshift(`🚨 ${troubleshootingData.criticalIssues.length} critical issues require immediate attention`);
    }
    
    if (troubleshootingData.parsingFailures?.length > 0) {
      analysis.insights.push(`🔍 ${troubleshootingData.parsingFailures.length} parsing failures detected - system efficiency compromised`);
    }

    if (troubleshootingData.learningProblems?.length > 0) {
      analysis.insights.push(`🧠 ${troubleshootingData.learningProblems.length} learning system issues found - accuracy may be reduced`);
    }

    return analysis;
  }

  /**
   * Generate comprehensive integrated report
   */
  static generateIntegratedReport(analysis, troubleshootingData) {
    const analyzer = new ExcelAnalyzer();
    let report = analyzer.generateReport(analysis);
    
    if (troubleshootingData) {
      report += `

# 🔧 System Integration Analysis

This analysis incorporates insights from automated troubleshooting performed on ${new Date(troubleshootingData.timestamp).toLocaleString()}.

## Integration Status
- **Troubleshooting Integration**: ✅ Active
- **System Health**: ${analysis.integrationContext?.systemHealth || 'UNKNOWN'}
- **Cross-system Data Flow**: ✅ Operational

## Critical Findings Integration

### 🚨 Critical Issues (${troubleshootingData.criticalIssues?.length || 0})
${troubleshootingData.criticalIssues?.map(issue => `- ${typeof issue === 'object' ? issue.issue : issue}`).join('\n') || 'No critical issues detected'}

### 🔍 Parsing System Analysis (${troubleshootingData.parsingFailures?.length || 0} failures)
${troubleshootingData.parsingFailures?.map(failure => `- ${typeof failure === 'object' ? failure.pattern || failure.issue : failure}`).join('\n') || 'No parsing failures detected'}

### 🧠 Learning System Status (${troubleshootingData.learningProblems?.length || 0} issues)
${troubleshootingData.learningProblems?.map(problem => `- ${typeof problem === 'object' ? problem.issue : problem}`).join('\n') || 'Learning system operating normally'}

## Recommended Actions

### Immediate (Next 24 hours)
${troubleshootingData.criticalIssues?.filter(issue => typeof issue === 'object' && issue.priority === 'HIGH').map(issue => `- ${issue.issue}`).join('\n') || '- Monitor system stability'}

### Short-term (Next week)
${troubleshootingData.recommendations?.slice(0, 3).map(rec => `- ${rec}`).join('\n') || '- Continue regular monitoring'}

### Long-term (Next month)
- Review and optimize parsing patterns based on failure analysis
- Enhance learning system accuracy based on identified problems
- Implement preventive measures for recurring issues

## Integration Workflow
1. **Troubleshooting Analysis** → Identifies issues and patterns
2. **Excel Analysis** → Provides data context and validation
3. **Integrated Report** → Combines insights for actionable intelligence
4. **Google Apps Script Integration** → Implements fixes automatically

---
*This integrated analysis ensures comprehensive system health monitoring and proactive issue resolution.*
`;
    }
    
    return report;
  }

  /**
   * Display enhanced summary with integration context
   */
  static displayIntegratedSummary(analysis, troubleshootingData) {
    console.log('\n📋 Integrated Analysis Summary:');
    
    // Standard analysis summary
    analysis.insights.forEach(insight => console.log(`   ${insight}`));
    
    console.log(`\n📊 Sheets processed: ${Object.keys(analysis.sheets).length}`);
    Object.keys(analysis.sheets).forEach(name => 
      console.log(`   - ${name} (${analysis.sheets[name].rows} rows)`)
    );

    // Integration-specific summary
    if (troubleshootingData) {
      console.log('\n🔧 Integration Context:');
      console.log(`   - Troubleshooting data: ${new Date(troubleshootingData.timestamp).toLocaleString()}`);
      console.log(`   - System health: ${analysis.integrationContext?.systemHealth || 'UNKNOWN'}`);
      console.log(`   - Total issues: ${(troubleshootingData.criticalIssues?.length || 0) + (troubleshootingData.parsingFailures?.length || 0) + (troubleshootingData.learningProblems?.length || 0)}`);
      
      if (troubleshootingData.criticalIssues?.length > 0) {
        console.log('\n🚨 CRITICAL ISSUES REQUIRE IMMEDIATE ATTENTION:');
        troubleshootingData.criticalIssues.forEach((issue, i) => {
          const issueText = typeof issue === 'object' ? issue.issue : issue;
          console.log(`   ${i+1}. ${issueText}`);
        });
      }
    }
  }
}

// Enhanced run function for integrated analysis
async function runIntegratedAnalysis() {
  return SystemIntegrationHelper.runIntegratedAnalysis();
}

// Run if called directly
if (require.main === module) {
  // Check if troubleshooting integration is available
  const troubleshootingData = SystemIntegrationHelper.loadTroubleshootingIntegration();
  
  if (troubleshootingData) {
    console.log('🔧 Running integrated analysis with troubleshooting context...');
    runIntegratedAnalysis().catch(console.error);
  } else {
    console.log('📊 Running standard analysis...');
    main().catch(console.error);
  }
}
