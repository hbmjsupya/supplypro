# SupplyPro MCP Integration

This project includes a Model Context Protocol (MCP) server to provide AI assistants (like Claude/Trae) with direct access to project tools and data.

## Features

The MCP server (`mcp/`) provides the following tools:

1.  **`query_database`**: Execute SQL queries against the project database (MySQL).
    *   *Usage*: `query_database(query="SELECT * FROM users LIMIT 5")`
2.  **`get_admin_token`**: Retrieve a valid JWT token for the `admin` user.
    *   *Usage*: `get_admin_token()`
    *   *Useful for*: Making authenticated API calls via curl or other tools.
3.  **`sync_tax_data`**: Trigger the Tax Classification data synchronization process.
    *   *Usage*: `sync_tax_data()`

## Configuration

The MCP configuration is located in `mcp.json` at the project root.

### Prerequisites
- Node.js (v16+)
- MySQL Database running (default port 3307 for Dev profile)
- Backend Service running (default http://localhost:8080)

### Installation

```bash
cd mcp
npm install
npm run build
```

## Testing

You can verify the MCP server is working using the included test client:

```bash
cd mcp
npm run build
node dist/client-test.js
```

## Integration

To use this with Claude Desktop or other MCP clients, add the server configuration from `mcp.json` to your client's config file.

```json
{
  "mcpServers": {
    "supplypro": {
      "command": "node",
      "args": ["/absolute/path/to/supplypro/mcp/dist/index.js"],
      "env": {
        "DB_PORT": "3307"
      }
    }
  }
}
```
