#!/usr/bin/env node

const ExcelAnalyzer = require('./excel-analyzer');
const fs = require('fs');
const path = require('path');

console.log('🚀 Finance Automation Excel Analyzer');
console.log('=====================================\n');

// Check if a specific file was provided as argument
const args = process.argv.slice(2);
let targetFile = null;

if (args.length > 0) {
  targetFile = args[0];
  if (!fs.existsSync(targetFile)) {
    console.error(`❌ File not found: ${targetFile}`);
    process.exit(1);
  }
} else {
  // Look for Excel files in current directory
  const files = fs.readdirSync('.');
  const excelFiles = files.filter(file => 
    file.endsWith('.xlsx') || file.endsWith('.xls') || file.endsWith('.csv')
  );

  if (excelFiles.length === 0) {
    console.log('📁 No Excel files found in current directory.');
    console.log('💡 Usage:');
    console.log('   node analyze-excel.js [filename]');
    console.log('   or place Excel file in this folder');
    console.log('   Supported formats: .xlsx, .xls, .csv\n');
    console.log('📋 Looking for files like:');
    console.log('   - Budget.xlsx');
    console.log('   - Transactions.xlsx');  
    console.log('   - Finance_Data.xlsx');
    process.exit(1);
  }

  targetFile = excelFiles[0];
  if (excelFiles.length > 1) {
    console.log(`📋 Multiple Excel files found, analyzing: ${targetFile}`);
    console.log(`   Other files: ${excelFiles.slice(1).join(', ')}\n`);
  }
}

async function analyze() {
  const analyzer = new ExcelAnalyzer();
  
  console.log(`📊 Analyzing: ${targetFile}\n`);
  
  if (analyzer.loadExcel(targetFile)) {
    const analysis = analyzer.analyzeFinanceData();
    
    // Export files
    analyzer.exportAnalysis(analysis, 'finance-analysis.json');
    
    const report = analyzer.generateReport(analysis);
    fs.writeFileSync('finance-report.md', report);
    
    console.log('\n✅ Analysis Complete!');
    console.log('📄 Generated Files:');
    console.log('   📊 finance-analysis.json - Detailed JSON data');
    console.log('   📝 finance-report.md - Human-readable report\n');
    
    // Show preview of analysis
    console.log('🔍 Quick Preview:');
    console.log('==================');
    
    if (analysis.insights.length > 0) {
      console.log('\n💡 Insights:');
      analysis.insights.forEach(insight => console.log(`   ${insight}`));
    }
    
    console.log(`\n📊 Sheets Found: ${Object.keys(analysis.sheets).length}`);
    Object.entries(analysis.sheets).forEach(([name, sheet]) => {
      console.log(`   📋 ${name}: ${sheet.rows} rows, ${sheet.columns} columns`);
      
      if (sheet.transactionAnalysis) {
        const ta = sheet.transactionAnalysis;
        console.log(`      💳 ${ta.totalTransactions} transactions`);
        if (ta.categories.length > 0) {
          console.log(`      🏷️  ${ta.categories.length} categories`);
        }
      }
      
      if (sheet.learningAnalysis) {
        const la = sheet.learningAnalysis;
        console.log(`      🧠 ${la.totalPatterns} learning patterns`);
      }
    });
    
    console.log('\n📖 Read the full report in finance-report.md');
    
  } else {
    console.error('❌ Failed to analyze Excel file');
    process.exit(1);
  }
}

analyze().catch(error => {
  console.error('❌ Analysis failed:', error.message);
  process.exit(1);
});
