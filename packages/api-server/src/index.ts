/**
 * API + WebSocket Server for Agent Track Dashboard
 * Main entry point that starts both HTTP and WebSocket servers
 */

import { initDatabase, closeDatabase } from './database.js';
import { createApiServer, startApiServer } from './api.js';
import { RealtimeServer } from './websocket.js';
import { setWebSocketServer } from './routes/index.js';

/**
 * Server configuration from environment variables
 */
const config = {
  apiPort: parseInt(process.env.API_PORT || '3000'),
  wsPort: parseInt(process.env.WEBSOCKET_PORT || '8080'),
  dbPath: process.env.DATABASE_PATH || './data/kanban.db',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  nodeEnv: process.env.NODE_ENV || 'development',
};

/**
 * Main server startup function
 */
async function startServer() {
  try {
    console.log('==========================================');
    console.log('  Agent Track Dashboard - API Server');
    console.log('==========================================');
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Database: ${config.dbPath}`);
    console.log('');

    // Initialize database connection
    console.log('[Startup] Initializing database...');
    initDatabase(config.dbPath);
    console.log('[Startup] Database initialized');

    // Create and start API server
    console.log('[Startup] Creating API server...');
    const app = createApiServer({
      port: config.apiPort,
      corsOrigin: config.corsOrigin,
      enableLogging: config.nodeEnv !== 'test',
    });

    await startApiServer(app, config.apiPort);

    // Create and start WebSocket server
    console.log('[Startup] Creating WebSocket server...');
    const wsServer = new RealtimeServer({
      port: config.wsPort,
      heartbeatInterval: 30000,
      clientTimeout: 60000,
    });

    // Wire WebSocket server to notification route for MCP bridge
    setWebSocketServer(wsServer);

    console.log('');
    console.log('==========================================');
    console.log('  Servers running successfully!');
    console.log('==========================================');
    console.log(`API Server: http://localhost:${config.apiPort}`);
    console.log(`WebSocket: ws://localhost:${config.wsPort}`);
    console.log(`Health Check: http://localhost:${config.apiPort}/health`);
    console.log('');
    console.log('Press Ctrl+C to stop');
    console.log('==========================================');

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      console.log('');
      console.log(`[${signal}] Received shutdown signal, closing servers...`);

      try {
        // Close WebSocket server first (active connections)
        console.log('[Shutdown] Closing WebSocket server...');
        await wsServer.close();

        // Close database connection
        console.log('[Shutdown] Closing database connection...');
        closeDatabase();

        console.log('[Shutdown] Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('[Shutdown] Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('[Fatal] Uncaught exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, _promise) => {
      console.error('[Fatal] Unhandled promise rejection:', reason);
      shutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    console.error('[Startup] Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
