"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.testConnection = testConnection;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// AR Service Database Configuration
// CRITICAL: Isolated database for AR projects ONLY
// No mixing with main e-commerce database
const databaseUrl = process.env.AR_DATABASE_URL;
if (!databaseUrl) {
    throw new Error('AR_DATABASE_URL environment variable is required');
}
exports.pool = new pg_1.Pool({
    connectionString: databaseUrl,
    max: 20, // Normal pool size (no MindAR blocking in main pool)
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 60000, // Normal timeout (workers handle compilation)
    statement_timeout: 30000, // 30s query timeout
    application_name: 'ar-service'
});
// Test connection on startup
exports.pool.on('connect', () => {
    console.log('[AR DB] ✅ Connected to AR database');
});
exports.pool.on('error', (err) => {
    console.error('[AR DB] ❌ Unexpected error:', err);
    process.exit(-1);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[AR DB] 🛑 Closing database pool...');
    await exports.pool.end();
    console.log('[AR DB] ✅ Database pool closed');
});
async function testConnection() {
    try {
        const result = await exports.pool.query('SELECT NOW()');
        console.log('[AR DB] ✅ Database connection test successful');
        return true;
    }
    catch (error) {
        console.error('[AR DB] ❌ Database connection test failed:', error);
        return false;
    }
}
//# sourceMappingURL=database.js.map