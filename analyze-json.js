const fs = require('fs');

// Simple JSON analyzer for exported Google Sheets data
function analyzeGoogleSheetsExport(filename = 'finance-data.json') {
  try {
    console.log('🔍 Analyzing Google Sheets export...\n');
    
    const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
    
    console.log('📊 Export Metadata:');
    console.log(`   Export Date: ${data.metadata.exportDate}`);
    console.log(`   Spreadsheet ID: ${data.metadata.spreadsheetId}`);
    console.log(`   Total Sheets: ${data.metadata.totalSheets}\n`);
    
    console.log('📋 Sheet Analysis:');
    for (const [sheetName, sheet] of Object.entries(data.sheets)) {
      console.log(`\n📄 ${sheetName}:`);
      console.log(`   📏 ${sheet.rows} rows × ${sheet.columns} columns`);
      console.log(`   🕒 Last Updated: ${sheet.lastUpdated}`);
      
      if (sheet.data && sheet.data.length > 0) {
        console.log(`   📋 Headers: ${sheet.data[0].join(', ')}`);
        
        // Specific analysis based on sheet type
        if (sheetName.includes('Transaction') && sheet.data.length > 1) {
          const transactions = sheet.data.slice(1);
          console.log(`   💳 Total Transactions: ${transactions.length}`);
          
          // Find date column and get date range
          const headers = sheet.data[0];
          const dateCol = headers.findIndex(h => h && h.toLowerCase().includes('date'));
          if (dateCol !== -1) {
            const dates = transactions
              .map(row => new Date(row[dateCol]))
              .filter(d => !isNaN(d.getTime()))
              .sort((a, b) => a - b);
            
            if (dates.length > 0) {
              console.log(`   📅 Date Range: ${dates[0].toLocaleDateString()} - ${dates[dates.length-1].toLocaleDateString()}`);
            }
          }
          
          // Find category column
          const categoryCol = headers.findIndex(h => h && h.toLowerCase().includes('category'));
          if (categoryCol !== -1) {
            const categories = [...new Set(transactions.map(row => row[categoryCol]).filter(Boolean))];
            console.log(`   🏷️  Categories Found: ${categories.length} (${categories.slice(0, 5).join(', ')}${categories.length > 5 ? '...' : ''})`);
          }
          
          // Find amount column
          const amountCol = headers.findIndex(h => h && (h.toLowerCase().includes('amount') || h.toLowerCase().includes('value')));
          if (amountCol !== -1) {
            const amounts = transactions.map(row => parseFloat(row[amountCol])).filter(n => !isNaN(n));
            if (amounts.length > 0) {
              const total = amounts.reduce((sum, amt) => sum + amt, 0);
              console.log(`   💰 Total Amount: $${total.toFixed(2)}`);
              console.log(`   📊 Average: $${(total / amounts.length).toFixed(2)}`);
            }
          }
        }
        
        else if (sheetName.includes('Learning') && sheet.data.length > 1) {
          const patterns = sheet.data.slice(1);
          console.log(`   🧠 Learning Patterns: ${patterns.length}`);
          
          // Analyze confidence levels if available
          const headers = sheet.data[0];
          const confCol = headers.findIndex(h => h && h.toLowerCase().includes('confidence'));
          if (confCol !== -1) {
            const confidences = patterns.map(row => parseFloat(row[confCol])).filter(n => !isNaN(n));
            const highConf = confidences.filter(c => c > 0.8).length;
            const medConf = confidences.filter(c => c > 0.5 && c <= 0.8).length;
            const lowConf = confidences.filter(c => c <= 0.5).length;
            
            console.log(`   📈 High Confidence (>0.8): ${highConf}`);
            console.log(`   📊 Medium Confidence (0.5-0.8): ${medConf}`);
            console.log(`   📉 Low Confidence (≤0.5): ${lowConf}`);
          }
        }
        
        else if (sheetName.includes('Categories') && sheet.data.length > 1) {
          console.log(`   🏷️  Categories Configured: ${sheet.data.length - 1}`);
        }
        
        else if (sheetName.includes('Account') && sheet.data.length > 1) {
          console.log(`   💰 Accounts Tracked: ${sheet.data.length - 1}`);
        }
      }
    }
    
    console.log('\n✅ Analysis complete!');
    console.log('💡 This shows what your finance automation script has accomplished.');
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('❌ finance-data.json not found!');
      console.log('💡 Please run the exportDataForAnalysis() function in Google Apps Script first.');
      console.log('📋 Then copy the JSON data and save it as finance-data.json in this folder.');
    } else {
      console.error('❌ Analysis failed:', error.message);
    }
  }
}

// Run if called directly
if (require.main === module) {
  // Check for the exported file
  const files = fs.readdirSync('.');
  const jsonFiles = files.filter(f => f.endsWith('.json') && f.includes('finance'));
  
  if (jsonFiles.length > 0) {
    console.log(`📁 Found: ${jsonFiles.join(', ')}`);
    analyzeGoogleSheetsExport(jsonFiles[0]);
  } else {
    analyzeGoogleSheetsExport();
  }
}

module.exports = { analyzeGoogleSheetsExport };
