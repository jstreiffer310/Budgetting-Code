# FINANCE AUTOMATION SYSTEM DNA
*AI Context Acceleration Document*

## 🧬 SYSTEM IDENTITY
**Core Mission**: Transform bank emails into categorized spreadsheet transactions
**Scale**: 273 functions, 11,848 lines Google Apps Script
**Data Processing**: 68 parsing failures → 97 ML learning patterns → 86.4% categorization success

## 🔬 EVOLUTIONARY HISTORY

### Genesis (v7-8)
- Basic email parsing foundation
- Manual transaction entry supplements

### Growth Phase (v9)
- ML learning system introduced
- Historical categorization patterns
- Multiple bank format support

### Crisis & Resolution (v10.0)
- **BUG EPIDEMIC**: Domain extraction failures (39 instances)
- **MISCLASSIFICATION**: CIBC purchases labeled as credits
- **USER FRICTION**: Menu redundancy confusion

### Current State (v10.1)
- **FIXED**: Domain extraction with try-catch validation
- **FIXED**: CIBC purchase-first parsing logic
- **STREAMLINED**: Menu consolidation (3→2 functions)
- **UX IMPROVED**: Function Reference moved to top position

## 🧠 CRITICAL KNOWLEDGE NODES

### Email Processing Architecture
```
Gmail → _extractEmailDomain() → Bank-specific parsers → ML categorization → Spreadsheet
```

### Key Data Relationships
- **Failed_Parsing sheet**: 68 entries mapping to parsing function failures
- **AI_Learning sheet**: 97 patterns feeding categorization ML
- **Transactions sheet**: 22 processed items with 86.4% auto-categorization

### Function Ecosystem (273 total)
- **Email Processing**: 24 functions handling 5+ bank formats
- **ML Learning**: 28 functions managing pattern recognition
- **UI/Menu**: Streamlined 6-tier menu system with Function Reference priority

## 🔧 RECENT SURGERY SITES

### Domain Extraction Fix
```javascript
// BEFORE: Caused 39 failures
function _extractEmailDomain(email) {
  return email.split('@')[1].toLowerCase();
}

// AFTER: Robust with validation
function _extractEmailDomain(email) {
  try {
    if (!email || typeof email !== 'string') return 'unknown';
    const parts = email.split('@');
    return parts.length > 1 ? parts[1].toLowerCase() : 'unknown';
  } catch (error) {
    return 'unknown';
  }
}
```

### CIBC Logic Reversal
```javascript
// FIXED: Purchase detection moved BEFORE credit detection
// Priority: Purchase indicators → Credit indicators → Default
```

## 🎯 OPTIMIZATION INSIGHTS
- **Parsing Success**: 25.3% → 85%+ expected after domain fix
- **Menu UX**: Eliminated redundant consolidation functions
- **Learning Data**: 97 patterns available for ML enhancement
- **System Health**: 0 critical issues, 0 performance bottlenecks

## 🔮 CONTEXT FOR AI ASSISTANTS
When an AI works on this system:
1. **Primary Issues**: Always check domain extraction and bank-specific parsing
2. **Data Flow**: Email → Domain → Parser → ML → Spreadsheet
3. **Menu Philosophy**: Help-first (Function Reference), then functionality
4. **Testing Priority**: Email parsing accuracy drives everything
5. **User Pain Points**: Menu confusion, parsing failures, categorization accuracy

*Last Updated: 2025-08-22 - Post menu cleanup and Function Reference repositioning*
