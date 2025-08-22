/**
 * EMERGENCY CLEANUP SCRIPT FOR DUPLICATE SHEETS
 * This script removes the massive number of duplicate sheets causing timeouts
 */

// Your Spreadsheet ID
const SPREADSHEET_ID = '1-eUeYMTeKoz2bIkHS8Jc2J9vO0Bnl8y6aHXmXGdJqg8';

/**
 * Preview what would be deleted (SAFE - doesn't actually delete)
 */
function previewCleanup() {
  console.log('👀 PREVIEW MODE - No sheets will be deleted');
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const allSheets = ss.getSheets();
    
    console.log(`📊 Total sheets: ${allSheets.length}`);
    
    const keepSheets = new Set([
      'Dashboard', 'Categorization_Metadata', 'Excel_Analyzer_Output',
      'Diagnostic_Hub', 'Failed_Parsing', 'Accounts', 'Transactions', 
      'Learning_Hub', 'Holdings', 'Categories', 'CSV_Import', 'Staging', 'AuditLog'
    ]);
    
    let wouldDelete = 0;
    let wouldKeep = 0;
    
    console.log('\n📋 ANALYSIS:');
    allSheets.forEach(sheet => {
      const name = sheet.getName();
      
      if (keepSheets.has(name)) {
        console.log(`✅ KEEP: ${name}`);
        wouldKeep++;
      } else if (name.match(/^Sheet\d+$/) || name === 'undefined') {
        console.log(`🗑️ DELETE: ${name}`);
        wouldDelete++;
      } else {
        console.log(`❓ KEEP (unknown): ${name}`);
        wouldKeep++;
      }
    });
    
    console.log(`\n📋 SUMMARY:`);
    console.log(`   💾 Would keep: ${wouldKeep}`);
    console.log(`   🗑️ Would delete: ${wouldDelete}`);
    
    return { wouldKeep, wouldDelete, totalSheets: allSheets.length };
    
  } catch (error) {
    console.error('❌ Preview failed:', error);
    return { error: error.message };
  }
}

/**
 * ACTUAL CLEANUP - removes duplicate sheets
 */
function cleanupDuplicateSheets() {
  console.log('🧹 Starting Emergency Sheet Cleanup...');
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const allSheets = ss.getSheets();
    
    console.log(`📊 Total sheets found: ${allSheets.length}`);
    
    // Define sheets we want to KEEP
    const keepSheets = new Set([
      'Dashboard', 'Categorization_Metadata', 'Excel_Analyzer_Output',
      'Diagnostic_Hub', 'Failed_Parsing', 'Accounts', 'Transactions', 
      'Learning_Hub', 'Holdings', 'Categories', 'CSV_Import', 'Staging', 'AuditLog'
    ]);
    
    let deletedCount = 0;
    let keptCount = 0;
    const deleteList = [];
    
    // Identify sheets to delete
    allSheets.forEach(sheet => {
      const name = sheet.getName();
      
      if (keepSheets.has(name)) {
        console.log(`✅ Keeping: ${name}`);
        keptCount++;
      } else if (name.match(/^Sheet\d+$/) || name === 'undefined') {
        console.log(`🗑️ Marking for deletion: ${name}`);
        deleteList.push(sheet);
      } else {
        console.log(`❓ Keeping unknown: ${name}`);
        keptCount++;
      }
    });
    
    console.log(`\n📋 CLEANUP PLAN:`);
    console.log(`   💾 Sheets to keep: ${keptCount}`);
    console.log(`   🗑️ Sheets to delete: ${deleteList.length}`);
    
    // Delete the problematic sheets
    if (deleteList.length > 0) {
      console.log('\n🚨 STARTING DELETION...');
      
      deleteList.forEach((sheet, index) => {
        try {
          const sheetName = sheet.getName();
          ss.deleteSheet(sheet);
          console.log(`   ✅ Deleted (${index + 1}/${deleteList.length}): ${sheetName}`);
          deletedCount++;
        } catch (error) {
          console.log(`   ❌ Failed to delete ${sheet.getName()}: ${error.message}`);
        }
      });
    }
    
    console.log(`\n🎉 CLEANUP COMPLETE!`);
    console.log(`   📊 Original sheets: ${allSheets.length}`);
    console.log(`   🗑️ Deleted: ${deletedCount}`);
    console.log(`   💾 Remaining: ${allSheets.length - deletedCount}`);
    
    return {
      originalCount: allSheets.length,
      deletedCount: deletedCount,
      finalCount: allSheets.length - deletedCount,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return { success: false, error: error.message };
  }
}
