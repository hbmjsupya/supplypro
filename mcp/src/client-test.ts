import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
    const transport = new StdioClientTransport({
        command: "node",
        args: ["dist/index.js"]
    });

    const client = new Client({
        name: "test-client",
        version: "1.0.0"
    }, {
        capabilities: {}
    });

    await client.connect(transport);

    console.log("Connected to MCP Server");

    // List tools
    const tools = await client.listTools();
    console.log("Tools:", tools.tools.map(t => t.name));

    // Test Token
    console.log("Testing get_admin_token...");
    try {
        const tokenRes = await client.callTool({
            name: "get_admin_token",
            arguments: {}
        });
        console.log("Token Result:", JSON.stringify(tokenRes, null, 2));
    } catch (e: any) {
        console.error("Token Error:", e.message);
    }
    
    // Test DB
    console.log("Testing query_database...");
    try {
        const dbRes = await client.callTool({
            name: "query_database",
            arguments: { query: "SELECT count(*) as count FROM users" }
        });
        console.log("DB Result:", JSON.stringify(dbRes, null, 2));
    } catch (e: any) {
        console.error("DB Error:", e.message);
    }

    await client.close(); // Note: Client might not have close method in all versions, checking docs logic
}

main().catch(console.error);
