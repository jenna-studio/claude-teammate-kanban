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
  // Find or create a board for the current working directory so the
  // browser opens directly to the correct project board.
  const cwd = process.cwd();
  let boardId = server.findBoardByProjectPath(cwd);

  if (boardId) {
    console.error(`[MCP] Found existing board ${boardId} for project ${cwd}`);
  } else {
    // Auto-create a board for this project
    boardId = server.createBoardForProject(cwd);
    console.error(`[MCP] Created new board ${boardId} for project ${cwd}`);
  }

  // Launch the API server, dashboard dev server, and open the browser.
  launchDashboard(boardId);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
