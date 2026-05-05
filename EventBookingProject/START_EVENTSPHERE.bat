@echo off
title EventSphere - Smart Event Booking System
color 0A
cls

echo.
echo  ============================================================
echo   ⚡  EVENTSPHERE — Smart Department Event Booking System
echo  ============================================================
echo.

:: ─── Set Java Home ───────────────────────────────────────────
SET "JAVA_HOME=C:\java\oracleJdk-25"
SET "PATH=%JAVA_HOME%\bin;%PATH%"

:: ─── Set MySQL path ───────────────────────────────────────────
SET "MYSQL=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

:: ─── Set Dirs ─────────────────────────────────────────────────
SET "ROOT=%~dp0"
SET "BACKEND=%ROOT%event-booking-backend"
SET "FRONTEND=%ROOT%event-booking-frontend"

:: ─── Step 1: Create Database ──────────────────────────────────
echo  [1/4] Setting up MySQL database...
"%MYSQL%" -u root "-pAbhi@122005" -e "CREATE DATABASE IF NOT EXISTS event_db;" 2>nul
IF %ERRORLEVEL%==0 (
    echo        ✓ Database 'event_db' is ready
) ELSE (
    echo        ✗ MySQL issue - make sure MySQL Server is running!
    echo          Trying to continue anyway...
)
echo.

:: ─── Step 2: Check Node Modules ───────────────────────────────
echo  [2/4] Checking frontend dependencies...
IF NOT EXIST "%FRONTEND%\node_modules" (
    echo        Installing npm packages ^(first time only^)...
    cd /d "%FRONTEND%"
    call npm install --silent
    echo        ✓ Dependencies installed
) ELSE (
    echo        ✓ Dependencies already installed
)
echo.

:: ─── Step 3: Download Maven if needed ─────────────────────────
echo  [3/4] Checking Maven...
SET "MAVEN_HOME=%USERPROFILE%\.mvn\wrapper\apache-maven-3.9.6"
SET "MVN=%MAVEN_HOME%\bin\mvn.cmd"

IF NOT EXIST "%MVN%" (
    echo        Maven not found. Downloading Maven 3.9.6...
    echo        This is a ONE-TIME download ^(~9 MB^). Please wait...
    IF NOT EXIST "%USERPROFILE%\.mvn\wrapper" MKDIR "%USERPROFILE%\.mvn\wrapper"
    powershell -Command "Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.6/apache-maven-3.9.6-bin.zip' -OutFile '%USERPROFILE%\.mvn\wrapper\maven.zip' -UseBasicParsing"
    powershell -Command "Expand-Archive -Path '%USERPROFILE%\.mvn\wrapper\maven.zip' -DestinationPath '%USERPROFILE%\.mvn\wrapper\' -Force"
    del "%USERPROFILE%\.mvn\wrapper\maven.zip" 2>nul
    echo        ✓ Maven downloaded!
) ELSE (
    echo        ✓ Maven is ready
)
SET "PATH=%MAVEN_HOME%\bin;%PATH%"
echo.

:: ─── Step 4: Launch both servers ──────────────────────────────
echo  [4/4] Starting servers...
echo.

:: Start Backend in new window
echo        Starting Spring Boot Backend on port 8080...
start "EventSphere Backend" cmd /k "title EventSphere Backend && color 09 && cd /d "%BACKEND%" && SET JAVA_HOME=C:\java\oracleJdk-25 && SET PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%PATH% && echo. && echo  ╔══════════════════════════════╗ && echo  ║  🚀 Starting Spring Boot...  ║ && echo  ╚══════════════════════════════╝ && echo. && "%MVN%" spring-boot:run -Dspring-boot.run.fork=false"

:: Wait a few seconds then start frontend
timeout /t 3 /nobreak >nul

:: Start Frontend in new window
echo        Starting React Frontend on port 5173...
start "EventSphere Frontend" cmd /k "title EventSphere Frontend && color 0D && cd /d "%FRONTEND%" && echo. && echo  ╔══════════════════════════════╗ && echo  ║  ⚛️  Starting React App...    ║ && echo  ╚══════════════════════════════╝ && echo. && npm run dev"

:: Wait for backend to boot then open browser
echo.
echo  ============================================================
echo   ✓ Both servers are starting up!
echo   ✓ Backend  →  http://localhost:8080
echo   ✓ Frontend →  http://localhost:5173
echo  ============================================================
echo.
echo   Opening browser in 15 seconds (waiting for backend boot)...
echo   Press any key to open browser now, or wait...
echo.
timeout /t 15 /nobreak >nul

:: Open browser
start "" "http://localhost:5173"

echo.
echo   Browser opened! 🎉
echo.
echo   ┌─────────────────────────────────────────┐
echo   │  To STOP the app, close both windows    │
echo   │  named "EventSphere Backend" and        │
echo   │  "EventSphere Frontend"                 │
echo   └─────────────────────────────────────────┘
echo.
pause
