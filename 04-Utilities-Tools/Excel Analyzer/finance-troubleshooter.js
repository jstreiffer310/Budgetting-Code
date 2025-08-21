const XLSX = require('xlsx');
const fs = require('fs-extra');

class FinanceTroubleshooter {
  constructor() {
    this.workbook = null;
    this.sheets = {};
    this.issues = [];
    this.recommendations = [];
  }

  loadExcel(filePath) {
    try {
      console.log(`🔍 Loading spreadsheet for troubleshooting: ${filePath}`);
      this.workbook = XLSX.readFile(filePath);
      
      this.workbook.SheetNames.forEach(sheetName => {
        const worksheet = this.workbook.Sheets[sheetName];
        this.sheets[sheetName] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error loading Excel file:', error.message);
      return false;
    }
  }

  /**
   * Main troubleshooting analysis
   */
  runTroubleshootingAnalysis() {
    console.log('\n🕵️ Running comprehensive troubleshooting analysis...\n');
    
    const analysis = {
      timestamp: new Date().toISOString(),
      criticalIssues: [],
      parsingFailures: [],
      missingTransactions: [],
      learningProblems: [],
      recommendations: [],
      scriptImprovements: []
    };

    // Analyze each area
    this.analyzeFailedParsing(analysis);
    this.analyzeMissingTransactions(analysis);
    this.analyzeLearningEffectiveness(analysis);
    this.analyzeDataIntegrity(analysis);
    this.generateScriptImprovements(analysis);

    return analysis;
  }

  /**
   * Analyze failed parsing patterns
   */
  analyzeFailedParsing(analysis) {
    const failedSheet = this.sheets['Failed_Parsing'];
    if (!failedSheet || failedSheet.length < 2) {
      analysis.criticalIssues.push("⚠️ No Failed_Parsing sheet found - parsing errors not being tracked");
      return;
    }

    const headers = failedSheet[0];
    const failures = failedSheet.slice(1);
    
    console.log(`📧 Analyzing ${failures.length} parsing failures...`);

    // Group failures by type
    const failuresByReason = {};
    const failuresByEmail = {};
    
    failures.forEach(row => {
      const [timestamp, emailId, from, subject, bodyPreview, failureReason, attemptedParsers] = row;
      
      // Track by failure reason
      if (failureReason) {
        failuresByReason[failureReason] = (failuresByReason[failureReason] || 0) + 1;
      }
      
      // Track by email domain
      if (from) {
        const domain = this.extractDomain(from);
        failuresByEmail[domain] = (failuresByEmail[domain] || 0) + 1;
      }

      // Check for specific issues
      if (subject && subject.includes('PayPal') && bodyPreview && bodyPreview.includes('14.45')) {
        analysis.criticalIssues.push({
          type: 'MISSING_TRANSACTION',
          amount: '$14.45',
          source: 'PayPal/PC Financial',
          issue: 'PayPal transaction not processed from PC Financial email',
          emailPreview: bodyPreview.substring(0, 100) + '...',
          recommendation: 'Check PayPal parsing logic in _parsePayPalEmail() function'
        });
      }
    });

    // Add failure patterns to analysis
    Object.entries(failuresByReason).forEach(([reason, count]) => {
      analysis.parsingFailures.push({
        reason: reason,
        count: count,
        severity: count > 5 ? 'HIGH' : count > 2 ? 'MEDIUM' : 'LOW'
      });
    });

    // Most problematic email domains
    const problematicDomains = Object.entries(failuresByEmail)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    if (problematicDomains.length > 0) {
      analysis.recommendations.push({
        type: 'EMAIL_PARSING',
        priority: 'HIGH',
        issue: `Most parsing failures from: ${problematicDomains.map(([domain, count]) => `${domain} (${count})`).join(', ')}`,
        action: 'Review and enhance email parsing logic for these domains'
      });
    }
  }

  /**
   * Analyze missing transactions by comparing different data sources
   */
  analyzeMissingTransactions(analysis) {
    const transactions = this.sheets['Transactions'];
    const csvImport = this.sheets['CSV_Import'];
    const staging = this.sheets['Staging'];
    
    if (!transactions || transactions.length < 2) {
      analysis.criticalIssues.push("⚠️ No transaction data found");
      return;
    }

    console.log(`💳 Analyzing transaction completeness...`);

    const transactionData = transactions.slice(1);
    const stagingData = staging ? staging.slice(1) : [];
    
    // Check for transactions stuck in staging
    if (stagingData.length > 0) {
      const staleStaging = stagingData.filter(row => {
        const stagedAt = row[6]; // StagedAt column
        if (!stagedAt) return false;
        const stagedDate = new Date(stagedAt);
        const hoursDiff = (new Date() - stagedDate) / (1000 * 60 * 60);
        return hoursDiff > 48; // Older than 48 hours
      });

      if (staleStaging.length > 0) {
        analysis.criticalIssues.push({
          type: 'STALE_STAGING',
          count: staleStaging.length,
          issue: `${staleStaging.length} transactions stuck in staging > 48 hours`,
          recommendation: 'Run staging cleanup function: _cleanupStaleStaging()'
        });
      }
    }

    // Check for date issues (1969 bug)
    const dateIssues = transactionData.filter(row => {
      const dateStr = row[0];
      return dateStr && typeof dateStr === 'string' && dateStr.includes('1969');
    });

    if (dateIssues.length > 0) {
      analysis.criticalIssues.push({
        type: 'DATE_PARSING_BUG',
        count: dateIssues.length,
        issue: `${dateIssues.length} transactions with 1969 date bug`,
        recommendation: 'Run date repair function: _fixDateParsingIssues()'
      });
    }
  }

  /**
   * Analyze learning system effectiveness
   */
  analyzeLearningEffectiveness(analysis) {
    const learningHub = this.sheets['Learning_Hub'];
    if (!learningHub || learningHub.length < 2) {
      analysis.criticalIssues.push("⚠️ Learning system not active - no Learning_Hub data");
      return;
    }

    console.log(`🧠 Analyzing AI learning effectiveness...`);

    const learningData = learningHub.slice(1);
    
    // Analyze confidence levels
    const confidenceStats = {
      high: 0,    // > 0.8
      medium: 0,  // 0.5 - 0.8
      low: 0      // < 0.5
    };

    const failureRates = {};
    
    learningData.forEach(row => {
      const [timestamp, learningType, pattern, context, confidence, successCount, failureCount] = row;
      
      if (confidence) {
        const conf = parseFloat(confidence);
        if (conf > 0.8) confidenceStats.high++;
        else if (conf > 0.5) confidenceStats.medium++;
        else confidenceStats.low++;
      }

      // Track failure rates by type
      if (learningType && successCount && failureCount) {
        const success = parseInt(successCount) || 0;
        const failure = parseInt(failureCount) || 0;
        const total = success + failure;
        if (total > 0) {
          const failureRate = failure / total;
          failureRates[learningType] = (failureRates[learningType] || []).concat(failureRate);
        }
      }
    });

    // Learning system health check
    if (confidenceStats.high === 0) {
      analysis.learningProblems.push({
        type: 'LOW_CONFIDENCE',
        issue: 'No high-confidence learning patterns (> 0.8)',
        recommendation: 'Review learning algorithm - may need more training data or pattern refinement'
      });
    }

    if (confidenceStats.low > confidenceStats.high + confidenceStats.medium) {
      analysis.learningProblems.push({
        type: 'POOR_LEARNING',
        issue: `${confidenceStats.low} low-confidence patterns vs ${confidenceStats.high + confidenceStats.medium} good patterns`,
        recommendation: 'Consider resetting learning data and improving training patterns'
      });
    }

    // Check for high failure rate learning types
    Object.entries(failureRates).forEach(([type, rates]) => {
      const avgFailureRate = rates.reduce((a, b) => a + b, 0) / rates.length;
      if (avgFailureRate > 0.3) {
        analysis.learningProblems.push({
          type: 'HIGH_FAILURE_RATE',
          learningType: type,
          failureRate: `${(avgFailureRate * 100).toFixed(1)}%`,
          recommendation: `Review ${type} learning logic - high failure rate indicates pattern issues`
        });
      }
    });
  }

  /**
   * Analyze data integrity issues
   */
  analyzeDataIntegrity(analysis) {
    console.log(`🔍 Checking data integrity...`);

    const transactions = this.sheets['Transactions'];
    const accounts = this.sheets['Accounts'];
    
    if (transactions && transactions.length > 1) {
      const transactionData = transactions.slice(1);
      
      // Check for duplicate transactions
      const transactionHashes = new Set();
      const duplicates = [];
      
      transactionData.forEach((row, index) => {
        const [date, amount, from, to, bank] = row;
        const hash = `${date}-${amount}-${from}-${to}`;
        if (transactionHashes.has(hash)) {
          duplicates.push({row: index + 2, hash});
        }
        transactionHashes.add(hash);
      });

      if (duplicates.length > 0) {
        analysis.criticalIssues.push({
          type: 'DUPLICATE_TRANSACTIONS',
          count: duplicates.length,
          issue: `${duplicates.length} potential duplicate transactions found`,
          recommendation: 'Run duplicate detection: _findAndRemoveDuplicates()'
        });
      }

      // Check for missing categories
      const uncategorized = transactionData.filter(row => {
        const category = row[7]; // Category column
        return !category || category === '' || category === 'Uncategorized';
      });

      if (uncategorized.length > transactionData.length * 0.2) {
        analysis.recommendations.push({
          type: 'CATEGORIZATION',
          priority: 'MEDIUM',
          issue: `${uncategorized.length} transactions (${((uncategorized.length/transactionData.length)*100).toFixed(1)}%) uncategorized`,
          action: 'Improve categorization rules or run learning enhancement'
        });
      }
    }
  }

  /**
   * Generate specific script improvements
   */
  generateScriptImprovements(analysis) {
    console.log(`💡 Generating script improvement recommendations...`);

    // Based on failed parsing patterns
    const failedParsing = this.sheets['Failed_Parsing'];
    if (failedParsing && failedParsing.length > 1) {
      const failures = failedParsing.slice(1);
      
      // Check for PayPal-specific issues
      const paypalFailures = failures.filter(row => 
        row[2] && (row[2].includes('paypal') || row[2].includes('PayPal'))
      );
      
      if (paypalFailures.length > 0) {
        analysis.scriptImprovements.push({
          function: '_parsePayPalEmail()',
          issue: `${paypalFailures.length} PayPal parsing failures`,
          improvement: `
// Enhanced PayPal parsing - add this to _parsePayPalEmail()
function _parsePayPalEmail(body, subject) {
  // Check for PC Financial PayPal transactions
  if (subject.includes('PC Financial') || body.includes('PC Financial')) {
    const pcFinancialRegex = /\\$([\\d,]+\\.\\d{2})\\s+CAD.*PayPal/i;
    const match = body.match(pcFinancialRegex);
    if (match) {
      return {
        amount: parseFloat(match[1].replace(',', '')),
        merchant: 'PayPal via PC Financial',
        type: 'Debit'
      };
    }
  }
  // ... existing PayPal logic
}`,
          priority: 'HIGH'
        });
      }

      // Check for domain parsing issues
      const domainErrors = failures.filter(row => 
        row[5] && row[5].includes('domain is not defined')
      );
      
      if (domainErrors.length > 0) {
        analysis.scriptImprovements.push({
          function: 'Email parsing functions',
          issue: `${domainErrors.length} domain extraction errors`,
          improvement: `
// Add domain validation - add this helper function
function _extractEmailDomain(fromField) {
  if (!fromField) return 'unknown';
  const match = fromField.match(/<([^>]+)>/);
  const email = match ? match[1] : fromField;
  const domain = email.split('@')[1];
  return domain ? domain.toLowerCase() : 'unknown';
}`,
          priority: 'MEDIUM'
        });
      }
    }

    // Date parsing improvements
    const transactions = this.sheets['Transactions'];
    if (transactions) {
      const dateIssues = transactions.slice(1).filter(row => 
        row[0] && typeof row[0] === 'string' && row[0].includes('1969')
      );
      
      if (dateIssues.length > 0) {
        analysis.scriptImprovements.push({
          function: 'Date parsing functions',
          issue: `${dateIssues.length} transactions with 1969 date bug`,
          improvement: `
// Enhanced date parsing - replace existing date parsing with:
function _parseEmailDate(dateStr, emailDate) {
  if (!dateStr) return emailDate;
  
  // Handle various date formats
  const formats = [
    /\\b(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})\\b/,  // MM/DD/YYYY
    /\\b(\\d{4})-(\\d{1,2})-(\\d{1,2})\\b/,      // YYYY-MM-DD
    /\\b(\\w{3})\\s+(\\d{1,2}),?\\s+(\\d{4})\\b/ // Mon DD, YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const parsedDate = new Date(match[0]);
      if (parsedDate.getFullYear() > 2000) {
        return parsedDate;
      }
    }
  }
  
  return emailDate; // Fallback to email date
}`,
          priority: 'HIGH'
        });
      }
    }
  }

  /**
   * Helper functions
   */
  extractDomain(emailFrom) {
    if (!emailFrom) return 'unknown';
    const match = emailFrom.match(/<([^>]+)>/);
    const email = match ? match[1] : emailFrom;
    const domain = email.split('@')[1];
    return domain ? domain.toLowerCase() : 'unknown';
  }

  /**
   * Generate comprehensive troubleshooting report
   */
  generateTroubleshootingReport(analysis) {
    let report = `
# Finance Automation Troubleshooting Report
Generated: ${new Date().toLocaleString()}

## 🚨 Critical Issues (Immediate Action Required)
`;

    if (analysis.criticalIssues.length === 0) {
      report += '✅ No critical issues found\n';
    } else {
      analysis.criticalIssues.forEach(issue => {
        if (typeof issue === 'string') {
          report += `- ${issue}\n`;
        } else {
          report += `\n### ${issue.type}\n`;
          report += `- **Issue**: ${issue.issue}\n`;
          if (issue.amount) report += `- **Amount**: ${issue.amount}\n`;
          if (issue.source) report += `- **Source**: ${issue.source}\n`;
          if (issue.recommendation) report += `- **Action**: ${issue.recommendation}\n`;
          if (issue.emailPreview) report += `- **Email Preview**: ${issue.emailPreview}\n`;
        }
      });
    }

    report += `\n## 📧 Parsing Failures Analysis\n`;
    if (analysis.parsingFailures.length === 0) {
      report += '✅ No parsing failures detected\n';
    } else {
      analysis.parsingFailures.forEach(failure => {
        report += `- **${failure.reason}**: ${failure.count} failures (${failure.severity} priority)\n`;
      });
    }

    report += `\n## 🧠 Learning System Issues\n`;
    if (analysis.learningProblems.length === 0) {
      report += '✅ Learning system operating normally\n';
    } else {
      analysis.learningProblems.forEach(problem => {
        report += `\n### ${problem.type}\n`;
        report += `- **Issue**: ${problem.issue}\n`;
        report += `- **Recommendation**: ${problem.recommendation}\n`;
        if (problem.learningType) report += `- **Learning Type**: ${problem.learningType}\n`;
        if (problem.failureRate) report += `- **Failure Rate**: ${problem.failureRate}\n`;
      });
    }

    report += `\n## 💡 Script Improvements\n`;
    if (analysis.scriptImprovements.length === 0) {
      report += '✅ No immediate script improvements identified\n';
    } else {
      analysis.scriptImprovements.forEach(improvement => {
        report += `\n### ${improvement.function} - ${improvement.priority} Priority\n`;
        report += `- **Issue**: ${improvement.issue}\n`;
        report += `- **Improvement**:\n\`\`\`javascript${improvement.improvement}\n\`\`\`\n`;
      });
    }

    report += `\n## 📋 Recommendations\n`;
    if (analysis.recommendations.length === 0) {
      report += '✅ No additional recommendations\n';
    } else {
      analysis.recommendations.forEach(rec => {
        report += `\n### ${rec.type} - ${rec.priority} Priority\n`;
        report += `- **Issue**: ${rec.issue}\n`;
        report += `- **Action**: ${rec.action}\n`;
      });
    }

    report += `\n## 🛠️ Immediate Action Items\n`;
    
    // Prioritize actions
    const immediateActions = [];
    
    analysis.criticalIssues.forEach(issue => {
      if (issue.recommendation) {
        immediateActions.push(`1. ${issue.recommendation}`);
      }
    });

    analysis.scriptImprovements
      .filter(imp => imp.priority === 'HIGH')
      .forEach(imp => {
        immediateActions.push(`2. Implement ${imp.function} improvements`);
      });

    if (immediateActions.length === 0) {
      report += '✅ No immediate actions required\n';
    } else {
      immediateActions.forEach(action => {
        report += `${action}\n`;
      });
    }

    return report;
  }

  /**
   * Export troubleshooting results with enhanced system integration
   */
  exportTroubleshootingResults(analysis, outputPath = './troubleshooting-report.md') {
    try {
      const report = this.generateTroubleshootingReport(analysis);
      fs.writeFileSync(outputPath, report);
      fs.writeFileSync('./troubleshooting-data.json', JSON.stringify(analysis, null, 2));
      
      // INTEGRATION ENHANCEMENT: Generate Google Apps Script fixes
      const gasCode = this.generateGASIntegrationCode(analysis);
      fs.writeFileSync('./gas-integration-fixes.gs', gasCode);
      
      // INTEGRATION ENHANCEMENT: Generate system status update
      const statusUpdate = this.generateSystemStatusUpdate(analysis);
      fs.writeFileSync('./system-status-update.json', JSON.stringify(statusUpdate, null, 2));
      
      // INTEGRATION ENHANCEMENT: Generate Excel analyzer integration
      const excelIntegration = this.generateExcelAnalyzerIntegration(analysis);
      fs.writeFileSync('./excel-analyzer-integration.js', excelIntegration);
      
      console.log(`📄 Troubleshooting report exported to: ${outputPath}`);
      console.log(`📊 Detailed data exported to: troubleshooting-data.json`);
      console.log(`🔧 GAS integration code: gas-integration-fixes.gs`);
      console.log(`📈 System status update: system-status-update.json`);
      console.log(`📊 Excel analyzer integration: excel-analyzer-integration.js`);
      return true;
    } catch (error) {
      console.error('❌ Error exporting analysis:', error.message);
      return false;
    }
  }

  /**
   * Generate Google Apps Script integration code for identified fixes
   */
  generateGASIntegrationCode(analysis) {
    let gasCode = `/**
 * AUTOMATICALLY GENERATED INTEGRATION CODE
 * Generated from troubleshooting analysis on ${new Date().toISOString()}
 * 
 * This code integrates troubleshooting findings with the main finance automation script
 */

// Integration status tracking
const TROUBLESHOOTING_INTEGRATION = {
  timestamp: '${new Date().toISOString()}',
  criticalIssues: ${analysis.criticalIssues.length},
  parsingFailures: ${analysis.parsingFailures.length},
  fixesImplemented: 0
};

`;

    // Generate specific fixes based on analysis
    if (analysis.criticalIssues.length > 0) {
      gasCode += `/**
 * CRITICAL ISSUES DETECTED - IMMEDIATE FIXES REQUIRED
 */
function applyTroubleshootingFixes() {
  try {
    let fixesApplied = 0;
    
`;
      
      analysis.criticalIssues.forEach((issue, index) => {
        if (typeof issue === 'object' && issue.issue) {
          gasCode += `    // Fix ${index + 1}: ${issue.issue}
    if (apply${this.camelCase(issue.issue)}Fix()) {
      fixesApplied++;
      _logInfo('Applied fix for: ${issue.issue}');
    }
    
`;
        }
      });
      
      gasCode += `    TROUBLESHOOTING_INTEGRATION.fixesImplemented = fixesApplied;
    _logInfo(\`Applied \${fixesApplied} troubleshooting fixes\`);
    return fixesApplied;
    
  } catch (error) {
    _logError('Failed to apply troubleshooting fixes', error);
    return 0;
  }
}

`;
    }

    // Generate parsing improvement functions
    if (analysis.parsingFailures.length > 0) {
      gasCode += `/**
 * PARSING IMPROVEMENTS BASED ON TROUBLESHOOTING
 */
function improveParsingFromTroubleshooting() {
  const improvements = [
`;
      
      analysis.parsingFailures.forEach(failure => {
        if (typeof failure === 'object' && failure.pattern) {
          gasCode += `    { pattern: '${failure.pattern}', action: '${failure.suggestedFix || 'enhance_parsing'}' },
`;
        }
      });
      
      gasCode += `  ];
  
  improvements.forEach(improvement => {
    try {
      _updateParsingPattern(improvement.pattern, improvement.action);
    } catch (error) {
      _logError('Failed to apply parsing improvement', error);
    }
  });
}

`;
    }

    // Generate integration status function
    gasCode += `/**
 * Get integration status for troubleshooting system
 */
function getTroubleshootingIntegrationStatus() {
  return {
    ...TROUBLESHOOTING_INTEGRATION,
    lastCheck: new Date(),
    systemHealth: _performQuickHealthCheck(),
    integrationActive: true
  };
}

/**
 * Quick health check for integration monitoring
 */
function _performQuickHealthCheck() {
  try {
    const ss = _ss();
    const mainSheet = ss.getSheetByName(SHEET_NAMES.MAIN);
    
    return {
      spreadsheetAccess: !!ss,
      mainSheetAccess: !!mainSheet,
      dataRows: mainSheet ? mainSheet.getLastRow() - 1 : 0,
      status: (ss && mainSheet) ? 'HEALTHY' : 'DEGRADED'
    };
  } catch (error) {
    return {
      spreadsheetAccess: false,
      mainSheetAccess: false,
      dataRows: 0,
      status: 'CRITICAL',
      error: error.message
    };
  }
}`;

    return gasCode;
  }

  /**
   * Generate system status update for integration with SYSTEM_STATUS.ps1
   */
  generateSystemStatusUpdate(analysis) {
    return {
      timestamp: new Date().toISOString(),
      source: 'finance-troubleshooter',
      version: '1.0.0',
      analysis: {
        criticalIssues: analysis.criticalIssues.length,
        parsingFailures: analysis.parsingFailures.length,
        learningProblems: analysis.learningProblems.length,
        scriptImprovements: analysis.scriptImprovements.length,
        totalIssues: analysis.criticalIssues.length + analysis.parsingFailures.length + analysis.learningProblems.length
      },
      systemHealth: {
        status: analysis.criticalIssues.length > 0 ? 'CRITICAL' : 
                analysis.parsingFailures.length > 5 ? 'DEGRADED' : 'HEALTHY',
        priority: analysis.criticalIssues.length > 0 ? 'IMMEDIATE' : 'NORMAL'
      },
      integrations: {
        gasScript: 'gas-integration-fixes.gs',
        excelAnalyzer: 'excel-analyzer-integration.js',
        statusUpdate: 'system-status-update.json'
      },
      recommendations: analysis.recommendations || []
    };
  }

  /**
   * Generate Excel analyzer integration code
   */
  generateExcelAnalyzerIntegration(analysis) {
    return `/**
 * EXCEL ANALYZER INTEGRATION WITH TROUBLESHOOTING RESULTS
 * Generated: ${new Date().toISOString()}
 */

const ExcelAnalyzer = require('./excel-analyzer');

class TroubleshootingIntegratedAnalyzer extends ExcelAnalyzer {
  constructor() {
    super();
    this.troubleshootingData = null;
    this.loadTroubleshootingData();
  }

  /**
   * Load troubleshooting data for enhanced analysis
   */
  loadTroubleshootingData() {
    try {
      const fs = require('fs-extra');
      if (fs.existsSync('./troubleshooting-data.json')) {
        this.troubleshootingData = JSON.parse(fs.readFileSync('./troubleshooting-data.json', 'utf8'));
        console.log('📊 Loaded troubleshooting data for enhanced analysis');
      }
    } catch (error) {
      console.warn('⚠️ Could not load troubleshooting data:', error.message);
    }
  }

  /**
   * Enhanced analysis incorporating troubleshooting findings
   */
  analyzeFinanceDataEnhanced() {
    const baseAnalysis = super.analyzeFinanceData();
    
    if (this.troubleshootingData) {
      baseAnalysis.troubleshootingInsights = {
        criticalIssuesFound: this.troubleshootingData.criticalIssues?.length || 0,
        parsingFailuresDetected: this.troubleshootingData.parsingFailures?.length || 0,
        learningProblemsIdentified: this.troubleshootingData.learningProblems?.length || 0,
        integrationTimestamp: this.troubleshootingData.timestamp
      };

      // Enhance insights with troubleshooting data
      if (this.troubleshootingData.criticalIssues?.length > 0) {
        baseAnalysis.insights.unshift('🚨 Critical issues detected in troubleshooting analysis - immediate attention required');
      }
      
      if (this.troubleshootingData.parsingFailures?.length > 0) {
        baseAnalysis.insights.push(\`🔍 \${this.troubleshootingData.parsingFailures.length} parsing failures identified - review parser effectiveness\`);
      }
    }
    
    return baseAnalysis;
  }

  /**
   * Generate integrated report with troubleshooting context
   */
  generateIntegratedReport(analysis) {
    let report = super.generateReport(analysis);
    
    if (this.troubleshootingData) {
      report += \`

## 🔧 Troubleshooting Integration

**Analysis Integration**: This report incorporates findings from automated troubleshooting analysis performed on \${new Date(this.troubleshootingData.timestamp).toLocaleString()}.

**Critical Issues**: \${this.troubleshootingData.criticalIssues?.length || 0}
**Parsing Failures**: \${this.troubleshootingData.parsingFailures?.length || 0}
**Learning Problems**: \${this.troubleshootingData.learningProblems?.length || 0}

### Priority Actions
\${this.troubleshootingData.criticalIssues?.map(issue => \`- \${typeof issue === 'object' ? issue.issue : issue}\`).join('\\n') || 'No critical issues detected'}

### System Recommendations
\${this.troubleshootingData.recommendations?.map(rec => \`- \${rec}\`).join('\\n') || 'No specific recommendations available'}
\`;
    }
    
    return report;
  }
}

module.exports = TroubleshootingIntegratedAnalyzer;

// Usage example:
// const analyzer = new TroubleshootingIntegratedAnalyzer();
// if (analyzer.loadExcel('path/to/file.xlsx')) {
//   const analysis = analyzer.analyzeFinanceDataEnhanced();
//   const report = analyzer.generateIntegratedReport(analysis);
//   console.log(report);
// }
`;
  }

  /**
   * Helper function to convert strings to camelCase for function names
   */
  camelCase(str) {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
        index === 0 ? word.toLowerCase() : word.toUpperCase())
      .replace(/\s+/g, '');
  }
}

// Main execution
async function main() {
  const troubleshooter = new FinanceTroubleshooter();
  
  // Look for Excel files
  const files = fs.readdirSync('.');
  const excelFiles = files.filter(file => 
    file.endsWith('.xlsx') || file.endsWith('.xls')
  );

  if (excelFiles.length === 0) {
    console.log('📁 No Excel files found for troubleshooting.');
    return;
  }

  const excelFile = excelFiles[0];
  console.log(`🔧 Troubleshooting: ${excelFile}`);
  
  if (troubleshooter.loadExcel(excelFile)) {
    const analysis = troubleshooter.runTroubleshootingAnalysis();
    troubleshooter.exportTroubleshootingResults(analysis);
    
    console.log('\n🎯 Troubleshooting Summary:');
    console.log(`   Critical Issues: ${analysis.criticalIssues.length}`);
    console.log(`   Parsing Failures: ${analysis.parsingFailures.length}`);
    console.log(`   Learning Problems: ${analysis.learningProblems.length}`);
    console.log(`   Script Improvements: ${analysis.scriptImprovements.length}`);
    
    if (analysis.criticalIssues.length > 0) {
      console.log('\n🚨 IMMEDIATE ACTION REQUIRED:');
      analysis.criticalIssues.forEach((issue, i) => {
        if (typeof issue === 'object' && issue.issue) {
          console.log(`   ${i+1}. ${issue.issue}`);
        }
      });
    }
  }
}

// Export for use as module
module.exports = FinanceTroubleshooter;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
