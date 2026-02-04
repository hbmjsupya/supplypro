import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpPlugin } from "./types.js";

export class McpServerBuilder {
    private server: McpServer;
    private plugins: McpPlugin[] = [];

    constructor(name: string, version: string) {
        this.server = new McpServer({ name, version });
    }

    /**
     * Integrates an MCP plugin into the server.
     * @param plugin The plugin to add
     */
    public withMcp(plugin: McpPlugin): McpServerBuilder {
        this.plugins.push(plugin);
        return this;
    }

    /**
     * Builds and starts the MCP server.
     */
    public async buildAndStart(): Promise<void> {
        console.error(`[McpServerBuilder] Registering ${this.plugins.length} plugins...`);
        for (const plugin of this.plugins) {
            try {
                await plugin.register(this.server);
                console.error(`[McpServerBuilder] Registered plugin: ${plugin.name}`);
            } catch (error) {
                console.error(`[McpServerBuilder] Failed to register plugin ${plugin.name}:`, error);
                throw error;
            }
        }
        
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("[McpServerBuilder] Server started on stdio transport");
    }
}
