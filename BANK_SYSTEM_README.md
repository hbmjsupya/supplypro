# Bank Basic Information Management System

This system manages basic information for bank institutions, providing data support for supplier and logistics provider settlement accounts.

## 1. Database Design

### Table: `banks`

| Field | Type | Description |
|-------|------|-------------|
| id | BIGINT | Primary Key, Auto-increment |
| bank_code | VARCHAR(12) | CNAPS Code (Unique Index) |
| name | VARCHAR(255) | Full Name (Index) |
| short_name | VARCHAR(100) | Short Name |
| type | VARCHAR(50) | Type (STATE_OWNED, JOINT_STOCK, etc.) |
| level | VARCHAR(50) | Level (HEAD_OFFICE, BRANCH, SUB_BRANCH) |
| province | VARCHAR(100) | Province |
| city | VARCHAR(100) | City |
| district | VARCHAR(100) | District |
| address | VARCHAR(500) | Detailed Address |
| phone | VARCHAR(50) | Contact Phone |
| swift_code | VARCHAR(50) | SWIFT Code |
| status | BOOLEAN | Active Status (Index) |

## 2. Backend API

Base URL: `/api/banks`

### Endpoints

- **GET /**: Search/List banks
  - Params: `page`, `size`, `keyword` (name/code), `status`
- **GET /{id}**: Get bank details
- **POST /**: Create new bank (Role: ADMIN, FINANCE)
- **PUT /{id}**: Update bank (Role: ADMIN, FINANCE)
- **DELETE /{id}**: Delete bank (Role: ADMIN, FINANCE)
- **POST /sync**: Trigger data sync (Role: ADMIN)

### Data Synchronization

- **Scheduled Task**: Runs daily at 2:00 AM (`BankSyncService`).
- **Mechanism**: Simulates fetching updates from authoritative sources (PBC/UnionPay) and updates the local database.

## 3. Frontend Component

### `<BankSelect />`

A reusable React component built with Ant Design.

#### Features
- **Remote Search**: Debounced (500ms) search by bank name.
- **Accessibility**: Keyboard navigation support.
- **Integration**: Used in Supplier and Logistics Provider settlement account forms.

#### Usage

```tsx
import BankSelect from '../../components/Bank/BankSelect';

<BankSelect
  value={bankId}
  onChange={(id, bank) => {
    console.log('Selected:', bank);
    setBankId(id);
  }}
/>
```

## 4. Permission Control

- **View**: All authenticated users.
- **Edit/Sync**: `ROLE_FINANCE` or `ROLE_ADMIN` only.

## 5. Testing & Verification

- **Unit Tests**: `BankRepositoryTest` (Planned)
- **Manual Verification**: Use `verify_bank.sh` script to test login, search, and create flows.
