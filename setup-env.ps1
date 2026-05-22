# =============================================
# SupplyPro 新环境自动化搭建脚本 (Windows)
# 用途：一键初始化新开发环境
# 使用方式：以管理员身份运行 PowerShell，执行：
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\setup-env.ps1
# =============================================

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ProjectRoot

function Write-Step {
    param([string]$Message)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Test-Command {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Wait-ForPort {
    param(
        [string]$Host = "localhost",
        [int]$Port,
        [int]$TimeoutSeconds = 120,
        [string]$ServiceName
    )
    $startTime = Get-Date
    while (((Get-Date) - $startTime).TotalSeconds -lt $TimeoutSeconds) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect($Host, $Port)
            $tcp.Close()
            Write-Info "$ServiceName ($Host`:$Port) is ready"
            return $true
        } catch {
            Write-Host "." -NoNewline
            Start-Sleep -Seconds 2
        }
    }
    Write-Err "$ServiceName ($Host`:$Port) did not become ready within $TimeoutSeconds seconds"
    return $false
}

# =============================================
# Step 0: 前置检查
# =============================================
Write-Step "Step 0: 前置环境检查"

$missingDeps = @()

if (-not (Test-Command "git")) {
    $missingDeps += "Git"
}
if (-not (Test-Command "docker")) {
    $missingDeps += "Docker"
}
if (-not (Test-Command "node")) {
    $missingDeps += "Node.js (>=18)"
}
if (-not (Test-Command "java")) {
    $missingDeps += "Java 17 (JDK)"
}

if ($missingDeps.Count -gt 0) {
    Write-Err "缺少以下依赖，请先安装："
    foreach ($dep in $missingDeps) {
        Write-Err "  - $dep"
    }
    Write-Host ""
    Write-Host "安装指南：" -ForegroundColor Yellow
    Write-Host "  Git:     https://git-scm.com/download/win" -ForegroundColor White
    Write-Host "  Docker:  https://www.docker.com/products/docker-desktop" -ForegroundColor White
    Write-Host "  Node.js: https://nodejs.org/ (LTS版本)" -ForegroundColor White
    Write-Host "  Java 17: https://adoptium.net/" -ForegroundColor White
    exit 1
}

$nodeVersion = (node --version)
$javaVersion = (java -version 2>&1 | Select-String "version" | Select-Object -First 1)
$dockerVersion = (docker --version)
$gitVersion = (git --version)

Write-Info "Git:      $gitVersion"
Write-Info "Docker:   $dockerVersion"
Write-Info "Node.js:  $nodeVersion"
Write-Info "Java:     $javaVersion"

# =============================================
# Step 1: 拉取最新代码
# =============================================
Write-Step "Step 1: 拉取最新代码"

if (Test-Path ".git") {
    Write-Info "检测到Git仓库，拉取最新代码..."
    git fetch origin
    $currentBranch = git branch --show-current
    Write-Info "当前分支: $currentBranch"
    git pull origin $currentBranch
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "git pull 失败，可能存在本地修改冲突，继续使用当前代码..."
    }
} else {
    Write-Warn "未检测到Git仓库，跳过代码拉取"
}

# =============================================
# Step 2: 启动Docker基础设施
# =============================================
Write-Step "Step 2: 启动Docker基础设施 (MySQL, Redis, RabbitMQ)"

$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Err "Docker未运行，请先启动Docker Desktop"
    exit 1
}

$mysqlContainer = docker ps -a --filter "name=supplypro-mysql" --format "{{.Names}}" 2>$null
$redisContainer = docker ps -a --filter "name=supplypro-redis" --format "{{.Names}}" 2>$null
$rabbitmqContainer = docker ps -a --filter "name=supplypro-rabbitmq" --format "{{.Names}}" 2>$null

$needStart = $true
if ($mysqlContainer -and $redisContainer -and $rabbitmqContainer) {
    $mysqlRunning = docker ps --filter "name=supplypro-mysql" --filter "status=running" --format "{{.Names}}" 2>$null
    $redisRunning = docker ps --filter "name=supplypro-redis" --filter "status=running" --format "{{.Names}}" 2>$null
    $rabbitmqRunning = docker ps --filter "name=supplypro-rabbitmq" --filter "status=running" --format "{{.Names}}" 2>$null
    
    if ($mysqlRunning -and $redisRunning -and $rabbitmqRunning) {
        Write-Info "所有基础设施容器已在运行中"
        $needStart = $false
    }
}

if ($needStart) {
    Write-Info "启动基础设施容器..."
    docker compose up -d mysql redis rabbitmq
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Docker容器启动失败"
        exit 1
    }
    
    Write-Info "等待MySQL启动..."
    $mysqlReady = Wait-ForPort -Port 3307 -ServiceName "MySQL" -TimeoutSeconds 90
    if (-not $mysqlReady) {
        Write-Err "MySQL启动超时"
        exit 1
    }
    
    Write-Info "等待Redis启动..."
    $redisReady = Wait-ForPort -Port 6379 -ServiceName "Redis" -TimeoutSeconds 30
    if (-not $redisReady) {
        Write-Err "Redis启动超时"
        exit 1
    }
    
    Write-Info "等待RabbitMQ启动..."
    $rabbitmqReady = Wait-ForPort -Port 5672 -ServiceName "RabbitMQ" -TimeoutSeconds 60
    if (-not $rabbitmqReady) {
        Write-Err "RabbitMQ启动超时"
        exit 1
    }
}

# =============================================
# Step 3: 初始化数据库
# =============================================
Write-Step "Step 3: 初始化数据库基础数据"

$mysqlReady = Wait-ForPort -Port 3307 -ServiceName "MySQL" -TimeoutSeconds 30
if (-not $mysqlReady) {
    Write-Err "MySQL未就绪，无法初始化数据库"
    exit 1
}

Start-Sleep -Seconds 5

Write-Info "执行数据库初始化脚本..."
$initSqlPath = Join-Path $ProjectRoot "scripts\init-database.sql"
if (Test-Path $initSqlPath) {
    Get-Content $initSqlPath -Raw | docker exec -i supplypro-mysql mysql -u root -ppassword supplypro --default-character-set=utf8mb4 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Info "数据库初始化脚本执行成功"
    } else {
        Write-Warn "数据库初始化脚本执行失败（可能数据已存在），继续..."
    }
} else {
    Write-Warn "未找到初始化脚本: $initSqlPath"
}

Write-Info "验证数据库连接和数据..."
$testResult = docker exec supplypro-mysql mysql -u root -ppassword supplypro --default-character-set=utf8mb4 -e "SELECT COUNT(*) AS logistics_company_count FROM logistics_companies;" 2>$null
if ($testResult) {
    Write-Info "物流公司数据验证: $testResult"
} else {
    Write-Warn "物流公司数据验证失败，请手动检查"
}

# =============================================
# Step 4: 配置后端
# =============================================
Write-Step "Step 4: 配置后端环境"

$localYmlPath = Join-Path $ProjectRoot "backend\src\main\resources\application-local.yml"
$localYmlExample = Join-Path $ProjectRoot "backend\src\main\resources\application-local.yml.example"

if (-not (Test-Path $localYmlPath)) {
    if (Test-Path $localYmlExample) {
        Write-Info "从示例文件创建 application-local.yml..."
        Copy-Item $localYmlExample $localYmlPath
    } else {
        Write-Info "创建默认 application-local.yml..."
        $localYmlContent = @"
spring:
  datasource:
    url: jdbc:mysql://127.0.0.1:3307/supplypro?useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true&useUnicode=true&characterEncoding=utf-8
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: root
    password: password
  jpa:
    database-platform: org.hibernate.dialect.MySQL8Dialect
    hibernate:
      ddl-auto: update
    show-sql: true
  flyway:
    enabled: true
    baseline-on-migrate: true
    baseline-version: "5.100"
  redis:
    host: localhost
    port: 6379
    timeout: 2000
  autoconfigure:
    exclude:
      - org.springframework.boot.autoconfigure.data.elasticsearch.ElasticsearchDataAutoConfiguration
      - org.springframework.boot.autoconfigure.data.elasticsearch.ElasticsearchRepositoriesAutoConfiguration
      - org.springframework.boot.autoconfigure.elasticsearch.ElasticsearchRestClientAutoConfiguration
      - org.springframework.boot.autoconfigure.amqp.RabbitAutoConfiguration
  rabbitmq:
    host: localhost
    port: 5672
    username: guest
    password: guest
    dynamic: false
  mvc:
    pathmatch:
      matching-strategy: ant_path_matcher

supplypro:
  app:
    jwtSecret: supplyproSecretKeyForJwtAuthenticationSupplyProSecretKeyForJwtAuthentication
    jwtExpirationMs: 86400000
  rate-limit:
    enabled: false

file:
  upload-dir: uploads
  allowed-types: jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx
"@
        Set-Content -Path $localYmlPath -Value $localYmlContent -Encoding UTF8
    }
    Write-Info "application-local.yml 创建成功"
} else {
    Write-Info "application-local.yml 已存在，跳过创建"
    
    $localYmlContent = Get-Content $localYmlPath -Raw
    if ($localYmlContent -match "flyway:\s*\n\s+enabled:\s*false") {
        Write-Warn "检测到 application-local.yml 中 Flyway 被禁用，建议启用"
        $localYmlContent = $localYmlContent -replace "flyway:\s*\n(\s+)enabled:\s*false", "flyway:`n`$1enabled: true`n`$1baseline-on-migrate: true`n`$1baseline-version: ""5.100"""
        Set-Content -Path $localYmlPath -Value $localYmlContent -Encoding UTF8
        Write-Info "已自动启用 Flyway"
    }
}

# =============================================
# Step 5: 编译后端
# =============================================
Write-Step "Step 5: 编译后端项目"

Set-Location (Join-Path $ProjectRoot "backend")

Write-Info "执行 Maven 编译（跳过测试）..."
.\mvnw compile -Dmaven.test.skip=true -q 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Maven 编译失败，尝试清理后重新编译..."
    .\mvnw clean compile -Dmaven.test.skip=true -q
    if ($LASTEXITCODE -ne 0) {
        Write-Err "后端编译失败，请检查代码"
        Set-Location $ProjectRoot
        exit 1
    }
}
Write-Info "后端编译成功"

# =============================================
# Step 6: 安装前端依赖
# =============================================
Write-Step "Step 6: 安装前端依赖"

Set-Location (Join-Path $ProjectRoot "frontend")

if (Test-Path "node_modules") {
    Write-Info "node_modules 已存在，检查是否需要更新..."
    $packageJsonHash = (Get-FileHash "package.json" -Algorithm MD5).Hash
    $lockHashFile = ".package-lock-hash"
    if (Test-Path $lockHashFile) {
        $savedHash = Get-Content $lockHashFile
        if ($packageJsonHash -eq $savedHash) {
            Write-Info "依赖无变化，跳过 npm install"
        } else {
            Write-Info "package.json 已变化，重新安装依赖..."
            npm install --prefer-offline 2>&1 | Out-Null
            $packageJsonHash | Set-Content $lockHashFile
        }
    } else {
        $packageJsonHash | Set-Content $lockHashFile
        Write-Info "依赖哈希文件已创建"
    }
} else {
    Write-Info "安装前端依赖（首次安装，可能需要几分钟）..."
    npm install 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Err "前端依赖安装失败"
        Set-Location $ProjectRoot
        exit 1
    }
    $packageJsonHash = (Get-FileHash "package.json" -Algorithm MD5).Hash
    $packageJsonHash | Set-Content ".package-lock-hash"
    Write-Info "前端依赖安装成功"
}

# =============================================
# Step 7: 环境验证
# =============================================
Write-Step "Step 7: 环境验证"

$allChecks = $true

Write-Info "检查 Docker 容器状态..."
$containers = @("supplypro-mysql", "supplypro-redis", "supplypro-rabbitmq")
foreach ($container in $containers) {
    $status = docker ps --filter "name=$container" --filter "status=running" --format "{{.Status}}" 2>$null
    if ($status) {
        Write-Info "  $container : $status"
    } else {
        Write-Err "  $container : NOT RUNNING"
        $allChecks = $false
    }
}

Write-Info "检查数据库连接..."
$dbTest = docker exec supplypro-mysql mysql -u root -ppassword -e "SELECT 1 AS test;" supplypro 2>$null
if ($dbTest) {
    Write-Info "  数据库连接: OK"
} else {
    Write-Err "  数据库连接: FAILED"
    $allChecks = $false
}

Write-Info "检查基础数据..."
$lcCount = docker exec supplypro-mysql mysql -u root -ppassword supplypro --default-character-set=utf8mb4 -e "SELECT COUNT(*) AS cnt FROM logistics_companies;" -s -N 2>$null
if ($lcCount -and [int]$lcCount.Trim() -gt 0) {
    Write-Info "  物流公司数据: $([int]$lcCount.Trim()) 条"
} else {
    Write-Warn "  物流公司数据: 缺失（请手动执行 scripts/init-database.sql）"
}

Write-Info "检查后端编译产物..."
$targetDir = Join-Path $ProjectRoot "backend\target\classes"
if (Test-Path $targetDir) {
    Write-Info "  后端编译产物: OK"
} else {
    Write-Err "  后端编译产物: MISSING"
    $allChecks = $false
}

Write-Info "检查前端依赖..."
$nodeModulesDir = Join-Path $ProjectRoot "frontend\node_modules"
if (Test-Path $nodeModulesDir) {
    Write-Info "  前端依赖: OK"
} else {
    Write-Err "  前端依赖: MISSING"
    $allChecks = $false
}

# =============================================
# 完成
# =============================================
Set-Location $ProjectRoot

Write-Step "环境搭建完成"

if ($allChecks) {
    Write-Host ""
    Write-Host "  所有检查通过！环境已就绪。" -ForegroundColor Green
    Write-Host ""
    Write-Host "  启动后端：" -ForegroundColor White
    Write-Host "    cd backend" -ForegroundColor Yellow
    Write-Host "    .\mvnw spring-boot:run -Dmaven.test.skip=true -Dspring-boot.run.profiles=local" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  启动前端：" -ForegroundColor White
    Write-Host "    cd frontend" -ForegroundColor Yellow
    Write-Host "    npm run dev" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  访问地址：" -ForegroundColor White
    Write-Host "    前端: http://localhost:5173" -ForegroundColor Yellow
    Write-Host "    后端: http://localhost:8080" -ForegroundColor Yellow
    Write-Host "    默认账号: admin / admin123" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "  部分检查未通过，请查看上方错误信息并手动修复。" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "  数据库初始化（如需手动）：" -ForegroundColor White
Write-Host "    Get-Content scripts\init-database.sql -Raw | docker exec -i supplypro-mysql mysql -u root -ppassword supplypro --default-character-set=utf8mb4" -ForegroundColor Yellow
Write-Host ""
