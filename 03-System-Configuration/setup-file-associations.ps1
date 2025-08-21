# File Association Registry Script
# Run as Administrator

Write-Host "🎯 Setting up file associations..." -ForegroundColor Cyan

# Set VS Code as default for development files
$vscodeExe = Get-Command code -ErrorAction SilentlyContinue
if ($vscodeExe) {
    $vscodePath = $vscodeExe.Source
    Write-Host "✅ VS Code found: $vscodePath" -ForegroundColor Green
    
    # File extensions to associate with VS Code
    $extensions = @('.js', '.gs', '.json', '.md', '.txt', '.csv', '.log')
    
    foreach ($ext in $extensions) {
        try {
            # This is a simplified approach - full implementation requires more registry work
            Write-Host "📝 Would associate $ext with VS Code" -ForegroundColor Cyan
        }
        catch {
            Write-Host "❌ Failed to associate $ext" -ForegroundColor Red
        }
    }
}
else {
    Write-Host "❌ VS Code not found in PATH" -ForegroundColor Red
}

Write-Host "💡 File associations require administrator rights" -ForegroundColor Yellow
Write-Host "💡 You can manually set them in Windows Settings > Apps > Default apps" -ForegroundColor Cyan
