/**
 * Streamable HTTP transport launcher for MCP clients that can't use stdio.
 */

import { randomUUID } from 'crypto';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { AgentKanbanMCPServer } from './server.js';

interface HttpServerOptions {
  dbPath: string;
  host: string;
  port: number;
  endpoint: string;
}

interface SessionState {
  mcpServer: AgentKanbanMCPServer;
  transport: StreamableHTTPServerTransport;
}

function getHeaderString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') return value[0];
  return undefined;
}

function respondJsonRpcError(
  res: any,
  httpStatus: number,
  code: number,
  message: string
) {
  res.status(httpStatus).json({
    jsonrpc: '2.0',
    error: { code, message },
    id: null,
  });
}

export async function startStreamableHttpServer(options: HttpServerOptions): Promise<void> {
  const app = createMcpExpressApp({ host: options.host });
  const sessions = new Map<string, SessionState>();

  const closeSession = async (sessionId: string) => {
    const state = sessions.get(sessionId);
    if (!state) return;

    sessions.delete(sessionId);

    try {
      await state.transport.close();
    } catch (error) {
      console.error(`[MCP] Failed to close transport for session ${sessionId}:`, error);
    }

    try {
      await state.mcpServer.close();
    } catch (error) {
      console.error(`[MCP] Failed to close MCP server for session ${sessionId}:`, error);
    }
  };

  const createSession = async (): Promise<SessionState> => {
    const mcpServer = new AgentKanbanMCPServer(options.dbPath, {
      cleanStaleDataOnStart: false,
    });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId: string) => {
        sessions.set(sessionId, { mcpServer, transport });
      },
    });

    transport.onclose = () => {
      const sessionId = transport.sessionId;
      if (!sessionId) return;
      void closeSession(sessionId);
    };

    await mcpServer.connect(transport);
    return { mcpServer, transport };
  };

  app.all(options.endpoint, async (req: any, res: any) => {
    let createdSession = false;
    let state: SessionState | undefined;

    try {
      const sessionId = getHeaderString(req.headers['mcp-session-id']);

      if (sessionId) {
        state = sessions.get(sessionId);
        if (!state) {
          respondJsonRpcError(res, 404, -32001, 'Session not found');
          return;
        }
      } else if (req.method === 'POST' && isInitializeRequest(req.body)) {
        state = await createSession();
        createdSession = true;
      } else {
        respondJsonRpcError(res, 400, -32000, 'No valid MCP session ID provided');
        return;
      }

      await state.transport.handleRequest(req, res, req.body);

      if (createdSession && !state.transport.sessionId) {
        await state.transport.close();
        await state.mcpServer.close();
      }
    } catch (error) {
      console.error('[MCP] Streamable HTTP request failed:', error);

      if (!res.headersSent) {
        respondJsonRpcError(res, 500, -32603, 'Internal server error');
      }

      if (createdSession && state) {
        await state.transport.close();
        await state.mcpServer.close();
      }
    }
  });

  app.get('/health', (_req: any, res: any) => {
    res.json({
      status: 'ok',
      transport: 'streamable-http',
      endpoint: options.endpoint,
      activeSessions: sessions.size,
      timestamp: new Date().toISOString(),
    });
  });

  const listener = await new Promise<any>((resolve, reject) => {
    const server = app.listen(options.port, options.host, () => {
      console.error(
        `[MCP] Streamable HTTP server listening on http://${options.host}:${options.port}${options.endpoint}`
      );
      resolve(server);
    });
    server.on('error', reject);
  });

  await new Promise<void>((resolve) => {
    const shutdown = async (signal: string) => {
      console.error(`[MCP] Received ${signal}, shutting down streamable HTTP server...`);

      process.removeListener('SIGINT', onSigInt);
      process.removeListener('SIGTERM', onSigTerm);

      const sessionIds = [...sessions.keys()];
      for (const sessionId of sessionIds) {
        await closeSession(sessionId);
      }

      listener.close(() => {
        resolve();
      });
    };

    const onSigInt = () => {
      void shutdown('SIGINT');
    };

    const onSigTerm = () => {
      void shutdown('SIGTERM');
    };

    process.once('SIGINT', onSigInt);
    process.once('SIGTERM', onSigTerm);
  });
}
