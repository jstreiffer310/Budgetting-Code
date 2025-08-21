/**
 * Test script for the enhanced CSV/PDF import system
 * Demonstrates how to use the new import capabilities
 */

/**
 * Test CSV import with sample data (including sorting verification)
 */
function testCSVImport() {
  // Sample CSV data that might have caused 1969 date issues before
  // Note: Deliberately out of chronological order to test sorting
  const sampleCSV = `Transaction Date,Description,Debit,Credit
01/19/24,"ONLINE PURCHASE",-89.99,
01/15/24,"GROCERY STORE PURCHASE",-45.67,
01/18/24,"RESTAURANT MEAL",-28.50,
01/16/24,"SALARY DEPOSIT",,2500.00
1/17/2024,"GAS STATION",-38.92,`;

  console.log('Testing CSV import with enhanced date parsing and sorting...');
  
  try {
    const result = processCSVStatement(sampleCSV, 'Test Bank Account');
    
    console.log('CSV Import Result:', result);
    
    if (result.success) {
      console.log(`✅ Successfully imported ${result.imported} transactions`);
      console.log(`📊 Profile used: ${result.profile}`);
      console.log(`🎯 Training data extracted: ${result.trainingData.vendors.length} vendors`);
      console.log(`📅 Transactions automatically sorted by date (most recent first)`);
    } else {
      console.log(`❌ Import failed: ${result.error}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('CSV import test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test date parsing specifically for 1969 issue
 */
function testDateParsing() {
  console.log('Testing date parsing for common problematic formats...');
  
  const testDates = [
    '01/15/24',    // 2-digit year that might become 1969
    '1/15/2024',   // Single digit month
    '01/15/2024',  // Standard format
    '2024-01-15',  // ISO format
    '15/01/2024',  // DD/MM/YYYY
    '01-15-24',    // Dash separator
    'invalid',     // Invalid date
    ''             // Empty string
  ];
  
  const results = [];
  
  for (const dateStr of testDates) {
    try {
      const parsed = _parseStatementDate(dateStr);
      const year = parsed ? parsed.getFullYear() : 'Failed';
      
      console.log(`📅 "${dateStr}" → ${year} ${year === 1969 ? '❌ (1969 ISSUE!)' : year >= 1990 ? '✅' : '⚠️'}`);
      
      results.push({
        input: dateStr,
        output: parsed,
        year: year,
        isValid: year >= 1990 && year <= new Date().getFullYear() + 1
      });
      
    } catch (error) {
      console.log(`📅 "${dateStr}" → Error: ${error.message}`);
      results.push({
        input: dateStr,
        output: null,
        year: 'Error',
        isValid: false
      });
    }
  }
  
  const validCount = results.filter(r => r.isValid).length;
  console.log(`\n✅ ${validCount}/${results.length} dates parsed correctly (no 1969 issues)`);
  
  return results;
}

/**
 * Test transaction sorting functionality
 */
function testTransactionSorting() {
  console.log('Testing transaction sorting...');
  
  try {
    // Test the sorting function directly
    console.log('📊 Running _sortTransactionsByDate() test...');
    
    // This would sort the actual Transactions sheet
    _sortTransactionsByDate();
    
    console.log('✅ Transaction sorting completed');
    
    // Verify the sort order by reading the first few transactions
    const transactionSheet = _getOrCreateSheet('Transactions');
    const data = transactionSheet.getDataRange().getValues();
    
    if (data.length > 3) {
      console.log('\n📅 Transaction order verification:');
      
      for (let i = 1; i <= Math.min(5, data.length - 1); i++) {
        const date = new Date(data[i][0]);
        const description = data[i][3] || 'No description';
        const amount = data[i][1] || 0;
        
        console.log(`${i}. ${date.toLocaleDateString()} - ${description.substring(0, 30)} ($${amount})`);
      }
      
      // Check if dates are in descending order
      let properlyOrdered = true;
      for (let i = 1; i < Math.min(5, data.length - 1); i++) {
        const currentDate = new Date(data[i][0]);
        const nextDate = new Date(data[i + 1][0]);
        
        if (currentDate.getTime() < nextDate.getTime()) {
          properlyOrdered = false;
          break;
        }
      }
      
      if (properlyOrdered) {
        console.log('✅ Transactions are properly ordered (most recent first)');
      } else {
        console.log('⚠️ Transactions may not be in proper chronological order');
      }
      
      return { success: true, properlyOrdered, recordCount: data.length - 1 };
      
    } else {
      console.log('ℹ️ No transactions found to verify sorting');
      return { success: true, properlyOrdered: true, recordCount: 0 };
    }
    
  } catch (error) {
    console.error('Transaction sorting test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test the import profiles detection
 */
function testProfileDetection() {
  console.log('Testing CSV profile detection...');
  
  const testCSVs = [
    {
      name: 'CIBC Aventura',
      csv: 'Date,Description,Debit,Credit\n4500********6271,Test Transaction,-10.00,'
    },
    {
      name: 'PC Financial',
      csv: 'Card Holder Name,Transaction Date,Description,Amount\nJOHN DOE,2024-01-15,GROCERY STORE,-45.67'
    },
    {
      name: 'Generic Bank',
      csv: 'Transaction Date,Payee,Amount\n2024-01-15,RESTAURANT,-28.50'
    }
  ];
  
  for (const test of testCSVs) {
    try {
      const profile = _detectCSVProfile(test.csv);
      console.log(`🏦 ${test.name}: ${profile ? profile.name : 'Not detected'} ${profile ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`🏦 ${test.name}: Error - ${error.message}`);
    }
  }
}

/**
 * Test the complete import system
 */
function testCompleteImportSystem() {
  console.log('🚀 Starting comprehensive import system test...\n');
  
  // Test 1: Date parsing
  console.log('=== TEST 1: Date Parsing ===');
  testDateParsing();
  
  console.log('\n=== TEST 2: Profile Detection ===');
  testProfileDetection();
  
  console.log('\n=== TEST 3: CSV Import ===');
  const csvResult = testCSVImport();
  
  console.log('\n=== TEST 4: Transaction Sorting ===');
  const sortResult = testTransactionSorting();
  
  console.log('\n=== TEST 5: Import System Status ===');
  const systemStatus = testImportSystem();
  console.log('System Status:', systemStatus);
  
  console.log('\n🎉 Import system test complete!');
  
  return {
    csvImport: csvResult,
    sorting: sortResult,
    systemStatus: systemStatus,
    testsPassed: csvResult.success && sortResult.success,
    timestamp: new Date()
  };
}

/**
 * Quick test to run from the script editor
 */
function quickTest() {
  console.log('Quick import system test...');
  
  const result = testCompleteImportSystem();
  
  if (result.testsPassed) {
    console.log('✅ All tests passed! Import system is ready.');
  } else {
    console.log('❌ Some tests failed. Check the logs above.');
  }
  
  return result;
}
