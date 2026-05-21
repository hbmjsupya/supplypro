$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

function Write-Status($msg) { Write-Host "`n[*] $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }

function Init-Env {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    $fnmPath = Get-Command fnm -ErrorAction SilentlyContinue
    if ($fnmPath) {
        fnm env --use-on-cd --shell powershell | Out-String | ForEach-Object { Invoke-Expression $_ }
    }
}

function Ensure-Docker {
    Init-Env
    try {
        $result = docker info 2>&1
        if ($result -match "Server Version") {
            Write-Ok "Docker is running"
            return
        }
        throw "Docker daemon not running"
    } catch {
        Write-Status "Starting Docker Desktop..."
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        Write-Status "Waiting for Docker daemon..."
        for ($i = 0; $i -lt 30; $i++) {
            Start-Sleep -Seconds 5
            try {
                $result = docker info 2>&1
                if ($result -match "Server Version") {
                    Write-Ok "Docker daemon is ready"
                    return
                }
            } catch {}
            Write-Host "  Waiting... ($($i+1)/30)"
        }
        Write-Err "Docker daemon failed to start. Please start Docker Desktop manually."
        exit 1
    }
}

function Start-Infra {
    Write-Status "Starting infrastructure (MySQL + Redis)..."
    docker compose -f docker-compose.dev.yml up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Infrastructure started"
        Write-Status "Waiting for MySQL to be healthy..."
        for ($i = 0; $i -lt 30; $i++) {
            $health = docker inspect --format='{{.State.Health.Status}}' supplypro-mysql 2>$null
            if ($health -eq "healthy") {
                Write-Ok "MySQL is healthy"
                return
            }
            Start-Sleep -Seconds 2
            Write-Host "  Waiting... ($($i+1)/30) status=$health"
        }
        Write-Warn "MySQL health check timeout, but container may still be starting"
    } else {
        Write-Err "Failed to start infrastructure"
        exit 1
    }
}

function Start-Backend {
    Write-Status "Starting backend..."
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title SupplyPro-Backend && .\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local" -WorkingDirectory "$ProjectRoot\backend"
    Write-Ok "Backend starting in new window (profile: local)"
}

function Start-Frontend {
    Init-Env
    Write-Status "Starting frontend..."
    if (-not (Test-Path "$ProjectRoot\frontend\node_modules")) {
        Write-Status "Installing frontend dependencies..."
        Push-Location "$ProjectRoot\frontend"
        npm install
        Pop-Location
    }
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title SupplyPro-Frontend && fnm use 22 && npm run dev" -WorkingDirectory "$ProjectRoot\frontend"
    Write-Ok "Frontend starting in new window"
}

$action = if ($args.Count -gt 0) { $args[0] } else { "all" }

switch ($action) {
    "infra" {
        Ensure-Docker
        Start-Infra
    }
    "backend" {
        Start-Backend
    }
    "frontend" {
        Start-Frontend
    }
    "all" {
        Ensure-Docker
        Start-Infra
        Start-Sleep -Seconds 3
        Start-Backend
        Start-Frontend
        Write-Host ""
        Write-Ok "All services starting!"
        Write-Host ""
        Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor White
        Write-Host "  Backend:   http://localhost:8080" -ForegroundColor White
        Write-Host "  MySQL:     localhost:3307 (root/password)" -ForegroundColor White
        Write-Host "  Redis:     localhost:6379" -ForegroundColor White
    }
    "stop" {
        Write-Status "Stopping all services..."
        Init-Env
        docker compose -f docker-compose.dev.yml down 2>$null
        Write-Ok "Infrastructure stopped"
    }
    "restart" {
        Write-Status "Restarting infrastructure..."
        Init-Env
        docker compose -f docker-compose.dev.yml restart
        Write-Ok "Infrastructure restarted"
    }
    "status" {
        Init-Env
        Write-Status "Service Status:"
        docker compose -f docker-compose.dev.yml ps
    }
    default {
        Write-Host "SupplyPro Local Development Helper"
        Write-Host ""
        Write-Host "Usage: .\scripts\dev.ps1 [action]"
        Write-Host ""
        Write-Host "Actions:"
        Write-Host "  all       - Start all services (default)"
        Write-Host "  infra     - Start only infrastructure (MySQL + Redis)"
        Write-Host "  backend   - Start only backend"
        Write-Host "  frontend  - Start only frontend"
        Write-Host "  stop      - Stop all services"
        Write-Host "  restart   - Restart infrastructure"
        Write-Host "  status    - Show service status"
    }
}
