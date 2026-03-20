#!/usr/bin/env node
/**
 * Initialize the SQLite database with schema.
 * Run automatically after `pnpm build` via the postbuild script.
 */

import { initDatabase, closeDatabase } from '../packages/api-server/dist/database.js';

const dbPath = process.env.DATABASE_PATH;
initDatabase(dbPath);
closeDatabase();
console.log('[init-db] Database ready.');
