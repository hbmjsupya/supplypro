import { McpServerBuilder } from "./builder.js";
import { SupplyProPlugin } from "./plugins/SupplyProPlugin.js";
import { ContextPlugin } from "./plugins/ContextPlugin.js";

// DB Configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'supplypro'
};

// API Configuration
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8080/api';

async function main() {
    const builder = new McpServerBuilder("supplypro-mcp", "1.0.0");

    // Integrate Plugins using the Builder Module
    await builder
        .withMcp(new SupplyProPlugin({ db: dbConfig, apiBaseUrl }))
        .withMcp(new ContextPlugin())
        .buildAndStart();
}

main().catch(console.error);
