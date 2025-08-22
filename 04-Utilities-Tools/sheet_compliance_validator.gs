/**
 * 🔍 SHEET COMPLIANCE VALIDATION SCRIPT
 * 
 * This script validates that all sheet references in the finance automation system
 * properly use SHEET_NAMES constants and identifies any remaining ghost references.
 */

function validateSheetCompliance() {
  _logInfo('🔍 Starting comprehensive sheet compliance validation...');
  
  const ss = _ss();
  const report = {
    timestamp: new Date(),
    totalSheets: ss.getSheets().length,
    validatedReferences: 0,
    ghostReferences: [],
    recommendations: [],
    systemHealth: 'UNKNOWN'
  };
  
  // Check all existing sheets against SHEET_NAMES constants
  const existingSheets = ss.getSheets().map(sheet => sheet.getName());
  const allowedSheets = Object.values(SHEET_NAMES);
  
  report.existingSheets = existingSheets;
  report.allowedSheets = allowedSheets;
  
  // Identify unauthorized sheets
  const unauthorizedSheets = existingSheets.filter(name => !allowedSheets.includes(name));
  
  if (unauthorizedSheets.length > 0) {
    report.ghostReferences = unauthorizedSheets;
    report.recommendations.push(`🚨 Remove unauthorized sheets: ${unauthorizedSheets.join(', ')}`);
  }
  
  // Verify core sheets exist
  const coreSheets = [
    SHEET_NAMES.MAIN,
    SHEET_NAMES.ACCOUNTS, 
    SHEET_NAMES.CATEGORIES,
    SHEET_NAMES.DASHBOARD,
    SHEET_NAMES.ANALYSIS,
    SHEET_NAMES.EXCEL_ANALYZER_OUTPUT
  ];
  
  const missingCore = coreSheets.filter(name => !existingSheets.includes(name));
  
  if (missingCore.length > 0) {
    report.recommendations.push(`⚠️ Create missing core sheets: ${missingCore.join(', ')}`);
  }
  
  // Determine system health
  if (unauthorizedSheets.length === 0 && missingCore.length === 0) {
    report.systemHealth = 'EXCELLENT';
  } else if (unauthorizedSheets.length < 5 && missingCore.length === 0) {
    report.systemHealth = 'GOOD';
  } else if (unauthorizedSheets.length < 20) {
    report.systemHealth = 'NEEDS_CLEANUP';
  } else {
    report.systemHealth = 'CRITICAL';
  }
  
  // Log to system analysis
  _logSystemEvent('VALIDATION', 'Sheet compliance check completed', {
    totalSheets: report.totalSheets,
    unauthorizedCount: unauthorizedSheets.length,
    systemHealth: report.systemHealth
  }, unauthorizedSheets.length > 0 ? 'Cleanup Required' : 'None');
  
  // Generate user-friendly report
  const userReport = generateComplianceReport(report);
  
  // Show results
  const ui = SpreadsheetApp.getUi();
  ui.alert('📊 Sheet Compliance Report', userReport, ui.ButtonSet.OK);
  
  _logInfo(`✅ Validation complete - System Health: ${report.systemHealth}`);
  return report;
}

function generateComplianceReport(report) {
  let output = `🔍 SHEET COMPLIANCE VALIDATION\n\n`;
  
  output += `📊 System Overview:\n`;
  output += `• Total Sheets: ${report.totalSheets}\n`;
  output += `• System Health: ${report.systemHealth}\n\n`;
  
  if (report.ghostReferences.length > 0) {
    output += `🚨 Unauthorized Sheets Found (${report.ghostReferences.length}):\n`;
    report.ghostReferences.forEach(name => {
      output += `  • ${name}\n`;
    });
    output += '\n';
  }
  
  if (report.recommendations.length > 0) {
    output += `📋 Recommendations:\n`;
    report.recommendations.forEach(rec => {
      output += `${rec}\n`;
    });
    output += '\n';
  }
  
  if (report.systemHealth === 'EXCELLENT') {
    output += `✅ PERFECT COMPLIANCE\n`;
    output += `All sheets properly follow naming conventions!\n`;
  } else {
    output += `🔧 Action required to achieve full compliance.\n`;
  }
  
  return output;
}

/**
 * 🧹 AUTOMATED SHEET CLEANUP
 * 
 * Removes unauthorized sheets that don't match SHEET_NAMES constants
 * WARNING: This will permanently delete sheets!
 */
function cleanupUnauthorizedSheets() {
  const ui = SpreadsheetApp.getUi();
  
  // Safety confirmation
  const confirmation = ui.alert(
    '⚠️ DANGEROUS OPERATION',
    'This will permanently delete ALL sheets that don\'t match SHEET_NAMES constants.\n\nAre you ABSOLUTELY sure?',
    ui.ButtonSet.YES_NO
  );
  
  if (confirmation !== ui.Button.YES) {
    ui.alert('❌ Cleanup cancelled by user');
    return;
  }
  
  _logInfo('🧹 Starting automated sheet cleanup...');
  
  const ss = _ss();
  const existingSheets = ss.getSheets();
  const allowedSheets = Object.values(SHEET_NAMES);
  
  let deletedCount = 0;
  const deletedNames = [];
  
  existingSheets.forEach(sheet => {
    const sheetName = sheet.getName();
    
    if (!allowedSheets.includes(sheetName)) {
      try {
        ss.deleteSheet(sheet);
        deletedCount++;
        deletedNames.push(sheetName);
        _logInfo(`🗑️ Deleted unauthorized sheet: ${sheetName}`);
      } catch (error) {
        _logError(`Failed to delete sheet: ${sheetName}`, error);
      }
    }
  });
  
  // Log cleanup results
  _logSystemEvent('CLEANUP', 'Automated sheet cleanup completed', {
    deletedCount: deletedCount,
    deletedSheets: deletedNames,
    remainingSheets: ss.getSheets().length
  }, 'None');
  
  const report = `🧹 CLEANUP COMPLETE\n\n` +
                `• Deleted Sheets: ${deletedCount}\n` +
                `• Remaining Sheets: ${ss.getSheets().length}\n` +
                `• Removed: ${deletedNames.join(', ')}\n\n` +
                `✅ System now compliant with SHEET_NAMES constants!`;
  
  ui.alert('🎉 Cleanup Results', report, ui.ButtonSet.OK);
  
  _logInfo(`✅ Cleanup complete - Deleted ${deletedCount} unauthorized sheets`);
}

/**
 * 🔨 CREATE MISSING CORE SHEETS
 * 
 * Ensures all essential sheets exist with proper headers
 */
function createMissingCoreSheets() {
  _logInfo('🔨 Creating missing core sheets...');
  
  const coreSheets = [
    { name: SHEET_NAMES.MAIN, headers: ['Date', 'Amount', 'From', 'To', 'Bank', 'Notes', 'EmailId', 'Category', 'Type'] },
    { name: SHEET_NAMES.ACCOUNTS, headers: ['Account', 'Balance', 'Last Updated', 'Type'] },
    { name: SHEET_NAMES.CATEGORIES, headers: ['Keyword', 'Category'] },
    { name: SHEET_NAMES.DASHBOARD, headers: ['Metric', 'Value', 'Last Updated'] },
    { name: SHEET_NAMES.ANALYSIS, headers: ['Timestamp', 'Type', 'Message', 'Data', 'Action_Required', 'Status'] },
    { name: SHEET_NAMES.EXCEL_ANALYZER_OUTPUT, headers: ['Metric', 'Value', 'Status', 'Action'] }
  ];
  
  let createdCount = 0;
  
  coreSheets.forEach(sheetConfig => {
    try {
      const sheet = _getOrCreateSheet(sheetConfig.name, sheetConfig.headers);
      if (sheet) {
        createdCount++;
        _logInfo(`✅ Ensured sheet exists: ${sheetConfig.name}`);
      }
    } catch (error) {
      _logError(`Failed to create sheet: ${sheetConfig.name}`, error);
    }
  });
  
  _logSystemEvent('INITIALIZATION', 'Core sheets verification completed', {
    checkedSheets: coreSheets.length,
    createdSheets: createdCount
  }, 'None');
  
  const ui = SpreadsheetApp.getUi();
  ui.alert('🔨 Core Sheets Ready', `✅ All ${coreSheets.length} core sheets are now available!`, ui.ButtonSet.OK);
  
  _logInfo(`✅ Core sheet verification complete`);
}

/**
 * 📊 COMPREHENSIVE SYSTEM STATUS
 * 
 * Provides complete overview of sheet compliance and system health
 */
function getComprehensiveSystemStatus() {
  _logInfo('📊 Generating comprehensive system status...');
  
  const validation = validateSheetCompliance();
  
  // Also check the streamlined analysis system
  const analysisReport = generateStreamlinedAnalysisReport();
  
  const combined = {
    timestamp: new Date(),
    sheetCompliance: validation,
    systemAnalysis: analysisReport,
    overallHealth: 'UNKNOWN'
  };
  
  // Determine overall health
  if (validation.systemHealth === 'EXCELLENT' && analysisReport.systemHealth === 'HEALTHY') {
    combined.overallHealth = 'PERFECT';
  } else if (validation.systemHealth === 'GOOD' && analysisReport.systemHealth !== 'CRITICAL') {
    combined.overallHealth = 'GOOD';
  } else if (validation.systemHealth === 'NEEDS_CLEANUP') {
    combined.overallHealth = 'NEEDS_ATTENTION';
  } else {
    combined.overallHealth = 'CRITICAL';
  }
  
  // Log comprehensive status
  _logSystemEvent('SYSTEM_STATUS', 'Comprehensive system check completed', {
    sheetHealth: validation.systemHealth,
    analysisHealth: analysisReport.systemHealth,
    overallHealth: combined.overallHealth
  }, combined.overallHealth === 'PERFECT' ? 'None' : 'Review System');
  
  _logInfo(`✅ Comprehensive status complete - Overall Health: ${combined.overallHealth}`);
  return combined;
}
