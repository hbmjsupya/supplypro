# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
# Start infrastructure only (MySQL, Redis, RabbitMQ)
docker compose up -d mysql redis rabbitmq

# Backend (profiles: local | dev | prod)
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=local -Dmaven.test.skip=true
./mvnw compile -Dmaven.test.skip=true           # compile only
./mvnw test -Dtest=ClassName                    # single test class

# Frontend
cd frontend
npm run dev                        # Vite dev server on :5173, proxies /api → :8080
npx tsc --noEmit                   # type-check only
npx vite build                     # production build

# Full production startup
docker compose up --build

# Environment setup (new machine)
./setup-env.sh                      # Linux/Mac
powershell -File setup-env.ps1      # Windows
```

**Default accounts**: admin / admin123 (seeded by `DataInitializer.java`)

## Architecture

Monolith full-stack app: **Spring Boot 2.7 (Java 17)** + **React 19 (TypeScript)** via Vite, deployed with Docker Compose (7 services: frontend nginx, backend, MySQL 8.0, Redis 7, Elasticsearch 7, RabbitMQ 3.11, registry).

Spring profiles: `local` (flyway disabled, ES/RabbitMQ excluded), `dev` (flyway enabled, ES/RabbitMQ excluded), `prod` (everything enabled). The `ddl-auto` is `validate` in base config and `update` in dev/local — new entities MUST have corresponding Flyway migrations.

Key infrastructure beans: `aiRestTemplate` (10s connect / 300s read timeout) for AI API calls, separate from the default `restTemplate` (5s timeout).

## Backend Package Structure

- `controller/` — 38 REST controllers mapped to `/api/*`
- `service/` — interfaces; `service/impl/` — implementations
- `repository/` — 50 Spring Data JPA repositories
- `entity/` — 49 JPA entities (tables managed by Flyway + ddl-auto)
- `config/` — SecurityConfig (JWT + Spring Security, strict-mode toggle), RestTemplateConfig, RedisConfig, RabbitMQConfig, data initializers
- `dto/` — data transfer objects
- `document/` — Elasticsearch `ProductDocument` (IK Chinese analyzer)
- `event/` + `listener/` — Spring events for PO lifecycle (inbound, received, logistics updated)
- `common/` — `ApiResponse<T>` wrapper, `@OperationLog` AOP, JWT utils, exception handlers

## Frontend Package Structure

- `pages/` — page-level components by domain (`AiTools/`, `PurchaseOrder/`, `Settlement/`, `Warehouse/`, etc.)
- `components/` — reusable UI: `ErrorBoundary`, `ProtectedRoute`, `ChatPanel`
- `services/` — API service layer (14 files, one per domain), all using the shared `request.ts` axios instance
- `utils/request.ts` — centralized axios: interceptor injects Bearer token, unpacks `ApiResponse` wrapper, retries GET 500s (3× with 1s delay), redirects 401 to `/login`
- `utils/statusMapping.ts` — Chinese status labels & colors
- State management: React `useState`/`useReducer` per page (no Redux); auth + AI config in localStorage

## Database Migration Strategy

Flyway baseline is **5.100**: V1.0–V5.x migrations are skipped on new databases. The `init-database.sql` script in `scripts/` must be run manually before first startup to seed reference data (logistics companies, banks, categories, admin user). New migrations go in `db/migration/` with versions > 5.100.

## Key Business Logic Locations

- **Purchase orders** — `PurchaseOrderServiceImpl` (~1900 lines): state machine (PENDING→CONFIRMED→SHIPPED→RECEIVED), waybill deduplication (one waybill = one shipping fee > 0), automatic settlement creation on ship
- **Settlements** — `SettlementService`: generates `JS`/`PS`/`GS` prefixed document numbers via Redis sequences, 6% VAT calculation (net = total / 1.06)
- **Category mapping** — `CategoryMappingServiceImpl` (857 lines): multi-strategy mapping engine (keyword rules → bigram similarity → fallback → semantic overrides), YAML rules in `mapping-rules.yml`, AI enhancement via `AiProxyService`
- **AI proxy** — `AiProxyService`: supports 6 LLM providers (DeepSeek, Tongyi, GLM, Doubao, Ernie, Xinghuo), all proxied through `POST /api/ai/proxy`
- **Cost adjustment** — `CostAdjustmentServiceImpl`: approval flow → updates PO cost → syncs StockBatch → creates StockFlow → auto-generates settlement
- **Snapshot system** — `PurchaseOrderSnapshotService`: immutable JSON snapshots with SHA-256 dedup, RabbitMQ async backfill
- **Data integrity** — `DataIntegrityMonitorService`: hourly checks for orphan POs/inbounds, snapshot consistency; daily cleanup of invalid snapshots

## Resilience & Events

- **Resilience4j**: circuit breaker + retry on `purchaseOrderList` and `taxApi` instances
- **RabbitMQ**: `ProductSyncProducer/Consumer` (ES indexing), `SnapshotBackfillProducer/Consumer` + dead-letter queue
- **Dev profile**: RabbitMQ auto-config excluded; synchronous fallback for ES indexing
- **Spring Events**: `PurchaseOrderInboundEvent`, `PurchaseReceivedEvent`, `PurchaseLogisticsUpdatedEvent` — handled by `PurchaseOrderInboundListener` (async, 3 retries)

## Security

JWT stateless auth via `JwtAuthenticationFilter` (OncePerRequestFilter). All APIs default to `permitAll()`. A `supplypro.security.strict-mode` toggle exists — when enabled, GET is public but POST/PUT/DELETE require authentication. Token blacklist in Redis on logout.

## Document Number Formats

| Type | Prefix | Format | Generator |
|------|--------|--------|-----------|
| Purchase Order | C | `C`+yyyyMMddHHmm+3digits | Redis sequence |
| Inbound Order | IN | `IN`+yyyyMMdd+timeBucket+3digits | Redis sequence |
| Settlement | JS | `JS`+yyyyMMddHHmm+3digits | Redis sequence |
| Delivery Settlement | PS | `PS`+yyyyMMddHHmmss+3digits | Redis sequence |
| Cost Adjustment | RC | `RC`+yyMMdd+2digits | Redis sequence |
| Refund | T | `T`+yyyyMMdd+4digits | DB counter |

## Gotchas

- `Map.of()` does NOT allow null values (Java 9+) — use `new HashMap<>()` for responses with nullable fields
- The `application-local.yml` is gitignored; copy from `application-local.yml.example` and update DB password + JWT secret
- Flyway `baseline-version: 5.100` means V1–V5 migrations are skipped; new DBs need `init-database.sql` run first
- `ddl-auto: validate` in default profile catches entity/DB mismatches at startup but doesn't modify schema
- The old `CategoryMapping.tsx` (2027 lines) was refactored into `CategoryMapping/index.tsx` (~680 lines) with extracted hooks and components — do NOT recreate the monolithic file
- RabbitMQ consumers are disabled in dev/local profiles; use sync fallback methods
