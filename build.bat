@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%" || (
	echo Failed to open the project directory.
	pause
	exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
	echo Node.js was not found in PATH. Install Node.js 22.19 or later and try again.
	popd
	pause
	exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
	echo npm was not found in PATH. Reinstall Node.js and try again.
	popd
	pause
	exit /b 1
)

echo.
echo Installing dependencies from package-lock.json...
call npm ci
if errorlevel 1 goto :failed

echo.
echo Building project...
call npm run build
if errorlevel 1 goto :failed

echo.
echo Build completed successfully.
popd
pause
exit /b 0

:failed
echo.
echo Build failed. Review the error output above.
popd
pause
exit /b 1
