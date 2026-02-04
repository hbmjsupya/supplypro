import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { McpPlugin } from "../types.js";

export class ContextPlugin implements McpPlugin {
    name = "ContextManager";
    private store: Map<string, string> = new Map();

    async register(server: McpServer): Promise<void> {
        // Resource: Context List
        server.resource(
            "context",
            "context://list",
            async (uri) => {
                const data = Object.fromEntries(this.store);
                return {
                    contents: [{
                        uri: uri.href,
                        text: JSON.stringify(data, null, 2)
                    }]
                };
            }
        );

        // Tool: Set Context
        server.tool(
            "set_context",
            { key: z.string(), value: z.string() },
            async ({ key, value }) => {
                this.store.set(key, value);
                return {
                    content: [{ type: "text", text: `Context set: ${key} = ${value}` }]
                };
            }
        );

        // Tool: Get Context
        server.tool(
            "get_context",
            { key: z.string() },
            async ({ key }) => {
                const value = this.store.get(key);
                return {
                    content: [{ type: "text", text: value || "undefined" }]
                };
            }
        );
    }
}
