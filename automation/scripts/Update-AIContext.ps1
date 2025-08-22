# PowerShell script to automate AI context updates
# Place in project root and run after each development session

param(
    [string]$SessionNotes = "Development session completed"
)

Write-Host "🔄 Updating AI Context System..." -ForegroundColor Green

# Navigate to AI Context System
Push-Location "04-Utilities-Tools\AI-Context-System"

try {
    # Run the context accelerator
    python ai_context_accelerator.py
    
    # Get current session log
    $Today = Get-Date -Format "yyyy-MM-dd"
    $SessionFile = "SESSION_LOG_$Today.md"
    
    # Add session notes if provided
    if ($SessionNotes -ne "Development session completed") {
        Add-Content -Path $SessionFile -Value "`n## 📝 Session Notes"
        Add-Content -Path $SessionFile -Value "**Time**: $(Get-Date -Format 'HH:mm:ss')"
        Add-Content -Path $SessionFile -Value "**Notes**: $SessionNotes"
        Add-Content -Path $SessionFile -Value ""
        
        Write-Host "✅ Added session notes to $SessionFile" -ForegroundColor Green
    }
    
    # Auto-commit if there are changes
    Set-Location ..\..
    git add "04-Utilities-Tools\AI-Context-System\"
    
    $Changes = git diff --cached --name-only | Where-Object { $_ -like "*AI-Context-System*" }
    if ($Changes) {
        $CommitMsg = "Auto-update AI context: $SessionNotes"
        git commit -m $CommitMsg
        Write-Host "✅ Auto-committed AI context updates" -ForegroundColor Green
    }
    
    Write-Host "🎯 AI Context System updated successfully!" -ForegroundColor Cyan
    Write-Host "   📄 Context package regenerated" -ForegroundColor Gray
    Write-Host "   📝 Session log updated: $SessionFile" -ForegroundColor Gray
    Write-Host "   📋 Ready for next AI session" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error updating AI context: $_" -ForegroundColor Red
} finally {
    Pop-Location
}

# Usage examples:
# .\Update-AIContext.ps1
# .\Update-AIContext.ps1 -SessionNotes "Fixed email parsing bug"
# .\Update-AIContext.ps1 -SessionNotes "Menu optimization completed"
