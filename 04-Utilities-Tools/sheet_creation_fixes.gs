/**
 * COMPREHENSIVE FIX FOR SHEET CREATION ISSUES
 * 
 * This file contains the corrected SHEET_NAMES constants and improved _getOrCreateSheet function
 * to prevent the creation of duplicate/numbered sheets that cause timeouts.
 * 
 * APPLY THESE FIXES TO YOUR MAIN SCRIPT
 */

// ===== CORRECTED SHEET_NAMES CONSTANT =====
const SHEET_NAMES = {
  // CORE DATA SHEETS (Essential - Always needed)
  MAIN: 'Transactions',
  ACCOUNTS: 'Accounts', 
  HOLDINGS: 'Holdings',
  DASHBOARD: 'Dashboard',
  
  // ANALYSIS & DEBUGGING SHEETS
  ANALYSIS: 'System_Analysis',
  DIAGNOSTIC_HUB: 'Diagnostic_Hub',
  FAILED_PARSING: 'Failed_Parsing',
  LEARNING_HUB: 'Learning_Hub',
  AUDIT_LOG: 'AuditLog',
  ERROR_ANALYSIS: 'Error_Analysis',
  
  // METADATA & CATEGORIZATION
  CATEGORIZATION_METADATA: 'Categorization_Metadata',
  EXCEL_ANALYZER_OUTPUT: 'Excel_Analyzer_Output',
  
  // AI & LEARNING
  AI_LEARNING: 'AI_Learning',
  
  // IMPORT & PROCESSING
  STAGING: 'Staging',
  CSV_IMPORT: 'CSV_Import',
  CATEGORIES: 'Categories'
};

// ===== IMPROVED _getOrCreateSheet FUNCTION =====
function _getOrCreateSheet(sheetName, customHeaders = null) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      console.log(`Creating new sheet: ${sheetName}`);
      
      // SAFETY CHECK: Prevent creating sheets with problematic names
      if (!sheetName || sheetName.trim() === '' || sheetName === 'undefined') {
        console.error(`❌ Invalid sheet name: "${sheetName}" - using fallback`);
        sheetName = 'Emergency_Sheet_' + new Date().getTime();
      }
      
      // Check if we've hit the sheet limit (Google Sheets max ~200 sheets)
      const allSheets = spreadsheet.getSheets();
      if (allSheets.length >= 150) {
        console.error(`❌ Too many sheets (${allSheets.length}) - cleanup required!`);
        throw new Error(`Sheet limit reached. Current count: ${allSheets.length}. Please run cleanup.`);
      }
      
      sheet = spreadsheet.insertSheet(sheetName);
      
      // Use custom headers if provided, otherwise use predefined headers
      if (customHeaders && customHeaders.length > 0) {
        sheet.getRange(1, 1, 1, customHeaders.length).setValues([customHeaders]);
        // Format header row
        const headerRange = sheet.getRange(1, 1, 1, customHeaders.length);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#e1f5fe');
      } else {
        // Set up default headers based on sheet type
        _setupDefaultHeaders(sheet, sheetName);
      }
      
      console.log(`✅ Successfully created sheet: ${sheetName}`);
    }
    
    return sheet;
    
  } catch (error) {
    console.error(`❌ Error in _getOrCreateSheet for "${sheetName}":`, error);
    
    // EMERGENCY FALLBACK: Try to use an existing sheet rather than create new
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const existingSheets = spreadsheet.getSheets();
    
    // Look for a similar named sheet
    for (let existingSheet of existingSheets) {
      if (existingSheet.getName().toLowerCase().includes(sheetName.toLowerCase())) {
        console.log(`🔄 Using existing similar sheet: ${existingSheet.getName()}`);
        return existingSheet;
      }
    }
    
    // Last resort: use the first available sheet
    if (existingSheets.length > 0) {
      console.log(`🚨 Emergency fallback: using first available sheet`);
      return existingSheets[0];
    }
    
    throw error;
  }
}

// ===== HELPER FUNCTION FOR DEFAULT HEADERS =====
function _setupDefaultHeaders(sheet, sheetName) {
  let headers = [];
  
  switch (sheetName) {
    case SHEET_NAMES.MAIN:
    case SHEET_NAMES.STAGING:
      headers = ['Date', 'Amount', 'From', 'To', 'Description', 'Category', 'Tags', 'Notes', 'Account', 'Balance', 'Type', 'Status'];
      break;
      
    case SHEET_NAMES.ACCOUNTS:
      headers = ['Account', 'Balance', 'Last Updated', 'Type', 'Status', 'Notes'];
      break;
      
    case SHEET_NAMES.HOLDINGS:
      headers = ['Account', 'Ticker', 'Shares', 'Unit Price (CAD)', 'Total Value (CAD)', 'Last Updated'];
      break;
      
    case SHEET_NAMES.AUDIT_LOG:
    case SHEET_NAMES.ERROR_ANALYSIS:
      headers = ['Timestamp', 'Level', 'Message', 'Context', 'Function'];
      break;
      
    case SHEET_NAMES.LEARNING_HUB:
    case SHEET_NAMES.AI_LEARNING:
      headers = ['Timestamp', 'LearningType', 'Pattern', 'Context', 'Confidence', 'Category', 'Merchant', 'Amount', 'Outcome', 'Notes'];
      break;
      
    case SHEET_NAMES.FAILED_PARSING:
      headers = ['Timestamp', 'EmailId', 'From', 'Subject', 'Error', 'Content_Sample', 'Attempted_Methods', 'Suggested_Fix', 'Status', 'Notes'];
      break;
      
    case SHEET_NAMES.CATEGORIZATION_METADATA:
      headers = ['Timestamp', 'Transaction_Date', 'Amount', 'Merchant', 'Original_Category', 'Predicted_Category', 'Final_Category', 'Confidence', 'Method', 'Learning_Applied', 'User_Override', 'Notes'];
      break;
      
    case SHEET_NAMES.EXCEL_ANALYZER_OUTPUT:
      headers = ['Timestamp', 'FileName', 'SheetName', 'Analysis', 'Errors', 'Recommendations', 'Data_Quality', 'Performance_Impact'];
      break;
      
    case SHEET_NAMES.DIAGNOSTIC_HUB:
      headers = ['Timestamp', 'Component', 'Status', 'Performance', 'Errors', 'Warnings', 'Last_Check', 'Recommendations', 'Auto_Fix_Available', 'Priority', 'Details', 'Next_Action'];
      break;
      
    case SHEET_NAMES.CSV_IMPORT:
      headers = ['Import Date', 'Source File', 'Records Imported', 'Status', 'Errors'];
      break;
      
    default:
      headers = ['Timestamp', 'Type', 'Data', 'Status', 'Notes'];
      break;
  }
  
  if (headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#e1f5fe');
  }
}

// ===== EMERGENCY SHEET COUNT MONITOR =====
function checkSheetCount() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();
    
    console.log(`📊 Current sheet count: ${sheets.length}`);
    
    if (sheets.length > 50) {
      console.warn(`⚠️ High sheet count detected: ${sheets.length} sheets`);
      
      // List problematic sheets
      const problematicSheets = sheets.filter(sheet => {
        const name = sheet.getName();
        return name.match(/^Sheet\d+$/) || name === 'undefined' || name.startsWith('Emergency_Sheet_');
      });
      
      console.log(`🗑️ Problematic sheets found: ${problematicSheets.length}`);
      problematicSheets.forEach(sheet => {
        console.log(`   - ${sheet.getName()}`);
      });
      
      if (problematicSheets.length > 10) {
        console.error(`🚨 CRITICAL: Too many problematic sheets! Run cleanup immediately.`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to check sheet count:', error);
    return false;
  }
}

// ===== SAFE SHEET CREATION WRAPPER =====
function safeGetOrCreateSheet(sheetName, customHeaders = null) {
  // Pre-check: Monitor sheet count
  if (!checkSheetCount()) {
    throw new Error('Sheet count too high - cleanup required before creating new sheets');
  }
  
  return _getOrCreateSheet(sheetName, customHeaders);
}
