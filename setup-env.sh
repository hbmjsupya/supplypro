#!/bin/bash
# =============================================
# SupplyPro 新环境自动化搭建脚本 (Linux/Mac)
# 用途：一键初始化新开发环境
# 使用方式：
#   chmod +x setup-env.sh
#   ./setup-env.sh
# =============================================

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

step() {
    echo ""
    echo -e "${CYAN}========================================"
    echo -e "  $1"
    echo -e "========================================${NC}"
}

info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

err() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

wait_for_port() {
    local host="${1:-localhost}"
    local port="$2"
    local timeout="${3:-120}"
    local service="$4"
    local start_time=$(date +%s)
    
    while true; do
        if nc -z "$host" "$port" 2>/dev/null || (echo > /dev/tcp/"$host"/"$port") 2>/dev/null; then
            info "$service ($host:$port) is ready"
            return 0
        fi
        
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        if [ $elapsed -ge $timeout ]; then
            err "$service ($host:$port) did not become ready within $timeout seconds"
            return 1
        fi
        
        echo -n "."
        sleep 2
    done
}

# =============================================
# Step 0: 前置检查
# =============================================
step "Step 0: 前置环境检查"

MISSING_DEPS=()

if ! check_command git; then
    MISSING_DEPS+=("Git")
fi
if ! check_command docker; then
    MISSING_DEPS+=("Docker")
fi
if ! check_command node; then
    MISSING_DEPS+=("Node.js (>=18)")
fi
if ! check_command java; then
    MISSING_DEPS+=("Java 17 (JDK)")
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    err "缺少以下依赖，请先安装："
    for dep in "${MISSING_DEPS[@]}"; do
        err "  - $dep"
    done
    echo ""
    echo -e "${YELLOW}安装指南：${NC}"
    echo "  Git:     https://git-scm.com/"
    echo "  Docker:  https://www.docker.com/products/docker-desktop"
    echo "  Node.js: https://nodejs.org/ (LTS版本)"
    echo "  Java 17: https://adoptium.net/"
    exit 1
fi

info "Git:      $(git --version)"
info "Docker:   $(docker --version)"
info "Node.js:  $(node --version)"
info "Java:     $(java -version 2>&1 | head -1)"

# =============================================
# Step 1: 拉取最新代码
# =============================================
step "Step 1: 拉取最新代码"

if [ -d ".git" ]; then
    info "检测到Git仓库，拉取最新代码..."
    git fetch origin
    CURRENT_BRANCH=$(git branch --show-current)
    info "当前分支: $CURRENT_BRANCH"
    git pull origin "$CURRENT_BRANCH" || warn "git pull 失败，可能存在本地修改冲突，继续使用当前代码..."
else
    warn "未检测到Git仓库，跳过代码拉取"
fi

# =============================================
# Step 2: 启动Docker基础设施
# =============================================
step "Step 2: 启动Docker基础设施 (MySQL, Redis, RabbitMQ)"

if ! docker info &> /dev/null; then
    err "Docker未运行，请先启动Docker"
    exit 1
fi

MYSQL_RUNNING=$(docker ps --filter "name=supplypro-mysql" --filter "status=running" --format "{{.Names}}" 2>/dev/null)
REDIS_RUNNING=$(docker ps --filter "name=supplypro-redis" --filter "status=running" --format "{{.Names}}" 2>/dev/null)
RABBITMQ_RUNNING=$(docker ps --filter "name=supplypro-rabbitmq" --filter "status=running" --format "{{.Names}}" 2>/dev/null)

if [ -n "$MYSQL_RUNNING" ] && [ -n "$REDIS_RUNNING" ] && [ -n "$RABBITMQ_RUNNING" ]; then
    info "所有基础设施容器已在运行中"
else
    info "启动基础设施容器..."
    docker compose up -d mysql redis rabbitmq
    
    info "等待MySQL启动..."
    wait_for_port localhost 3307 90 "MySQL"
    
    info "等待Redis启动..."
    wait_for_port localhost 6379 30 "Redis"
    
    info "等待RabbitMQ启动..."
    wait_for_port localhost 5672 60 "RabbitMQ"
fi

# =============================================
# Step 3: 初始化数据库
# =============================================
step "Step 3: 初始化数据库基础数据"

wait_for_port localhost 3307 30 "MySQL"
sleep 5

info "执行数据库初始化脚本..."
INIT_SQL_PATH="$PROJECT_ROOT/scripts/init-database.sql"
if [ -f "$INIT_SQL_PATH" ]; then
    docker exec -i supplypro-mysql mysql -u root -ppassword supplypro --default-character-set=utf8mb4 < "$INIT_SQL_PATH" 2>/dev/null && \
        info "数据库初始化脚本执行成功" || \
        warn "数据库初始化脚本执行失败（可能数据已存在），继续..."
else
    warn "未找到初始化脚本: $INIT_SQL_PATH"
fi

info "验证数据库数据..."
LC_COUNT=$(docker exec supplypro-mysql mysql -u root -ppassword supplypro --default-character-set=utf8mb4 -e "SELECT COUNT(*) FROM logistics_companies;" -s -N 2>/dev/null || echo "0")
if [ "$LC_COUNT" -gt 0 ]; then
    info "物流公司数据验证: $LC_COUNT 条"
else
    warn "物流公司数据缺失，请手动执行 scripts/init-database.sql"
fi

# =============================================
# Step 4: 配置后端
# =============================================
step "Step 4: 配置后端环境"

LOCAL_YML_PATH="$PROJECT_ROOT/backend/src/main/resources/application-local.yml"
LOCAL_YML_EXAMPLE="$PROJECT_ROOT/backend/src/main/resources/application-local.yml.example"

if [ ! -f "$LOCAL_YML_PATH" ]; then
    if [ -f "$LOCAL_YML_EXAMPLE" ]; then
        info "从示例文件创建 application-local.yml..."
        cp "$LOCAL_YML_EXAMPLE" "$LOCAL_YML_PATH"
    else
        info "创建默认 application-local.yml..."
        cat > "$LOCAL_YML_PATH" << 'YMLEOF'
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
YMLEOF
    fi
    info "application-local.yml 创建成功"
else
    info "application-local.yml 已存在，跳过创建"
    
    if grep -q "flyway:" "$LOCAL_YML_PATH" && grep -A1 "flyway:" "$LOCAL_YML_PATH" | grep -q "enabled: false"; then
        warn "检测到 application-local.yml 中 Flyway 被禁用，建议启用"
        sed -i.bak 's/flyway:\n\s*enabled: false/flyway:\n    enabled: true\n    baseline-on-migrate: true\n    baseline-version: "5.100"/' "$LOCAL_YML_PATH" 2>/dev/null || \
        warn "自动修改失败，请手动将 flyway.enabled 改为 true"
    fi
fi

# =============================================
# Step 5: 编译后端
# =============================================
step "Step 5: 编译后端项目"

cd "$PROJECT_ROOT/backend"

info "执行 Maven 编译（跳过测试）..."
if ./mvnw compile -Dmaven.test.skip=true -q 2>/dev/null; then
    info "后端编译成功"
else
    warn "Maven 编译失败，尝试清理后重新编译..."
    ./mvnw clean compile -Dmaven.test.skip=true -q
    if [ $? -ne 0 ]; then
        err "后端编译失败，请检查代码"
        cd "$PROJECT_ROOT"
        exit 1
    fi
    info "后端编译成功（清理后重编译）"
fi

# =============================================
# Step 6: 安装前端依赖
# =============================================
step "Step 6: 安装前端依赖"

cd "$PROJECT_ROOT/frontend"

if [ -d "node_modules" ]; then
    info "node_modules 已存在，跳过 npm install"
else
    info "安装前端依赖（首次安装，可能需要几分钟）..."
    npm install
    if [ $? -ne 0 ]; then
        err "前端依赖安装失败"
        cd "$PROJECT_ROOT"
        exit 1
    fi
    info "前端依赖安装成功"
fi

# =============================================
# Step 7: 环境验证
# =============================================
step "Step 7: 环境验证"

ALL_CHECKS=true

info "检查 Docker 容器状态..."
for container in supplypro-mysql supplypro-redis supplypro-rabbitmq; do
    status=$(docker ps --filter "name=$container" --filter "status=running" --format "{{.Status}}" 2>/dev/null)
    if [ -n "$status" ]; then
        info "  $container : $status"
    else
        err "  $container : NOT RUNNING"
        ALL_CHECKS=false
    fi
done

info "检查数据库连接..."
if docker exec supplypro-mysql mysql -u root -ppassword -e "SELECT 1 AS test;" supplypro &>/dev/null; then
    info "  数据库连接: OK"
else
    err "  数据库连接: FAILED"
    ALL_CHECKS=false
fi

info "检查基础数据..."
lc_count=$(docker exec supplypro-mysql mysql -u root -ppassword supplypro --default-character-set=utf8mb4 -e "SELECT COUNT(*) FROM logistics_companies;" -s -N 2>/dev/null || echo "0")
if [ "$lc_count" -gt 0 ]; then
    info "  物流公司数据: $lc_count 条"
else
    warn "  物流公司数据: 缺失"
fi

info "检查后端编译产物..."
if [ -d "$PROJECT_ROOT/backend/target/classes" ]; then
    info "  后端编译产物: OK"
else
    err "  后端编译产物: MISSING"
    ALL_CHECKS=false
fi

info "检查前端依赖..."
if [ -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    info "  前端依赖: OK"
else
    err "  前端依赖: MISSING"
    ALL_CHECKS=false
fi

# =============================================
# 完成
# =============================================
cd "$PROJECT_ROOT"

step "环境搭建完成"

if [ "$ALL_CHECKS" = true ]; then
    echo ""
    echo -e "${GREEN}  所有检查通过！环境已就绪。${NC}"
    echo ""
    echo "  启动后端："
    echo -e "    ${YELLOW}cd backend${NC}"
    echo -e "    ${YELLOW}./mvnw spring-boot:run -Dmaven.test.skip=true -Dspring-boot.run.profiles=local${NC}"
    echo ""
    echo "  启动前端："
    echo -e "    ${YELLOW}cd frontend${NC}"
    echo -e "    ${YELLOW}npm run dev${NC}"
    echo ""
    echo "  访问地址："
    echo -e "    前端: ${YELLOW}http://localhost:5173${NC}"
    echo -e "    后端: ${YELLOW}http://localhost:8080${NC}"
    echo -e "    默认账号: ${YELLOW}admin / admin123${NC}"
    echo ""
else
    echo ""
    echo -e "${YELLOW}  部分检查未通过，请查看上方错误信息并手动修复。${NC}"
    echo ""
fi

echo "  数据库初始化（如需手动）："
echo -e "    ${YELLOW}docker exec -i supplypro-mysql mysql -u root -ppassword supplypro --default-character-set=utf8mb4 < scripts/init-database.sql${NC}"
echo ""
