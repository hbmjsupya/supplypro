# Login System Troubleshooting Guide

## 1. Overview
This document describes the troubleshooting steps, root cause analysis, and solutions for the "Internal Server Error" (500) issues in the Login module.

## 2. Issue Description
**Symptom:** Users receive a "系统内部错误，请联系管理员" (System internal error, please contact administrator) message when attempting to log in.
**Error Code:** 500
**Log Error:** `Internal Server Error: [Specific Exception Message]`

## 3. Root Cause Analysis
Potential causes identified:
1.  **Database Connection Failure:** The application cannot connect to the database (e.g., wrong credentials, network issue).
2.  **Missing Admin User:** The `admin` user might not be initialized in the database if migration V2.6 failed.
3.  **Java Version Incompatibility:** Running Spring Boot 2.x on JDK 21+ caused startup errors in some environments.
4.  **Unhandled Exceptions:** Previous exception handler only caught `Exception`, potentially missing `Error` types or other `Throwable`s.

## 4. Solutions Implemented

### 4.1 Global Exception Handling
- Updated `GlobalExceptionHandler` to catch `Throwable` and `Exception`.
- Standardized 500 error response to return a friendly message: "系统内部错误，请联系管理员".
- Logs full stack trace to backend logs for debugging.

### 4.2 Logging Enhancements
- Added `logback-spring.xml` to persist logs to `logs/app.log` and `logs/error.log`.
- Added detailed request/response logging in `AuthController`.

### 4.3 Testing & Verification
- **Unit Tests:** Added `LoginErrorTest` to verify error handling logic.
- **Regression Tests:** Verified normal login flow using H2 in-memory database.
- **Environment:** Standardized on JDK 17 for stability.

## 5. Monitoring & Alarms
- **Log Monitoring:** Check `logs/error.log` for "Critical System Error" or "Login failed".
- **Health Check:** Ensure `/actuator/health` is UP (if enabled).

## 6. Deployment Checklist
- [ ] Verify `application.yml` database credentials.
- [ ] Ensure JDK 17 is used.
- [ ] Run `mvn test` to ensure all regression tests pass.
- [ ] Check `logs/error.log` immediately after startup.

## 7. Login Page Access Information
To access the login functionality, ensure the frontend service is running and use the following URL details:

*   **Protocol**: HTTP
*   **Domain**: `localhost` (for local development) or Server IP
*   **Port**: Defaults to `5173`. If occupied, Vite will auto-increment (e.g., `5174`, `5175`). **Always check the terminal output for the active port.**
*   **Path**: `/login`
*   **Full URL Example**: 
    *   Primary: `http://localhost:5173/login`
    *   Secondary: `http://localhost:5174/login`

**Note:** If modifications are not visible, check if you are accessing the correct port.
