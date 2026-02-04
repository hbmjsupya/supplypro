#!/bin/bash

# 1. Login and get token
echo "Logging in..."
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f3)

if [ -z "$TOKEN" ]; then
    echo "Login failed with password 'password', trying '123456'..."
    TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/signin \
      -H "Content-Type: application/json" \
      -d '{"username":"admin","password":"123456"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f3)
fi

if [ -z "$TOKEN" ]; then
    echo "Login failed! Cannot proceed with cache clearing."
    # Continue anyway for the test, as test does its own login
else
    echo "Token obtained."

    # 2. Clear Cache
    echo "Clearing Cache..."
    curl -X POST http://localhost:8080/api/system/maintenance/clear-cache \
      -H "Authorization: Bearer $TOKEN"

    # 3. Reinit Tax Data
    echo "Reinitializing Tax Data..."
    curl -X POST http://localhost:8080/api/system/maintenance/reinit-tax \
      -H "Authorization: Bearer $TOKEN"
fi

# 4. Run Cypress
echo "Running Cypress Tests..."
cd frontend
npx cypress run --spec "cypress/e2e/fix_verification.cy.ts"
