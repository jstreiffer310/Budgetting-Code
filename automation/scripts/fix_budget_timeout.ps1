# BUDGET SPREADSHEET CLEANUP HELPER
# This script helps you manage the Excel file with too many sheets

Write-Host "🔍 BUDGET SPREADSHEET ANALYSIS & CLEANUP HELPER" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

$budgetFile = "$env:USERPROFILE\Downloads\My Budget (9).xlsx"

Write-Host "`n📊 FILE ANALYSIS:" -ForegroundColor Yellow
Write-Host "File: My Budget (9).xlsx" -ForegroundColor White
Write-Host "Size: 401KB (larger than previous versions)" -ForegroundColor White
Write-Host "Problem: 115 sheets causing timeout issues" -ForegroundColor Red

Write-Host "`n🚨 IDENTIFIED ISSUES:" -ForegroundColor Red
Write-Host "• 115 worksheets instead of ~15 expected" -ForegroundColor Red
Write-Host "• Sheets 9-112 are auto-generated duplicates" -ForegroundColor Red
Write-Host "• Failed_Parsing: 62 errors contributing to sheet proliferation" -ForegroundColor Red
Write-Host "• Google Apps Script timing out due to excessive sheets" -ForegroundColor Red

Write-Host "`n✅ SOLUTION STEPS:" -ForegroundColor Green
Write-Host "1. Use the cleanup_duplicate_sheets.gs script in Google Apps Script" -ForegroundColor White
Write-Host "2. Apply the fixes from sheet_creation_fixes.gs to your main script" -ForegroundColor White
Write-Host "3. Run the emergency cleanup to remove 100+ duplicate sheets" -ForegroundColor White

Write-Host "`n🛠️ IMMEDIATE ACTIONS:" -ForegroundColor Cyan
Write-Host "[1] Copy cleanup script to Google Apps Script" -ForegroundColor White
Write-Host "[2] View cleanup script content" -ForegroundColor White
Write-Host "[3] View prevention fixes" -ForegroundColor White
Write-Host "[4] Check budget file details" -ForegroundColor White
Write-Host "[5] Exit" -ForegroundColor White

do {
    $choice = Read-Host "`nSelect option (1-5)"
    
    switch ($choice) {
        "1" {
            Write-Host "`n📋 CLEANUP SCRIPT INSTRUCTIONS:" -ForegroundColor Cyan
            Write-Host "1. Open Google Apps Script (script.google.com)" -ForegroundColor White
            Write-Host "2. Create a new project" -ForegroundColor White
            Write-Host "3. Copy the content from: 04-Utilities-Tools\cleanup_duplicate_sheets.gs" -ForegroundColor White
            Write-Host "4. Update SPREADSHEET_ID with your actual spreadsheet ID" -ForegroundColor White
            Write-Host "5. Save and run previewCleanup() first to see what will be deleted" -ForegroundColor White
            Write-Host "6. Run cleanupDuplicateSheets() to perform the cleanup" -ForegroundColor Yellow
            
            Write-Host "`n🔑 To get your Spreadsheet ID:" -ForegroundColor Green
            Write-Host "   Open your Google Sheet and copy the ID from the URL:" -ForegroundColor White
            Write-Host "   https://docs.google.com/spreadsheets/d/[COPY_THIS_PART]/edit" -ForegroundColor Gray
        }
        
        "2" {
            Write-Host "`n📄 Opening cleanup script..." -ForegroundColor Cyan
            $scriptPath = "04-Utilities-Tools\cleanup_duplicate_sheets.gs"
            if (Test-Path $scriptPath) {
                notepad $scriptPath
            } else {
                Write-Host "❌ Script not found at: $scriptPath" -ForegroundColor Red
            }
        }
        
        "3" {
            Write-Host "`n📄 Opening prevention fixes..." -ForegroundColor Cyan
            $fixPath = "04-Utilities-Tools\sheet_creation_fixes.gs"
            if (Test-Path $fixPath) {
                notepad $fixPath
            } else {
                Write-Host "❌ Fixes not found at: $fixPath" -ForegroundColor Red
            }
        }
        
        "4" {
            Write-Host "`n📊 BUDGET FILE DETAILS:" -ForegroundColor Cyan
            if (Test-Path $budgetFile) {
                $file = Get-Item $budgetFile
                Write-Host "Name: $($file.Name)" -ForegroundColor White
                Write-Host "Size: $([math]::Round($file.Length/1KB, 1)) KB" -ForegroundColor White
                Write-Host "Modified: $($file.LastWriteTime)" -ForegroundColor White
                Write-Host "Location: $($file.Directory)" -ForegroundColor White
            } else {
                Write-Host "❌ Budget file not found at: $budgetFile" -ForegroundColor Red
            }
        }
        
        "5" {
            Write-Host "`n👋 Exiting..." -ForegroundColor Green
            break
        }
        
        default {
            Write-Host "❌ Invalid choice. Please select 1-5." -ForegroundColor Red
        }
    }
} while ($choice -ne "5")

Write-Host "`n🎯 SUMMARY:" -ForegroundColor Yellow
Write-Host "The timeout issue is caused by 115 sheets instead of ~15." -ForegroundColor White
Write-Host "Use the provided cleanup script to remove 100+ duplicate sheets." -ForegroundColor White
Write-Host "Apply the prevention fixes to stop this from happening again." -ForegroundColor White
Write-Host "`nFiles created:" -ForegroundColor Green
Write-Host "• 04-Utilities-Tools\cleanup_duplicate_sheets.gs" -ForegroundColor Gray
Write-Host "• 04-Utilities-Tools\sheet_creation_fixes.gs" -ForegroundColor Gray
