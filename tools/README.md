# 🔧 Development Tools & Utilities

**Analysis tools, AI context system, and development utilities**

This directory contains sophisticated development tools that support the finance automation system with analysis, AI context generation, and comprehensive reporting.

## 📁 Directory Structure

```
tools/
├── ai-context/                 # AI onboarding & context acceleration
│   ├── ai_context_accelerator.py
│   ├── AI_ONBOARDING_GUIDE.md
│   ├── SYSTEM_DNA.md
│   ├── SESSION_LOG_*.md
│   └── README.md
├── analysis/                   # System analysis & reporting
│   ├── comprehensive_system_analyzer.py
│   ├── comprehensive_analysis_report.html
│   ├── function_reference_guide.md
│   ├── reports_viewer.py
│   └── critical_fixes_checklist.md
└── README.md                   # This file
```

## 🤖 AI Context System

### **Zero-Prompt AI Onboarding Acceleration**
The AI context system provides **instant context** for new AI sessions without lengthy explanations.

#### `ai_context_accelerator.py`
**Purpose**: Automatically generates comprehensive AI context
**Features**:
- 📊 Evolutionary system analysis
- 🎯 Rapid onboarding guides
- 📝 Session logging automation
- 🤖 AI-optimized format generation

```python
# Key functions:
generate_system_dna()           # Create evolutionary history
create_onboarding_guide()       # Generate quick-start context
process_session_logs()          # Analyze development sessions
optimize_ai_context()           # Format for AI consumption
```

**Usage**:
```bash
cd tools/ai-context
python ai_context_accelerator.py
```

#### Generated Files

##### `SYSTEM_DNA.md`
**Evolutionary history and system architecture**
- 🧬 System evolution timeline
- 🎯 Core functionality breakdown
- 📊 Performance metrics
- 🔧 Technical architecture

##### `AI_ONBOARDING_GUIDE.md`
**Rapid context for new AI sessions**
- ⚡ 2-minute system overview
- 🎯 Key concepts and terminology
- 📝 Important code locations
- 🔧 Quick troubleshooting guide

##### `SESSION_LOG_[DATE].md`
**Daily development session logs**
- 📅 Automatic session tracking
- 🔄 Commit timeline and context
- 📊 Development statistics
- 🎯 Change categorization

#### Session Log Format (Ultra-Condensed)
```markdown
# Session: 2025-08-22 | Branch: main | Auto-Generated

## 📊 Session Stats
**Files**: 15 | **Lines**: +247/-83 | **Commits**: 8

## 🔄 Development Timeline
**09:15** [abc123] Initialize repository | feature | Files:12 +1247/-0
**10:30** [def456] Fix parsing bug | bugfix | Files:1 +15/-8
**11:45** [ghi789] Update UI | ui | Files:2 +32/-15
```

## 📊 Analysis Tools

### `comprehensive_system_analyzer.py`
**Purpose**: Deep system analysis and reporting
**Features**:
- 🔍 Code structure analysis
- 📈 Performance profiling
- 🎯 Function documentation extraction
- 📊 Comprehensive HTML reporting

**Capabilities**:
```python
# Analysis functions:
analyze_code_structure()        # Parse Google Apps Script
extract_function_signatures()   # Document all functions
generate_performance_metrics()  # Analyze system performance
create_html_report()           # Generate visual reports
```

**Generated Output**:
- `comprehensive_analysis_report.html` - Visual system analysis
- `comprehensive_system_analysis.json` - Structured data
- `function_reference_guide.md` - Complete function documentation

### `function_reference_guide.md`
**Purpose**: Complete documentation of all 270+ functions
**Structure**:
```markdown
# Function Reference Guide

## 📧 Email Processing Functions (50+)
- processFinancialEmails() - Main email processing entry point
- _parseEmailContent() - Extract transaction data from emails
- _extractTransactionDetails() - Parse amounts and merchants

## 🎯 Categorization Functions (30+)
- _categorizationLogic() - Apply AI-powered categorization
- applyPDFTrainingData() - Use real CIBC training data
- _improveCategorization() - Continuous learning system

## 📊 Investment Functions (25+)
- updateHoldingsFromEmail() - Process trade confirmations
- refreshAllHoldings() - Update portfolio values
- calculatePortfolioMetrics() - Performance analytics
```

### `reports_viewer.py`
**Purpose**: Interactive HTML report viewer
**Features**:
- 🌐 Local web server for report viewing
- 📊 Interactive charts and graphs
- 🔍 Searchable function reference
- 📱 Mobile-responsive design

```python
# Usage:
python reports_viewer.py
# Opens browser at http://localhost:8080
```

### `critical_fixes_checklist.md`
**Purpose**: Track important system improvements
**Categories**:
- ✅ **Fixed Issues**: Resolved problems with solutions
- 🔄 **In Progress**: Current work items
- 📋 **Planned**: Future improvements
- 🚨 **Critical**: High-priority issues

## 🎯 Tool Integration

### Automated Workflow
```
Git Commit → Git Hook → AI Context Generation → Analysis Update → Report Generation
     ↓              ↓              ↓                 ↓               ↓
  Code Changes → Session Log → System DNA → Function Docs → HTML Report
```

### Tool Chain
1. **Development**: Code changes in core scripts
2. **Automation**: Git hooks trigger context generation
3. **Analysis**: System analyzer processes changes
4. **Documentation**: Function reference updates automatically
5. **Reporting**: HTML reports provide visual insights

## 📈 Performance Analysis

### System Metrics Tracked
- **Function Count**: 270+ documented functions
- **Code Coverage**: Analysis of all major components
- **Performance**: Execution time and memory usage
- **Complexity**: Cyclomatic complexity analysis
- **Documentation**: Coverage percentage

### Analysis Categories
```python
ANALYSIS_CATEGORIES = {
    'email_processing': 50+,      # Email parsing and processing
    'categorization': 30+,        # Transaction categorization
    'investments': 25+,           # Portfolio and holdings
    'dashboard': 40+,             # Reporting and analytics
    'import_export': 35+,         # CSV/PDF processing
    'utilities': 90+              # Helper and utility functions
}
```

## 🔧 Usage Examples

### Generate Complete Analysis
```bash
cd tools/analysis
python comprehensive_system_analyzer.py

# Output:
# ✅ Code structure analyzed
# ✅ Functions documented (270+)
# ✅ Performance metrics calculated
# ✅ HTML report generated
```

### Update AI Context
```bash
cd tools/ai-context
python ai_context_accelerator.py

# Output:
# ✅ System DNA updated
# ✅ Onboarding guide refreshed
# ✅ Session logs processed
# ✅ AI context optimized
```

### View Analysis Reports
```bash
cd tools/analysis
python reports_viewer.py

# Opens browser with:
# - Interactive function reference
# - System architecture diagrams
# - Performance metrics
# - Code coverage reports
```

## 🤖 AI Integration Features

### Context Acceleration
- **Rapid Onboarding**: Get AI up to speed in 2 minutes
- **Evolutionary History**: Understand system development
- **Session Awareness**: Track recent changes and context
- **Format Optimization**: AI-readable condensed format

### Automatic Updates
- **Git Hook Integration**: Updates on every commit
- **Session Logging**: Automatic development tracking
- **Context Regeneration**: Keep AI context current
- **Background Processing**: Zero-friction automation

## 📊 Tool Output Examples

### Function Analysis Output
```json
{
  "function_count": 273,
  "categories": {
    "email_processing": 52,
    "categorization": 31,
    "investments": 26,
    "dashboard": 42,
    "import_export": 37,
    "utilities": 85
  },
  "complexity_metrics": {
    "average_complexity": 3.2,
    "max_complexity": 12,
    "total_lines": 11848
  }
}
```

### AI Context Summary
```markdown
## 🎯 Quick Context
- **System Type**: Google Apps Script finance automation
- **Version**: v10.1 with PDF training integration
- **Functions**: 270+ documented
- **Training Data**: 679 real CIBC transactions
- **Accuracy**: 95%+ categorization with AI
```

## 🔧 Configuration

### Environment Setup
```bash
# Python dependencies
pip install beautifulsoup4 markdown2 pandas

# Optional: Enhanced analysis
pip install plotly dash streamlit
```

### Tool Configuration
```python
# ai_context_accelerator.py settings
CONFIG = {
    'session_log_format': 'condensed',
    'ai_optimization': True,
    'auto_update': True,
    'output_format': 'markdown'
}
```

## 📚 Related Documentation

- **[AI Context README](ai-context/README.md)** - Detailed AI system docs
- **[Core Scripts](../core/README.md)** - Main automation engine
- **[Automation](../automation/README.md)** - Git hooks and setup

---

**These tools provide comprehensive analysis and AI context acceleration, making the finance automation system easier to understand, maintain, and enhance.**

*Last updated: August 22, 2025*
