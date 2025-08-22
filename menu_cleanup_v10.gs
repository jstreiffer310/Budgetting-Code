// Clean version of the onOpen menu function for finance_automation_v10.gs
// This removes dead functions and fixes broken emoji characters

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('💰 Finance Automation V10.1');

  // 🚀 MAIN ACTIONS - Core functionality
  menu.addItem('🚀 Run Full Automation', 'runFullAutomation');
  menu.addItem('⚡ Quick Setup', 'quickSetup');
  menu.addSeparator();

  // 📊 DASHBOARD & UPDATES
  const dashboardMenu = ui.createMenu('📊 Dashboard & Updates')
    .addItem('📊 Update Dashboard', 'updateDashboard')
    .addItem('🔄 Refresh Holdings', 'refreshHoldings')
    .addItem('📈 Update Net Worth', 'updateNetWorth')
    .addItem('📋 Initialize Holdings Data', 'initializeHoldingsData');
  menu.addSubMenu(dashboardMenu);

  // 💳 TRANSACTION PROCESSING - Core transaction functions
  const transactionMenu = ui.createMenu('💳 Transaction Processing')
    .addItem('📧 Process New Emails', 'processNewEmails')
    .addItem('🤝 Pair Staged Transfers', 'pairStagedTransfers')
    .addItem('🧹 Cleanup Stale Transactions', 'cleanupStaleTransactions')
    .addSeparator()
    .addItem('📚 Learn Categories', 'learnCategoriesFromTransactions')
    .addItem('🎯 Apply PDF Training Data', 'applyPDFTrainingToExistingTransactions')
    .addSeparator()
    .addItem('📑 Sort All Transactions', 'sortAllTransactions');
  menu.addSubMenu(transactionMenu);

  // 🔧 SYSTEM MAINTENANCE - Critical functions
  const maintenanceMenu = ui.createMenu('🔧 System Maintenance')
    .addItem('🧹 Remove Duplicate Transactions', 'removeDuplicateTransactions')
    .addItem('🏥 Run System Health Check', 'runSystemHealthCheck')
    .addItem('📊 Generate Analysis Report', 'generateStreamlinedAnalysisReport')
    .addSeparator()
    .addItem('✅ Test Enhanced Email Parsing', 'testEnhancedEmailParsing');
  menu.addSubMenu(maintenanceMenu);

  // 📁 IMPORT & ANALYSIS
  const importMenu = ui.createMenu('📁 Import & Analysis')
    .addItem('📄 Test Import System', 'testImportSystem')
    .addSeparator()
    .addItem('ℹ️ CSV Import Info', 'showCSVImportInfo')
    .addItem('ℹ️ PDF Import Info', 'showPDFImportInfo')
    .addSeparator()
    .addItem('📊 Transaction Order Stats', 'getTransactionOrderStats');
  menu.addSubMenu(importMenu);
  
  // 🧪 ADVANCED TOOLS - For debugging and testing
  const advancedMenu = ui.createMenu('🧪 Advanced Tools')
    .addItem('📋 Show Configuration', 'showConfiguration')
    .addItem('🧪 Test Email Parsing', 'testEmailParsing')
    .addItem('📋 Review Pending Transactions', 'reviewPendingTransactions')
    .addSeparator()
    .addItem('💰 Test PayPal Processing', 'testPayPalProcessing')
    .addItem('💳 Debug PayPal Emails', 'debugPayPalEmails')
    .addSeparator()
    .addItem('🧠 Test Historical Categorization', 'testHistoricalCategorization')
    .addItem('🔗 Test Historical Integration', 'testHistoricalIntegration')
    .addSeparator()
    .addItem('🔍 Diagnostic Category Analysis', 'diagnosticCategoryLearning')
    .addItem('🧠 Force Learn Categories', 'forceLearnCategoriesLowThreshold');
  menu.addSubMenu(advancedMenu);

  menu.addToUi();
}

// SUMMARY OF CHANGES MADE:
// ✅ Removed dead functions: emergencySheetNameValidation, auditAllSheetCreationCalls
// ✅ Fixed broken emoji characters in Advanced Tools menu
// ✅ Confirmed all remaining menu items point to existing functions
// ✅ Kept all working functionality accessible
// ✅ Maintained logical organization of menu structure

// FUNCTIONS VERIFIED TO EXIST:
// Main Actions: runFullAutomation, quickSetup
// Dashboard: updateDashboard, refreshHoldings, updateNetWorth, initializeHoldingsData
// Transactions: processNewEmails, pairStagedTransfers, cleanupStaleTransactions, learnCategoriesFromTransactions, applyPDFTrainingToExistingTransactions, sortAllTransactions
// Maintenance: removeDuplicateTransactions, runSystemHealthCheck, generateStreamlinedAnalysisReport, testEnhancedEmailParsing
// Import: testImportSystem, showCSVImportInfo, showPDFImportInfo, getTransactionOrderStats
// Advanced: showConfiguration, testEmailParsing, reviewPendingTransactions, testPayPalProcessing, debugPayPalEmails, testHistoricalCategorization, testHistoricalIntegration, diagnosticCategoryLearning, forceLearnCategoriesLowThreshold
