const express = require("express");
const session = require("express-session");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const passport = require("passport");
const MongoStore = require("connect-mongo");
const { uploadMiddleware, handleUpload } = require("./upload");
const { getOrCreateDbForSession } = require("./dbStore");
const {
  buildSelect,
  analyzeNormalization,
  generateNormalizationSQL,
  detectForeignKeys,
  validateConstraints,
  generateConstraintSQL,
  extractDataInsights,
} = require("./sqlBuilder");
const authRoutes = require("./routes/auth");
require("./auth/passport");

// Connect to MongoDB
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/sqlbuilder",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl:
        process.env.MONGODB_URI || "mongodb://localhost:27017/sqlbuilder",
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 24 hours
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Auth routes
app.use("/api/auth", authRoutes);

// Protected routes (require authentication)
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
};

app.post("/api/upload", requireAuth, uploadMiddleware, handleUpload);

app.post("/api/query", requireAuth, async (req, res) => {
  try {
    const sessionId = req.session.id;
    const { db } = getOrCreateDbForSession(sessionId);
    const { table, columns, where, aggregations, joins } = req.body || {};

    if (!table) {
      return res.status(400).json({ error: "table is required" });
    }

    // Validate table exists
    const tables = await all(
      db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
    );
    const tableExists = tables.some((t) => t.name === table);
    if (!tableExists) {
      return res.status(400).json({ error: `Table '${table}' does not exist` });
    }

    const built = buildSelect({ table, columns, where, aggregations, joins });
    console.log("Executing SQL:", built.sql, "params:", built.params);

    // Validate SQL before execution
    if (!built.sql || built.sql.trim() === "") {
      return res.status(400).json({ error: "Generated SQL is empty" });
    }

    const rows = await all(db, built.sql, built.params);
    res.json({ sql: built.sql, rows });
  } catch (e) {
    console.error("Query error:", e);

    // Provide more specific error messages
    let errorMessage = e.message;
    if (e.code === "SQLITE_ERROR") {
      if (e.message.includes("no such column")) {
        errorMessage = `Column not found: ${e.message}`;
      } else if (e.message.includes("no such table")) {
        errorMessage = `Table not found: ${e.message}`;
      } else if (e.message.includes("syntax error")) {
        errorMessage = `SQL syntax error: ${e.message}`;
      }
    }

    res.status(500).json({ error: errorMessage });
  }
});

app.get("/api/schema", requireAuth, async (req, res) => {
  try {
    const sessionId = req.session.id;
    const { db } = getOrCreateDbForSession(sessionId);
    const tables = await all(
      db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
    );
    const schema = {};
    for (const t of tables) {
      const name = t.name;
      const cols = await all(db, `PRAGMA table_info(${name});`);
      schema[name] = cols.map((c) => ({
        name: c.name,
        type: c.type,
        primaryKey: c.pk === 1,
        notNull: c.notnull === 1,
        defaultValue: c.dflt_value,
      }));
    }
    res.json({ tables: Object.keys(schema), schema });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// New endpoint for normalization analysis
app.get("/api/normalization", requireAuth, async (req, res) => {
  try {
    const sessionId = req.session.id;
    const { db } = getOrCreateDbForSession(sessionId);

    // Get schema
    const tables = await all(
      db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
    );
    const schema = {};
    for (const t of tables) {
      const name = t.name;
      const cols = await all(db, `PRAGMA table_info(${name});`);
      schema[name] = cols.map((c) => ({
        name: c.name,
        type: c.type,
        primaryKey: c.pk === 1,
        notNull: c.notnull === 1,
        defaultValue: c.dflt_value,
      }));
    }

    // Get sample data for analysis
    const data = {};
    for (const tableName of Object.keys(schema)) {
      try {
        data[tableName] = await all(
          db,
          `SELECT * FROM ${tableName} LIMIT 100;`
        );
      } catch (e) {
        console.warn(`Could not fetch data from ${tableName}:`, e.message);
        data[tableName] = [];
      }
    }

    // Perform normalization analysis
    const analysis = analyzeNormalization(schema, data);
    const sqlStatements = generateNormalizationSQL(analysis);

    // Perform constraint validation
    const constraintViolations = validateConstraints(schema, data);
    const constraintSQL = generateConstraintSQL(schema, constraintViolations);

    res.json({
      analysis,
      sqlStatements,
      foreignKeys: detectForeignKeys(schema, data),
      constraintViolations,
      constraintSQL,
    });
  } catch (e) {
    console.error("Normalization analysis error:", e);
    res.status(500).json({ error: e.message });
  }
});

// New endpoint for data insights
app.get("/api/insights", requireAuth, async (req, res) => {
  try {
    const sessionId = req.session.id;
    const { db } = getOrCreateDbForSession(sessionId);

    // Get schema
    const tables = await all(
      db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
    );
    const schema = {};
    for (const t of tables) {
      const name = t.name;
      const cols = await all(db, `PRAGMA table_info(${name});`);
      schema[name] = cols.map((c) => ({
        name: c.name,
        type: c.type,
        primaryKey: c.pk === 1,
        notNull: c.notnull === 1,
        defaultValue: c.dflt_value,
      }));
    }

    // Get sample data for analysis
    const data = {};
    for (const tableName of Object.keys(schema)) {
      try {
        data[tableName] = await all(
          db,
          `SELECT * FROM ${tableName} LIMIT 1000;`
        );
      } catch (e) {
        console.warn(`Could not fetch data from ${tableName}:`, e.message);
        data[tableName] = [];
      }
    }

    // Extract comprehensive data insights
    const insights = extractDataInsights(schema, data);

    res.json(insights);
  } catch (e) {
    console.error("Data insights error:", e);
    res.status(500).json({ error: e.message });
  }
});

function all(db, sql, params = []) {
  return new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
