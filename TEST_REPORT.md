# Product Submission & Deduplication Test Report

## 1. Overview
This report details the testing and validation of the Product Selection Submission fix and the new Global Product Name Deduplication feature.

## 2. Test Environment
- **Backend**: Spring Boot 2.7.x (Java 17)
- **Frontend**: React + Ant Design
- **Database**: H2 (Test), MySQL (Dev)
- **Test Framework**: JUnit 5, MockMvc

## 3. Implemented Features
1.  **Global Deduplication**:
    -   **Backend**: Enforced unique name checks in `create` (POST), `update` (PUT), and `updateStatus` (PATCH) endpoints.
    -   **Frontend**: Real-time validation in Product Add/Edit form using `/api/products/validation/name`.
    -   **Submission**: Added deduplication check during "Select" action in Product List.
2.  **Error Handling**:
    -   **404 Diagnosis**: Validated endpoint routing and ID handling.
    -   **UX Improvement**: Added "Go to Edit" modal when a duplicate name prevents submission.

## 4. Integration Test Results (Backend)

| Test Case | Description | Result |
| :--- | :--- | :--- |
| `updateStatus_ShouldReachEndpoint_AndValidateFields` | Verifies PATCH endpoint is reachable and validates mandatory fields (Brand, Category, etc.) | **PASS** |
| `updateStatus_ShouldFail_WhenNameDuplicate` | Verifies that status update is blocked if the product name duplicates another existing product | **PASS** |
| `updateStatus_ShouldReturn404_WhenIdNotFound` | Verifies that providing a non-existent ID returns a 404 status code | **PASS** |

### Test Execution Log
```
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
[INFO] Total time:  8.061 s
[INFO] Finished at: 2026-02-04T10:37:04+08:00
```

## 5. Frontend Verification
-   **Real-time Validation**: Verified `ProductAdd.tsx` calls `/api/products/validation/name` and displays error inline.
-   **Submission Error**: Verified `ProductPoolList.tsx` intercepts "Product Name Exists" error and shows a confirmation modal to redirect user to Edit page.

## 6. Conclusion
The "404 Not Found" error in product submission has been addressed by ensuring correct ID handling and endpoint routing. The global deduplication mechanism is now fully implemented across both frontend (user guidance) and backend (strict enforcement), ensuring data integrity.
