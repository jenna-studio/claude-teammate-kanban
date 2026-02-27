/**
 * Auto-launcher for API server, dashboard, and browser
 *
 * When the MCP server starts, this module checks whether the API server
 * and dashboard are already running. If not, it spawns them as detached
 * background processes and opens the dashboard in the default browser.
 */

import { spawn, execFile } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Compiled path: packages/mcp-server/dist/utils/launcher.js
// Project root is 4 levels up
const PROJECT_ROOT = resolve(__dirname, '../../../..');
const DASHBOARD_DIR = resolve(PROJECT_ROOT, 'packages/dashboard');

const API_PORT = parseInt(process.env.API_PORT || '3000');
const DASHBOARD_PORT = 5173;
const DASHBOARD_URL = `http://localhost:${DASHBOARD_PORT}`;

/**
 * Check if a TCP port is accepting connections.
 */
function isPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

/**
 * Wait until a port starts accepting connections, with a timeout.
 */
async function waitForPort(port: number, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortListening(port)) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/**
 * Spawn a long-running process in the background (detached & unref'd).
 * stdout/stderr are piped to /dev/null so they don't interfere with stdio MCP transport.
 */
function spawnBackground(
  command: string,
  args: string[],
  cwd: string,
  env?: Record<string, string>,
): void {
  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, ...env },
  });
  child.unref();
  console.error(`[Launcher] Spawned ${command} ${args.join(' ')} (PID ${child.pid})`);
}

/**
 * Open a URL in the user's default browser.
 */
function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'cmd'
        : 'xdg-open';

  const args =
    process.platform === 'win32' ? ['/c', 'start', '', url] : [url];

  execFile(cmd, args, (err) => {
    if (err) {
      console.error(`[Launcher] Could not open browser: ${err.message}`);
    }
  });
}

/**
 * Main entry point – start servers if needed, then open the dashboard.
 */
export async function launchDashboard(): Promise<void> {
  try {
    // --- API server ---
    const apiUp = await isPortListening(API_PORT);
    if (!apiUp) {
      console.error(`[Launcher] API server not detected on port ${API_PORT}, starting…`);

      // Resolve the database path to an absolute path so the API server
      // finds the same DB regardless of its working directory.
      const dbPath = resolve(
        PROJECT_ROOT,
        process.env.DATABASE_PATH || 'packages/api-server/data/kanban.db',
      );

      spawnBackground(
        process.execPath, // current node binary
        [resolve(PROJECT_ROOT, 'packages/api-server/dist/index.js')],
        PROJECT_ROOT,
        { DATABASE_PATH: dbPath },
      );

      const apiReady = await waitForPort(API_PORT, 10_000);
      if (apiReady) {
        console.error(`[Launcher] API server is ready on port ${API_PORT}`);
      } else {
        console.error(`[Launcher] API server did not start within 10 s – continuing anyway`);
      }
    } else {
      console.error(`[Launcher] API server already running on port ${API_PORT}`);
    }

    // --- Dashboard dev server ---
    const dashUp = await isPortListening(DASHBOARD_PORT);
    if (!dashUp) {
      console.error(`[Launcher] Dashboard not detected on port ${DASHBOARD_PORT}, starting…`);

      spawnBackground(
        resolve(PROJECT_ROOT, 'node_modules/.bin/vite'),
        ['--port', String(DASHBOARD_PORT)],
        DASHBOARD_DIR,
      );

      const dashReady = await waitForPort(DASHBOARD_PORT, 15_000);
      if (dashReady) {
        console.error(`[Launcher] Dashboard is ready on port ${DASHBOARD_PORT}`);
      } else {
        console.error(`[Launcher] Dashboard did not start within 15 s – continuing anyway`);
      }
    } else {
      console.error(`[Launcher] Dashboard already running on port ${DASHBOARD_PORT}`);
    }

    // --- Open browser ---
    console.error(`[Launcher] Opening ${DASHBOARD_URL}`);
    openBrowser(DASHBOARD_URL);
  } catch (error) {
    // Never let launcher errors crash the MCP server
    console.error('[Launcher] Error:', error);
  }
}
