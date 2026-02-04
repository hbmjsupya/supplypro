# pnpm + Vite Test Environment Setup Scheme

This document provides a complete scheme for configuring domestic mirror sources and setting up a new Vite project with Vitest and Cypress using pnpm.

## 1. Mirror Configuration

Before starting, configure npm and pnpm to use the domestic mirror (`https://registry.npmmirror.com`) to ensure fast and stable downloads.

### Configure npm
```bash
npm config set registry https://registry.npmmirror.com/
```

### Configure pnpm
If you don't have pnpm installed, you can install it globally (requires permissions) or use `npx pnpm`.
To configure the registry for pnpm:
```bash
pnpm config set registry https://registry.npmmirror.com/
```

For project-specific configuration (recommended), create a `.npmrc` file in the project root:
```ini
registry=https://registry.npmmirror.com/
```

## 2. Create New Vite Project

Use the following command to create a new Vite project (using React + TypeScript template as an example):

```bash
# Using npm to create (easiest compatibility)
npm create vite@latest my-vite-project -- --template react-ts

# Enter project directory
cd my-vite-project
```

## 3. Install Dependencies via pnpm

First, switch to pnpm and install basic dependencies:

```bash
# If pnpm is not in PATH, use `npx pnpm`
npx pnpm install
```

Install test frameworks (Vitest, Cypress) and helper libraries:

```bash
npx pnpm add -D vitest jsdom cypress @testing-library/react @testing-library/user-event
```

## 4. Configuration & Verification

### Configure Scripts
Update `package.json` scripts:
```json
"scripts": {
  "test": "vitest",
  "cypress:open": "cypress open",
  "cypress:run": "cypress run"
}
```

### Configure Vitest
Create `vitest.config.ts`:
```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

### Verify Installation
Create a simple test file `src/demo.test.ts`:
```typescript
import { expect, test } from 'vitest'

test('demo test', () => {
  expect(1 + 1).toBe(2)
})
```

Run the test:
```bash
npx pnpm test run
```

If the test passes, the environment is correctly set up.

## 5. Troubleshooting

- **pnpm not found**: Use `npx pnpm <command>` or install globally via `npm install -g pnpm`.
- **Permission errors**: If global installation fails, use local installation or `npx`.
- **Binary download failures**: Cypress binary download might fail. Use `CYPRESS_INSTALL_BINARY=0` in CI, or ensure network access to `cdn.npmmirror.com`.
- **Mirror verification**: Check current registry with `pnpm config get registry`.
