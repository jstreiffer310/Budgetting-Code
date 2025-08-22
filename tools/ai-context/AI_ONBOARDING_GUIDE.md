# AI Assistant Onboarding Guide

*Rapid context acceleration for Finance Automation system*

## 🎯 System Identity
- **Name**: Finance Automation V10.1
- **Type**: Google Apps Script
- **Purpose**: Bank email → categorized spreadsheet automation
- **Scale**: 273 functions, 11.8k lines
- **Success Metrics**: 86.4% auto-categorization, 97 ML patterns

## 🧠 Critical Knowledge
**Architecture**: Gmail → _extractEmailDomain() → Bank parsers → ML categorization → Spreadsheet

**Data Ecosystem**:
- Failed_Parsing: 68 entries - parsing failure analysis
- AI_Learning: 97 patterns - ML categorization training
- Transactions: 22 items - processed financial data

**Recent Major Fixes**:
- Domain extraction null pointer → try-catch validation
- CIBC purchase/credit confusion → priority logic reversal
- Menu redundancy (3 consolidation functions → 2 streamlined)

## 🚀 AI Assistant Priorities
- Email parsing accuracy drives everything
- Domain extraction is critical failure point
- Bank-specific parsing logic varies significantly
- Menu UX follows help-first philosophy
- ML learning patterns feed categorization success

## 🔧 Common Issues & Solutions
- **Parsing Failures**: Check _extractEmailDomain() and bank-specific parsers
- **Categorization Errors**: Review AI_Learning patterns and ML logic
- **Menu Confusion**: Streamlined consolidation functions, Function Reference first
- **Performance Bottlenecks**: Currently 0 - system optimized

## ⚡ Context Acceleration Tips
- Start with Failed_Parsing sheet to understand current issues
- Review comprehensive_system_analysis.json for data relationships
- Check Function Reference system for user-facing documentation
- Email processing = 24 functions handling 5+ bank formats
- Menu system has 6 tiers: Reference → Main → Dashboard → Transactions → Maintenance → Import → Advanced
- Always use Chrome for HTML reports (user preference over VS Code Simple Browser)
- Check SESSION_LOG files for detailed development history and context

*Generated: 2025-08-22T01:43:23.191827*
