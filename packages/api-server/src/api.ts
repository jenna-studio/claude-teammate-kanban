/**
 * Express API Server
 * Provides REST endpoints for the dashboard
 */

import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { boardRoutes, taskRoutes, agentRoutes } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';

/**
 * API Server configuration
 */
export interface ApiServerConfig {
  port: number;
  corsOrigin?: string | string[];
  enableLogging?: boolean;
}

/**
 * Create and configure Express application
 * @param config - Server configuration
 * @returns Configured Express app
 */
export function createApiServer(config: ApiServerConfig): Express {
  const app = express();

  // ==========================================
  // Middleware
  // ==========================================

  // Security headers
  app.disable('x-powered-by');

  // CORS - Allow cross-origin requests from dashboard
  const corsOptions: cors.CorsOptions = {
    origin: config.corsOrigin || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // 24 hours
  };
  app.use(cors(corsOptions));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' })); // Support large code diffs
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  if (config.enableLogging !== false) {
    app.use(morgan('combined', {
      skip: (req) => req.path === '/health', // Skip health check logs
    }));
  }

  // ==========================================
  // Health Check
  // ==========================================

  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ==========================================
  // API Routes
  // ==========================================

  // API version prefix
  const apiPrefix = '/api';

  // Board routes
  app.use(`${apiPrefix}/boards`, boardRoutes);

  // Task routes
  app.use(`${apiPrefix}/tasks`, taskRoutes);

  // Agent routes
  app.use(`${apiPrefix}/agents`, agentRoutes);

  // API root
  app.get(apiPrefix, (_req, res) => {
    res.json({
      success: true,
      message: 'Agent Track Dashboard API',
      version: '0.1.0',
      endpoints: {
        boards: `${apiPrefix}/boards`,
        tasks: `${apiPrefix}/tasks`,
        agents: `${apiPrefix}/agents`,
        health: '/health',
      },
    });
  });

  // ==========================================
  // Error Handling
  // ==========================================

  // 404 handler for unmatched routes
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}

/**
 * Start the API server
 * @param app - Express application
 * @param port - Port to listen on
 * @returns HTTP server instance
 */
export function startApiServer(app: Express, port: number) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`[API Server] Listening on port ${port}`);
      console.log(`[API Server] Health check: http://localhost:${port}/health`);
      console.log(`[API Server] API endpoint: http://localhost:${port}/api`);
      resolve(server);
    });

    server.on('error', (error) => {
      console.error('[API Server] Failed to start:', error);
      reject(error);
    });
  });
}
