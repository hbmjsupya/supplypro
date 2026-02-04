# Product Management System - Development Skills & Best Practices

## 1. API Interface Specification & Routing
- **Base URL Convention**: All API endpoints should be prefixed with `/api` (e.g., `/api/products`).
- **Proxy Configuration**: Frontend `vite.config.ts` must proxy `/api` to the backend port (default 8080).
  ```typescript
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true
    }
  }
  ```
- **RESTful Methods**:
  - `GET /api/resources`: List (Pagination support)
  - `GET /api/resources/{id}`: Detail (Handle 404 if not found)
  - `POST /api/resources`: Create (Return 200/201 with created entity)
  - `PUT /api/resources/{id}`: Full Update (Idempotent)
  - `PATCH /api/resources/{id}/status`: Partial Update (e.g., Status change)

## 2. Database Constraints & Data Integrity
- **Unique Constraints**:
  - **Global Name Deduplication**: Enforce uniqueness on business keys (e.g., Product Name, SKU Code) at both Application (Controller/Service) and Database levels.
  - **Validation Logic**:
    - *Create*: `!existsByName(name)`
    - *Update*: `!existsByNameAndIdNot(name, id)`
- **Foreign Key Relationships**:
  - Ensure associated entities (Brand, Supplier) exist and are ENABLED before linking.
  - Use `FetchType.LAZY` for collections but `JOIN FETCH` (or `EntityGraph`) in Repositories for performance.
- **Enum Consistency**:
  - Java Enums (e.g., `Product.Status`) must strictly match Database column values.
  - Use `@Enumerated(EnumType.STRING)` for clarity.

## 3. Error Handling Mechanism
- **Global Exception Handler**:
  - Use `@RestControllerAdvice` to catch `DataIntegrityViolationException`.
  - **Root Cause Analysis**: Parse `exception.getMostSpecificCause().getMessage()` to distinguish between "Duplicate entry" (400 Bad Request) and "Foreign key constraint fails" (400/404).
  - **User-Friendly Messages**: Translate SQL errors into actionable user prompts (e.g., "SKU Code already exists").
- **Frontend Interceptors**:
  - Axios interceptors should handle `400` (Validation), `401` (Auth), `403` (Permission), and `500` (Server) errors specifically.

## 4. Frontend Form Best Practices
- **ID Preservation**:
  - When editing complex objects (e.g., Product with SKUs), ALWAYS preserve the IDs of child entities (SKUs) to prevent Hibernate from deleting and recreating them (which breaks Foreign Keys).
  - Example: `skus: specs.map(s => ({ ...s, id: s.id }))`
- **Component State**:
  - Use `labelInValue` for `Select` components when binding to object relationships (e.g., Brand) to ensure the UI displays the name correctly even if the option list isn't fully loaded.

## 5. Testing Strategy
- **Integration Tests**:
  - Use `@SpringBootTest` + `MockMvc` for end-to-end flow validation.
  - **Transactional Tests**: Use `@Transactional` to roll back data after each test.
  - **Coverage Checklist**:
    - Happy Path (Create/Update Success)
    - Validation Failure (Duplicate Name/SKU)
    - Resource Not Found (404 on Invalid ID)
    - Status Transitions
