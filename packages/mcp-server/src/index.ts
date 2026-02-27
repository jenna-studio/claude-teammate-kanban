#!/usr/bin/env node

/**
 * Entry point for Agent Kanban MCP Server
 *
 * By default, uses the API server's database so both servers
 * share the same data. Override with DATABASE_PATH env variable.
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { AgentKanbanMCPServer } from './server.js';
import { launchDashboard } from './utils/launcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve to the API server's database by default so both servers share data
const defaultDbPath = resolve(__dirname, '../../api-server/data/kanban.db');
const dbPath = process.env.DATABASE_PATH || defaultDbPath;

const server = new AgentKanbanMCPServer(dbPath);

server.run().then(() => {
  // Once the MCP server is connected, launch the API server,
  // dashboard dev server, and open the browser automatically.
  launchDashboard();
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
