# Quick Excel Analyzer - PowerShell Launcher
# Financial Intelligence Tool for Budget Analysis

param(
    [switch]$AutoInstall = $false
)

function Write-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host "  🔍 QUICK EXCEL ANALYZER - Financial Intelligence" -ForegroundColor Yellow
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This tool analyzes Excel files in your Downloads folder" -ForegroundColor Green
    Write-Host "and provides financial intelligence insights." -ForegroundColor Green
    Write-Host ""
}

function Test-NodeJS {
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
        Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
        return $false
    }
    return $false
}

function Test-ExcelJS {
    try {
        npm list exceljs 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ ExcelJS dependency found" -ForegroundColor Green
            return $true
        }
    }
    catch {
        return $false
    }
    return $false
}

function Install-ExcelJS {
    Write-Host "📦 Installing ExcelJS dependency..." -ForegroundColor Yellow
    try {
        npm install exceljs
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ ExcelJS installed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Failed to install ExcelJS" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Error installing ExcelJS: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Start-Analysis {
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    $analyzerPath = Join-Path $scriptPath "quick_excel_analyzer.js"
    
    if (-not (Test-Path $analyzerPath)) {
        Write-Host "❌ Analyzer script not found at: $analyzerPath" -ForegroundColor Red
        return $false
    }
    
    Write-Host "🚀 Starting Excel Analyzer..." -ForegroundColor Cyan
    Write-Host ""
    
    try {
        node $analyzerPath
        return $true
    }
    catch {
        Write-Host "❌ Error running analyzer: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Show-Help {
    Write-Host ""
    Write-Host "📖 USAGE:" -ForegroundColor Cyan
    Write-Host "  .\run_excel_analyzer.ps1                # Interactive mode"
    Write-Host "  .\run_excel_analyzer.ps1 -AutoInstall   # Auto-install dependencies"
    Write-Host ""
    Write-Host "🔧 REQUIREMENTS:" -ForegroundColor Cyan
    Write-Host "  • Node.js (https://nodejs.org/)"
    Write-Host "  • Excel files in Downloads folder"
    Write-Host ""
    Write-Host "💡 FEATURES:" -ForegroundColor Cyan
    Write-Host "  • Automatic Excel file detection"
    Write-Host "  • Financial intelligence analysis"
    Write-Host "  • Error pattern recognition"
    Write-Host "  • System health assessment"
    Write-Host "  • Actionable recommendations"
    Write-Host ""
}

# Main execution
Write-Banner

# Check Node.js
if (-not (Test-NodeJS)) {
    Show-Help
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Check ExcelJS
if (-not (Test-ExcelJS)) {
    if ($AutoInstall) {
        if (-not (Install-ExcelJS)) {
            Write-Host ""
            Write-Host "Manual installation required: npm install exceljs" -ForegroundColor Yellow
            Write-Host "Press any key to exit..." -ForegroundColor Yellow
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            exit 1
        }
    } else {
        Write-Host "❌ ExcelJS dependency not found" -ForegroundColor Red
        Write-Host ""
        $install = Read-Host "Would you like to install it now? (Y/n)"
        if ($install -eq "" -or $install.ToLower() -eq "y" -or $install.ToLower() -eq "yes") {
            if (-not (Install-ExcelJS)) {
                Write-Host ""
                Write-Host "Press any key to exit..." -ForegroundColor Yellow
                $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
                exit 1
            }
        } else {
            Write-Host ""
            Write-Host "Please install ExcelJS manually: npm install exceljs" -ForegroundColor Yellow
            Write-Host "Press any key to exit..." -ForegroundColor Yellow
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            exit 1
        }
    }
    Write-Host ""
}

# Run the analyzer
if (Start-Analysis) {
    Write-Host ""
    Write-Host "👋 Analysis complete!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Analysis failed" -ForegroundColor Red
    Show-Help
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
