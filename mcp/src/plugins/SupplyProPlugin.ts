import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import mysql from "mysql2/promise";
import axios from "axios";
import { McpPlugin } from "../types.js";

export interface SupplyProConfig {
    db: mysql.ConnectionOptions;
    apiBaseUrl: string;
}

export class SupplyProPlugin implements McpPlugin {
    name = "SupplyPro";
    private config: SupplyProConfig;

    constructor(config: SupplyProConfig) {
        this.config = config;
    }

    async register(server: McpServer): Promise<void> {
        // Tool: Query Database
        server.tool(
            "query_database",
            { query: z.string().describe("SQL query to execute") },
            async ({ query }) => {
                let connection;
                try {
                    connection = await mysql.createConnection(this.config.db);
                    const [rows] = await connection.execute(query);
                    return {
                        content: [{ type: "text", text: JSON.stringify(rows, null, 2) }]
                    };
                } catch (error: any) {
                    return {
                        content: [{ type: "text", text: `Error: ${error.message}` }],
                        isError: true
                    };
                } finally {
                    if (connection) await connection.end();
                }
            }
        );

        // Tool: Get Admin Token
        server.tool(
            "get_admin_token",
            {},
            async () => {
                try {
                    const response = await axios.post(`${this.config.apiBaseUrl}/auth/signin`, {
                        username: "admin",
                        password: "password"
                    });
                    const token = response.data.data?.token;
                    if (!token) {
                         return {
                            content: [{ type: "text", text: "Token not found in response: " + JSON.stringify(response.data) }],
                            isError: true
                         };
                    }
                    return {
                        content: [{ type: "text", text: token }]
                    };
                } catch (error: any) {
                    return {
                        content: [{ type: "text", text: `Login Failed: ${error.message}` }],
                        isError: true
                    };
                }
            }
        );

        // Tool: Sync Tax Data
        server.tool(
            "sync_tax_data",
            {},
            async () => {
                try {
                    // Get token first
                    const response = await axios.post(`${this.config.apiBaseUrl}/auth/signin`, {
                        username: "admin",
                        password: "password"
                    });
                    const token = response.data.data?.token;
                    
                    if (!token) throw new Error("Failed to get token for sync");

                    const syncRes = await axios.post(`${this.config.apiBaseUrl}/tax-classifications/sync`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    return {
                        content: [{ type: "text", text: JSON.stringify(syncRes.data, null, 2) }]
                    };
                } catch (error: any) {
                     return {
                        content: [{ type: "text", text: `Sync Failed: ${error.message}` }],
                        isError: true
                    };
                }
            }
        );
    }
}
