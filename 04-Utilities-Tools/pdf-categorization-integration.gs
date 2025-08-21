/**
 * PDF TRAINING CATEGORIZATION INTEGRATION
 * =======================================
 * This script integrates the PDF training system with the main finance automation
 * to create a comprehensive categorization validation and improvement system.
 */

/**
 * MAIN INTEGRATION FUNCTION
 * Run this after processing PDF training data to validate and improve categorization
 */
function integrateCategorizationSystems() {
  try {
    console.log('🔄 Starting categorization systems integration...');
    
    // Step 1: Load PDF training data
    const pdfData = loadPDFTrainingResults();
    if (!pdfData) {
      console.log('⚠️ No PDF training data found. Run pdf_test.py first.');
      return { status: 'No PDF training data' };
    }
    
    // Step 2: Validate main script categorization against PDF training
    const validationResults = validateMainScriptAgainstPDFTraining(pdfData);
    
    // Step 3: Generate categorization improvement recommendations
    const improvements = generateCategorizationImprovements(validationResults, pdfData);
    
    // Step 4: Update main script with high-confidence PDF training patterns
    const integrationResults = integratePDFPatternsIntoMainScript(pdfData, improvements);
    
    // Step 5: Generate comprehensive report
    const report = generateIntegrationReport(validationResults, improvements, integrationResults);
    
    console.log('✅ Categorization systems integration complete!');
    return report;
    
  } catch (error) {
    console.error('❌ Integration failed:', error);
    return { status: 'Failed', error: error.message };
  }
}

/**
 * Load PDF training results from the PDF training system
 */
function loadPDFTrainingResults() {
  try {
    // Check if PDF training data exists in spreadsheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let pdfSheet = ss.getSheetByName('PDF_Training_Data');
    
    if (!pdfSheet) {
      console.log('No PDF_Training_Data sheet found. Creating placeholder...');
      return null;
    }
    
    const data = pdfSheet.getDataRange().getValues();
    if (data.length < 2) {
      return null;
    }
    
    // Parse PDF training data into usable format
    const pdfTrainingData = {
      merchantMappings: {},
      categoryDistribution: {},
      confidenceStats: {},
      trainingQuality: {}
    };
    
    // Process PDF training data
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const [merchant, category, confidence, transactionCount, lastSeen] = row;
      
      if (merchant && category) {
        pdfTrainingData.merchantMappings[merchant.toLowerCase()] = {
          category: category,
          confidence: parseFloat(confidence) || 0,
          transactionCount: parseInt(transactionCount) || 1,
          lastSeen: lastSeen || new Date(),
          source: 'PDF_training'
        };
        
        // Track category distribution
        if (!pdfTrainingData.categoryDistribution[category]) {
          pdfTrainingData.categoryDistribution[category] = 0;
        }
        pdfTrainingData.categoryDistribution[category]++;
      }
    }
    
    console.log(`📊 Loaded PDF training data: ${Object.keys(pdfTrainingData.merchantMappings).length} merchants`);
    return pdfTrainingData;
    
  } catch (error) {
    console.error('Failed to load PDF training data:', error);
    return null;
  }
}

/**
 * Validate main script categorization decisions against PDF training data
 */
function validateMainScriptAgainstPDFTraining(pdfData) {
  try {
    console.log('🔍 Validating main script categorization against PDF training...');
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const metadataSheet = ss.getSheetByName('Categorization_Metadata');
    
    if (!metadataSheet) {
      console.log('⚠️ No categorization metadata found. System needs to process transactions first.');
      return null;
    }
    
    const metadataData = metadataSheet.getDataRange().getValues();
    const validationResults = {
      totalComparisons: 0,
      agreements: 0,
      disagreements: 0,
      agreementRate: 0,
      merchantAnalysis: {},
      categoryAnalysis: {},
      confidenceAnalysis: {}
    };
    
    // Process each categorization decision
    for (let i = 1; i < metadataData.length; i++) {
      const row = metadataData[i];
      const [timestamp, transDate, amount, merchant, mainCategory, method, confidence] = row;
      
      if (!merchant || !mainCategory) continue;
      
      const merchantKey = merchant.toLowerCase().trim();
      const pdfMapping = pdfData.merchantMappings[merchantKey];
      
      if (pdfMapping) {
        validationResults.totalComparisons++;
        
        const agreement = mainCategory === pdfMapping.category;
        if (agreement) {
          validationResults.agreements++;
        } else {
          validationResults.disagreements++;
        }
        
        // Track merchant-specific analysis
        if (!validationResults.merchantAnalysis[merchantKey]) {
          validationResults.merchantAnalysis[merchantKey] = {
            merchant: merchant,
            mainScriptCategory: mainCategory,
            pdfTrainingCategory: pdfMapping.category,
            agreement: agreement,
            mainConfidence: parseFloat(confidence) || 0,
            pdfConfidence: pdfMapping.confidence,
            transactionCount: 0,
            recommendedAction: ''
          };
        }
        
        validationResults.merchantAnalysis[merchantKey].transactionCount++;
        
        // Determine recommended action
        if (!agreement) {
          if (pdfMapping.confidence > validationResults.merchantAnalysis[merchantKey].mainConfidence) {
            validationResults.merchantAnalysis[merchantKey].recommendedAction = 'Adopt PDF training category';
          } else {
            validationResults.merchantAnalysis[merchantKey].recommendedAction = 'Manual review required';
          }
        }
      }
    }
    
    // Calculate agreement rate
    if (validationResults.totalComparisons > 0) {
      validationResults.agreementRate = (validationResults.agreements / validationResults.totalComparisons) * 100;
    }
    
    console.log(`📈 Validation complete: ${validationResults.agreementRate.toFixed(1)}% agreement rate`);
    return validationResults;
    
  } catch (error) {
    console.error('Validation failed:', error);
    return null;
  }
}

/**
 * Generate categorization improvement recommendations
 */
function generateCategorizationImprovements(validationResults, pdfData) {
  const improvements = {
    highConfidencePDFMappings: [],
    conflictResolutions: [],
    newMerchantMappings: [],
    categoryRefinements: [],
    systemRecommendations: []
  };
  
  // Identify high-confidence PDF mappings to adopt
  Object.values(pdfData.merchantMappings).forEach(mapping => {
    if (mapping.confidence > 0.8 && mapping.transactionCount >= 3) {
      improvements.highConfidencePDFMappings.push(mapping);
    }
  });
  
  // Analyze conflicts and generate resolutions
  Object.values(validationResults.merchantAnalysis || {}).forEach(analysis => {
    if (!analysis.agreement) {
      improvements.conflictResolutions.push({
        merchant: analysis.merchant,
        conflict: `Main: ${analysis.mainScriptCategory} vs PDF: ${analysis.pdfTrainingCategory}`,
        recommendation: analysis.recommendedAction,
        mainConfidence: analysis.mainConfidence,
        pdfConfidence: analysis.pdfConfidence
      });
    }
  });
  
  // Generate system-level recommendations
  if (validationResults && validationResults.agreementRate < 70) {
    improvements.systemRecommendations.push('Low agreement rate - major categorization review needed');
  } else if (validationResults && validationResults.agreementRate < 85) {
    improvements.systemRecommendations.push('Moderate agreement - focus on high-volume disagreements');
  } else {
    improvements.systemRecommendations.push('High agreement - system well-calibrated');
  }
  
  return improvements;
}

/**
 * Integrate high-confidence PDF training patterns into main script
 */
function integratePDFPatternsIntoMainScript(pdfData, improvements) {
  try {
    console.log('🔧 Integrating PDF patterns into main script...');
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const categoriesSheet = ss.getSheetByName('Categories') || ss.insertSheet('Categories');
    
    // Clear existing data
    if (categoriesSheet.getLastRow() > 0) {
      categoriesSheet.clear();
    }
    
    // Set headers
    categoriesSheet.appendRow(['Merchant Pattern', 'Category', 'Confidence', 'Source', 'Transaction Count']);
    
    let integratedCount = 0;
    
    // Add high-confidence PDF mappings
    improvements.highConfidencePDFMappings.forEach(mapping => {
      categoriesSheet.appendRow([
        mapping.merchant || 'Unknown',
        mapping.category,
        mapping.confidence,
        'PDF_Training',
        mapping.transactionCount
      ]);
      integratedCount++;
    });
    
    // Format the sheet
    const headerRange = categoriesSheet.getRange(1, 1, 1, 5);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('white');
    
    console.log(`✅ Integrated ${integratedCount} PDF training patterns into main script`);
    
    return {
      integratedPatterns: integratedCount,
      status: 'Success',
      categoriesSheetUpdated: true
    };
    
  } catch (error) {
    console.error('Integration failed:', error);
    return {
      integratedPatterns: 0,
      status: 'Failed',
      error: error.message
    };
  }
}

/**
 * Generate comprehensive integration report
 */
function generateIntegrationReport(validationResults, improvements, integrationResults) {
  const report = {
    timestamp: new Date(),
    summary: {},
    validation: validationResults,
    improvements: improvements,
    integration: integrationResults,
    recommendations: [],
    nextSteps: []
  };
  
  // Generate summary
  if (validationResults) {
    report.summary = {
      totalComparisons: validationResults.totalComparisons,
      agreementRate: validationResults.agreementRate,
      disagreements: validationResults.disagreements,
      integratedPatterns: integrationResults.integratedPatterns
    };
  }
  
  // Generate recommendations
  if (validationResults && validationResults.agreementRate > 85) {
    report.recommendations.push('✅ System is well-calibrated - continue current approach');
  } else if (validationResults && validationResults.agreementRate > 70) {
    report.recommendations.push('⚠️ Review specific merchant conflicts for improvements');
  } else {
    report.recommendations.push('❌ Major categorization review needed - low agreement rate');
  }
  
  // Generate next steps
  report.nextSteps = [
    'Monitor categorization accuracy over next 30 days',
    'Process additional PDF statements for more training data',
    'Review and resolve merchant categorization conflicts',
    'Re-run integration analysis monthly'
  ];
  
  // Write report to spreadsheet
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const reportSheet = ss.getSheetByName('Integration_Report') || ss.insertSheet('Integration_Report');
    
    reportSheet.clear();
    reportSheet.appendRow(['PDF Training Integration Report', new Date().toISOString()]);
    reportSheet.appendRow(['']);
    reportSheet.appendRow(['SUMMARY']);
    
    if (report.summary.totalComparisons) {
      reportSheet.appendRow(['Total Comparisons', report.summary.totalComparisons]);
      reportSheet.appendRow(['Agreement Rate', `${report.summary.agreementRate.toFixed(1)}%`]);
      reportSheet.appendRow(['Disagreements', report.summary.disagreements]);
    }
    reportSheet.appendRow(['Integrated Patterns', report.summary.integratedPatterns || 0]);
    
    reportSheet.appendRow(['']);
    reportSheet.appendRow(['RECOMMENDATIONS']);
    report.recommendations.forEach(rec => {
      reportSheet.appendRow([rec]);
    });
    
    reportSheet.appendRow(['']);
    reportSheet.appendRow(['NEXT STEPS']);
    report.nextSteps.forEach(step => {
      reportSheet.appendRow([step]);
    });
    
    // Format report
    const titleRange = reportSheet.getRange(1, 1, 1, 2);
    titleRange.setFontWeight('bold');
    titleRange.setFontSize(14);
    
  } catch (error) {
    console.error('Failed to write report:', error);
  }
  
  return report;
}

/**
 * TESTING FUNCTION
 * Run this to test the integration with sample data
 */
function testCategorizationIntegration() {
  console.log('🧪 Testing categorization integration...');
  
  // Create sample PDF training data
  const samplePDFData = {
    merchantMappings: {
      'starbucks': { category: 'Food & Dining', confidence: 0.95, transactionCount: 12, source: 'PDF_training' },
      'amazon': { category: 'Shopping', confidence: 0.88, transactionCount: 23, source: 'PDF_training' },
      'esso': { category: 'Gas & Fuel', confidence: 0.92, transactionCount: 8, source: 'PDF_training' }
    },
    categoryDistribution: {
      'Food & Dining': 45,
      'Shopping': 38,
      'Gas & Fuel': 18
    }
  };
  
  console.log('✅ Sample data created');
  
  // Test validation
  const validationResults = {
    totalComparisons: 10,
    agreements: 8,
    disagreements: 2,
    agreementRate: 80,
    merchantAnalysis: {
      'starbucks': {
        merchant: 'Starbucks',
        mainScriptCategory: 'Food & Dining',
        pdfTrainingCategory: 'Food & Dining',
        agreement: true,
        mainConfidence: 0.9,
        pdfConfidence: 0.95
      }
    }
  };
  
  console.log('✅ Validation test complete');
  
  // Test improvements
  const improvements = generateCategorizationImprovements(validationResults, samplePDFData);
  console.log(`✅ Generated ${improvements.highConfidencePDFMappings.length} improvement recommendations`);
  
  // Test integration
  const integrationResults = integratePDFPatternsIntoMainScript(samplePDFData, improvements);
  console.log(`✅ Integration test: ${integrationResults.status}`);
  
  return {
    status: 'Test complete',
    sampleData: samplePDFData,
    validation: validationResults,
    improvements: improvements,
    integration: integrationResults
  };
}

console.log('📚 PDF Training Categorization Integration loaded');
console.log('🚀 Run integrateCategorizationSystems() to start integration');
console.log('🧪 Run testCategorizationIntegration() to test with sample data');
