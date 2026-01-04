import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import type { Session, SessionSummary } from './types.js';
import type { Message, ModelTier } from '@10x/shared';

const DB_PATH = join(homedir(), '.config', '10x', 'sessions.db');

let db: Database | null = null;

/**
 * Initialize the database
 */
function getDb(): Database {
  if (db) return db;

  // Ensure directory exists
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT,
      parent_id TEXT,
      messages TEXT NOT NULL,
      working_directory TEXT NOT NULL,
      model TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      token_usage_input INTEGER DEFAULT 0,
      token_usage_output INTEGER DEFAULT 0,
      state TEXT DEFAULT 'active'
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_sessions_updated_at
    ON sessions(updated_at DESC)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_sessions_name
    ON sessions(name)
  `);

  return db;
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Save a session to the database
 */
export function saveSession(session: Session): void {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO sessions (
      id, name, parent_id, messages, working_directory, model,
      created_at, updated_at, token_usage_input, token_usage_output, state
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    session.id,
    session.name ?? null,
    session.parentId ?? null,
    JSON.stringify(session.messages),
    session.workingDirectory,
    session.model,
    session.createdAt.toISOString(),
    session.updatedAt.toISOString(),
    session.tokenUsage.input,
    session.tokenUsage.output,
    session.state
  );
}

/**
 * Get a session by ID
 */
export function getSession(id: string): Session | null {
  const db = getDb();

  const row = db.query(`SELECT * FROM sessions WHERE id = ?`).get(id) as any;

  if (!row) return null;

  return rowToSession(row);
}

/**
 * Get a session by name
 */
export function getSessionByName(name: string): Session | null {
  const db = getDb();

  const row = db
    .query(`SELECT * FROM sessions WHERE name = ? ORDER BY updated_at DESC LIMIT 1`)
    .get(name) as any;

  if (!row) return null;

  return rowToSession(row);
}

/**
 * Get the most recent session
 */
export function getLastSession(): Session | null {
  const db = getDb();

  const row = db
    .query(`SELECT * FROM sessions WHERE state = 'active' ORDER BY updated_at DESC LIMIT 1`)
    .get() as any;

  if (!row) return null;

  return rowToSession(row);
}

/**
 * List recent sessions
 */
export function listSessions(limit = 20): SessionSummary[] {
  const db = getDb();

  const rows = db
    .query(
      `SELECT id, name, messages, model, created_at, updated_at, state
       FROM sessions
       ORDER BY updated_at DESC
       LIMIT ?`
    )
    .all(limit) as any[];

  return rows.map((row) => {
    const messages = JSON.parse(row.messages) as Message[];
    // Find the last user message for preview
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    let lastUserPrompt: string | undefined;
    if (lastUserMsg) {
      // Truncate to ~50 chars, clean up whitespace
      const cleaned = lastUserMsg.content.replace(/\s+/g, ' ').trim();
      lastUserPrompt = cleaned.length > 50 ? cleaned.slice(0, 47) + '...' : cleaned;
    }
    return {
      id: row.id,
      name: row.name ?? undefined,
      messageCount: messages.length,
      model: row.model as ModelTier,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      state: row.state as Session['state'],
      lastUserPrompt,
    };
  });
}

/**
 * Delete a session
 */
export function deleteSession(id: string): boolean {
  const db = getDb();

  const result = db.run(`DELETE FROM sessions WHERE id = ?`, [id]);
  return result.changes > 0;
}

/**
 * Update session name
 */
export function renameSession(id: string, name: string): boolean {
  const db = getDb();

  const result = db.run(
    `UPDATE sessions SET name = ?, updated_at = ? WHERE id = ?`,
    [name, new Date().toISOString(), id]
  );
  return result.changes > 0;
}

/**
 * Convert a database row to a Session object
 */
function rowToSession(row: any): Session {
  return {
    id: row.id,
    name: row.name ?? undefined,
    parentId: row.parent_id ?? undefined,
    messages: JSON.parse(row.messages) as Message[],
    workingDirectory: row.working_directory,
    model: row.model as ModelTier,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    tokenUsage: {
      input: row.token_usage_input,
      output: row.token_usage_output,
    },
    state: row.state as Session['state'],
  };
}

/**
 * Close the database connection
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
