#!/usr/bin/env node
/**
 * Terminal Viewer for Agent Track Dashboard
 * View agent activities directly from the terminal
 */

const API_URL = 'http://localhost:3000/api';

async function fetchBoards() {
  const response = await fetch(`${API_URL}/boards`);
  return response.json();
}

async function fetchBoardDetails(boardId) {
  const response = await fetch(`${API_URL}/boards/${boardId}`);
  return response.json();
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function formatProgress(task) {
  const width = 20;
  const filled = Math.round((task.progress / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${bar} ${task.progress}%`;
}

async function displayBoards() {
  try {
    const { data: boards } = await fetchBoards();

    if (boards.length === 0) {
      console.log('\n📋 No boards found.');
      console.log('\nTo create boards and tasks, use the MCP server with Claude Desktop.');
      console.log('The dashboard is configured in your Claude Desktop config.\n');
      return;
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║        Agent Track Dashboard - Terminal Viewer           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    for (const board of boards) {
      console.log(`📋 ${board.name}`);
      console.log(`   ${board.description || 'No description'}`);
      console.log(`   Path: ${board.projectPath}`);
      console.log(`   Last updated: ${formatDate(board.updatedAt)}\n`);

      // Fetch detailed board info
      const { data: boardData } = await fetchBoardDetails(board.id);

      if (boardData.agents && boardData.agents.length > 0) {
        console.log('   🤖 Active Agents:');
        boardData.agents.forEach(agent => {
          console.log(`      • ${agent.name} (${agent.type})`);
          if (agent.currentAction) {
            console.log(`        → ${agent.currentAction}`);
          }
        });
        console.log('');
      }

      if (boardData.tasks && boardData.tasks.length > 0) {
        console.log('   📝 Tasks:');
        boardData.tasks.forEach(task => {
          const status = {
            'pending': '⏸️ ',
            'claimed': '📌',
            'in_progress': '🔄',
            'blocked': '🚫',
            'done': '✅'
          }[task.status] || '❓';

          console.log(`      ${status} ${task.title}`);
          if (task.currentAction) {
            console.log(`         Action: ${task.currentAction}`);
          }
          if (typeof task.progress === 'number') {
            console.log(`         Progress: ${formatProgress(task)}`);
          }
        });
        console.log('');
      }

      if (boardData.statistics) {
        const stats = boardData.statistics;
        console.log('   📊 Statistics:');
        console.log(`      Total Tasks: ${stats.totalTasks}`);
        console.log(`      Completed: ${stats.completedTasks}`);
        console.log(`      In Progress: ${stats.inProgressTasks}`);
        console.log(`      Avg Completion: ${Math.round(stats.averageProgress)}%`);
        console.log('');
      }

      console.log('   ─'.repeat(30) + '\n');
    }

    console.log('💡 Tip: Open http://localhost:5174 in your browser for the full dashboard\n');

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Could not connect to API server on port 3000');
      console.error('   Make sure the API server is running.\n');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

async function watchMode() {
  console.clear();
  await displayBoards();

  console.log('Refreshing every 5 seconds... (Ctrl+C to stop)');
  setInterval(async () => {
    console.clear();
    await displayBoards();
    console.log('Refreshing every 5 seconds... (Ctrl+C to stop)');
  }, 5000);
}

// Check if watch mode requested
const args = process.argv.slice(2);
if (args.includes('--watch') || args.includes('-w')) {
  watchMode();
} else {
  displayBoards();
}
