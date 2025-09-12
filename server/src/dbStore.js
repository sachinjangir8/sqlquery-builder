const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

// In-memory map of sessionId -> { db, tables: Set<string> }
const sessionIdToDb = new Map();

function getOrCreateDbForSession(sessionId) {
  let entry = sessionIdToDb.get(sessionId);
  if (!entry) {
    const db = new sqlite3.Database(':memory:');
    entry = { db, tables: new Set() };
    sessionIdToDb.set(sessionId, entry);
  }
  return entry;
}

function resetDbForSession(sessionId) {
  const existing = sessionIdToDb.get(sessionId);
  if (existing) {
    existing.db.close();
    sessionIdToDb.delete(sessionId);
  }
}

module.exports = {
  getOrCreateDbForSession,
  resetDbForSession,
};


