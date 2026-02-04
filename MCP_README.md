# MCP (Model Context Protocol) Integration

This project is configured with [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) support, enabling AI agents and LLMs to interact with the project's resources, database, and version control system in a standardized way.

## Installed MCP Toolkits

The following MCP packages have been installed as `devDependencies` in the `frontend` workspace (npm):

1.  **Core SDK**
    *   Package: `@modelcontextprotocol/sdk`
    *   Purpose: Provides the foundation for building custom MCP servers and clients.

2.  **Database Connector**
    *   Package: `@bytebase/dbhub`
    *   Purpose: Connects to MySQL (and other DBs) to allow schema inspection and query execution via MCP.
    *   Usage:
        ```bash
        # Configure via environment variable DSN or config file
        export DSN="mysql://root:password@localhost:3307/supply_chain_db"
        npx dbhub
        ```

3.  **Filesystem Access**
    *   Package: `@modelcontextprotocol/server-filesystem`
    *   Purpose: Provides safe access to the local filesystem (read/write).
    *   Usage:
        ```bash
        npx @modelcontextprotocol/server-filesystem /path/to/allowed/directory
        ```

4.  **Version Control (Git)**
    *   Package: `github-mcp-server`
    *   Purpose: Enables Git repository management and GitHub API interactions.
    *   Usage:
        ```bash
        export GITHUB_PERSONAL_ACCESS_TOKEN=your_token
        npx github-mcp-server
        ```

5.  **Debugging & Inspection**
    *   Package: `@modelcontextprotocol/inspector`
    *   Purpose: A web-based tool to inspect and test MCP servers.
    *   Usage:
        ```bash
        npx @modelcontextprotocol/inspector <command-to-run-server>
        ```

## Quick Start

To use these tools with an MCP Client (e.g., Claude Desktop or an AI IDE):

1.  **Install Dependencies**:
    ```bash
    cd frontend
    npm install
    ```

2.  **Run a Server**:
    To run the filesystem server for the current project root:
    ```bash
    npx @modelcontextprotocol/server-filesystem $(pwd)/../
    ```

3.  **Inspect a Server**:
    To test the database connector:
    ```bash
    npx @modelcontextprotocol/inspector npx dbhub --dsn="mysql://root:password@localhost:3307/supply_chain_db"
    ```

## Configuration

Ensure you have the following environment variables set when running specific servers:
- `DSN`: Database connection string for `dbhub`.
- `GITHUB_PERSONAL_ACCESS_TOKEN`: For `github-mcp-server` if accessing remote GitHub APIs.
