/**
 * EMERGENCY CLEANUP SCRIPT FOR DUPLICATE SHEETS
 * This script removes the massive number of duplicate sheets causing timeouts
 * 
 * INSTRUCTIONS:
 * 1. Copy this code into Google Apps Script editor
 * 2. Update SPREADSHEET_ID to your spreadsheet ID
 * 3. Run cleanupDuplicateSheets() function
 * 4. Monitor the execution log
 */

// UPDATE THIS WITH YOUR ACTUAL SPREADSHEET ID
const SPREADSHEET_ID = '1-eUeYMTeKoz2bIkHS8Jc2J9vO0Bnl8y6aHXmXGdJqg8';

/**
 * Core cleanup function - removes sheets that match duplicate pattern
 */
function cleanupDuplicateSheets() {
  console.log('🧹 Starting Emergency Sheet Cleanup...');
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const allSheets = ss.getSheets();
    
    console.log(`📊 Total sheets found: ${allSheets.length}`);
    
    // Define sheets we want to KEEP (core functional sheets)
    const keepSheets = new Set([
      'Dashboard',
      'Categorization_Metadata', 
      'Excel_Analyzer_Output',
      'Diagnostic_Hub',
      'Failed_Parsing',
      'Accounts',
      'Transactions', 
      'Learning_Hub',
      'Holdings',
      'Categories',
      'CSV_Import',
      'Staging',
      'AuditLog',
      'System_Analysis',
      'Error_Analysis',
      'AI_Learning'
    ]);
    
    let deletedCount = 0;
    let keptCount = 0;
    const deleteList = [];
    
    // Identify sheets to delete
    allSheets.forEach(sheet => {
      const name = sheet.getName();
      
      // Keep core sheets and avoid deleting sheets with substantial data
      if (keepSheets.has(name)) {
        console.log(`✅ Keeping core sheet: ${name}`);
        keptCount++;
      } else if (name.match(/^Sheet\d+$/)) {
        // These are the auto-generated problematic sheets
        console.log(`🗑️ Marking for deletion: ${name}`);
        deleteList.push(sheet);
      } else if (name === 'undefined' || name.startsWith('Sheet')) {
        // Other problematic auto-generated sheets
        console.log(`🗑️ Marking for deletion: ${name}`);
        deleteList.push(sheet);
      } else {
        console.log(`❓ Unknown sheet (keeping): ${name}`);
        keptCount++;
      }
    });
    
    console.log(`\n📋 CLEANUP SUMMARY:`);
    console.log(`   💾 Sheets to keep: ${keptCount}`);
    console.log(`   🗑️ Sheets to delete: ${deleteList.length}`);
    
    // Confirm deletion
    if (deleteList.length > 0) {
      console.log('\n🚨 STARTING DELETION PROCESS...');
      
      // Delete in batches to avoid timeout
      const batchSize = 10;
      for (let i = 0; i < deleteList.length; i += batchSize) {
        const batch = deleteList.slice(i, i + batchSize);
        
        console.log(`\n🧹 Deleting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(deleteList.length/batchSize)}...`);
        
        batch.forEach(sheet => {
          try {
            const sheetName = sheet.getName();
            ss.deleteSheet(sheet);
            console.log(`   ✅ Deleted: ${sheetName}`);
            deletedCount++;
          } catch (error) {
            console.log(`   ❌ Failed to delete ${sheet.getName()}: ${error.message}`);
          }
        });
        
        // Small delay between batches
        Utilities.sleep(500);
      }
    }
    
    console.log(`\n🎉 CLEANUP COMPLETE!`);
    console.log(`   📊 Original sheet count: ${allSheets.length}`);
    console.log(`   🗑️ Sheets deleted: ${deletedCount}`);
    console.log(`   💾 Sheets remaining: ${allSheets.length - deletedCount}`);
    
    // Final verification
    const finalSheets = ss.getSheets();
    console.log(`   ✅ Final verification: ${finalSheets.length} sheets`);
    
    return {
      originalCount: allSheets.length,
      deletedCount: deletedCount,
      finalCount: finalSheets.length,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Safe mode - just lists what would be deleted without actually deleting
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
    
    console.log(`\n📋 PREVIEW SUMMARY:`);
    console.log(`   💾 Would keep: ${wouldKeep}`);
    console.log(`   🗑️ Would delete: ${wouldDelete}`);
    
  } catch (error) {
    console.error('❌ Preview failed:', error);
  }
}

/**
 * Emergency function to delete ALL auto-generated sheets matching pattern
 */
function emergencyCleanupAllAutoSheets() {
  console.log('🚨 EMERGENCY MODE - Deleting all auto-generated sheets');
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const allSheets = ss.getSheets();
    
    let deletedCount = 0;
    
    // Keep only the most essential sheets
    const essentialSheets = new Set([
      'Dashboard', 'Accounts', 'Transactions', 'Holdings', 'AuditLog'
    ]);
    
    allSheets.forEach(sheet => {
      const name = sheet.getName();
      
      if (!essentialSheets.has(name)) {
        try {
          ss.deleteSheet(sheet);
          console.log(`✅ Deleted: ${name}`);
          deletedCount++;
        } catch (error) {
          console.log(`❌ Failed to delete ${name}: ${error.message}`);
        }
      } else {
        console.log(`💾 Keeping essential: ${name}`);
      }
    });
    
    console.log(`🎉 Emergency cleanup complete: ${deletedCount} sheets deleted`);
    
  } catch (error) {
    console.error('❌ Emergency cleanup failed:', error);
  }
}
