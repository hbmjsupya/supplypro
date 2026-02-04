import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface McpPlugin {
    name: string;
    register(server: McpServer): Promise<void> | void;
}
