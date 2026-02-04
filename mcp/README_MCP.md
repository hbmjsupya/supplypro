# MCP Integration Guide for SupplyPro

This document details the integration of the Model Context Protocol (MCP) server into the SupplyPro project, featuring a modular plugin architecture.

## 1. Architecture Overview

The MCP server has been refactored to use a **Builder Pattern**, allowing for easy extension and configuration of plugins.

- **Builder Module**: `src/builder.ts` - Provides `McpServerBuilder` with the `withMcp()` method.
- **Plugins**: Located in `src/plugins/`.
    - `SupplyProPlugin`: Core project tools (Database, Auth, Tax Sync).
    - `ContextPlugin`: Context management tools (Set/Get context).
- **Entry Point**: `src/index.ts` - Configures and starts the server using the builder.

## 2. Installation & Configuration

### Prerequisites
- Node.js (v16+)
- TypeScript

### Setup
1. Navigate to the `mcp` directory:
   ```bash
   cd mcp
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment:
   Copy `.env.example` to `.env` (optional, defaults are provided in code):
   ```bash
   cp .env.example .env
   ```

## 3. Usage

### Building the Server
```bash
npm run build
```

### Starting the Server
```bash
npm start
```
This runs the server over `stdio`, ready to be connected to an MCP client (like Trae IDE or Claude Desktop).

## 4. Plugin System

To add a new capability, implement the `McpPlugin` interface:

```typescript
import { McpPlugin } from "../types";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class MyNewPlugin implements McpPlugin {
    name = "MyPlugin";
    register(server: McpServer) {
        server.tool("my_tool", {}, async () => { ... });
    }
}
```

Then register it in `src/index.ts`:

```typescript
builder.withMcp(new MyNewPlugin());
```

## 5. Troubleshooting

### Database Connection Failed
**Error**: `Access denied for user 'root'@'...'`
**Fix**: Ensure your Database Docker container allows connections from the host or the MCP container. Check `DB_HOST` and `DB_PORT`. If running locally with Docker mapping 3306->3307, use `localhost` and `3307`.

### Token Not Found
**Error**: `Login Failed`
**Fix**: Ensure the Backend Service is running on `http://localhost:8080`. Check `API_BASE_URL`.

### "withMcp" is not a function
**Fix**: Ensure you are using the `McpServerBuilder` class from `src/builder.ts`, not the raw `McpServer` class.
