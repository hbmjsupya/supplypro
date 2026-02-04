# SupplyPro Deployment Guide

This guide provides detailed instructions for deploying the SupplyPro project in both **Local Development** and **Docker Container** environments.

## 1. Prerequisites

Before you begin, ensure you have the following installed:

*   **Java Development Kit (JDK)**: Version 11 or higher (Tested with OpenJDK 24).
*   **Node.js**: Version 16 or higher (Recommended).
*   **Docker & Docker Compose**: For containerized deployment and database.
*   **Maven**: For building the backend (Optional if using Docker to build).

## 2. Environment Access Overview

| Environment | Frontend URL | Backend URL | Database Port |
| :--- | :--- | :--- | :--- |
| **Local Dev** | [http://localhost:5173](http://localhost:5173) | [http://localhost:8080](http://localhost:8080) | 3307 (Mapped) |
| **Docker** | [http://localhost:80](http://localhost:80) | [http://localhost:8081](http://localhost:8081) | 3307 (Mapped) |

### Default Credentials

*   **Admin User**:
    *   Username: `admin`
    *   Password: `password`
*   **Database**:
    *   Host: `localhost`
    *   Port: `3307`
    *   User: `root`
    *   Password: `password`
    *   Database: `supplypro`

---

## 3. Local Deployment Steps

Follow these steps to set up the project locally for development.

### Step 1: Start Database
We use Docker to run the MySQL database to avoid local installation clutter.

```bash
# Start only the database container
docker-compose up -d supplypro-db
```

### Step 2: Backend Setup

1.  **Build the Project**:
    If you have Maven installed:
    ```bash
    cd backend
    mvn clean package -DskipTests
    ```
    *If you don't have Maven, you can use Docker to build:*
    ```bash
    docker run --rm -v "$(pwd)/backend":/app -w /app maven:3.9.6-eclipse-temurin-17 mvn clean package -Dmaven.test.skip=true
    ```

2.  **Run the Application**:
    ```bash
    # Run from project root
    java -jar backend/target/supplypro-backend-0.0.1-SNAPSHOT.jar \
      --spring.profiles.active=dev \
      --spring.datasource.username=root \
      --spring.datasource.password=password \
      --spring.datasource.url="jdbc:mysql://127.0.0.1:3307/supplypro?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true&useUnicode=true&characterEncoding=utf-8"
    ```

### Step 3: Frontend Setup

1.  **Install Dependencies**:
    ```bash
    cd frontend
    npm install
    ```

2.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    Access the application at [http://localhost:5173](http://localhost:5173).

---

## 4. Docker Deployment Steps

Deploy the entire stack (Frontend + Backend + Database) using Docker Compose.

### Step 1: Build and Start
```bash
# Build images and start containers in background
docker-compose up -d --build
```

### Step 2: Verify Deployment
Check the status of your containers:
```bash
docker-compose ps
```
You should see 3 services running: `supplypro-frontend`, `supplypro-backend`, and `supplypro-db`.

Access the application at [http://localhost:80](http://localhost:80).

### Step 3: Stop Services
```bash
docker-compose down
```

---

## 5. Troubleshooting & Notes

### Login Error (Status 500)
**Issue**: Previously, logging in with `admin` caused a 500 error.
**Cause**: The password hash in the database migration (`V2.6__init_admin_user.sql`) was invalid for the BCrypt encoder.
**Solution**: The migration file has been updated with a valid hash for `password`. If you are using an old database volume, you may need to reset it:
```bash
docker-compose down -v  # WARNING: Deletes all database data
docker-compose up -d
```

### Port Conflicts
*   **Port 3306**: The `docker-compose.yml` maps MySQL to port **3307** on the host to avoid conflicts with local MySQL installations.
*   **Port 8080**: The Docker backend is mapped to **8081** on the host to avoid conflict with the local backend running on 8080.

### Maven Command Not Found
If you encounter `command not found: mvn`, use the Docker build method described in the "Local Deployment" section.
