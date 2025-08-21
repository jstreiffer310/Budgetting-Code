/**
 * ENHANCED SPREADSHEET ANALYZER - Unified Diagnostic Integration
 * This script analyzes your finance spreadsheet with consolidated diagnostic insights
 */

function analyzeCurrentSpreadsheet() {
  const SPREADSHEET_ID = '1-eUeYMTeKoz2bIkHS8Jc2J9vO0Bnl8y6aHXmXGdJqg8';
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const analysis = {};
    
    // Analyze each sheet with enhanced diagnostic focus
    const sheets = ss.getSheets();
    console.log(`Found ${sheets.length} sheets:`);
    
    const diagnosticSheets = ['Failed_Parsing', 'AuditLog', 'Learning_Hub', 'Diagnostic_Hub'];
    const primarySheets = ['Transactions', 'Accounts', 'Holdings'];
    
    // Analyze diagnostic sheets first
    console.log('\n=== DIAGNOSTIC SHEETS ANALYSIS ===');
    diagnosticSheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        analysis[sheetName] = _analyzeDiagnosticSheet(sheet);
        console.log(`${sheetName}: ${analysis[sheetName].summary}`);
      }
    });
    
    // Analyze primary data sheets
    console.log('\n=== PRIMARY DATA SHEETS ===');
    primarySheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        analysis[sheetName] = _analyzeDataSheet(sheet);
        console.log(`${sheetName}: ${analysis[sheetName].summary}`);
      }
    });
    
    // Generate consolidated insights
    const insights = _generateConsolidatedInsights(analysis);
    console.log('\n=== CONSOLIDATED DIAGNOSTIC INSIGHTS ===');
    console.log(`System Health: ${insights.systemHealth}`);
    console.log(`Critical Issues: ${insights.criticalIssueCount}`);
    console.log(`Success Rate: ${Math.round(insights.overallSuccessRate * 100)}%`);
    
    // Output detailed analysis
    console.log('\n=== DETAILED ANALYSIS ===');
    console.log(JSON.stringify(insights, null, 2));
    
    return { analysis, insights };
    
  } catch (error) {
    console.error('Error analyzing spreadsheet:', error);
    return null;
  }
}

function _analyzeDiagnosticSheet(sheet) {
  const name = sheet.getName();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  const result = {
    type: 'diagnostic',
    rows: lastRow,
    columns: lastCol,
    headers: [],
    patterns: {},
    summary: ''
  };
  
  if (lastRow > 0 && lastCol > 0) {
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    result.headers = headers;
    
    // Analyze diagnostic patterns based on sheet type
    if (name === 'Failed_Parsing') {
      result.patterns = _analyzeFailedParsingPatterns(sheet, lastRow);
      result.summary = `${lastRow - 1} parsing failures, ${result.patterns.uniqueDomains} domains affected`;
    } else if (name === 'AuditLog') {
      result.patterns = _analyzeAuditPatterns(sheet, lastRow);
      result.summary = `${lastRow - 1} audit entries, ${result.patterns.errorCount} errors`;
    } else if (name === 'Learning_Hub') {
      result.patterns = _analyzeLearningPatterns(sheet, lastRow);
      result.summary = `${lastRow - 1} learning entries, ${Math.round(result.patterns.averageConfidence * 100)}% avg confidence`;
    } else if (name === 'Diagnostic_Hub') {
      result.patterns = _analyzeDiagnosticHubPatterns(sheet, lastRow);
      result.summary = `${lastRow - 1} unified diagnostics, ${result.patterns.systemHealth} health`;
    }
  }
  
  return result;
}

function _analyzeDataSheet(sheet) {
  const name = sheet.getName();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  const result = {
    type: 'data',
    rows: lastRow,
    columns: lastCol,
    headers: [],
    dataQuality: {},
    summary: ''
  };
  
  if (lastRow > 0 && lastCol > 0) {
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    result.headers = headers;
    
    if (lastRow > 1) {
      const sampleSize = Math.min(100, lastRow - 1);
      const sampleData = sheet.getRange(2, 1, sampleSize, lastCol).getValues();
      
      result.dataQuality = _assessDataQuality(sampleData, headers);
      result.summary = `${lastRow - 1} records, ${Math.round(result.dataQuality.completeness * 100)}% complete`;
    }
  }
  
  return result;
}

function _analyzeFailedParsingPatterns(sheet, lastRow) {
  const patterns = {
    uniqueDomains: new Set(),
    errorTypes: {},
    timeDistribution: {},
    resolutionRate: 0
  };
  
  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, Math.min(lastRow - 1, 100), 10).getValues();
    
    data.forEach(row => {
      const [timestamp, emailId, from, subject, bodyPreview, failureReason, 
             attemptedParsers, aiAnalysis, status, priority] = row;
      
      // Extract domain
      const domain = from ? from.match(/@([^>]+)/)?.[1] : null;
      if (domain) patterns.uniqueDomains.add(domain);
      
      // Classify error type
      const errorType = failureReason ? failureReason.toString().split(':')[0] : 'Unknown';
      patterns.errorTypes[errorType] = (patterns.errorTypes[errorType] || 0) + 1;
      
      // Track resolution
      if (status === 'RESOLVED') patterns.resolutionRate++;
    });
    
    patterns.resolutionRate = patterns.resolutionRate / data.length;
    patterns.uniqueDomains = patterns.uniqueDomains.size;
  }
  
  return patterns;
}

function _analyzeAuditPatterns(sheet, lastRow) {
  const patterns = {
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    recentErrorRate: 0,
    topErrors: {}
  };
  
  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, Math.min(lastRow - 1, 200), 5).getValues();
    
    data.forEach(row => {
      const [timestamp, level, message, context, user] = row;
      
      if (level === 'ERROR') {
        patterns.errorCount++;
        const errorKey = message ? message.toString().substring(0, 50) : 'Unknown';
        patterns.topErrors[errorKey] = (patterns.topErrors[errorKey] || 0) + 1;
      } else if (level === 'WARNING') {
        patterns.warningCount++;
      } else {
        patterns.infoCount++;
      }
    });
    
    // Calculate recent error rate (errors per total entries)
    const totalEntries = patterns.errorCount + patterns.warningCount + patterns.infoCount;
    patterns.recentErrorRate = totalEntries > 0 ? patterns.errorCount / totalEntries : 0;
  }
  
  return patterns;
}

function _analyzeLearningPatterns(sheet, lastRow) {
  const patterns = {
    learningTypes: {},
    averageConfidence: 0,
    successRate: 0,
    validatedPatterns: 0
  };
  
  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, Math.min(lastRow - 1, 100), 10).getValues();
    
    let totalConfidence = 0;
    let totalSuccess = 0;
    let totalAttempts = 0;
    
    data.forEach(row => {
      const [timestamp, learningType, pattern, context, confidence, 
             successCount, failureCount, metadata, status, crossValidated] = row;
      
      // Track learning types
      patterns.learningTypes[learningType] = (patterns.learningTypes[learningType] || 0) + 1;
      
      // Calculate averages
      const conf = parseFloat(confidence) || 0;
      totalConfidence += conf;
      
      const success = parseInt(successCount) || 0;
      const failure = parseInt(failureCount) || 0;
      totalSuccess += success;
      totalAttempts += success + failure;
      
      if (crossValidated === 'TRUE' || crossValidated === true) {
        patterns.validatedPatterns++;
      }
    });
    
    patterns.averageConfidence = data.length > 0 ? totalConfidence / data.length : 0;
    patterns.successRate = totalAttempts > 0 ? totalSuccess / totalAttempts : 0;
  }
  
  return patterns;
}

function _analyzeDiagnosticHubPatterns(sheet, lastRow) {
  const patterns = {
    severityDistribution: {},
    componentHealth: {},
    systemHealth: 'UNKNOWN',
    resolutionRate: 0
  };
  
  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, Math.min(lastRow - 1, 50), 10).getValues();
    
    let resolvedCount = 0;
    
    data.forEach(row => {
      const [timestamp, diagnosticType, severity, component, message, 
             context, patterns, confidence, resolution, crossReference] = row;
      
      // Track severity
      patterns.severityDistribution[severity] = (patterns.severityDistribution[severity] || 0) + 1;
      
      // Track component health
      if (!patterns.componentHealth[component]) {
        patterns.componentHealth[component] = { issues: 0, resolved: 0 };
      }
      patterns.componentHealth[component].issues++;
      
      if (resolution === 'RESOLVED') {
        resolvedCount++;
        patterns.componentHealth[component].resolved++;
      }
    });
    
    patterns.resolutionRate = data.length > 0 ? resolvedCount / data.length : 0;
    
    // Determine system health
    const criticalCount = patterns.severityDistribution['CRITICAL'] || 0;
    const highCount = patterns.severityDistribution['HIGH'] || 0;
    
    if (criticalCount === 0 && highCount < 3) {
      patterns.systemHealth = 'HEALTHY';
    } else if (criticalCount < 2 && highCount < 10) {
      patterns.systemHealth = 'STABLE';
    } else if (criticalCount < 5) {
      patterns.systemHealth = 'DEGRADED';
    } else {
      patterns.systemHealth = 'CRITICAL';
    }
  }
  
  return patterns;
}

function _assessDataQuality(sampleData, headers) {
  const quality = {
    completeness: 0,
    consistency: 0,
    duplicates: 0
  };
  
  if (sampleData.length === 0) return quality;
  
  let totalCells = 0;
  let nonEmptyCells = 0;
  const seenRows = new Set();
  
  sampleData.forEach(row => {
    const rowString = row.join('|');
    if (seenRows.has(rowString)) {
      quality.duplicates++;
    } else {
      seenRows.add(rowString);
    }
    
    row.forEach(cell => {
      totalCells++;
      if (cell !== null && cell !== undefined && cell !== '') {
        nonEmptyCells++;
      }
    });
  });
  
  quality.completeness = totalCells > 0 ? nonEmptyCells / totalCells : 0;
  quality.consistency = sampleData.length > 0 ? (sampleData.length - quality.duplicates) / sampleData.length : 0;
  
  return quality;
}

function _generateConsolidatedInsights(analysis) {
  const insights = {
    systemHealth: 'UNKNOWN',
    criticalIssueCount: 0,
    overallSuccessRate: 0,
    recommendations: [],
    detailedFindings: {}
  };
  
  // Determine overall system health
  if (analysis['Diagnostic_Hub']) {
    insights.systemHealth = analysis['Diagnostic_Hub'].patterns.systemHealth;
  } else {
    // Fallback calculation
    const auditErrorRate = analysis['AuditLog']?.patterns?.recentErrorRate || 0;
    const parsingFailures = analysis['Failed_Parsing']?.rows || 0;
    
    if (auditErrorRate < 0.1 && parsingFailures < 20) {
      insights.systemHealth = 'HEALTHY';
    } else if (auditErrorRate < 0.3 && parsingFailures < 100) {
      insights.systemHealth = 'STABLE';
    } else {
      insights.systemHealth = 'CRITICAL';
    }
  }
  
  // Count critical issues
  if (analysis['Failed_Parsing']) {
    const failedParsing = analysis['Failed_Parsing'];
    insights.criticalIssueCount += failedParsing.rows - 1; // Exclude header
  }
  
  if (analysis['AuditLog']) {
    insights.criticalIssueCount += analysis['AuditLog'].patterns.errorCount;
  }
  
  // Calculate success rate
  const learningSuccess = analysis['Learning_Hub']?.patterns?.successRate || 0;
  const parsingSuccess = 1 - (analysis['Failed_Parsing']?.patterns?.resolutionRate || 0);
  insights.overallSuccessRate = (learningSuccess + parsingSuccess) / 2;
  
  // Generate recommendations
  if (insights.systemHealth === 'CRITICAL') {
    insights.recommendations.push('URGENT: Address critical system errors immediately');
  }
  
  if (analysis['Failed_Parsing']?.patterns?.uniqueDomains > 5) {
    insights.recommendations.push('Review and enhance email parsing for multiple domains');
  }
  
  if (analysis['Learning_Hub']?.patterns?.averageConfidence < 0.7) {
    insights.recommendations.push('Improve learning pattern confidence through validation');
  }
  
  insights.detailedFindings = analysis;
  
  return insights;
}

// Enhanced integration functions
function runUnifiedAnalysis() {
  console.log('Starting unified diagnostic analysis...\n');
  
  const spreadsheetAnalysis = analyzeCurrentSpreadsheet();
  
  if (spreadsheetAnalysis) {
    console.log('\n=== UNIFIED ANALYSIS COMPLETE ===');
    console.log('Use the detailed findings above to:');
    console.log('1. Address critical system issues');
    console.log('2. Improve parsing success rates');
    console.log('3. Enhance learning pattern accuracy');
    console.log('4. Monitor system health trends');
    
    return spreadsheetAnalysis;
  }
  
  return null;
}

function exportAnalysisForExcel() {
  const analysis = runUnifiedAnalysis();
  
  if (analysis) {
    const exportData = {
      timestamp: new Date().toISOString(),
      insights: analysis.insights,
      criticalMetrics: {
        systemHealth: analysis.insights.systemHealth,
        errorCount: analysis.insights.criticalIssueCount,
        successRate: Math.round(analysis.insights.overallSuccessRate * 100) + '%'
      },
      recommendations: analysis.insights.recommendations
    };
    
    console.log('\n=== EXCEL EXPORT DATA ===');
    console.log(JSON.stringify(exportData, null, 2));
    
    return exportData;
  }
  
  return null;
}

function analyzeTransactionPatterns() {
  const SPREADSHEET_ID = '1-eUeYMTeKoz2bIkHS8Jc2J9vO0Bnl8y6aHXmXGdJqg8';
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const txSheet = ss.getSheetByName('Transactions');
    
    if (!txSheet) {
      console.log('No Transactions sheet found');
      return;
    }
    
    const lastRow = txSheet.getLastRow();
    if (lastRow < 2) {
      console.log('No transaction data found');
      return;
    }
    
    // Analyze recent transactions (last 20)
    const startRow = Math.max(2, lastRow - 19);
    const numRows = lastRow - startRow + 1;
    const data = txSheet.getRange(startRow, 1, numRows, txSheet.getLastColumn()).getValues();
    
    console.log('\n=== RECENT TRANSACTIONS ANALYSIS ===');
    console.log(`Analyzing ${numRows} recent transactions:`);
    
    const patterns = {
      banks: new Set(),
      categories: new Set(),
      types: new Set(),
      amountRanges: { positive: 0, negative: 0, zero: 0 }
    };
    
    data.forEach((row, index) => {
      const actualRow = startRow + index;
      const [date, amount, from, to, bank, notes, emailId, category, type] = row;
      
      if (bank) patterns.banks.add(bank);
      if (category) patterns.categories.add(category);
      if (type) patterns.types.add(type);
      
      const numAmount = parseFloat(amount) || 0;
      if (numAmount > 0) patterns.amountRanges.positive++;
      else if (numAmount < 0) patterns.amountRanges.negative++;
      else patterns.amountRanges.zero++;
      
      console.log(`Row ${actualRow}: ${date} | ${amount} | ${from} → ${to} | ${bank} | ${category}`);
    });
    
    console.log('\n=== PATTERNS FOUND ===');
    console.log('Banks:', Array.from(patterns.banks));
    console.log('Categories:', Array.from(patterns.categories));
    console.log('Types:', Array.from(patterns.types));
    console.log('Amount Distribution:', patterns.amountRanges);
    
  } catch (error) {
    console.error('Error analyzing transactions:', error);
  }
}

function analyzeAccountsAndHoldings() {
  const SPREADSHEET_ID = '1-eUeYMTeKoz2bIkHS8Jc2J9vO0Bnl8y6aHXmXGdJqg8';
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Analyze Accounts
    const accountsSheet = ss.getSheetByName('Accounts');
    if (accountsSheet && accountsSheet.getLastRow() > 1) {
      console.log('\n=== ACCOUNTS ANALYSIS ===');
      const accountData = accountsSheet.getRange(2, 1, accountsSheet.getLastRow() - 1, accountsSheet.getLastColumn()).getValues();
      
      accountData.forEach(row => {
        const [name, balance, lastUpdated, type] = row;
        console.log(`${name}: $${balance} (${type}) - Updated: ${lastUpdated}`);
      });
    }
    
    // Analyze Holdings
    const holdingsSheet = ss.getSheetByName('Holdings');
    if (holdingsSheet && holdingsSheet.getLastRow() > 1) {
      console.log('\n=== HOLDINGS ANALYSIS ===');
      const holdingsData = holdingsSheet.getRange(2, 1, holdingsSheet.getLastRow() - 1, holdingsSheet.getLastColumn()).getValues();
      
      holdingsData.forEach(row => {
        const [account, ticker, shares, unitPrice, totalValue, lastUpdated] = row;
        console.log(`${account}: ${shares} × ${ticker} @ $${unitPrice} = $${totalValue}`);
      });
    }
    
  } catch (error) {
    console.error('Error analyzing accounts/holdings:', error);
  }
}

// Run all analyses
function runFullAnalysis() {
  console.log('Starting comprehensive spreadsheet analysis...\n');
  
  analyzeCurrentSpreadsheet();
  analyzeTransactionPatterns();
  analyzeAccountsAndHoldings();
  
  console.log('\nAnalysis complete! Check the logs above for detailed structure information.');
}
