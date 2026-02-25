#!/usr/bin/env node

/**
 * Entry point for Agent Kanban MCP Server
 */

import { AgentKanbanMCPServer } from './server.js';

// Get database path from environment variable or use default
const dbPath = process.env.DATABASE_PATH || './data/kanban.db';

const server = new AgentKanbanMCPServer(dbPath);

server.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
