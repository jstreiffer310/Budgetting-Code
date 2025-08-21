#!/usr/bin/env node

/**
 * 🔍 QUICK EXCEL ANALYZER
 * Easy-to-use interface for analyzing Excel files from Downloads folder
 * Integrates with unified diagnostic system for financial intelligence
 */

const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const DOWNLOADS_PATH = path.join(require('os').homedir(), 'Downloads');
const SUPPORTED_EXTENSIONS = ['.xlsx', '.xls'];

class QuickExcelAnalyzer {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run() {
    try {
      console.log('🔍 QUICK EXCEL ANALYZER - Financial Intelligence Tool');
      console.log('=' .repeat(60));
      
      // Find Excel files in Downloads
      const excelFiles = this.findExcelFiles();
      
      if (excelFiles.length === 0) {
        console.log('❌ No Excel files found in Downloads folder');
        this.rl.close();
        return;
      }
      
      // Show file selection menu
      const selectedFile = await this.selectFile(excelFiles);
      
      if (!selectedFile) {
        console.log('👋 Analysis cancelled');
        this.rl.close();
        return;
      }
      
      // Analyze the selected file
      await this.analyzeFile(selectedFile);
      
      this.rl.close();
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      this.rl.close();
    }
  }

  findExcelFiles() {
    try {
      const files = fs.readdirSync(DOWNLOADS_PATH);
      return files
        .filter(file => SUPPORTED_EXTENSIONS.some(ext => file.toLowerCase().endsWith(ext)))
        .map(file => ({
          name: file,
          path: path.join(DOWNLOADS_PATH, file),
          size: this.getFileSize(path.join(DOWNLOADS_PATH, file)),
          modified: this.getFileModified(path.join(DOWNLOADS_PATH, file))
        }))
        .sort((a, b) => b.modified - a.modified); // Sort by most recent first
    } catch (error) {
      console.error('Error reading Downloads folder:', error.message);
      return [];
    }
  }

  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(1);
      return `${sizeInMB}MB`;
    } catch {
      return 'Unknown';
    }
  }

  getFileModified(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.mtime;
    } catch {
      return new Date(0);
    }
  }

  async selectFile(files) {
    console.log('\n📁 Excel files found in Downloads:');
    console.log('-'.repeat(80));
    
    files.forEach((file, index) => {
      const modifiedDate = file.modified.toLocaleDateString();
      const modifiedTime = file.modified.toLocaleTimeString();
      console.log(`${index + 1}. ${file.name}`);
      console.log(`   📅 ${modifiedDate} ${modifiedTime} | 📏 ${file.size}`);
      console.log('');
    });
    
    return new Promise((resolve) => {
      this.rl.question(`\n🎯 Select file (1-${files.length}) or 'q' to quit: `, (answer) => {
        if (answer.toLowerCase() === 'q') {
          resolve(null);
          return;
        }
        
        const selection = parseInt(answer);
        if (selection >= 1 && selection <= files.length) {
          resolve(files[selection - 1]);
        } else {
          console.log('❌ Invalid selection');
          resolve(null);
        }
      });
    });
  }

  async analyzeFile(file) {
    console.log(`\n🔍 Analyzing: ${file.name}`);
    console.log('=' .repeat(60));
    
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(file.path);
      
      const analysis = {
        fileName: file.name,
        fileSize: file.size,
        totalSheets: workbook.worksheets.length,
        diagnosticSheets: [],
        dataSheets: [],
        financialIntelligence: {}
      };
      
      // Analyze each worksheet
      console.log(`📊 Found ${workbook.worksheets.length} worksheets:\n`);
      
      workbook.worksheets.forEach((worksheet, index) => {
        const sheetAnalysis = this.analyzeWorksheet(worksheet);
        
        if (this.isDiagnosticSheet(worksheet.name)) {
          analysis.diagnosticSheets.push(sheetAnalysis);
        } else {
          analysis.dataSheets.push(sheetAnalysis);
        }
        
        this.displaySheetSummary(sheetAnalysis, index + 1);
      });
      
      // Generate financial intelligence insights
      analysis.financialIntelligence = this.generateFinancialInsights(analysis);
      
      // Display consolidated insights
      this.displayConsolidatedInsights(analysis);
      
      // Ask if user wants detailed analysis
      await this.offerDetailedAnalysis(analysis);
      
    } catch (error) {
      console.error('❌ Failed to analyze file:', error.message);
    }
  }

  analyzeWorksheet(worksheet) {
    const analysis = {
      name: worksheet.name,
      rowCount: worksheet.rowCount,
      columnCount: worksheet.columnCount,
      headers: [],
      dataTypes: {},
      patterns: {},
      isEmpty: worksheet.rowCount <= 1
    };
    
    if (!analysis.isEmpty) {
      // Get headers
      const headerRow = worksheet.getRow(1);
      for (let col = 1; col <= worksheet.columnCount; col++) {
        const cell = headerRow.getCell(col);
        if (cell.value) {
          analysis.headers.push(cell.value.toString());
        }
      }
      
      // Analyze data patterns for diagnostic sheets
      if (this.isDiagnosticSheet(worksheet.name)) {
        analysis.patterns = this.analyzeDiagnosticPatterns(worksheet);
      }
    }
    
    return analysis;
  }

  isDiagnosticSheet(sheetName) {
    const diagnosticNames = [
      'failed_parsing', 'auditlog', 'learning_hub', 'diagnostic_hub',
      'error', 'audit', 'failed', 'parsing', 'learning', 'diagnostic'
    ];
    
    const lowerName = sheetName.toLowerCase();
    return diagnosticNames.some(diagnostic => lowerName.includes(diagnostic));
  }

  analyzeDiagnosticPatterns(worksheet) {
    const patterns = {
      errorCount: 0,
      successCount: 0,
      domains: new Set(),
      errorTypes: {},
      timeRange: { start: null, end: null }
    };
    
    try {
      // Sample first 100 rows for pattern analysis
      const maxRows = Math.min(worksheet.rowCount, 100);
      
      for (let row = 2; row <= maxRows; row++) {
        const rowData = [];
        for (let col = 1; col <= Math.min(worksheet.columnCount, 10); col++) {
          const cell = worksheet.getRow(row).getCell(col);
          rowData.push(cell.value);
        }
        
        // Analyze based on sheet type
        if (worksheet.name.toLowerCase().includes('failed')) {
          patterns.errorCount++;
          this.extractErrorPatterns(rowData, patterns);
        } else if (worksheet.name.toLowerCase().includes('audit')) {
          this.extractAuditPatterns(rowData, patterns);
        } else if (worksheet.name.toLowerCase().includes('learning')) {
          this.extractLearningPatterns(rowData, patterns);
        }
      }
      
      patterns.domains = patterns.domains.size;
      
    } catch (error) {
      console.warn(`Warning: Could not analyze patterns for ${worksheet.name}`);
    }
    
    return patterns;
  }

  extractErrorPatterns(rowData, patterns) {
    // Look for email domains in 'from' field (typically column 3)
    const fromField = rowData[2];
    if (fromField && typeof fromField === 'string') {
      const domainMatch = fromField.match(/@([^>]+)/);
      if (domainMatch) {
        patterns.domains.add(domainMatch[1].trim());
      }
    }
    
    // Look for error types in failure reason (typically column 6)
    const failureReason = rowData[5];
    if (failureReason && typeof failureReason === 'string') {
      const errorType = failureReason.split(':')[0] || 'Unknown';
      patterns.errorTypes[errorType] = (patterns.errorTypes[errorType] || 0) + 1;
    }
  }

  extractAuditPatterns(rowData, patterns) {
    // Look for error level (typically column 2)
    const level = rowData[1];
    if (level === 'ERROR') {
      patterns.errorCount++;
    } else if (level === 'SUCCESS' || level === 'INFO') {
      patterns.successCount++;
    }
  }

  extractLearningPatterns(rowData, patterns) {
    // Look for success/failure counts (typically columns 5-6)
    const successCount = parseInt(rowData[5]) || 0;
    const failureCount = parseInt(rowData[6]) || 0;
    
    patterns.successCount += successCount;
    patterns.errorCount += failureCount;
  }

  displaySheetSummary(analysis, index) {
    const icon = this.isDiagnosticSheet(analysis.name) ? '🔍' : '📊';
    const type = this.isDiagnosticSheet(analysis.name) ? 'Diagnostic' : 'Data';
    
    console.log(`${icon} Sheet ${index}: ${analysis.name} (${type})`);
    console.log(`   📏 ${analysis.rowCount} rows × ${analysis.columnCount} columns`);
    
    if (analysis.headers.length > 0) {
      const headerPreview = analysis.headers.slice(0, 4).join(', ');
      const moreHeaders = analysis.headers.length > 4 ? '...' : '';
      console.log(`   📋 Headers: ${headerPreview}${moreHeaders}`);
    }
    
    if (analysis.patterns.errorCount > 0 || analysis.patterns.successCount > 0) {
      console.log(`   ⚠️  Errors: ${analysis.patterns.errorCount} | ✅ Success: ${analysis.patterns.successCount}`);
    }
    
    if (analysis.patterns.domains > 0) {
      console.log(`   🌐 Email domains: ${analysis.patterns.domains}`);
    }
    
    console.log('');
  }

  generateFinancialInsights(analysis) {
    const insights = {
      systemHealth: 'UNKNOWN',
      criticalIssues: [],
      recommendations: [],
      summary: {}
    };
    
    // Calculate total errors across all diagnostic sheets
    const totalErrors = analysis.diagnosticSheets.reduce(
      (sum, sheet) => sum + (sheet.patterns.errorCount || 0), 0
    );
    
    const totalSuccess = analysis.diagnosticSheets.reduce(
      (sum, sheet) => sum + (sheet.patterns.successCount || 0), 0
    );
    
    // Determine system health
    if (totalErrors === 0) {
      insights.systemHealth = 'HEALTHY';
    } else if (totalErrors < 20) {
      insights.systemHealth = 'STABLE';
    } else if (totalErrors < 100) {
      insights.systemHealth = 'DEGRADED';
    } else {
      insights.systemHealth = 'CRITICAL';
    }
    
    // Identify critical issues
    analysis.diagnosticSheets.forEach(sheet => {
      if (sheet.patterns.errorCount > 10) {
        insights.criticalIssues.push({
          sheet: sheet.name,
          errorCount: sheet.patterns.errorCount,
          type: 'HIGH_ERROR_RATE'
        });
      }
    });
    
    // Generate recommendations
    if (insights.systemHealth === 'CRITICAL') {
      insights.recommendations.push('🚨 URGENT: Address critical system errors immediately');
    }
    
    if (totalErrors > totalSuccess) {
      insights.recommendations.push('🔧 Fix error patterns - more failures than successes detected');
    }
    
    const failedParsingSheet = analysis.diagnosticSheets.find(s => 
      s.name.toLowerCase().includes('failed')
    );
    if (failedParsingSheet && failedParsingSheet.patterns.domains > 5) {
      insights.recommendations.push('📧 Review email parsing for multiple domains');
    }
    
    insights.summary = {
      totalErrors,
      totalSuccess,
      diagnosticSheets: analysis.diagnosticSheets.length,
      dataSheets: analysis.dataSheets.length
    };
    
    return insights;
  }

  displayConsolidatedInsights(analysis) {
    console.log('\n🧠 FINANCIAL INTELLIGENCE INSIGHTS');
    console.log('=' .repeat(60));
    
    const insights = analysis.financialIntelligence;
    
    // System Health
    const healthIcon = {
      'HEALTHY': '🟢',
      'STABLE': '🟡', 
      'DEGRADED': '🟠',
      'CRITICAL': '🔴'
    }[insights.systemHealth] || '⚪';
    
    console.log(`${healthIcon} System Health: ${insights.systemHealth}`);
    console.log(`📊 Total Errors: ${insights.summary.totalErrors}`);
    console.log(`✅ Total Success: ${insights.summary.totalSuccess}`);
    console.log(`🔍 Diagnostic Sheets: ${insights.summary.diagnosticSheets}`);
    console.log(`📈 Data Sheets: ${insights.summary.dataSheets}`);
    
    // Critical Issues
    if (insights.criticalIssues.length > 0) {
      console.log('\n🚨 Critical Issues:');
      insights.criticalIssues.forEach(issue => {
        console.log(`   • ${issue.sheet}: ${issue.errorCount} errors (${issue.type})`);
      });
    }
    
    // Recommendations
    if (insights.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      insights.recommendations.forEach(rec => {
        console.log(`   ${rec}`);
      });
    }
    
    console.log('');
  }

  async offerDetailedAnalysis(analysis) {
    return new Promise((resolve) => {
      this.rl.question('🔬 Would you like detailed error pattern analysis? (y/N): ', (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          this.displayDetailedAnalysis(analysis);
        }
        resolve();
      });
    });
  }

  displayDetailedAnalysis(analysis) {
    console.log('\n🔬 DETAILED ERROR PATTERN ANALYSIS');
    console.log('=' .repeat(60));
    
    analysis.diagnosticSheets.forEach(sheet => {
      if (sheet.patterns.errorCount > 0) {
        console.log(`\n📋 ${sheet.name}:`);
        
        if (Object.keys(sheet.patterns.errorTypes).length > 0) {
          console.log('   Error Types:');
          Object.entries(sheet.patterns.errorTypes)
            .sort(([,a], [,b]) => b - a)
            .forEach(([type, count]) => {
              console.log(`     • ${type}: ${count} occurrences`);
            });
        }
        
        if (sheet.patterns.domains > 0) {
          console.log(`   📧 Affected Email Domains: ${sheet.patterns.domains}`);
        }
      }
    });
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Run consolidateDiagnosticData() in your Google Apps Script');
    console.log('   2. Use generateExcelAnalyzerReport() for detailed reports');
    console.log('   3. Monitor unified Diagnostic_Hub sheet for real-time insights');
    console.log('');
  }
}

// Main execution
if (require.main === module) {
  const analyzer = new QuickExcelAnalyzer();
  analyzer.run().catch(console.error);
}

module.exports = QuickExcelAnalyzer;
