# Permission Fix Utility
# Usage: .\fix-permissions.ps1 [path]

param(
    [string]$TargetPath = $PWD
)

Write-Host "🔐 Fixing permissions for: $TargetPath" -ForegroundColor Cyan

if (-not (Test-Path $TargetPath)) {
    Write-Host "❌ Path not found: $TargetPath" -ForegroundColor Red
    exit 1
}

try {
    # Get current ACL
    $acl = Get-Acl $TargetPath
    
    # Create access rule for current user
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $env:USERNAME, 
        "FullControl", 
        "ContainerInherit,ObjectInherit", 
        "None", 
        "Allow"
    )
    
    # Apply the rule
    $acl.SetAccessRule($accessRule)
    Set-Acl $TargetPath $acl
    
    Write-Host "✅ Permissions fixed for: $TargetPath" -ForegroundColor Green
    
    # If it's a directory, fix permissions for all subdirectories
    if (Test-Path $TargetPath -PathType Container) {
        Get-ChildItem $TargetPath -Recurse -Directory | ForEach-Object {
            try {
                $subAcl = Get-Acl $_.FullName
                $subAcl.SetAccessRule($accessRule)
                Set-Acl $_.FullName $subAcl
                Write-Host "✅ Fixed: $($_.FullName)" -ForegroundColor Green
            }
            catch {
                Write-Host "⚠️  Could not fix: $($_.FullName)" -ForegroundColor Yellow
            }
        }
    }
}
catch {
    Write-Host "❌ Failed to fix permissions: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Try running PowerShell as Administrator" -ForegroundColor Cyan
    exit 1
}

Write-Host "🎉 Permission fix complete!" -ForegroundColor Green
