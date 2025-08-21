# SYSTEM SETUP AND PERMISSIONS CONFIGURATION
# Resolves path permissions and default application issues
# Run as Administrator for full functionality

Write-Host "🔧 Setting up system permissions and default applications..." -ForegroundColor Cyan

# ===================== PATH PERMISSIONS =====================

Write-Host "`n📁 Configuring Path Permissions..." -ForegroundColor Yellow

# Ensure user has full control over their Documents and Desktop
$userPaths = @(
    "$env:USERPROFILE\Documents\GitHub",
    "$env:USERPROFILE\Desktop\Budgetting-System-Organized",
    "$env:USERPROFILE\Downloads"
)

foreach ($path in $userPaths) {
    if (Test-Path $path) {
        try {
            # Grant full control to current user
            $acl = Get-Acl $path
            $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
                $env:USERNAME, "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow"
            )
            $acl.SetAccessRule($accessRule)
            Set-Acl $path $acl -ErrorAction Stop
            Write-Host "✅ Permissions set for: $path" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ Failed to set permissions for: $path - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    else {
        Write-Host "⚠️  Path not found: $path" -ForegroundColor Yellow
    }
}

# ===================== EXECUTION POLICY =====================

Write-Host "`n🔐 Configuring PowerShell Execution Policy..." -ForegroundColor Yellow

try {
    # Set execution policy for current user (safer than system-wide)
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    Write-Host "✅ PowerShell execution policy set to RemoteSigned for current user" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to set execution policy: $($_.Exception.Message)" -ForegroundColor Red
}

# ===================== PYTHON SETUP =====================

Write-Host "`n🐍 Checking Python Installation..." -ForegroundColor Yellow

# Check if Python is installed and accessible
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python") {
        Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
        
        # Install required packages for PDF processing
        Write-Host "📦 Installing Python packages for PDF processing..." -ForegroundColor Cyan
        $packages = @("PyPDF2", "pdfplumber", "pandas", "openpyxl")
        
        foreach ($package in $packages) {
            try {
                pip install $package --user --quiet
                Write-Host "✅ Installed: $package" -ForegroundColor Green
            }
            catch {
                Write-Host "❌ Failed to install: $package" -ForegroundColor Red
            }
        }
    }
    else {
        Write-Host "❌ Python not found in PATH" -ForegroundColor Red
        Write-Host "💡 Install Python from: https://python.org/downloads" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "❌ Python not accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# ===================== NODE.JS SETUP =====================

Write-Host "`n📦 Checking Node.js Installation..." -ForegroundColor Yellow

try {
    $nodeVersion = node --version 2>&1
    if ($nodeVersion -match "v\d+") {
        Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
        
        # Install useful packages for file processing
        Write-Host "📦 Installing Node.js packages..." -ForegroundColor Cyan
        $nodePackages = @("pdf-parse", "xlsx", "csv-parser")
        
        foreach ($package in $nodePackages) {
            try {
                npm install -g $package --silent
                Write-Host "✅ Installed: $package" -ForegroundColor Green
            }
            catch {
                Write-Host "❌ Failed to install: $package" -ForegroundColor Red
            }
        }
    }
    else {
        Write-Host "❌ Node.js not found in PATH" -ForegroundColor Red
        Write-Host "💡 Install Node.js from: https://nodejs.org" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "❌ Node.js not accessible: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 System setup complete!" -ForegroundColor Green
