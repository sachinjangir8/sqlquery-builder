const multer = require('multer');
const { parse } = require('csv-parse');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { getOrCreateDbForSession } = require('./dbStore');

const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

function sanitizeIdentifier(name) {
  return String(name)
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^([0-9])/, '_$1')
    .toLowerCase();
}

function inferType(value) {
  if (value === null || value === undefined || value === '') return 'TEXT';
  if (!isNaN(Number(value))) return 'REAL';
  const lower = String(value).toLowerCase();
  if (lower === 'true' || lower === 'false') return 'INTEGER';
  // Fallback
  return 'TEXT';
}

function buildCreateTableSQL(tableName, headers, sampleRow) {
  const columns = headers.map((h) => {
    const col = sanitizeIdentifier(h);
    const sampleVal = sampleRow ? sampleRow[h] : '';
    const type = inferType(sampleVal);
    return `${col} ${type}`;
  });
  return `CREATE TABLE IF NOT EXISTS ${sanitizeIdentifier(tableName)} (${columns.join(', ')});`;
}

function buildInsertSQL(tableName, headers) {
  const cols = headers.map((h) => sanitizeIdentifier(h)).join(', ');
  const placeholders = headers.map(() => '?').join(', ');
  return `INSERT INTO ${sanitizeIdentifier(tableName)} (${cols}) VALUES (${placeholders});`;
}

async function loadCsvIntoDb(db, tableName, filePath) {
  const rows = await new Promise((resolve, reject) => {
    const records = [];
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (row) => records.push(row))
      .on('end', () => resolve(records))
      .on('error', (err) => reject(err));
  });

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  await run(db, buildCreateTableSQL(tableName, headers, rows[0] || null));
  const stmt = await prepare(db, buildInsertSQL(tableName, headers));
  for (const r of rows) {
    const values = headers.map((h) => r[h]);
    await runStatement(stmt, values);
  }
  await finalize(stmt);
}

async function loadXlsxIntoDb(db, filename, filePath) {
  const workbook = XLSX.readFile(filePath);
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const headers = json.length > 0 ? Object.keys(json[0]) : [];
    const tableName = `${sanitizeIdentifier(path.parse(filename).name)}_${sanitizeIdentifier(sheetName)}`;
    await run(db, buildCreateTableSQL(tableName, headers, json[0] || null));
    const stmt = await prepare(db, buildInsertSQL(tableName, headers));
    for (const r of json) {
      const values = headers.map((h) => r[h]);
      await runStatement(stmt, values);
    }
    await finalize(stmt);
  }
}

function run(db, sql) {
  return new Promise((resolve, reject) => db.run(sql, (err) => (err ? reject(err) : resolve())));
}
function prepare(db, sql) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(sql, (err) => (err ? reject(err) : resolve(stmt)));
  });
}
function runStatement(stmt, values) {
  return new Promise((resolve, reject) => stmt.run(values, (err) => (err ? reject(err) : resolve())));
}
function finalize(stmt) {
  return new Promise((resolve, reject) => stmt.finalize((err) => (err ? reject(err) : resolve())));
}

const uploadMiddleware = upload.array('files');

async function handleUpload(req, res) {
  try {
    const sessionId = req.session.id;
    const { db, tables } = getOrCreateDbForSession(sessionId);
    const createdTables = [];
    for (const file of req.files || []) {
      const ext = path.extname(file.originalname).toLowerCase();
      const baseName = sanitizeIdentifier(path.parse(file.originalname).name);
      if (ext === '.csv') {
        await loadCsvIntoDb(db, baseName, file.path);
        tables.add(baseName);
        createdTables.push(baseName);
      } else if (ext === '.xlsx' || ext === '.xls') {
        await loadXlsxIntoDb(db, file.originalname, file.path);
        // push all sheets with prefix; to keep simple, we can't know names here easily
      } else {
        return res.status(400).json({ error: `Unsupported file type: ${ext}` });
      }
      fs.unlink(file.path, () => {});
    }
    res.json({ message: 'Uploaded', tables: Array.from(tables) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { uploadMiddleware, handleUpload };


