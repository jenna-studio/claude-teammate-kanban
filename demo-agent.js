#!/usr/bin/env node
/**
 * Demo Agent Script
 * Simulates agent activity by calling the API directly
 */

const API_URL = 'http://localhost:3000/api';

async function createBoard() {
  const response = await fetch(`${API_URL}/boards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Claude Code Demo',
      description: 'Demo board showing agent activities',
      projectPath: '/Users/yoojinseon/Develop/Sourcetree/agent-track-dashboard'
    })
  });
  return response.json();
}

async function createTask(boardId, title, description) {
  const response = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      boardId,
      title,
      description,
      importance: 'high',
      status: 'in_progress',
      agentId: 'demo-agent-1',
      agentName: 'Claude Code Agent',
      agentType: 'coding',
      sessionId: 'demo-session-1',
      progress: 0
    })
  });
  return response.json();
}

async function updateTaskProgress(taskId, progress, currentAction) {
  const response = await fetch(`${API_URL}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      progress,
      currentAction,
      files: ['src/index.ts', 'src/components/Header.tsx']
    })
  });
  return response.json();
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function demo() {
  console.log('🚀 Starting Agent Track Demo...\n');

  // Create a board
  console.log('Creating demo board...');
  const { data: board } = await createBoard();
  console.log(`✓ Board created: ${board.name} (${board.id})\n`);

  // Create a task
  console.log('Creating task...');
  const { data: task } = await createTask(
    board.id,
    'Implement user authentication',
    'Add JWT-based authentication to the API endpoints'
  );
  console.log(`✓ Task created: ${task.title} (${task.id})\n`);

  // Simulate progress updates
  const actions = [
    { progress: 25, action: 'Setting up authentication middleware' },
    { progress: 50, action: 'Implementing JWT token generation' },
    { progress: 75, action: 'Adding login and registration endpoints' },
    { progress: 100, action: 'Writing tests for auth flows' }
  ];

  for (const { progress, action } of actions) {
    await sleep(2000);
    console.log(`Updating progress: ${progress}% - ${action}`);
    await updateTaskProgress(task.id, progress, action);
  }

  console.log('\n✅ Demo complete! Check your dashboard at http://localhost:5174');
}

demo().catch(console.error);
