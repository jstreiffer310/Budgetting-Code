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
   * Analyze the finance automation results - UPDATED FOR STREAMLINED SYSTEM
   */
  analyzeFinanceData() {
    const analysis = {
      summary: {},
      sheets: {},
      insights: [],
      streamlinedSystemDetected: false
    };

    // Check if this is the new streamlined system
    if (this.sheets['System_Analysis'] || this.sheets['Excel_Analyzer_Output']) {
      analysis.streamlinedSystemDetected = true;
      console.log('🎯 Detected new streamlined analysis system');
    }

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
      } else if (sheetName === 'System_Analysis') {
        // NEW: Analyze the unified system analysis sheet
        sheetAnalysis.systemAnalysis = this.analyzeSystemEvents(data);
      } else if (sheetName === 'Excel_Analyzer_Output') {
        // NEW: Analyze the clean Excel output
        sheetAnalysis.excelOutputAnalysis = this.analyzeExcelOutput(data);
      } else if (sheetName.toLowerCase().includes('learning') || sheetName.toLowerCase().includes('ai')) {
        // LEGACY: Keep for backward compatibility but mark as legacy
        sheetAnalysis.learningAnalysis = this.analyzeLearningData(data);
        if (analysis.streamlinedSystemDetected) {
          sheetAnalysis.learningAnalysis.isLegacy = true;
        }
      } else if (sheetName.toLowerCase().includes('account')) {
        sheetAnalysis.accountAnalysis = this.analyzeAccounts(data);
      } else if (sheetName.toLowerCase().includes('audit')) {
        // LEGACY: Mark as deprecated
        sheetAnalysis.legacyAuditLog = this.analyzeLegacyAuditLog(data);
      } else if (sheetName.toLowerCase().includes('failed')) {
        // LEGACY: Mark as deprecated
        sheetAnalysis.legacyFailedParsing = this.analyzeLegacyFailedParsing(data);
      }

      analysis.sheets[sheetName] = sheetAnalysis;
    }

    // Generate insights based on analysis
    analysis.insights = this.generateStreamlinedInsights(analysis.sheets, analysis.streamlinedSystemDetected);

    return analysis;
  }

  /**
   * NEW: Analyze the unified System_Analysis sheet
   */
  analyzeSystemEvents(data) {
    if (!data || data.length < 2) return null;

    const headers = data[0] || [];
    const rows = data.slice(1);
    
    const analysis = {
      totalEvents: rows.length,
      eventTypes: {},
      systemHealth: 'Unknown',
      criticalIssues: [],
      actionItems: []
    };

    // Find relevant columns
    const timestampCol = headers.findIndex(h => h && h.toLowerCase().includes('timestamp'));
    const typeCol = headers.findIndex(h => h && (h.toLowerCase().includes('type') || h.toLowerCase().includes('level')));
    const messageCol = headers.findIndex(h => h && h.toLowerCase().includes('message'));
    const statusCol = headers.findIndex(h => h && h.toLowerCase().includes('status'));

    rows.forEach(row => {
      // Count event types
      const eventType = row[typeCol] || 'UNKNOWN';
      analysis.eventTypes[eventType] = (analysis.eventTypes[eventType] || 0) + 1;

      // Check for critical issues
      if (eventType === 'ERROR' || eventType === 'CRITICAL') {
        analysis.criticalIssues.push({
          message: row[messageCol] || 'Unknown error',
          timestamp: row[timestampCol] || 'Unknown time'
        });
      }

      // Check for action items
      const message = row[messageCol] || '';
      if (message.toLowerCase().includes('action required') || 
          message.toLowerCase().includes('needs attention') ||
          message.toLowerCase().includes('manual review')) {
        analysis.actionItems.push({
          action: 'MANUAL_REVIEW',
          message: message,
          timestamp: row[timestampCol] || 'Unknown time'
        });
      }
    });

    // Determine system health
    const errorCount = analysis.eventTypes['ERROR'] || 0;
    const criticalCount = analysis.eventTypes['CRITICAL'] || 0;
    const warningCount = analysis.eventTypes['WARNING'] || 0;

    if (criticalCount > 0 || errorCount > 5) {
      analysis.systemHealth = 'CRITICAL';
    } else if (errorCount > 0 || warningCount > 10) {
      analysis.systemHealth = 'WARNING';
    } else {
      analysis.systemHealth = 'HEALTHY';
    }

    return analysis;
  }

  /**
   * NEW: Analyze the Excel_Analyzer_Output sheet
   */
  analyzeExcelOutput(data) {
    if (!data || data.length < 2) return null;

    const headers = data[0] || [];
    const rows = data.slice(1);
    
    const analysis = {
      totalRows: rows.length,
      metrics: {},
      overallStatus: 'Unknown',
      actionItems: []
    };

    // Find metric and value columns
    const metricCol = headers.findIndex(h => h && h.toLowerCase().includes('metric'));
    const valueCol = headers.findIndex(h => h && h.toLowerCase().includes('value'));
    const statusCol = headers.findIndex(h => h && h.toLowerCase().includes('status'));

    rows.forEach(row => {
      const metric = row[metricCol] || 'Unknown';
      const value = row[valueCol] || 'N/A';
      const status = row[statusCol] || 'Unknown';

      analysis.metrics[metric] = {
        value: value,
        status: status
      };

      // Check for action items
      if (status === 'Poor' || status === 'Critical' || status === 'Failed') {
        analysis.actionItems.push({
          metric: metric,
          value: value,
          status: status,
          priority: status === 'Critical' ? 'HIGH' : 'MEDIUM'
        });
      }
    });

    // Determine overall status
    const statusCounts = Object.values(analysis.metrics).reduce((acc, metric) => {
      acc[metric.status] = (acc[metric.status] || 0) + 1;
      return acc;
    }, {});

    if (statusCounts['Critical'] > 0 || statusCounts['Failed'] > 0) {
      analysis.overallStatus = 'CRITICAL';
    } else if (statusCounts['Poor'] > 0 || statusCounts['Warning'] > 0) {
      analysis.overallStatus = 'WARNING';
    } else if (statusCounts['Good'] > 0 || statusCounts['Excellent'] > 0) {
      analysis.overallStatus = 'HEALTHY';
    }

    return analysis;
  }

  /**
   * LEGACY: Analyze deprecated audit log sheets
   */
  analyzeLegacyAuditLog(data) {
    return {
      totalEntries: data.length - 1,
      status: 'DEPRECATED',
      recommendation: 'Migrate to System_Analysis sheet for unified logging'
    };
  }

  /**
   * LEGACY: Analyze deprecated failed parsing sheets
   */
  analyzeLegacyFailedParsing(data) {
    return {
      totalFailures: data.length - 1,
      status: 'DEPRECATED',
      recommendation: 'Use System_Analysis sheet for error tracking'
    };
  }

  /**
   * Find the last updated date in the data
   */
  findLastUpdatedDate(data) {
    try {
      // Look for date patterns in the data
      for (let row of data) {
        for (let cell of row) {
          if (typeof cell === 'string' && /\d{1,2}\/\d{1,2}\/\d{4}/.test(cell)) {
            return cell;
          }
        }
      }
      return null;
    } catch (error) {
      return null;
    }
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
      dateRange: null,
      categories: [],
      accounts: []
    };

    // Find date column
    const dateColumnIndex = headers.findIndex(header => 
      header && header.toLowerCase().includes('date')
    );

    if (dateColumnIndex !== -1) {
      const dates = transactions
        .map(row => row[dateColumnIndex])
        .filter(date => date)
        .sort();
      
      if (dates.length > 0) {
        analysis.dateRange = {
          start: dates[0],
          end: dates[dates.length - 1],
          range: `${dates[0]} to ${dates[dates.length - 1]}`
        };
      }
    }

    // Find category column
    const categoryColumnIndex = headers.findIndex(header => 
      header && header.toLowerCase().includes('category')
    );

    if (categoryColumnIndex !== -1) {
      analysis.categories = [...new Set(
        transactions
          .map(row => row[categoryColumnIndex])
          .filter(cat => cat && cat.trim() !== '')
      )];
    }

    return analysis;
  }

  /**
   * Analyze category data
   */
  analyzeCategories(data) {
    if (data.length < 2) return null;

    return {
      totalCategories: data.length - 1,
      headers: data[0] || []
    };
  }

  /**
   * Analyze learning data - Updated for legacy detection
   */
  analyzeLearningData(data) {
    if (data.length < 2) return null;

    const analysis = {
      totalPatterns: data.length - 1,
      headers: data[0] || [],
      confidenceLevels: {}
    };

    // Check if this appears to be legacy learning data
    const headers = data[0] || [];
    if (headers.some(h => h && (h.includes('confidence') || h.includes('accuracy')))) {
      const confidenceCol = headers.findIndex(h => h && h.toLowerCase().includes('confidence'));
      if (confidenceCol !== -1) {
        const confidenceValues = data.slice(1)
          .map(row => parseFloat(row[confidenceCol]))
          .filter(val => !isNaN(val));
        
        analysis.confidenceLevels = {
          high: confidenceValues.filter(val => val > 0.8).length,
          medium: confidenceValues.filter(val => val > 0.5 && val <= 0.8).length,
          low: confidenceValues.filter(val => val <= 0.5).length
        };
      }
    }

    return analysis;
  }

  /**
   * Analyze account data
   */
  analyzeAccounts(data) {
    if (data.length < 2) return null;

    return {
      totalAccounts: data.length - 1,
      headers: data[0] || []
    };
  }

  /**
   * Generate insights with streamlined system awareness
   */
  generateStreamlinedInsights(sheets, isStreamlined) {
    const insights = [];

    // System type insight
    if (isStreamlined) {
      insights.push('🎯 Using streamlined analysis system - optimized performance');
      
      // System health insight
      const systemSheet = sheets['System_Analysis'];
      if (systemSheet && systemSheet.systemAnalysis) {
        const health = systemSheet.systemAnalysis.systemHealth;
        const healthIcon = health === 'HEALTHY' ? '✅' : health === 'WARNING' ? '⚠️' : '🚨';
        insights.push(`${healthIcon} System health: ${health}`);
        
        if (systemSheet.systemAnalysis.criticalIssues.length > 0) {
          insights.push(`🚨 ${systemSheet.systemAnalysis.criticalIssues.length} critical issues require attention`);
        }
      }

      // Excel output insight
      const outputSheet = sheets['Excel_Analyzer_Output'];
      if (outputSheet && outputSheet.excelOutputAnalysis) {
        const status = outputSheet.excelOutputAnalysis.overallStatus;
        const statusIcon = status === 'HEALTHY' ? '✅' : status === 'WARNING' ? '⚠️' : '🚨';
        insights.push(`${statusIcon} Excel integration status: ${status}`);
      }
    } else {
      insights.push('📊 Using legacy analysis system - consider upgrading to streamlined approach');
    }

    // Transaction insights
    const transactionSheets = Object.values(sheets).filter(s => s.transactionAnalysis);
    if (transactionSheets.length > 0) {
      const totalTransactions = transactionSheets.reduce((sum, sheet) => 
        sum + sheet.transactionAnalysis.totalTransactions, 0);
      insights.push(`💰 ${totalTransactions} transactions processed across ${transactionSheets.length} sheet(s)`);
    }

    // Category insights
    const categorySheets = Object.values(sheets).filter(s => s.categoryAnalysis);
    if (categorySheets.length > 0) {
      insights.push(`📊 ${categorySheets[0].categoryAnalysis.totalCategories} categories configured`);
    }

    // Check for duplicate/conflicting analysis systems
    const hasLegacyLearning = Object.values(sheets).some(s => s.learningAnalysis);
    const hasSystemAnalysis = Object.values(sheets).some(s => s.systemAnalysis);
    
    if (hasLegacyLearning && hasSystemAnalysis) {
      insights.push(`🔄 Both legacy and streamlined systems detected - migration recommended`);
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
   * Generate readable report - UPDATED FOR STREAMLINED SYSTEM
   */
  generateReport(analysis) {
    let report = `
# Finance Automation Analysis Report
Generated: ${new Date().toLocaleString()}

## System Type
`;

    // System type detection
    if (analysis.streamlinedSystemDetected) {
      report += `🎯 **STREAMLINED ANALYSIS SYSTEM DETECTED**\n\n`;
      report += `This system uses the new unified approach with:\n`;
      report += `- System_Analysis: Unified event logging\n`;
      report += `- Excel_Analyzer_Output: Clean summary data\n`;
    } else {
      report += `📊 **LEGACY SYSTEM DETECTED**\n\n`;
      report += `⚠️ Consider upgrading to the streamlined analysis system for better performance and maintenance.\n`;
    }

    report += `\n## Summary\n`;

    // Add insights
    if (analysis.insights.length > 0) {
      report += '\n### Key Insights\n';
      analysis.insights.forEach(insight => {
        report += `- ${insight}\n`;
      });
    }

    // Special streamlined system summary
    if (analysis.streamlinedSystemDetected) {
      report += `\n### Streamlined System Status\n`;
      
      const systemSheet = analysis.sheets['System_Analysis'];
      if (systemSheet && systemSheet.systemAnalysis) {
        const sa = systemSheet.systemAnalysis;
        report += `- System Health: **${sa.systemHealth}**\n`;
        report += `- Total Events: ${sa.totalEvents}\n`;
        report += `- Critical Issues: ${sa.criticalIssues.length}\n`;
        
        if (sa.actionItems.length > 0) {
          report += `\n#### ⚡ Action Items Required:\n`;
          sa.actionItems.forEach(item => {
            report += `- ${item.action}: ${item.message}\n`;
          });
        }
      }

      const outputSheet = analysis.sheets['Excel_Analyzer_Output'];
      if (outputSheet && outputSheet.excelOutputAnalysis) {
        const ea = outputSheet.excelOutputAnalysis;
        report += `\n#### 📈 Excel Integration Metrics:\n`;
        
        Object.entries(ea.metrics).forEach(([metric, data]) => {
          const status = data.status === 'Good' ? '✅' : data.status === 'Review' ? '⚠️' : '❌';
          report += `- ${metric}: ${data.value} ${status}\n`;
        });
      }
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

      // Streamlined system analysis
      if (sheet.systemAnalysis) {
        const sa = sheet.systemAnalysis;
        report += `\n**🎯 STREAMLINED SYSTEM ANALYSIS:**\n`;
        report += `- Events: ${sa.totalEvents}\n`;
        report += `- System Health: ${sa.systemHealth}\n`;
        report += `- Critical Issues: ${sa.criticalIssues.length}\n`;
        
        if (Object.keys(sa.eventTypes).length > 0) {
          report += `- Event Breakdown:\n`;
          Object.entries(sa.eventTypes).forEach(([type, count]) => {
            const icon = type === 'ERROR' ? '❌' : type === 'WARNING' ? '⚠️' : type === 'LEARNING' ? '🧠' : '📝';
            report += `  - ${icon} ${type}: ${count}\n`;
          });
        }
      }

      if (sheet.excelOutputAnalysis) {
        const ea = sheet.excelOutputAnalysis;
        report += `\n**📈 EXCEL INTEGRATION ANALYSIS:**\n`;
        report += `- Overall Status: ${ea.overallStatus}\n`;
        report += `- Metrics: ${Object.keys(ea.metrics).length}\n`;
        report += `- Action Items: ${ea.actionItems.length}\n`;
      }

      // Legacy system warnings
      if (sheet.legacyAuditLog) {
        report += `\n**⚠️ LEGACY AUDIT LOG DETECTED:**\n`;
        report += `- Entries: ${sheet.legacyAuditLog.totalEntries}\n`;
        report += `- Status: DEPRECATED - ${sheet.legacyAuditLog.recommendation}\n`;
      }

      if (sheet.legacyFailedParsing) {
        report += `\n**⚠️ LEGACY FAILED PARSING DETECTED:**\n`;
        report += `- Failures: ${sheet.legacyFailedParsing.totalFailures}\n`;
        report += `- Status: DEPRECATED - ${sheet.legacyFailedParsing.recommendation}\n`;
      }

      // Standard analysis
      if (sheet.transactionAnalysis) {
        const ta = sheet.transactionAnalysis;
        report += `- Total Transactions: ${ta.totalTransactions}\n`;
        if (ta.dateRange) {
          report += `- Date Range: ${ta.dateRange.range}\n`;
        }
        if (ta.categories && ta.categories.length > 0) {
          report += `- Categories: ${ta.categories.length} unique (${ta.categories.slice(0, 5).join(', ')}${ta.categories.length > 5 ? '...' : ''})\n`;
        }
      }

      if (sheet.learningAnalysis) {
        const la = sheet.learningAnalysis;
        if (la.isLegacy) {
          report += `\n**⚠️ LEGACY LEARNING ANALYSIS:**\n`;
          report += `- Consider migration to streamlined system\n`;
        }
        report += `- Learning Patterns: ${la.totalPatterns}\n`;
        if (la.confidenceLevels) {
          report += `- High Confidence Patterns: ${la.confidenceLevels.high || 'N/A'}\n`;
        }
      }
    }

    // Migration recommendations
    if (analysis.streamlinedSystemDetected) {
      const legacySheets = Object.keys(analysis.sheets).filter(name => 
        analysis.sheets[name].legacyAuditLog || 
        analysis.sheets[name].legacyFailedParsing ||
        (analysis.sheets[name].learningAnalysis && analysis.sheets[name].learningAnalysis.isLegacy)
      );
      
      if (legacySheets.length > 0) {
        report += `\n## 🔄 Migration Recommendations\n\n`;
        report += `The following legacy sheets were detected and should be cleaned up:\n`;
        legacySheets.forEach(sheetName => {
          report += `- ${sheetName}\n`;
        });
        report += `\n**Action:** Run \`cleanupLegacyAnalysisSheets()\` in Google Apps Script to remove deprecated sheets.\n`;
      } else {
        report += `\n## ✅ System Status\n\n`;
        report += `Your system is fully migrated to the streamlined analysis approach. No legacy cleanup needed.\n`;
      }
    } else {
      report += `\n## 🚀 Upgrade Recommendation\n\n`;
      report += `This system appears to be using the legacy analysis structure. Consider upgrading to the new streamlined system for:\n\n`;
      report += `✅ **Better Performance:** Fewer sheet operations, improved efficiency\n`;
      report += `✅ **Cleaner Data Flow:** Single source of truth for all events\n`;
      report += `✅ **Improved Excel Integration:** Standardized output format\n`;
      report += `✅ **Easier Maintenance:** Simplified debugging and troubleshooting\n`;
      report += `✅ **Reduced Complexity:** 2 focused sheets instead of 7+ overlapping ones\n\n`;
      report += `**Action:** Run \`migrateToStreamlinedSystem()\` in Google Apps Script to upgrade.\n`;
    }

    return report;
  }

  /**
   * AUTOMATED FILE MANAGEMENT SYSTEM
   * Systematically manages output files after each analysis to prevent clutter
   */

  /**
   * Get configuration for file management
   */
  getFileManagementConfig() {
    return {
      // Output files that should be kept from current run
      keepCurrentFiles: [
        'finance-analysis.json',
        'finance-report.md'
      ],
      
      // Temporary/intermediate files to always clean up
      alwaysCleanup: [
        'temp-analysis.json',
        'processing-log.txt',
        'debug-output.json',
        'raw-data-dump.json'
      ],
      
      // Old output files to archive before creating new ones
      archivePattern: [
        'finance-analysis-*.json',
        'finance-report-*.md',
        'integrated-analysis*.json',
        'integrated-report*.md',
        'troubleshooting-*.json',
        'processed-transactions*.json'
      ],
      
      // File age thresholds (in days)
      maxAge: {
        currentOutputs: 7,     // Keep current outputs for 1 week
        archivedFiles: 30,     // Keep archived files for 1 month
        tempFiles: 1           // Clean temp files after 1 day
      },
      
      // Archive directory structure
      archiveDir: './archive',
      tempDir: './temp'
    };
  }

  /**
   * Pre-analysis cleanup: Prepare workspace for new analysis
   */
  async preAnalysisCleanup() {
    const config = this.getFileManagementConfig();
    
    console.log('🧹 Pre-analysis cleanup...');
    
    try {
      // Archive existing output files
      await this.archiveOldOutputs(config);
      
      // Clean temporary files
      await this.cleanTempFiles(config);
      
      // Ensure directories exist
      await this.ensureDirectories(config);
      
      console.log('✅ Workspace prepared for analysis');
      
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error.message);
    }
  }

  /**
   * Post-analysis cleanup: Organize files after analysis completes
   */
  async postAnalysisCleanup() {
    const config = this.getFileManagementConfig();
    
    console.log('\n🗂️ Post-analysis file management...');
    
    try {
      // Clean up any temporary processing files
      await this.cleanTempFiles(config);
      
      // Organize output files with timestamps
      await this.timestampOutputFiles(config);
      
      // Clean old archived files
      await this.cleanOldArchives(config);
      
      // Generate cleanup summary
      this.generateCleanupSummary();
      
      console.log('✅ File management complete');
      
    } catch (error) {
      console.warn('⚠️ Post-cleanup warning:', error.message);
    }
  }

  /**
   * Archive old output files before creating new ones
   */
  async archiveOldOutputs(config) {
    if (!fs.existsSync(config.archiveDir)) {
      fs.mkdirSync(config.archiveDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    
    for (const keepFile of config.keepCurrentFiles) {
      if (fs.existsSync(keepFile)) {
        const archiveName = `${path.parse(keepFile).name}-${timestamp}${path.parse(keepFile).ext}`;
        const archivePath = path.join(config.archiveDir, archiveName);
        
        try {
          fs.copyFileSync(keepFile, archivePath);
          console.log(`📦 Archived: ${keepFile} → ${archiveName}`);
        } catch (error) {
          console.warn(`⚠️ Could not archive ${keepFile}:`, error.message);
        }
      }
    }
  }

  /**
   * Clean temporary and processing files
   */
  async cleanTempFiles(config) {
    const filesToCheck = [
      ...config.alwaysCleanup,
      'node_modules/.cache/**/*',
      'debug-*.json',
      'temp-*.json',
      'processing-*.log'
    ];

    for (const pattern of filesToCheck) {
      try {
        if (fs.existsSync(pattern)) {
          fs.unlinkSync(pattern);
          console.log(`🗑️ Cleaned: ${pattern}`);
        }
      } catch (error) {
        // Silently continue - temp files may not exist
      }
    }
  }

  /**
   * Add timestamps to current output files
   */
  async timestampOutputFiles(config) {
    // This helps track when analysis was performed without cluttering workspace
    const timestamp = new Date().toISOString();
    
    for (const outputFile of config.keepCurrentFiles) {
      if (fs.existsSync(outputFile)) {
        try {
          const content = fs.readFileSync(outputFile, 'utf8');
          let updatedContent;
          
          if (outputFile.endsWith('.json')) {
            const data = JSON.parse(content);
            data.analysisMetadata = {
              timestamp: timestamp,
              version: '1.0',
              cleanupSystemEnabled: true
            };
            updatedContent = JSON.stringify(data, null, 2);
          } else if (outputFile.endsWith('.md')) {
            updatedContent = content.replace(
              'Generated: ', 
              `Generated: ${new Date().toLocaleString()} | Cleanup System: ✅ Active\nLast Updated: `
            );
          } else {
            updatedContent = content;
          }
          
          fs.writeFileSync(outputFile, updatedContent);
          
        } catch (error) {
          console.warn(`⚠️ Could not timestamp ${outputFile}:`, error.message);
        }
      }
    }
  }

  /**
   * Clean old archived files based on age
   */
  async cleanOldArchives(config) {
    if (!fs.existsSync(config.archiveDir)) return;

    const now = Date.now();
    const maxAge = config.maxAge.archivedFiles * 24 * 60 * 60 * 1000; // Convert days to ms
    
    try {
      const files = fs.readdirSync(config.archiveDir);
      let cleanedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(config.archiveDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🗑️ Cleaned ${cleanedCount} old archived file(s)`);
      }
      
    } catch (error) {
      console.warn('⚠️ Could not clean old archives:', error.message);
    }
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectories(config) {
    const dirs = [config.archiveDir, config.tempDir];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Generate summary of cleanup operations
   */
  generateCleanupSummary() {
    const config = this.getFileManagementConfig();
    
    const summary = {
      timestamp: new Date().toISOString(),
      status: 'complete',
      currentFiles: config.keepCurrentFiles.filter(f => fs.existsSync(f)),
      archiveExists: fs.existsSync(config.archiveDir),
      cleanupEnabled: true
    };
    
    // Save compact summary (this gets cleaned up next run)
    fs.writeFileSync('./.last-cleanup.json', JSON.stringify(summary, null, 2));
  }

  /**
   * Smart analysis with automatic file management
   */
  async runManagedAnalysis(filePath = null) {
    console.log('🎯 Starting managed analysis with automatic file cleanup...\n');
    
    // Pre-analysis cleanup
    await this.preAnalysisCleanup();
    
    try {
      // Run the actual analysis
      let analysisResult;
      
      if (filePath) {
        // Specific file provided
        if (this.loadExcel(filePath)) {
          analysisResult = this.analyzeFinanceData();
          
          // Export with file management
          this.exportAnalysis(analysisResult);
          const report = this.generateReport(analysisResult);
          fs.writeFileSync('./finance-report.md', report);
        }
      } else {
        // Auto-detect Excel files (existing logic)
        const files = fs.readdirSync('.');
        const excelFiles = files.filter(file => 
          file.endsWith('.xlsx') || file.endsWith('.xls') || file.endsWith('.csv')
        );

        if (excelFiles.length === 0) {
          console.log('📁 No Excel files found in current directory.');
          return null;
        }

        const excelFile = excelFiles[0];
        console.log(`📊 Processing: ${excelFile}`);
        
        if (this.loadExcel(excelFile)) {
          analysisResult = this.analyzeFinanceData();
          
          // Export with file management
          this.exportAnalysis(analysisResult);
          const report = this.generateReport(analysisResult);
          fs.writeFileSync('./finance-report.md', report);
        }
      }
      
      // Post-analysis cleanup
      await this.postAnalysisCleanup();
      
      // Show final summary
      if (analysisResult) {
        console.log('\n📊 Analysis Summary:');
        analysisResult.insights.forEach(insight => console.log(`   ${insight}`));
        
        console.log('\n📁 Output Files (managed):');
        console.log('   ✅ finance-analysis.json (current analysis)');
        console.log('   ✅ finance-report.md (readable report)');
        console.log('   📦 Previous outputs archived automatically');
        console.log('   🗑️ Temporary files cleaned up');
      }
      
      return analysisResult;
      
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      
      // Still run cleanup even if analysis fails
      await this.postAnalysisCleanup();
      throw error;
    }
  }
}

// Enhanced main execution with file management
async function main() {
  const analyzer = new ExcelAnalyzer();
  
  try {
    // Use the new managed analysis system
    const analysis = await analyzer.runManagedAnalysis();
    
    if (analysis) {
      console.log('\n🎉 Analysis completed successfully with automatic file management!');
      console.log('\n💡 File Management Benefits:');
      console.log('   📦 Previous outputs automatically archived');
      console.log('   �️ Temporary files cleaned up');
      console.log('   📅 Current outputs timestamped');
      console.log('   � Old archives automatically removed');
      console.log('\n📋 Next Steps:');
      console.log('   - Review finance-report.md for insights');
      console.log('   - Check archive/ folder for historical data');
      console.log('   - Run again anytime - cleanup is automatic!');
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.log('\n� File cleanup still completed automatically');
  }
}

// Export for use as module
module.exports = ExcelAnalyzer;

// Run main function if called directly
if (require.main === module) {
  main().catch(console.error);
}
