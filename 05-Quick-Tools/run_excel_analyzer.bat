@echo off
cls
echo.
echo ===================================================
echo   🔍 QUICK EXCEL ANALYZER - Financial Intelligence
echo ===================================================
echo.
echo This tool will analyze Excel files in your Downloads folder
echo and provide financial intelligence insights.
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if ExcelJS is installed
npm list exceljs >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installing ExcelJS dependency...
    npm install exceljs
    if %errorlevel% neq 0 (
        echo ❌ Failed to install ExcelJS
        echo Please run: npm install exceljs
        echo.
        pause
        exit /b 1
    )
    echo ✅ ExcelJS installed successfully
    echo.
)

REM Run the analyzer
echo 🚀 Starting Excel Analyzer...
echo.
node "%~dp0quick_excel_analyzer.js"

echo.
echo 👋 Analysis complete. Press any key to exit...
pause >nul
