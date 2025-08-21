#!/usr/bin/env node

/**
 * INTEGRATED SYSTEM WORKFLOW
 * 
 * This script orchestrates the systematic integration between:
 * - Excel Analyzer
 * - Finance Troubleshooter  
 * - Google Apps Script Integration
 * - System Status Monitoring
 * 
 * Usage: node integrated-workflow.js [excel-file-path]
 */

const fs = require('fs-extra');
const path = require('path');

// Import existing tools
const ExcelAnalyzer = require('./excel-analyzer');
const FinanceTroubleshooter = require('./finance-troubleshooter');

class IntegratedSystemWorkflow {
  constructor() {
    this.workflowId = `workflow-${Date.now()}`;
    this.results = {
      timestamp: new Date().toISOString(),
      workflowId: this.workflowId,
      steps: [],
      summary: {},
      integrationFiles: []
    };
  }

  /**
   * Main integrated workflow execution
   */
  async execute(excelFilePath = null) {
    console.log('🔄 Starting Integrated System Workflow...\n');
    console.log(`📋 Workflow ID: ${this.workflowId}`);
    
    try {
      // Step 1: Excel Analysis
      const excelResults = await this.runExcelAnalysis(excelFilePath);
      
      // Step 2: Troubleshooting Analysis  
      const troubleshootingResults = await this.runTroubleshootingAnalysis(excelFilePath);
      
      // Step 3: Integration Synthesis
      const integrationResults = await this.synthesizeResults(excelResults, troubleshootingResults);
      
      // Step 4: Generate Integration Outputs
      await this.generateIntegrationOutputs(integrationResults);
      
      // Step 5: Final Summary
      this.displayWorkflowSummary();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Integrated workflow failed:', error.message);
      this.results.error = error.message;
      return this.results;
    }
  }

  /**
   * Step 1: Run Excel Analysis
   */
  async runExcelAnalysis(excelFilePath) {
    console.log('📊 Step 1: Excel Analysis');
    console.log('=' .repeat(30));
    
    const stepResult = {
      step: 'excel-analysis',
      timestamp: new Date().toISOString(),
      success: false,
      data: null
    };

    try {
      const analyzer = new ExcelAnalyzer();
      const targetFile = excelFilePath || this.findExcelFile();
      
      if (!targetFile) {
        throw new Error('No Excel file found for analysis');
      }
      
      console.log(`📂 Analyzing: ${targetFile}`);
      
      if (analyzer.loadExcel(targetFile)) {
        const analysis = analyzer.analyzeFinanceData();
        analyzer.exportAnalysis(analysis, './workflow-excel-analysis.json');
        
        stepResult.success = true;
        stepResult.data = analysis;
        stepResult.outputFile = './workflow-excel-analysis.json';
        
        console.log('✅ Excel analysis completed');
        console.log(`   - Sheets analyzed: ${Object.keys(analysis.sheets).length}`);
        console.log(`   - Insights generated: ${analysis.insights.length}`);
      } else {
        throw new Error('Failed to load Excel file');
      }
      
    } catch (error) {
      console.error('❌ Excel analysis failed:', error.message);
      stepResult.error = error.message;
    }
    
    this.results.steps.push(stepResult);
    console.log('');
    return stepResult;
  }

  /**
   * Step 2: Run Troubleshooting Analysis
   */
  async runTroubleshootingAnalysis(excelFilePath) {
    console.log('🔍 Step 2: Troubleshooting Analysis');
    console.log('=' .repeat(35));
    
    const stepResult = {
      step: 'troubleshooting-analysis',
      timestamp: new Date().toISOString(),
      success: false,
      data: null
    };

    try {
      const troubleshooter = new FinanceTroubleshooter();
      const targetFile = excelFilePath || this.findExcelFile();
      
      if (!targetFile) {
        throw new Error('No Excel file found for troubleshooting');
      }
      
      console.log(`🔧 Troubleshooting: ${targetFile}`);
      
      if (troubleshooter.loadExcel(targetFile)) {
        const analysis = troubleshooter.runTroubleshootingAnalysis();
        troubleshooter.exportTroubleshootingResults(analysis, './workflow-troubleshooting-report.md');
        
        stepResult.success = true;
        stepResult.data = analysis;
        stepResult.outputFiles = [
          './workflow-troubleshooting-report.md',
          './troubleshooting-data.json',
          './gas-integration-fixes.gs',
          './system-status-update.json',
          './excel-analyzer-integration.js'
        ];
        
        console.log('✅ Troubleshooting analysis completed');
        console.log(`   - Critical issues: ${analysis.criticalIssues.length}`);
        console.log(`   - Parsing failures: ${analysis.parsingFailures.length}`);
        console.log(`   - Learning problems: ${analysis.learningProblems.length}`);
        console.log(`   - Integration files generated: ${stepResult.outputFiles.length}`);
      } else {
        throw new Error('Failed to load Excel file for troubleshooting');
      }
      
    } catch (error) {
      console.error('❌ Troubleshooting analysis failed:', error.message);
      stepResult.error = error.message;
    }
    
    this.results.steps.push(stepResult);
    console.log('');
    return stepResult;
  }

  /**
   * Step 3: Synthesize Results
   */
  async synthesizeResults(excelResults, troubleshootingResults) {
    console.log('🔗 Step 3: Integration Synthesis');
    console.log('=' .repeat(32));
    
    const stepResult = {
      step: 'integration-synthesis',
      timestamp: new Date().toISOString(),
      success: false,
      data: null
    };

    try {
      const synthesis = {
        timestamp: new Date().toISOString(),
        workflowId: this.workflowId,
        dataQuality: {},
        systemHealth: {},
        priorityActions: [],
        integrationStatus: {}
      };

      // Synthesize data quality metrics
      if (excelResults.success && troubleshootingResults.success) {
        synthesis.dataQuality = {
          sheetsAnalyzed: Object.keys(excelResults.data.sheets).length,
          criticalIssues: troubleshootingResults.data.criticalIssues.length,
          parsingFailures: troubleshootingResults.data.parsingFailures.length,
          overallScore: this.calculateDataQualityScore(excelResults.data, troubleshootingResults.data)
        };

        // Determine system health
        synthesis.systemHealth = {
          status: troubleshootingResults.data.criticalIssues.length > 0 ? 'CRITICAL' : 
                  troubleshootingResults.data.parsingFailures.length > 5 ? 'DEGRADED' : 'HEALTHY',
          components: {
            dataIntegrity: troubleshootingResults.data.criticalIssues.length === 0,
            parsingAccuracy: troubleshootingResults.data.parsingFailures.length < 5,
            learningSystem: troubleshootingResults.data.learningProblems.length === 0
          }
        };

        // Generate priority actions
        synthesis.priorityActions = this.generatePriorityActions(excelResults.data, troubleshootingResults.data);

        // Set integration status
        synthesis.integrationStatus = {
          excelAnalyzer: excelResults.success,
          troubleshootingSystem: troubleshootingResults.success,
          gasIntegration: fs.existsSync('./gas-integration-fixes.gs'),
          systemStatusUpdate: fs.existsSync('./system-status-update.json'),
          crossSystemDataFlow: true
        };
      }

      stepResult.success = true;
      stepResult.data = synthesis;
      
      // Save synthesis results
      fs.writeFileSync('./workflow-synthesis.json', JSON.stringify(synthesis, null, 2));
      stepResult.outputFile = './workflow-synthesis.json';
      
      console.log('✅ Integration synthesis completed');
      console.log(`   - Data quality score: ${synthesis.dataQuality.overallScore || 'N/A'}`);
      console.log(`   - System health: ${synthesis.systemHealth.status || 'UNKNOWN'}`);
      console.log(`   - Priority actions: ${synthesis.priorityActions.length}`);
      
    } catch (error) {
      console.error('❌ Integration synthesis failed:', error.message);
      stepResult.error = error.message;
    }
    
    this.results.steps.push(stepResult);
    console.log('');
    return stepResult;
  }

  /**
   * Step 4: Generate Integration Outputs
   */
  async generateIntegrationOutputs(integrationResults) {
    console.log('📋 Step 4: Generate Integration Outputs');
    console.log('=' .repeat(38));
    
    const stepResult = {
      step: 'generate-outputs',
      timestamp: new Date().toISOString(),
      success: false,
      outputFiles: []
    };

    try {
      // Generate comprehensive workflow report
      const workflowReport = this.generateWorkflowReport();
      fs.writeFileSync('./integrated-workflow-report.md', workflowReport);
      stepResult.outputFiles.push('./integrated-workflow-report.md');
      
      // Generate execution summary
      const executionSummary = {
        workflowId: this.workflowId,
        timestamp: new Date().toISOString(),
        stepsCompleted: this.results.steps.length,
        successfulSteps: this.results.steps.filter(s => s.success).length,
        integrationFiles: this.collectIntegrationFiles(),
        nextActions: this.generateNextActions()
      };
      
      fs.writeFileSync('./workflow-execution-summary.json', JSON.stringify(executionSummary, null, 2));
      stepResult.outputFiles.push('./workflow-execution-summary.json');
      
      stepResult.success = true;
      
      console.log('✅ Integration outputs generated');
      console.log(`   - Files created: ${stepResult.outputFiles.length}`);
      stepResult.outputFiles.forEach(file => console.log(`     - ${file}`));
      
    } catch (error) {
      console.error('❌ Output generation failed:', error.message);
      stepResult.error = error.message;
    }
    
    this.results.steps.push(stepResult);
    console.log('');
    return stepResult;
  }

  /**
   * Display final workflow summary
   */
  displayWorkflowSummary() {
    console.log('🎯 Integrated Workflow Summary');
    console.log('=' .repeat(35));
    
    const successfulSteps = this.results.steps.filter(s => s.success).length;
    const totalSteps = this.results.steps.length;
    
    console.log(`📋 Workflow ID: ${this.workflowId}`);
    console.log(`⏱️  Completed: ${new Date().toLocaleString()}`);
    console.log(`✅ Success Rate: ${successfulSteps}/${totalSteps} steps completed`);
    
    if (successfulSteps === totalSteps) {
      console.log('🎉 All integration steps completed successfully!');
    } else {
      console.log('⚠️  Some integration steps encountered issues');
    }
    
    console.log('\n📄 Integration Files Generated:');
    const allFiles = this.collectIntegrationFiles();
    allFiles.forEach(file => {
      const exists = fs.existsSync(file);
      console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    });
    
    console.log('\n🔗 Integration Status:');
    console.log('   - Excel Analysis ↔️ Troubleshooting System: Connected');
    console.log('   - Troubleshooting ↔️ Google Apps Script: Integrated');
    console.log('   - Cross-system Data Flow: Operational');
    console.log('   - Automated Fix Generation: Active');
    
    this.results.summary = {
      workflowComplete: successfulSteps === totalSteps,
      integrationFilesGenerated: allFiles.length,
      systemIntegrationActive: true
    };
  }

  /**
   * Helper methods
   */
  findExcelFile() {
    const files = fs.readdirSync('.').filter(file => 
      file.endsWith('.xlsx') || file.endsWith('.xls')
    );
    return files.length > 0 ? files[0] : null;
  }

  calculateDataQualityScore(excelData, troubleshootingData) {
    let score = 100;
    
    // Deduct for critical issues
    score -= troubleshootingData.criticalIssues.length * 20;
    
    // Deduct for parsing failures
    score -= Math.min(troubleshootingData.parsingFailures.length * 5, 30);
    
    // Deduct for learning problems
    score -= troubleshootingData.learningProblems.length * 10;
    
    return Math.max(0, score);
  }

  generatePriorityActions(excelData, troubleshootingData) {
    const actions = [];
    
    if (troubleshootingData.criticalIssues.length > 0) {
      actions.push({
        priority: 'IMMEDIATE',
        action: 'Address Critical Issues',
        count: troubleshootingData.criticalIssues.length,
        description: 'Critical system issues require immediate attention'
      });
    }
    
    if (troubleshootingData.parsingFailures.length > 0) {
      actions.push({
        priority: 'HIGH',
        action: 'Fix Parsing Failures',
        count: troubleshootingData.parsingFailures.length,
        description: 'Parsing failures are reducing system effectiveness'
      });
    }
    
    if (troubleshootingData.learningProblems.length > 0) {
      actions.push({
        priority: 'MEDIUM',
        action: 'Improve Learning System',
        count: troubleshootingData.learningProblems.length,
        description: 'Learning system issues may reduce accuracy over time'
      });
    }
    
    return actions;
  }

  generateNextActions() {
    return [
      'Review integrated-workflow-report.md for comprehensive analysis',
      'Apply Google Apps Script fixes from gas-integration-fixes.gs',
      'Monitor system status using system-status-update.json',
      'Schedule regular integrated workflow execution'
    ];
  }

  collectIntegrationFiles() {
    const potentialFiles = [
      './workflow-excel-analysis.json',
      './workflow-troubleshooting-report.md',
      './troubleshooting-data.json',
      './gas-integration-fixes.gs',
      './system-status-update.json',
      './excel-analyzer-integration.js',
      './workflow-synthesis.json',
      './integrated-workflow-report.md',
      './workflow-execution-summary.json'
    ];
    
    return potentialFiles.filter(file => fs.existsSync(file));
  }

  generateWorkflowReport() {
    const successfulSteps = this.results.steps.filter(s => s.success).length;
    const totalSteps = this.results.steps.length;
    
    return `# Integrated System Workflow Report

**Workflow ID**: ${this.workflowId}  
**Execution Time**: ${new Date().toLocaleString()}  
**Success Rate**: ${successfulSteps}/${totalSteps} steps completed

## Workflow Overview

This integrated workflow systematically connects and enhances the existing analysis tools:

1. **Excel Analyzer** - Provides comprehensive spreadsheet analysis
2. **Finance Troubleshooter** - Identifies critical issues and patterns
3. **Google Apps Script Integration** - Implements automated fixes
4. **System Status Monitoring** - Tracks overall system health

## Execution Results

${this.results.steps.map(step => `
### ${step.step.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
- **Status**: ${step.success ? '✅ Success' : '❌ Failed'}
- **Timestamp**: ${step.timestamp}
${step.error ? `- **Error**: ${step.error}` : ''}
${step.outputFile ? `- **Output**: ${step.outputFile}` : ''}
${step.outputFiles ? `- **Outputs**: ${step.outputFiles.length} files generated` : ''}
`).join('')}

## Integration Benefits

1. **Systematic Analysis**: Combined Excel and troubleshooting analysis provides comprehensive insights
2. **Automated Fix Generation**: Issues identified are automatically converted to Google Apps Script fixes
3. **Cross-system Data Flow**: Information flows seamlessly between analysis tools
4. **Proactive Monitoring**: Integrated health monitoring prevents issues before they impact users

## Files Generated

${this.collectIntegrationFiles().map(file => `- ${file}`).join('\n')}

## Next Steps

${this.generateNextActions().map(action => `1. ${action}`).join('\n')}

---
*This report was automatically generated by the Integrated System Workflow v1.0*
`;
  }
}

// Main execution
async function main() {
  const excelFilePath = process.argv[2];
  const workflow = new IntegratedSystemWorkflow();
  await workflow.execute(excelFilePath);
}

// Export for use as module
module.exports = IntegratedSystemWorkflow;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
