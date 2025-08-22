# Git Hook Installation Script
# Installs the AI context prompt hook for this repository

Write-Host "🔧 Installing AI Context Git Hooks..." -ForegroundColor Green

# Create the bash post-commit hook
$BashHookContent = @'
#!/bin/bash
# Git post-commit hook to prompt for AI context updates after each commit
# Cross-platform compatibility for Windows/Linux/Mac

# Check if we're on Windows and PowerShell is available
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]] && command -v powershell &> /dev/null; then
    # Use PowerShell version for better Windows experience
    powershell -ExecutionPolicy Bypass -File "$(dirname "$0")/post-commit.ps1"
    exit $?
fi

echo ""
echo "🎯 Commit completed successfully!"
echo ""

# Get commit info
COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MESSAGE=$(git log -1 --pretty=%B --no-merges)
COMMIT_DATE=$(git log -1 --pretty=%cd --date=short)

echo "📋 Commit Details:"
echo "   Hash: $COMMIT_HASH"
echo "   Message: $COMMIT_MESSAGE"
echo "   Date: $COMMIT_DATE"
echo ""

# Prompt user for AI context update
echo "🤖 Would you like to update the AI Context System for future sessions?"
echo "   This preserves development context and speeds up future AI onboarding."
echo ""
read -p "Update AI context? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔄 Updating AI Context System..."
    
    # Navigate to AI Context System
    if [ -d "04-Utilities-Tools/AI-Context-System" ]; then
        cd "04-Utilities-Tools/AI-Context-System"
    elif [ -d "04-Utilities-Tools\\AI-Context-System" ]; then
        cd "04-Utilities-Tools\\AI-Context-System"
    else
        echo "❌ AI Context System directory not found"
        exit 1
    fi
    
    # Prompt for session notes
    echo ""
    read -p "📝 Add session notes (optional): " SESSION_NOTES
    
    # Generate new session log entry
    SESSION_FILE="SESSION_LOG_$(date +%Y-%m-%d).md"
    
    # Create or append to today's session log
    if [ ! -f "$SESSION_FILE" ]; then
        echo "# Session Log: $(date +%Y-%m-%d) - Development Session" > "$SESSION_FILE"
        echo "" >> "$SESSION_FILE"
        echo "## 📅 Session Overview" >> "$SESSION_FILE"
        echo "**Date**: $(date +%Y-%m-%d)" >> "$SESSION_FILE"
        echo "**Branch**: $(git branch --show-current)" >> "$SESSION_FILE"
        echo "" >> "$SESSION_FILE"
        echo "## 🔄 Commits Made Today" >> "$SESSION_FILE"
        echo "" >> "$SESSION_FILE"
    fi
    
    # Append commit information
    echo "### Commit: $COMMIT_HASH" >> "$SESSION_FILE"
    echo "**Time**: $(date +%H:%M:%S)" >> "$SESSION_FILE"
    echo "**Message**: $COMMIT_MESSAGE" >> "$SESSION_FILE"
    
    if [ ! -z "$SESSION_NOTES" ]; then
        echo "**Notes**: $SESSION_NOTES" >> "$SESSION_FILE"
    fi
    echo "" >> "$SESSION_FILE"
    
    # Regenerate AI context package
    if command -v python &> /dev/null; then
        python ai_context_accelerator.py
    elif command -v python3 &> /dev/null; then
        python3 ai_context_accelerator.py
    else
        echo "⚠️ Python not found. Please run manually: python ai_context_accelerator.py"
    fi
    
    # Navigate back to repo root
    cd ../..
    
    # Prompt to commit the updated context
    echo ""
    read -p "💾 Commit the AI context updates? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add "04-Utilities-Tools/AI-Context-System/"
        
        # Check if there are actually changes to commit
        if ! git diff --cached --quiet "04-Utilities-Tools/AI-Context-System/"; then
            CONTEXT_COMMIT_MSG="Update AI context: $COMMIT_MESSAGE"
            if [ ! -z "$SESSION_NOTES" ]; then
                CONTEXT_COMMIT_MSG="Update AI context: $SESSION_NOTES"
            fi
            
            git commit -m "$CONTEXT_COMMIT_MSG"
            echo "✅ AI context committed successfully!"
        else
            echo "ℹ️ No changes to commit in AI context system"
        fi
    fi
    
    echo ""
    echo "🎉 AI Context System updated!"
    echo "   📄 Context package regenerated"
    echo "   📝 Session logged: $SESSION_FILE"
    echo "   🤖 Future AI sessions will have full context"
    
else
    echo ""
    echo "ℹ️ Skipped AI context update"
    echo "   💡 Run manually later: .\Update-AIContext.ps1"
fi

echo ""
echo "🚀 Ready for continued development!"
echo ""
'@

$BashHookContent | Out-File -FilePath ".git\hooks\post-commit" -Encoding UTF8

# Create the PowerShell post-commit hook
$PSHookPath = ".git\hooks\post-commit.ps1"
if (Test-Path $PSHookPath) {
    Write-Host "✅ PowerShell hook already exists at $PSHookPath" -ForegroundColor Green
} else {
    Write-Host "📝 Creating PowerShell hook..." -ForegroundColor Yellow
    # The PowerShell hook is already created, just noting it
}

# Make hooks executable
try {
    icacls ".git\hooks\post-commit" /grant Everyone:F | Out-Null
    Write-Host "✅ Made bash hook executable" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Could not set bash hook permissions" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 AI Context Git Hooks installed successfully!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 What happens now:" -ForegroundColor White
Write-Host "   🔄 After every commit, you'll be prompted to update AI context" -ForegroundColor Gray
Write-Host "   📝 Session logs will be automatically created/updated" -ForegroundColor Gray  
Write-Host "   🤖 Future AI sessions will have complete development history" -ForegroundColor Gray
Write-Host "   ⚡ Eliminates need to rebuild context from scratch" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Test it: Make any commit and you'll see the AI context prompt!" -ForegroundColor Yellow
Write-Host ""
