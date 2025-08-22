/**
 * FINAL CLEANUP - Remove remaining problem sheets
 * Targets: Sheet110, Sheet111, Sheet112
 */

const SPREADSHEET_ID = '1-eUeYMTeKoz2bIkHS8Jc2J9vO0Bnl8y6aHXmXGdJqg8';

function finalCleanupRemainingSheets() {
  console.log('🧹 Final cleanup of remaining problem sheets...');
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const allSheets = ss.getSheets();
    
    console.log(`📊 Current sheet count: ${allSheets.length}`);
    
    // Target specific problematic sheets
    const targetSheets = ['Sheet110', 'Sheet111', 'Sheet112'];
    let deletedCount = 0;
    
    targetSheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        try {
          ss.deleteSheet(sheet);
          console.log(`✅ Deleted: ${sheetName}`);
          deletedCount++;
        } catch (error) {
          console.log(`❌ Failed to delete ${sheetName}: ${error.message}`);
        }
      } else {
        console.log(`ℹ️ Sheet not found: ${sheetName}`);
      }
    });
    
    const finalSheets = ss.getSheets();
    console.log(`\n🎉 FINAL CLEANUP COMPLETE!`);
    console.log(`   🗑️ Deleted: ${deletedCount} sheets`);
    console.log(`   📊 Final count: ${finalSheets.length} sheets`);
    
    return {
      deletedCount: deletedCount,
      finalCount: finalSheets.length,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Final cleanup failed:', error);
    return { success: false, error: error.message };
  }
}

function checkRemainingSheets() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const allSheets = ss.getSheets();
    
    console.log(`📊 Current sheet count: ${allSheets.length}`);
    console.log(`\n📋 All sheets:`);
    
    allSheets.forEach((sheet, index) => {
      const name = sheet.getName();
      const isProblematic = name.match(/^Sheet\d+$/);
      console.log(`${index + 1}. ${name} ${isProblematic ? '❌' : '✅'}`);
    });
    
    return allSheets.length;
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    return -1;
  }
}
