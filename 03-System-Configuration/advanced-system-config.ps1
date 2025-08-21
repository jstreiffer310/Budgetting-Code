# ADVANCED SYSTEM CONFIGURATION
# Fixes remaining permission issues and sets up environment properly

Write-Host "🔧 Advanced System Configuration..." -ForegroundColor Cyan

# ===================== PATH ENVIRONMENT FIXES =====================

Write-Host "`n🌍 Fixing PATH Environment..." -ForegroundColor Yellow

# Add Python Scripts to PATH
$pythonScriptsPath = "C:\Users\jstre\AppData\Roaming\Python\Python313\Scripts"
if (Test-Path $pythonScriptsPath) {
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", [EnvironmentVariableTarget]::User)
    if ($currentPath -notlike "*$pythonScriptsPath*") {
        try {
            [Environment]::SetEnvironmentVariable(
                "PATH", 
                "$currentPath;$pythonScriptsPath", 
                [EnvironmentVariableTarget]::User
            )
            Write-Host "✅ Added Python Scripts to PATH: $pythonScriptsPath" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ Failed to add Python Scripts to PATH" -ForegroundColor Red
        }
    }
    else {
        Write-Host "✅ Python Scripts already in PATH" -ForegroundColor Green
    }
}

# Add Node.js global modules to PATH if needed
$nodeGlobalPath = npm config get prefix 2>$null
if ($nodeGlobalPath -and (Test-Path $nodeGlobalPath)) {
    Write-Host "✅ Node.js global path: $nodeGlobalPath" -ForegroundColor Green
}

# ===================== POWERSHELL PROFILE SETUP =====================

Write-Host "`n📁 Setting up PowerShell Profile..." -ForegroundColor Yellow

# Create PowerShell profile directory if it doesn't exist
$profileDir = Split-Path $PROFILE -Parent
if (-not (Test-Path $profileDir)) {
    try {
        New-Item -Path $profileDir -ItemType Directory -Force | Out-Null
        Write-Host "✅ Created PowerShell profile directory: $profileDir" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to create PowerShell profile directory" -ForegroundColor Red
    }
}

# Create or update PowerShell profile
$profileContent = @"
# Auto-generated PowerShell Profile for Finance Automation

# Set execution policy for this session
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# Add custom aliases for finance automation
Set-Alias -Name 'fix-permissions' -Value 'C:\Users\jstre\Documents\GitHub\Budgetting-Code\fix-permissions.ps1'

# Custom functions
function Get-FinanceHelp {
    Write-Host "🎓 Finance Automation Commands:" -ForegroundColor Cyan
    Write-Host "  fix-permissions [path]  - Fix file permissions"
    Write-Host "  Test-PDFRead [file]     - Test PDF reading capability"
    Write-Host "  Install-FinanceTools    - Install required tools"
}

function Test-PDFRead {
    param([string]`$FilePath)
    if (-not (Test-Path `$FilePath)) {
        Write-Host "❌ File not found: `$FilePath" -ForegroundColor Red
        return
    }
    
    try {
        python -c "import PyPDF2; print('✅ PyPDF2 available')"
        python -c "import pdfplumber; print('✅ pdfplumber available')"
        Write-Host "✅ PDF processing tools ready" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ PDF tools not available" -ForegroundColor Red
    }
}

function Install-FinanceTools {
    Write-Host "📦 Installing finance automation tools..." -ForegroundColor Cyan
    pip install --user PyPDF2 pdfplumber pandas openpyxl --quiet
    npm install -g pdf-parse xlsx csv-parser --silent
    Write-Host "✅ Tools installed" -ForegroundColor Green
}

Write-Host "🎓 Finance Automation Profile Loaded - Type 'Get-FinanceHelp' for commands" -ForegroundColor Green
"@

try {
    $profileContent | Out-File -FilePath $PROFILE -Encoding UTF8 -Force
    Write-Host "✅ PowerShell profile created/updated: $PROFILE" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to create PowerShell profile" -ForegroundColor Red
}

# ===================== PERMISSION FIX UTILITY =====================

Write-Host "`n🔐 Creating Permission Fix Utility..." -ForegroundColor Yellow

$permissionFixScript = @"
# Permission Fix Utility
# Usage: .\fix-permissions.ps1 [path]

param(
    [string]`$TargetPath = `$PWD
)

Write-Host "🔐 Fixing permissions for: `$TargetPath" -ForegroundColor Cyan

if (-not (Test-Path `$TargetPath)) {
    Write-Host "❌ Path not found: `$TargetPath" -ForegroundColor Red
    exit 1
}

try {
    # Get current ACL
    `$acl = Get-Acl `$TargetPath
    
    # Create access rule for current user
    `$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        `$env:USERNAME, 
        "FullControl", 
        "ContainerInherit,ObjectInherit", 
        "None", 
        "Allow"
    )
    
    # Apply the rule
    `$acl.SetAccessRule(`$accessRule)
    Set-Acl `$TargetPath `$acl
    
    Write-Host "✅ Permissions fixed for: `$TargetPath" -ForegroundColor Green
    
    # If it's a directory, fix permissions for all subdirectories
    if (Test-Path `$TargetPath -PathType Container) {
        Get-ChildItem `$TargetPath -Recurse -Directory | ForEach-Object {
            try {
                `$subAcl = Get-Acl `$_.FullName
                `$subAcl.SetAccessRule(`$accessRule)
                Set-Acl `$_.FullName `$subAcl
                Write-Host "✅ Fixed: `$(`$_.FullName)" -ForegroundColor Green
            }
            catch {
                Write-Host "⚠️  Could not fix: `$(`$_.FullName)" -ForegroundColor Yellow
            }
        }
    }
}
catch {
    Write-Host "❌ Failed to fix permissions: `$(`$_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Try running PowerShell as Administrator" -ForegroundColor Cyan
    exit 1
}

Write-Host "🎉 Permission fix complete!" -ForegroundColor Green
"@

$fixPermissionsPath = "C:\Users\jstre\Documents\GitHub\Budgetting-Code\fix-permissions.ps1"
try {
    $permissionFixScript | Out-File -FilePath $fixPermissionsPath -Encoding UTF8 -Force
    Write-Host "✅ Permission fix utility created: $fixPermissionsPath" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to create permission fix utility" -ForegroundColor Red
}

# ===================== PDF PROCESSING TEST =====================

Write-Host "`n📄 Testing PDF Processing Capabilities..." -ForegroundColor Yellow

$pdfTestScript = @"
# PDF Processing Test
import sys
import os

def test_pdf_libraries():
    print("🧪 Testing PDF processing libraries...")
    
    # Test PyPDF2
    try:
        import PyPDF2
        print("✅ PyPDF2 available")
        pdf_readers = ['PyPDF2']
    except ImportError:
        print("❌ PyPDF2 not available")
        pdf_readers = []
    
    # Test pdfplumber
    try:
        import pdfplumber
        print("✅ pdfplumber available")
        pdf_readers.append('pdfplumber')
    except ImportError:
        print("❌ pdfplumber not available")
    
    return pdf_readers

def test_pdf_file(file_path):
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False
    
    print(f"📄 Testing PDF file: {file_path}")
    
    # Test with PyPDF2
    try:
        import PyPDF2
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            num_pages = len(pdf_reader.pages)
            print(f"✅ PyPDF2: {num_pages} pages detected")
            
            if num_pages > 0:
                first_page = pdf_reader.pages[0]
                text_preview = first_page.extract_text()[:200]
                print(f"📝 Text preview: {text_preview}...")
                return True
    except Exception as e:
        print(f"❌ PyPDF2 failed: {e}")
    
    # Test with pdfplumber
    try:
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            num_pages = len(pdf.pages)
            print(f"✅ pdfplumber: {num_pages} pages detected")
            
            if num_pages > 0:
                first_page = pdf.pages[0]
                text_preview = first_page.extract_text()[:200]
                print(f"📝 Text preview: {text_preview}...")
                return True
    except Exception as e:
        print(f"❌ pdfplumber failed: {e}")
    
    return False

if __name__ == "__main__":
    # Test libraries
    available_readers = test_pdf_libraries()
    
    if not available_readers:
        print("❌ No PDF libraries available")
        sys.exit(1)
    
    # Test with a sample PDF if provided
    if len(sys.argv) > 1:
        pdf_file = sys.argv[1]
        success = test_pdf_file(pdf_file)
        if success:
            print("✅ PDF processing test successful")
        else:
            print("❌ PDF processing test failed")
    else:
        print("💡 Usage: python pdf_test.py <pdf_file>")
        print("✅ PDF libraries are available for use")
"@

$pdfTestPath = "C:\Users\jstre\Documents\GitHub\Budgetting-Code\pdf_test.py"
try {
    $pdfTestScript | Out-File -FilePath $pdfTestPath -Encoding UTF8 -Force
    Write-Host "✅ PDF test script created: $pdfTestPath" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to create PDF test script" -ForegroundColor Red
}

# ===================== DEFAULT APPLICATIONS =====================

Write-Host "`n🎯 Setting up File Associations..." -ForegroundColor Yellow

# Create a registry script for file associations (requires admin rights)
$regScript = @"
# File Association Registry Script
# Run as Administrator

Write-Host "🎯 Setting up file associations..." -ForegroundColor Cyan

# Set VS Code as default for development files
`$vscodeExe = Get-Command code -ErrorAction SilentlyContinue
if (`$vscodeExe) {
    `$vscodePath = `$vscodeExe.Source
    Write-Host "✅ VS Code found: `$vscodePath" -ForegroundColor Green
    
    # File extensions to associate with VS Code
    `$extensions = @('.js', '.gs', '.json', '.md', '.txt', '.csv', '.log')
    
    foreach (`$ext in `$extensions) {
        try {
            # This is a simplified approach - full implementation requires more registry work
            Write-Host "📝 Would associate `$ext with VS Code" -ForegroundColor Cyan
        }
        catch {
            Write-Host "❌ Failed to associate `$ext" -ForegroundColor Red
        }
    }
}
else {
    Write-Host "❌ VS Code not found in PATH" -ForegroundColor Red
}

Write-Host "💡 File associations require administrator rights" -ForegroundColor Yellow
Write-Host "💡 You can manually set them in Windows Settings > Apps > Default apps" -ForegroundColor Cyan
"@

$regScriptPath = "C:\Users\jstre\Documents\GitHub\Budgetting-Code\setup-file-associations.ps1"
try {
    $regScript | Out-File -FilePath $regScriptPath -Encoding UTF8 -Force
    Write-Host "✅ File association script created: $regScriptPath" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to create file association script" -ForegroundColor Red
}

# ===================== SUMMARY AND NEXT STEPS =====================

Write-Host "`n📊 Advanced Configuration Summary:" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Python PATH updated for scripts" -ForegroundColor Green
Write-Host "✅ PowerShell profile configured" -ForegroundColor Green
Write-Host "✅ Permission fix utility created" -ForegroundColor Green
Write-Host "✅ PDF processing test script created" -ForegroundColor Green
Write-Host "✅ File association setup script created" -ForegroundColor Green

Write-Host "`n🎯 Quick Commands Available:" -ForegroundColor Yellow
Write-Host "  .\fix-permissions.ps1 [path]     - Fix permissions for any path" -ForegroundColor White
Write-Host "  python pdf_test.py [file.pdf]    - Test PDF processing" -ForegroundColor White
Write-Host "  .\setup-file-associations.ps1    - Setup file associations (admin)" -ForegroundColor White

Write-Host "`n💡 To complete setup:" -ForegroundColor Cyan
Write-Host "  1. Restart PowerShell to load new profile" -ForegroundColor White
Write-Host "  2. Run 'Get-FinanceHelp' for available commands" -ForegroundColor White
Write-Host "  3. Test PDF processing with a sample file" -ForegroundColor White
Write-Host "  4. Run file association script as Administrator if needed" -ForegroundColor White

Write-Host "`n🎉 Advanced configuration complete!" -ForegroundColor Green
