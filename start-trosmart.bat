
@echo off
setlocal
title TroSmart Launcher

cd /d "%~dp0"

echo ========================================
echo             TROSMART
echo ========================================
echo.

echo [1/4] Kiem tra Docker Desktop...

docker info >nul 2>&1
if not errorlevel 1 goto DOCKER_READY

echo Dang mo Docker Desktop...

if not exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    echo Khong tim thay Docker Desktop.
    pause
    exit /b 1
)

start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"

set /a DOCKER_COUNT=0

:WAIT_DOCKER
timeout /t 3 /nobreak >nul
docker info >nul 2>&1
if not errorlevel 1 goto DOCKER_READY

set /a DOCKER_COUNT+=1
if %DOCKER_COUNT% GEQ 60 (
    echo Docker Desktop khoi dong qua lau.
    pause
    exit /b 1
)
goto WAIT_DOCKER

:DOCKER_READY
echo Docker Desktop da san sang.

echo.
echo [2/4] Khoi dong MySQL va Redis...

docker start mysql-server >nul 2>&1
if errorlevel 1 (
    echo Khong the khoi dong mysql-server.
    pause
    exit /b 1
)

docker start redis-server >nul 2>&1
if errorlevel 1 (
    echo Khong the khoi dong redis-server.
    pause
    exit /b 1
)

echo Dang cho MySQL san sang...

set /a MYSQL_COUNT=0

:WAIT_MYSQL
docker exec mysql-server mysqladmin -uroot -proot ping --silent >nul 2>&1
if not errorlevel 1 goto MYSQL_READY

timeout /t 2 /nobreak >nul
set /a MYSQL_COUNT+=1

if %MYSQL_COUNT% GEQ 60 (
    echo MySQL khoi dong that bai hoac qua lau.
    pause
    exit /b 1
)
goto WAIT_MYSQL

:MYSQL_READY
echo MySQL da san sang.

echo Dang cho Redis san sang...

set /a REDIS_COUNT=0

:WAIT_REDIS
docker exec redis-server redis-cli ping 2>nul | findstr /C:"PONG" >nul
if not errorlevel 1 goto REDIS_READY

timeout /t 2 /nobreak >nul
set /a REDIS_COUNT+=1

if %REDIS_COUNT% GEQ 30 (
    echo Redis khoi dong that bai hoac qua lau.
    pause
    exit /b 1
)
goto WAIT_REDIS

:REDIS_READY
echo Redis da san sang.

echo.
echo [3/4] Khoi dong Backend...

if not exist "trosmart-backend\mvnw.cmd" (
    echo Khong tim thay mvnw.cmd.
    pause
    exit /b 1
)

start "TroSmart Backend" /D "%~dp0trosmart-backend" cmd /k "mvnw.cmd spring-boot:run"

echo.
echo [4/4] Khoi dong Frontend...

if not exist "trosmart-frontend\package.json" (
    echo Khong tim thay package.json.
    pause
    exit /b 1
)

if not exist "trosmart-frontend\node_modules" (
    echo Dang cai dat thu vien Frontend...
    pushd "trosmart-frontend"
    call npm install
    if errorlevel 1 (
        echo Cai dat Frontend that bai.
        pause
        exit /b 1
    )
    popd
)

start "TroSmart Frontend" /D "%~dp0trosmart-frontend" cmd /k "npm start"

echo.
echo Dang khoi dong TroSmart...
echo.
echo Neu trinh duyet khong tu mo, truy cap:
echo http://localhost:3000
echo.
echo Hay giu hai cua so Backend va Frontend khi su dung.
pause
