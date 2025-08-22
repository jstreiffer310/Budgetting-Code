#!/usr/bin/env python3
"""
AI Context Accelerator - Generates compressed system knowledge for rapid AI onboarding
"""

import json
import os
from datetime import datetime

def generate_ai_context_package():
    """Generate a comprehensive but concise AI context package"""
    
    context = {
        "system_identity": {
            "name": "Finance Automation V10.1",
            "type": "Google Apps Script",
            "purpose": "Bank email → categorized spreadsheet automation",
            "scale": "273 functions, 11.8k lines",
            "success_metrics": "86.4% auto-categorization, 97 ML patterns"
        },
        
        "critical_knowledge": {
            "architecture_flow": "Gmail → _extractEmailDomain() → Bank parsers → ML categorization → Spreadsheet",
            "data_ecosystem": {
                "Failed_Parsing": "68 entries - parsing failure analysis",
                "AI_Learning": "97 patterns - ML categorization training",
                "Transactions": "22 items - processed financial data"
            },
            "recent_major_fixes": [
                "Domain extraction null pointer → try-catch validation",
                "CIBC purchase/credit confusion → priority logic reversal",
                "Menu redundancy (3 consolidation functions → 2 streamlined)"
            ]
        },
        
        "ai_assistant_priorities": [
            "Email parsing accuracy drives everything",
            "Domain extraction is critical failure point",
            "Bank-specific parsing logic varies significantly",
            "Menu UX follows help-first philosophy",
            "ML learning patterns feed categorization success"
        ],
        
        "common_issues": {
            "parsing_failures": "Check _extractEmailDomain() and bank-specific parsers",
            "categorization_errors": "Review AI_Learning patterns and ML logic",
            "menu_confusion": "Streamlined consolidation functions, Function Reference first",
            "performance_bottlenecks": "Currently 0 - system optimized"
        },
        
        "context_acceleration_tips": [
            "Start with Failed_Parsing sheet to understand current issues",
            "Review comprehensive_system_analysis.json for data relationships",
            "Check Function Reference system for user-facing documentation",
            "Email processing = 24 functions handling 5+ bank formats",
            "Menu system has 6 tiers: Reference → Main → Dashboard → Transactions → Maintenance → Import → Advanced",
            "Always use Chrome for HTML reports (user preference over VS Code Simple Browser)",
            "Check SESSION_LOG files for detailed development history and context"
        ],
        
        "recent_session_context": {
            "date": "2025-08-22",
            "focus": "Menu redundancy cleanup and AI context acceleration system",
            "changes": [
                "Removed 3 redundant consolidation menu items",
                "Moved Function Reference to first menu position",
                "Created comprehensive AI context acceleration system",
                "Organized context files into AI-Context-System subfolder"
            ],
            "user_preferences": [
                "Chrome browser over VS Code Simple Browser",
                "Detail-oriented UI feedback",
                "Values systematic analysis before changes",
                "Prefers comprehensive documentation and automation"
            ]
        },
        
        "last_updated": datetime.now().isoformat(),
        "evolution_stage": "Post-menu cleanup, Function Reference optimization"
    }
    
    return context

def save_context_package():
    """Save the AI context package for future use"""
    context = generate_ai_context_package()
    
    # Save as JSON for programmatic use
    with open('ai_context_package.json', 'w') as f:
        json.dump(context, f, indent=2)
    
    # Save as readable markdown
    with open('AI_ONBOARDING_GUIDE.md', 'w', encoding='utf-8') as f:
        f.write("# AI Assistant Onboarding Guide\n\n")
        f.write("*Rapid context acceleration for Finance Automation system*\n\n")
        
        f.write("## 🎯 System Identity\n")
        for key, value in context["system_identity"].items():
            f.write(f"- **{key.replace('_', ' ').title()}**: {value}\n")
        
        f.write("\n## 🧠 Critical Knowledge\n")
        f.write(f"**Architecture**: {context['critical_knowledge']['architecture_flow']}\n\n")
        
        f.write("**Data Ecosystem**:\n")
        for sheet, desc in context["critical_knowledge"]["data_ecosystem"].items():
            f.write(f"- {sheet}: {desc}\n")
        
        f.write("\n**Recent Major Fixes**:\n")
        for fix in context["critical_knowledge"]["recent_major_fixes"]:
            f.write(f"- {fix}\n")
        
        f.write("\n## 🚀 AI Assistant Priorities\n")
        for priority in context["ai_assistant_priorities"]:
            f.write(f"- {priority}\n")
        
        f.write("\n## 🔧 Common Issues & Solutions\n")
        for issue, solution in context["common_issues"].items():
            f.write(f"- **{issue.replace('_', ' ').title()}**: {solution}\n")
        
        f.write("\n## ⚡ Context Acceleration Tips\n")
        for tip in context["context_acceleration_tips"]:
            f.write(f"- {tip}\n")
        
        f.write(f"\n*Generated: {context['last_updated']}*\n")
    
    print("✅ AI context package generated:")
    print("  📄 ai_context_package.json (programmatic)")
    print("  📖 AI_ONBOARDING_GUIDE.md (human-readable)")

if __name__ == "__main__":
    save_context_package()
