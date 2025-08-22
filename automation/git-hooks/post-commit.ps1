# Fully automatic AI context logging - zero manual input required
# Captures maximum development context with minimal overhead

# Silent operation - suppress all output except errors
$ErrorActionPreference = 'SilentlyContinue'

# Get commit info automatically
$CommitHash = git rev-parse --short HEAD
$CommitMessage = git log -1 --pretty=%B --no-merges
$CommitDate = Get-Date -Format "yyyy-MM-dd"
$CommitTime = Get-Date -Format "HH:mm:ss"
$Branch = git branch --show-current

# Auto-detect change type from commit message
$ChangeType = "general"
if ($CommitMessage -match "(fix|bug|error)") { $ChangeType = "bugfix" }
elseif ($CommitMessage -match "(feature|add|new)") { $ChangeType = "feature" }
elseif ($CommitMessage -match "(update|modify|change)") { $ChangeType = "update" }
elseif ($CommitMessage -match "(menu|ui|interface)") { $ChangeType = "ui" }

# Get file changes count
$ChangedFiles = git diff-tree --no-commit-id --name-only -r HEAD
$NumChanges = ($ChangedFiles | Measure-Object).Count

# Auto-update AI context (if directory exists)
if (Test-Path "04-Utilities-Tools\AI-Context-System") {
    Push-Location "04-Utilities-Tools\AI-Context-System"
    
    # Auto-create/update session log
    $SessionFile = "SESSION_LOG_$CommitDate.md"
    
    # Create session log if it doesn't exist
    if (-not (Test-Path $SessionFile)) {
        @"
# Session Log: $CommitDate - Development Session

## 📅 Session Overview
**Date**: $CommitDate
**Branch**: $Branch
**Auto-generated**: $(Get-Date -Format 'HH:mm:ss')

## 🔄 Commits Made Today

"@ | Out-File -FilePath $SessionFile -Encoding UTF8
    }
    
    # Append commit with smart context
    $CommitEntry = @"

### [$CommitHash] $ChangeType
**Time**: $CommitTime | **Files**: $NumChanges changed
**Message**: $CommitMessage

"@
    
    Add-Content -Path $SessionFile -Value $CommitEntry -Encoding UTF8
    
    # Auto-regenerate context (silently)
    try {
        python ai_context_accelerator.py | Out-Null
    } catch {
        # Silent fail - no user interruption
    }
    
    # Navigate back
    Pop-Location
    
    # Auto-commit context updates (silently)
    git add "04-Utilities-Tools\AI-Context-System\" | Out-Null
    $Changes = git diff --cached --name-only | Where-Object { $_ -like "*AI-Context-System*" }
    if ($Changes) {
        git commit -m "Auto-context: $ChangeType ($CommitHash)" | Out-Null
    }
}

# Silent success - no output
exit 0
