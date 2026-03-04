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
import { startStreamableHttpServer } from './http.js';
import { launchDashboard } from './utils/launcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve to the API server's database by default so both servers share data
const defaultDbPath = resolve(__dirname, '../../api-server/data/kanban.db');
const dbPath = process.env.DATABASE_PATH || defaultDbPath;

const transportMode = (process.env.MCP_TRANSPORT || 'stdio').toLowerCase();

function ensureProjectBoard(server: AgentKanbanMCPServer): string {
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

  return boardId;
}

function shouldAutoLaunchDashboard(): boolean {
  // Default is true so MCP startup automatically opens dashboard.
  // Set AUTO_LAUNCH_DASHBOARD=false to disable.
  return process.env.AUTO_LAUNCH_DASHBOARD !== 'false';
}

async function bootstrapProjectBoard(dbPathValue: string): Promise<string> {
  const bootstrapServer = new AgentKanbanMCPServer(dbPathValue, {
    cleanStaleDataOnStart: false,
  });

  try {
    return ensureProjectBoard(bootstrapServer);
  } finally {
    await bootstrapServer.close();
  }
}

async function runStdioMode() {
  const server = new AgentKanbanMCPServer(dbPath);
  await server.run();

  const shouldBootstrapProjectBoard = process.env.MCP_BOOTSTRAP_PROJECT_BOARD !== 'false';
  if (!shouldBootstrapProjectBoard) {
    return;
  }

  const boardId = ensureProjectBoard(server);

  if (shouldAutoLaunchDashboard()) {
    console.error('[MCP] Auto-launching dashboard...');
    launchDashboard(boardId);
  } else {
    console.error('[MCP] Dashboard auto-launch disabled (AUTO_LAUNCH_DASHBOARD=false).');
    console.error(`[MCP] View dashboard manually at: http://localhost:5173/board/${boardId}`);
  }
}

function readHttpPort(): number {
  const rawPort = process.env.MCP_HTTP_PORT || '8787';
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid MCP_HTTP_PORT: ${rawPort}`);
  }

  return port;
}

async function runHttpMode() {
  if (shouldAutoLaunchDashboard()) {
    const boardId = await bootstrapProjectBoard(dbPath);
    console.error('[MCP] Auto-launching dashboard...');
    void launchDashboard(boardId);
  } else {
    console.error('[MCP] Dashboard auto-launch disabled (AUTO_LAUNCH_DASHBOARD=false).');
  }

  await startStreamableHttpServer({
    dbPath,
    host: process.env.MCP_HTTP_HOST || '127.0.0.1',
    port: readHttpPort(),
    endpoint: process.env.MCP_HTTP_PATH || '/mcp',
  });
}

const runPromise = transportMode === 'http' || transportMode === 'streamable-http'
  ? runHttpMode()
  : runStdioMode();

runPromise.catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
