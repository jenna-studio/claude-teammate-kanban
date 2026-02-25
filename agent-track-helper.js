#!/usr/bin/env node
/**
 * Agent Track Helper for Claude Code
 * Simple CLI to report agent activities to the dashboard
 */

const API_URL = process.env.AGENT_TRACK_API || 'http://localhost:3000/api';

// Helper functions
async function request(method, endpoint, data) {
  const url = `${API_URL}${endpoint}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Request failed');
  }

  return result.data;
}

//Commands
const commands = {
  async 'create-board'(name, description, projectPath) {
    if (!name || !projectPath) {
      console.error('Usage: agent-track-helper.js create-board <name> <description> <projectPath>');
      process.exit(1);
    }

    const board = await request('POST', '/boards', {
      name,
      description,
      projectPath: projectPath || process.cwd(),
    });

    console.log(`✓ Board created: ${board.id}`);
    console.log(`  Name: ${board.name}`);
    console.log(`  Path: ${board.projectPath}`);
    return board.id;
  },

  async 'create-task'(boardId, title, description) {
    if (!boardId || !title) {
      console.error('Usage: agent-track-helper.js create-task <boardId> <title> [description]');
      process.exit(1);
    }

    const task = await request('POST', '/tasks', {
      boardId,
      title,
      description,
      agentId: 'claude-code-cli',
      agentName: 'Claude Code',
      agentType: 'coding',
      status: 'in_progress',
      progress: 0,
    });

    console.log(`✓ Task created: ${task.id}`);
    console.log(`  Title: ${task.title}`);
    return task.id;
  },

  async 'update-task'(taskId, progress, currentAction) {
    if (!taskId) {
      console.error('Usage: agent-track-helper.js update-task <taskId> [progress] [currentAction]');
      process.exit(1);
    }

    const updates = {};
    if (progress !== undefined) updates.progress = parseInt(progress);
    if (currentAction) updates.currentAction = currentAction;

    const task = await request('PATCH', `/tasks/${taskId}`, updates);

    console.log(`✓ Task updated: ${task.id}`);
    if (updates.progress !== undefined) console.log(`  Progress: ${task.progress}%`);
    if (updates.currentAction) console.log(`  Action: ${task.currentAction}`);
    return task.id;
  },

  async 'complete-task'(taskId) {
    if (!taskId) {
      console.error('Usage: agent-track-helper.js complete-task <taskId>');
      process.exit(1);
    }

    const task = await request('PATCH', `/tasks/${taskId}`, {
      status: 'done',
      progress: 100,
    });

    console.log(`✓ Task completed: ${task.id}`);
    return task.id;
  },

  async 'list-boards'() {
    const boards = await request('GET', '/boards');

    if (boards.length === 0) {
      console.log('No boards found.');
      return;
    }

    console.log('\nBoards:');
    boards.forEach(board => {
      console.log(`  ${board.id} - ${board.name}`);
      console.log(`    Path: ${board.projectPath}`);
    });
  },

  async 'list-tasks'(boardId) {
    const endpoint = boardId ? `/tasks?boardId=${boardId}` : '/tasks';
    const tasks = await request('GET', endpoint);

    if (tasks.length === 0) {
      console.log('No tasks found.');
      return;
    }

    console.log('\nTasks:');
    tasks.forEach(task => {
      const statusIcon = {
        'pending': '⏸️',
        'claimed': '📌',
        'in_progress': '🔄',
        'done': '✅',
        'blocked': '🚫',
      }[task.status] || '❓';

      console.log(`  ${statusIcon} ${task.id} - ${task.title} (${task.progress}%)`);
      if (task.currentAction) {
        console.log(`       ${task.currentAction}`);
      }
    });
  },

  async 'help'() {
    console.log(`
Agent Track Helper - CLI for Claude Code Integration

Usage: node agent-track-helper.js <command> [arguments]

Commands:
  create-board <name> <description> <projectPath>  Create a new board
  create-task <boardId> <title> [description]      Create a new task
  update-task <taskId> [progress] [action]         Update task progress/action
  complete-task <taskId>                           Mark task as completed
  list-boards                                      List all boards
  list-tasks [boardId]                             List tasks (optionally filtered by board)
  help                                             Show this help message

Examples:
  # Create a board for current project
  node agent-track-helper.js create-board "My Project" "Project description" "$(pwd)"

  # Create a task
  node agent-track-helper.js create-task board-123 "Implement feature X"

  # Update task progress
  node agent-track-helper.js update-task task-456 50 "Writing tests"

  # Complete a task
  node agent-track-helper.js complete-task task-456

  # List all boards
  node agent-track-helper.js list-boards

  # List tasks for a specific board
  node agent-track-helper.js list-tasks board-123

Dashboard: http://localhost:5174
`);
  },
};

// Main
async function main() {
  const [,, command, ...args] = process.argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    await commands.help();
    return;
  }

  const handler = commands[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    console.error('Run "node agent-track-helper.js help" for usage information.');
    process.exit(1);
  }

  try {
    await handler(...args);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (error.cause) {
      console.error(`Cause: ${error.cause.message}`);
    }
    process.exit(1);
  }
}

main();
