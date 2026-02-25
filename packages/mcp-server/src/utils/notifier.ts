/**
 * HTTP notifier for bridging MCP server events to the API server's WebSocket
 *
 * Sends lightweight POST requests to the API server's /api/notify endpoint
 * so that dashboard clients receive real-time updates when agents make changes.
 */

const API_BASE_URL = process.env.API_SERVER_URL || 'http://localhost:3000';

/**
 * Notify the API server of an event so it can broadcast via WebSocket.
 * Failures are silently logged — notifications are best-effort.
 */
export async function notifyApiServer(
  event: string,
  boardId?: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, boardId, data }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Best-effort: don't fail MCP operations if API server is down
  }
}
