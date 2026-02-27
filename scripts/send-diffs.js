#!/usr/bin/env node
/**
 * Send git diffs to agent-track dashboard
 * Usage: node scripts/send-diffs.js <task-id> [base-commit]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const taskId = process.argv[2];
const baseCommit = process.argv[3] || 'HEAD~1';

if (!taskId) {
  console.error('Usage: node scripts/send-diffs.js <task-id> [base-commit]');
  console.error('Example: node scripts/send-diffs.js task-123 HEAD~1');
  process.exit(1);
}

console.log(`📊 Collecting diffs for task: ${taskId}`);

try {
  // Get list of changed files
  const changedFiles = execSync(`git diff --name-status ${baseCommit} HEAD`, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(line => line.length > 0);

  if (changedFiles.length === 0) {
    console.log('No changes detected');
    process.exit(0);
  }

  const codeChanges = [];

  for (const line of changedFiles) {
    const [status, ...pathParts] = line.split('\t');
    const filePath = pathParts.join('\t');

    // Skip deleted files for now
    if (status.startsWith('D')) continue;

    // Get the diff for this file
    let diff;
    try {
      diff = execSync(`git diff ${baseCommit} HEAD -- "${filePath}"`, { encoding: 'utf8' });
    } catch (e) {
      console.warn(`⚠️  Could not get diff for ${filePath}`);
      continue;
    }

    // Count lines
    const lines = diff.split('\n');
    const linesAdded = lines.filter(l => l.startsWith('+')).length;
    const linesDeleted = lines.filter(l => l.startsWith('-')).length;

    // Determine change type
    let changeType = 'modified';
    if (status.startsWith('A')) changeType = 'added';
    else if (status.startsWith('D')) changeType = 'deleted';
    else if (status.startsWith('R')) changeType = 'renamed';

    // Detect language from extension
    const ext = path.extname(filePath).slice(1);
    const languageMap = {
      'ts': 'typescript', 'tsx': 'typescript',
      'js': 'javascript', 'jsx': 'javascript',
      'py': 'python', 'go': 'go', 'rs': 'rust',
      'java': 'java', 'c': 'c', 'cpp': 'cpp',
      'md': 'markdown', 'json': 'json', 'yml': 'yaml', 'yaml': 'yaml'
    };

    codeChanges.push({
      filePath,
      changeType,
      diff,
      language: languageMap[ext] || ext,
      linesAdded: linesAdded - 1, // Subtract the +++ line
      linesDeleted: linesDeleted - 1, // Subtract the --- line
    });
  }

  // Get current commit hash
  const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

  // Count total lines
  const totalAdded = codeChanges.reduce((sum, c) => sum + (c.linesAdded || 0), 0);
  const totalDeleted = codeChanges.reduce((sum, c) => sum + (c.linesDeleted || 0), 0);

  const payload = {
    taskId,
    commitHash,
    codeChanges,
    linesChanged: {
      added: totalAdded,
      removed: totalDeleted,
    },
    files: codeChanges.map(c => c.filePath),
  };

  // Output as JSON for MCP or API consumption
  console.log('\n📝 Diff Summary:');
  console.log(`   Files changed: ${codeChanges.length}`);
  console.log(`   Lines added: +${totalAdded}`);
  console.log(`   Lines deleted: -${totalDeleted}`);
  console.log('\n📦 Payload (copy this for MCP call):');
  console.log(JSON.stringify(payload, null, 2));

  // Optionally write to file for pickup
  const outputFile = path.join(__dirname, '..', '.tmp', `diff-${taskId}.json`);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2));
  console.log(`\n💾 Saved to: ${outputFile}`);

  // If MCP server is available, send directly
  // This would require the MCP client library
  console.log('\n💡 To send to dashboard, use:');
  console.log(`   mcp__agent-track__update_task_progress(${JSON.stringify({ taskId, ...payload }, null, 2)})`);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
