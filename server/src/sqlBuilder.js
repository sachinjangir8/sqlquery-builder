function sanitizeIdentifier(name) {
  return String(name)
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^([0-9])/, "_$1")
    .toLowerCase();
}

function buildWhereClause(where) {
  if (!where || !Array.isArray(where) || where.length === 0)
    return { sql: "", params: [] };
  const params = [];
  const parts = where
    .map((w) => {
      let col;

      // Handle column names that might already contain table.column format
      if (w.column && w.column.includes(".")) {
        const [table, column] = w.column.split(".");
        col = `${sanitizeIdentifier(table)}.${sanitizeIdentifier(column)}`;
      } else if (w.table && w.column) {
        col = `${sanitizeIdentifier(w.table)}.${sanitizeIdentifier(w.column)}`;
      } else if (w.column) {
        col = sanitizeIdentifier(w.column);
      } else {
        // Skip invalid conditions
        return null;
      }

      const op = (w.operator || "=").toUpperCase();

      // Handle different operators
      if (op === "IN" && Array.isArray(w.value)) {
        const ph = w.value.map(() => "?").join(", ");
        params.push(...w.value);
        return `${col} IN (${ph})`;
      }

      if (op === "LIKE") {
        params.push(String(w.value));
        return `${col} LIKE ?`;
      }

      if (op === "IS NULL") {
        return `${col} IS NULL`;
      }

      if (op === "IS NOT NULL") {
        return `${col} IS NOT NULL`;
      }

      // For other operators, add the value as parameter
      if (w.value !== null && w.value !== undefined) {
        params.push(w.value);
        return `${col} ${op} ?`;
      } else {
        // Handle null values
        if (op === "=") {
          return `${col} IS NULL`;
        } else if (op === "!=") {
          return `${col} IS NOT NULL`;
        } else {
          params.push(w.value);
          return `${col} ${op} ?`;
        }
      }
    })
    .filter((part) => part !== null); // Remove null parts

  if (parts.length === 0) {
    return { sql: "", params: [] };
  }

  return { sql: ` WHERE ${parts.join(" AND ")}`, params };
}

function buildGroupBy(columns, aggregations) {
  // Only add GROUP BY if there are aggregations and non-aggregated columns
  if (!aggregations || aggregations.length === 0) {
    return "";
  }

  // If all selected columns are aggregations, no GROUP BY needed
  const hasNonAggregatedColumns =
    columns &&
    columns.length > 0 &&
    columns.some(
      (col) => col !== "*" && !aggregations.some((agg) => agg.column === col)
    );

  if (!hasNonAggregatedColumns) {
    return "";
  }

  // Group by all non-aggregated columns
  const groupByCols = columns
    .filter(
      (col) => col !== "*" && !aggregations.some((agg) => agg.column === col)
    )
    .map((col) => {
      if (col.includes(".")) {
        const [table, column] = col.split(".");
        return `${sanitizeIdentifier(table)}.${sanitizeIdentifier(column)}`;
      }
      return sanitizeIdentifier(col);
    });

  if (groupByCols.length === 0) {
    return "";
  }

  return ` GROUP BY ${groupByCols.join(", ")}`;
}

function buildJoins(joins) {
  if (!joins || joins.length === 0) return "";
  return joins
    .map((j) => {
      const t = sanitizeIdentifier(j.table);
      const jt = (j.type || "INNER").toUpperCase();

      // Handle different join types
      let joinClause = "";

      switch (jt) {
        case "CROSS":
          return ` CROSS JOIN ${t}`;
        case "NATURAL":
          return ` NATURAL JOIN ${t}`;
        case "SELF":
          const alias = j.alias ? ` AS ${sanitizeIdentifier(j.alias)}` : "";
          return ` ${jt} JOIN ${t}${alias} ON ${buildJoinCondition(j.on)}`;
        default:
          joinClause = ` ${jt} JOIN ${t}`;
      }

      // Add ON condition for non-CROSS and non-NATURAL joins
      if (jt !== "CROSS" && jt !== "NATURAL" && j.on) {
        joinClause += ` ON ${buildJoinCondition(j.on)}`;
      }

      return joinClause;
    })
    .join("");
}

function buildJoinCondition(condition) {
  if (!condition) return "";

  // Handle simple equality conditions
  if (condition.left && condition.right) {
    const left = `${sanitizeIdentifier(
      condition.left.table
    )}.${sanitizeIdentifier(condition.left.column)}`;
    const right = `${sanitizeIdentifier(
      condition.right.table
    )}.${sanitizeIdentifier(condition.right.column)}`;
    const operator = condition.operator || "=";
    return `${left} ${operator} ${right}`;
  }

  // Handle complex conditions
  if (condition.expression) {
    return condition.expression;
  }

  // Handle multiple conditions
  if (condition.conditions && Array.isArray(condition.conditions)) {
    return condition.conditions
      .map((c) => buildJoinCondition(c))
      .join(` ${condition.logic || "AND"} `);
  }

  return "";
}

function buildSelect({
  table,
  columns = ["*"],
  where = [],
  aggregations = [],
  joins = [],
}) {
  const baseTable = sanitizeIdentifier(table);
  const selectCols =
    Array.isArray(columns) && columns.length > 0
      ? columns.map((c) => {
          if (c.includes(".")) {
            const [t, col] = c.split(".");
            return `${sanitizeIdentifier(t)}.${sanitizeIdentifier(col)}`;
          }
          return sanitizeIdentifier(c);
        })
      : ["*"];

  const aggCols = (aggregations || []).map((a) => {
    const fn = (a.fn || "").toUpperCase();
    let col;

    // Handle different column types for aggregation
    if (a.column === "*" || a.column === "COUNT(*)") {
      col = "*";
    } else if (a.column.includes(".")) {
      const [table, column] = a.column.split(".");
      col = `${sanitizeIdentifier(table)}.${sanitizeIdentifier(column)}`;
    } else {
      col = sanitizeIdentifier(a.column);
    }

    const alias = a.as ? ` AS ${sanitizeIdentifier(a.as)}` : "";

    // Handle special cases for COUNT
    if (fn === "COUNT" && (a.column === "*" || a.column === "COUNT(*)")) {
      return `COUNT(*)${alias}`;
    }

    return `${fn}(${col})${alias}`;
  });

  const allSelect = [...selectCols, ...aggCols].join(", ");
  const joinSql = buildJoins(joins);
  const { sql: whereSql, params } = buildWhereClause(where);

  // Add GROUP BY if there are aggregations and regular columns
  const groupBySql = buildGroupBy(columns, aggregations);

  const sql = `SELECT ${allSelect} FROM ${baseTable}${joinSql}${whereSql}${groupBySql};`;

  // Debug logging
  console.log("SQL Builder Debug:");
  console.log("- Table:", table, "->", baseTable);
  console.log("- Columns:", columns, "->", selectCols);
  console.log("- Aggregations:", aggregations, "->", aggCols);
  console.log("- Where conditions:", where);
  console.log("- Generated WHERE SQL:", whereSql);
  console.log("- Generated GROUP BY SQL:", groupBySql);
  console.log("- Parameters:", params);
  console.log("- Final SQL:", sql);

  return { sql, params };
}

// Normalization analysis functions
function analyzeNormalization(schema, data) {
  const analysis = {
    firstNormalForm: analyzeFirstNormalForm(schema, data),
    secondNormalForm: analyzeSecondNormalForm(schema, data),
    thirdNormalForm: analyzeThirdNormalForm(schema, data),
    foreignKeys: detectForeignKeys(schema, data),
    suggestions: [],
  };

  // Generate suggestions based on analysis
  if (!analysis.firstNormalForm.isValid) {
    analysis.suggestions.push({
      level: "1NF",
      issue: "First Normal Form violations detected",
      description: "Table contains repeating groups or non-atomic values",
      recommendations: analysis.firstNormalForm.recommendations,
    });
  }

  if (!analysis.secondNormalForm.isValid) {
    analysis.suggestions.push({
      level: "2NF",
      issue: "Second Normal Form violations detected",
      description: "Table has partial dependencies on composite primary key",
      recommendations: analysis.secondNormalForm.recommendations,
    });
  }

  if (!analysis.thirdNormalForm.isValid) {
    analysis.suggestions.push({
      level: "3NF",
      issue: "Third Normal Form violations detected",
      description: "Table has transitive dependencies",
      recommendations: analysis.thirdNormalForm.recommendations,
    });
  }

  return analysis;
}

function analyzeFirstNormalForm(schema, data) {
  const violations = [];
  const recommendations = [];
  const tableViolations = new Map();

  Object.entries(schema).forEach(([tableName, columns]) => {
    const tableViolationCount = { count: 0, issues: [] };

    columns.forEach((column) => {
      // Check for non-atomic values (comma-separated lists, etc.)
      if (data[tableName]) {
        data[tableName].forEach((row, rowIndex) => {
          const value = row[column.name];
          if (value && typeof value === "string" && value.includes(",")) {
            const violation = {
              table: tableName,
              column: column.name,
              row: rowIndex,
              issue: "Non-atomic value detected",
              value: value,
            };
            violations.push(violation);
            tableViolationCount.count++;
            tableViolationCount.issues.push(violation);
            recommendations.push(
              `Split column '${column.name}' in table '${tableName}' into separate atomic values`
            );
          }
        });
      }
    });

    if (tableViolationCount.count > 0) {
      tableViolations.set(tableName, tableViolationCount);
    }
  });

  return {
    isValid: violations.length === 0,
    violations,
    recommendations: [...new Set(recommendations)],
    tableViolations: Object.fromEntries(tableViolations),
  };
}

function analyzeSecondNormalForm(schema, data) {
  const violations = [];
  const recommendations = [];
  const tableViolations = new Map();

  // This is a simplified analysis - in practice, you'd need to identify composite keys
  // and check for partial dependencies
  Object.entries(schema).forEach(([tableName, columns]) => {
    const tableViolationCount = { count: 0, issues: [] };
    const primaryKeys = columns.filter((col) => col.primaryKey);

    if (primaryKeys.length > 1) {
      // Check for partial dependencies
      const nonKeyColumns = columns.filter((col) => !col.primaryKey);
      nonKeyColumns.forEach((col) => {
        // Simplified check - in practice, you'd analyze actual data dependencies
        if (
          col.name.toLowerCase().includes("name") ||
          col.name.toLowerCase().includes("description")
        ) {
          const violation = {
            table: tableName,
            column: col.name,
            issue: "Potential partial dependency on composite key",
            description: "Column may depend on only part of the composite key",
          };
          violations.push(violation);
          tableViolationCount.count++;
          tableViolationCount.issues.push(violation);
        }
      });
    }

    if (tableViolationCount.count > 0) {
      tableViolations.set(tableName, tableViolationCount);
    }
  });

  return {
    isValid: violations.length === 0,
    violations,
    recommendations:
      violations.length > 0
        ? [`Consider splitting table with composite key into separate tables`]
        : [],
    tableViolations: Object.fromEntries(tableViolations),
  };
}

function analyzeThirdNormalForm(schema, data) {
  const violations = [];
  const recommendations = [];
  const tableViolations = new Map();

  // Check for transitive dependencies
  Object.entries(schema).forEach(([tableName, columns]) => {
    const tableViolationCount = { count: 0, issues: [] };
    const nonKeyColumns = columns.filter((col) => !col.primaryKey);

    // Look for potential transitive dependencies
    nonKeyColumns.forEach((col) => {
      if (
        col.name.toLowerCase().includes("city") ||
        col.name.toLowerCase().includes("state")
      ) {
        const violation = {
          table: tableName,
          column: col.name,
          issue: "Potential transitive dependency",
          description: "Column may depend on another non-key column",
        };
        violations.push(violation);
        tableViolationCount.count++;
        tableViolationCount.issues.push(violation);
      }
    });

    if (tableViolationCount.count > 0) {
      tableViolations.set(tableName, tableViolationCount);
    }
  });

  return {
    isValid: violations.length === 0,
    violations,
    recommendations:
      violations.length > 0
        ? [`Consider extracting transitive dependencies into separate tables`]
        : [],
    tableViolations: Object.fromEntries(tableViolations),
  };
}

function detectForeignKeys(schema, data) {
  const foreignKeys = [];

  Object.entries(schema).forEach(([tableName, columns]) => {
    columns.forEach((column) => {
      // Look for columns that might be foreign keys (ending with _id, etc.)
      if (
        column.name.toLowerCase().endsWith("_id") ||
        column.name.toLowerCase().endsWith("id")
      ) {
        // Try to find referenced table
        const possibleRefTable = column.name.replace(/_id$|id$/i, "");
        if (schema[possibleRefTable]) {
          foreignKeys.push({
            table: tableName,
            column: column.name,
            referencedTable: possibleRefTable,
            referencedColumn: "id",
            confidence: "high",
          });
        }
      }
    });
  });

  return foreignKeys;
}

function generateNormalizationSQL(analysis) {
  const sqlStatements = [];

  analysis.suggestions.forEach((suggestion) => {
    switch (suggestion.level) {
      case "1NF":
        // Generate SQL to split non-atomic values
        suggestion.recommendations.forEach((rec) => {
          if (rec.includes("Split column")) {
            const match = rec.match(/Split column '(\w+)' in table '(\w+)'/);
            if (match) {
              const [, column, table] = match;
              sqlStatements.push({
                type: "1NF",
                description: `Create normalized table for ${table}.${column}`,
                sql: `-- Create new table for normalized ${column} values\nCREATE TABLE ${table}_${column}_normalized (\n  id INTEGER PRIMARY KEY,\n  ${table}_id INTEGER,\n  ${column}_value TEXT,\n  FOREIGN KEY (${table}_id) REFERENCES ${table}(id)\n);`,
              });
            }
          }
        });
        break;

      case "2NF":
        sqlStatements.push({
          type: "2NF",
          description: "Split table to eliminate partial dependencies",
          sql: `-- Create separate tables to eliminate partial dependencies\n-- (Specific SQL depends on the actual table structure)`,
        });
        break;

      case "3NF":
        sqlStatements.push({
          type: "3NF",
          description: "Extract transitive dependencies",
          sql: `-- Create separate tables for transitive dependencies\n-- (Specific SQL depends on the actual table structure)`,
        });
        break;
    }
  });

  return sqlStatements;
}

// Constraint validation functions
function validateConstraints(schema, data) {
  const violations = [];

  Object.entries(schema).forEach(([tableName, columns]) => {
    const tableData = data[tableName] || [];

    // Check primary key constraints
    const primaryKeys = columns.filter((col) => col.primaryKey);
    if (primaryKeys.length > 0) {
      const pkColumn = primaryKeys[0].name;
      const pkValues = new Set();

      tableData.forEach((row, rowIndex) => {
        const pkValue = row[pkColumn];
        if (pkValue === null || pkValue === undefined || pkValue === "") {
          violations.push({
            table: tableName,
            column: pkColumn,
            row: rowIndex,
            type: "PRIMARY_KEY_NULL",
            message: "Primary key cannot be null or empty",
          });
        } else if (pkValues.has(pkValue)) {
          violations.push({
            table: tableName,
            column: pkColumn,
            row: rowIndex,
            type: "PRIMARY_KEY_DUPLICATE",
            message: `Duplicate primary key value: ${pkValue}`,
          });
        } else {
          pkValues.add(pkValue);
        }
      });
    }

    // Check NOT NULL constraints
    columns.forEach((column) => {
      if (column.notNull) {
        tableData.forEach((row, rowIndex) => {
          const value = row[column.name];
          if (value === null || value === undefined || value === "") {
            violations.push({
              table: tableName,
              column: column.name,
              row: rowIndex,
              type: "NOT_NULL_VIOLATION",
              message: "NOT NULL constraint violated",
            });
          }
        });
      }
    });

    // Check data type constraints
    columns.forEach((column) => {
      tableData.forEach((row, rowIndex) => {
        const value = row[column.name];
        if (value !== null && value !== undefined && value !== "") {
          const isValidType = validateDataType(value, column.type);
          if (!isValidType) {
            violations.push({
              table: tableName,
              column: column.name,
              row: rowIndex,
              type: "TYPE_MISMATCH",
              message: `Value '${value}' does not match expected type ${column.type}`,
            });
          }
        }
      });
    });
  });

  return violations;
}

function validateDataType(value, expectedType) {
  if (value === null || value === undefined) return true;

  switch (expectedType.toUpperCase()) {
    case "INTEGER":
    case "INT":
      return Number.isInteger(Number(value));
    case "REAL":
    case "FLOAT":
    case "DOUBLE":
      return !isNaN(Number(value));
    case "TEXT":
    case "VARCHAR":
    case "STRING":
      return typeof value === "string";
    case "BOOLEAN":
      return (
        value === true ||
        value === false ||
        value === "true" ||
        value === "false" ||
        value === 1 ||
        value === 0
      );
    default:
      return true; // Unknown types are considered valid
  }
}

function generateConstraintSQL(schema, violations) {
  const sqlStatements = [];

  // Group violations by type
  const violationsByType = violations.reduce((acc, violation) => {
    if (!acc[violation.type]) acc[violation.type] = [];
    acc[violation.type].push(violation);
    return acc;
  }, {});

  // Generate SQL for each constraint type
  Object.entries(violationsByType).forEach(([type, typeViolations]) => {
    switch (type) {
      case "PRIMARY_KEY_DUPLICATE":
        sqlStatements.push({
          type: "CONSTRAINT",
          description: "Fix duplicate primary key values",
          sql: `-- Remove duplicate primary key values\n-- You may need to manually resolve these conflicts\n${typeViolations
            .map(
              (v) => `-- Row ${v.row}: ${v.table}.${v.column} = ${v.message}`
            )
            .join("\n")}`,
        });
        break;

      case "NOT_NULL_VIOLATION":
        sqlStatements.push({
          type: "CONSTRAINT",
          description: "Fix NOT NULL constraint violations",
          sql: `-- Update NULL values to satisfy NOT NULL constraints\n${typeViolations
            .map(
              (v) =>
                `UPDATE ${v.table} SET ${v.column} = 'default_value' WHERE ${v.column} IS NULL;`
            )
            .join("\n")}`,
        });
        break;

      case "TYPE_MISMATCH":
        sqlStatements.push({
          type: "CONSTRAINT",
          description: "Fix data type mismatches",
          sql: `-- Convert values to correct data types\n${typeViolations
            .map((v) => `-- Row ${v.row}: Convert ${v.table}.${v.column} value`)
            .join("\n")}`,
        });
        break;
    }
  });

  return sqlStatements;
}

// Data insights extraction functions
function extractDataInsights(schema, data) {
  const insights = {
    tableOverview: generateTableOverview(schema, data),
    dataQuality: analyzeDataQuality(schema, data),
    statisticalAnalysis: performStatisticalAnalysis(schema, data),
    patternDetection: detectDataPatterns(schema, data),
    relationshipAnalysis: analyzeRelationships(schema, data),
    recommendations: generateDataRecommendations(schema, data),
  };

  return insights;
}

function generateTableOverview(schema, data) {
  const overview = {};

  Object.entries(schema).forEach(([tableName, columns]) => {
    const tableData = data[tableName] || [];
    const rowCount = tableData.length;

    overview[tableName] = {
      rowCount,
      columnCount: columns.length,
      primaryKeys: columns.filter((col) => col.primaryKey).length,
      foreignKeys: columns.filter((col) =>
        col.name.toLowerCase().endsWith("_id")
      ).length,
      nullableColumns: columns.filter((col) => !col.notNull).length,
      dataTypes: {
        text: columns.filter((col) => col.type.toLowerCase().includes("text"))
          .length,
        numeric: columns.filter((col) =>
          ["INTEGER", "REAL", "FLOAT", "DOUBLE"].includes(
            col.type.toUpperCase()
          )
        ).length,
        boolean: columns.filter((col) =>
          col.type.toLowerCase().includes("bool")
        ).length,
        date: columns.filter((col) => col.type.toLowerCase().includes("date"))
          .length,
      },
      sizeEstimate: estimateTableSize(tableData, columns),
    };
  });

  return overview;
}

function analyzeDataQuality(schema, data) {
  const quality = {};

  Object.entries(schema).forEach(([tableName, columns]) => {
    const tableData = data[tableName] || [];
    const qualityMetrics = {
      completeness: {},
      uniqueness: {},
      consistency: {},
      validity: {},
    };

    columns.forEach((column) => {
      const values = tableData.map((row) => row[column.name]);
      const nonNullValues = values.filter(
        (val) => val !== null && val !== undefined && val !== ""
      );

      // Completeness
      qualityMetrics.completeness[column.name] = {
        totalRows: values.length,
        nonNullRows: nonNullValues.length,
        completenessRate:
          values.length > 0 ? (nonNullValues.length / values.length) * 100 : 0,
        nullCount: values.length - nonNullValues.length,
      };

      // Uniqueness
      const uniqueValues = new Set(nonNullValues);
      qualityMetrics.uniqueness[column.name] = {
        uniqueCount: uniqueValues.size,
        totalNonNullCount: nonNullValues.length,
        uniquenessRate:
          nonNullValues.length > 0
            ? (uniqueValues.size / nonNullValues.length) * 100
            : 0,
        isUnique:
          uniqueValues.size === nonNullValues.length &&
          nonNullValues.length > 0,
      };

      // Consistency (for text fields)
      if (column.type.toLowerCase().includes("text")) {
        const textValues = nonNullValues.filter(
          (val) => typeof val === "string"
        );
        const lengthStats = calculateLengthStats(textValues);
        qualityMetrics.consistency[column.name] = {
          averageLength: lengthStats.average,
          minLength: lengthStats.min,
          maxLength: lengthStats.max,
          lengthVariance: lengthStats.variance,
          hasInconsistentLength: lengthStats.variance > 100,
        };
      }

      // Validity (basic type checking)
      qualityMetrics.validity[column.name] = {
        validTypeCount: nonNullValues.filter((val) =>
          isValidValue(val, column.type)
        ).length,
        invalidTypeCount:
          nonNullValues.length -
          nonNullValues.filter((val) => isValidValue(val, column.type)).length,
        validityRate:
          nonNullValues.length > 0
            ? (nonNullValues.filter((val) => isValidValue(val, column.type))
                .length /
                nonNullValues.length) *
              100
            : 0,
      };
    });

    quality[tableName] = qualityMetrics;
  });

  return quality;
}

function performStatisticalAnalysis(schema, data) {
  const statistics = {};

  Object.entries(schema).forEach(([tableName, columns]) => {
    const tableData = data[tableName] || [];
    const numericColumns = columns.filter((col) =>
      ["INTEGER", "REAL", "FLOAT", "DOUBLE"].includes(col.type.toUpperCase())
    );

    statistics[tableName] = {};

    numericColumns.forEach((column) => {
      const values = tableData
        .map((row) => row[column.name])
        .filter((val) => val !== null && val !== undefined && val !== "")
        .map((val) => Number(val))
        .filter((val) => !isNaN(val));

      if (values.length > 0) {
        statistics[tableName][column.name] = {
          count: values.length,
          mean: calculateMean(values),
          median: calculateMedian(values),
          mode: calculateMode(values),
          min: Math.min(...values),
          max: Math.max(...values),
          range: Math.max(...values) - Math.min(...values),
          standardDeviation: calculateStandardDeviation(values),
          variance: calculateVariance(values),
          quartiles: calculateQuartiles(values),
          outliers: detectOutliers(values),
        };
      }
    });
  });

  return statistics;
}

function detectDataPatterns(schema, data) {
  const patterns = {};

  Object.entries(schema).forEach(([tableName, columns]) => {
    const tableData = data[tableName] || [];
    patterns[tableName] = {
      duplicates: detectDuplicateRows(tableData),
      anomalies: detectAnomalies(tableData, columns),
      trends: detectTrends(tableData, columns),
      correlations: detectCorrelations(tableData, columns),
    };
  });

  return patterns;
}

function analyzeRelationships(schema, data) {
  const relationships = {
    foreignKeys: detectForeignKeys(schema, data),
    potentialRelationships: detectPotentialRelationships(schema, data),
    cardinality: analyzeCardinality(schema, data),
    referentialIntegrity: checkReferentialIntegrity(schema, data),
  };

  return relationships;
}

function generateDataRecommendations(schema, data) {
  const recommendations = [];
  const insights = extractDataInsights(schema, data);

  // Data quality recommendations
  Object.entries(insights.dataQuality).forEach(([tableName, quality]) => {
    Object.entries(quality.completeness).forEach(([columnName, metrics]) => {
      if (metrics.completenessRate < 80) {
        recommendations.push({
          type: "DATA_QUALITY",
          priority: "HIGH",
          table: tableName,
          column: columnName,
          issue: "Low completeness rate",
          description: `Column ${columnName} has only ${metrics.completenessRate.toFixed(
            1
          )}% completeness`,
          suggestion: "Consider data cleaning or investigating missing values",
        });
      }
    });

    Object.entries(quality.uniqueness).forEach(([columnName, metrics]) => {
      if (metrics.uniquenessRate < 95 && metrics.totalNonNullCount > 10) {
        recommendations.push({
          type: "DATA_QUALITY",
          priority: "MEDIUM",
          table: tableName,
          column: columnName,
          issue: "Low uniqueness rate",
          description: `Column ${columnName} has ${metrics.uniquenessRate.toFixed(
            1
          )}% uniqueness`,
          suggestion:
            "Consider if this should be a unique constraint or if duplicates are expected",
        });
      }
    });
  });

  // Statistical recommendations
  Object.entries(insights.statisticalAnalysis).forEach(([tableName, stats]) => {
    Object.entries(stats).forEach(([columnName, columnStats]) => {
      if (columnStats.outliers.length > 0) {
        recommendations.push({
          type: "STATISTICAL",
          priority: "MEDIUM",
          table: tableName,
          column: columnName,
          issue: "Outliers detected",
          description: `Found ${columnStats.outliers.length} outliers in ${columnName}`,
          suggestion:
            "Review outliers for data quality issues or business logic",
        });
      }
    });
  });

  // Pattern recommendations
  Object.entries(insights.patternDetection).forEach(([tableName, patterns]) => {
    if (patterns.duplicates.length > 0) {
      recommendations.push({
        type: "PATTERN",
        priority: "HIGH",
        table: tableName,
        issue: "Duplicate rows detected",
        description: `Found ${patterns.duplicates.length} duplicate rows`,
        suggestion: "Consider adding unique constraints or removing duplicates",
      });
    }
  });

  return recommendations;
}

// Helper functions
function estimateTableSize(data, columns) {
  const avgRowSize = columns.reduce((sum, col) => {
    const sampleValues = data.slice(0, 10).map((row) => row[col.name]);
    const avgLength =
      sampleValues.reduce(
        (len, val) => len + (val ? String(val).length : 0),
        0
      ) / sampleValues.length;
    return sum + (avgLength || 10);
  }, 0);

  return {
    estimatedBytes: data.length * avgRowSize,
    estimatedMB: (data.length * avgRowSize) / (1024 * 1024),
  };
}

function calculateLengthStats(values) {
  if (values.length === 0) return { average: 0, min: 0, max: 0, variance: 0 };

  const lengths = values.map((v) => String(v).length);
  const average = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
  const variance =
    lengths.reduce((sum, len) => sum + Math.pow(len - average, 2), 0) /
    lengths.length;

  return {
    average: Math.round(average * 100) / 100,
    min: Math.min(...lengths),
    max: Math.max(...lengths),
    variance: Math.round(variance * 100) / 100,
  };
}

function isValidValue(value, type) {
  if (value === null || value === undefined) return true;

  switch (type.toUpperCase()) {
    case "INTEGER":
    case "INT":
      return Number.isInteger(Number(value));
    case "REAL":
    case "FLOAT":
    case "DOUBLE":
      return !isNaN(Number(value));
    case "TEXT":
    case "VARCHAR":
      return typeof value === "string";
    case "BOOLEAN":
      return [true, false, "true", "false", 1, 0].includes(value);
    default:
      return true;
  }
}

function calculateMean(values) {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function calculateMode(values) {
  const frequency = {};
  values.forEach((val) => (frequency[val] = (frequency[val] || 0) + 1));
  const maxFreq = Math.max(...Object.values(frequency));
  return Object.keys(frequency).filter((key) => frequency[key] === maxFreq);
}

function calculateStandardDeviation(values) {
  const mean = calculateMean(values);
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  return Math.sqrt(variance);
}

function calculateVariance(values) {
  const mean = calculateMean(values);
  return (
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length
  );
}

function calculateQuartiles(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q2Index = Math.floor(sorted.length * 0.5);
  const q3Index = Math.floor(sorted.length * 0.75);

  return {
    q1: sorted[q1Index],
    q2: sorted[q2Index],
    q3: sorted[q3Index],
  };
}

function detectOutliers(values) {
  if (values.length < 4) return [];

  const q1 = calculateQuartiles(values).q1;
  const q3 = calculateQuartiles(values).q3;
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return values.filter((val) => val < lowerBound || val > upperBound);
}

function detectDuplicateRows(data) {
  const seen = new Set();
  const duplicates = [];

  data.forEach((row, index) => {
    const rowKey = JSON.stringify(row);
    if (seen.has(rowKey)) {
      duplicates.push({ index, row });
    } else {
      seen.add(rowKey);
    }
  });

  return duplicates;
}

function detectAnomalies(data, columns) {
  const anomalies = [];

  columns.forEach((column) => {
    if (
      column.type.toUpperCase().includes("INTEGER") ||
      column.type.toUpperCase().includes("REAL")
    ) {
      const values = data
        .map((row) => Number(row[column.name]))
        .filter((val) => !isNaN(val));
      if (values.length > 0) {
        const outliers = detectOutliers(values);
        outliers.forEach((outlier) => {
          anomalies.push({
            column: column.name,
            value: outlier,
            type: "NUMERICAL_OUTLIER",
          });
        });
      }
    }
  });

  return anomalies;
}

function detectTrends(data, columns) {
  // Simple trend detection for time-series data
  const trends = [];

  columns.forEach((column) => {
    if (
      column.name.toLowerCase().includes("date") ||
      column.name.toLowerCase().includes("time")
    ) {
      // This would need more sophisticated implementation for real trend analysis
      trends.push({
        column: column.name,
        type: "TIME_SERIES_DETECTED",
        suggestion: "Consider time-series analysis",
      });
    }
  });

  return trends;
}

function detectCorrelations(data, columns) {
  const correlations = [];
  const numericColumns = columns.filter((col) =>
    ["INTEGER", "REAL", "FLOAT", "DOUBLE"].includes(col.type.toUpperCase())
  );

  for (let i = 0; i < numericColumns.length; i++) {
    for (let j = i + 1; j < numericColumns.length; j++) {
      const col1 = numericColumns[i];
      const col2 = numericColumns[j];

      const values1 = data
        .map((row) => Number(row[col1.name]))
        .filter((val) => !isNaN(val));
      const values2 = data
        .map((row) => Number(row[col2.name]))
        .filter((val) => !isNaN(val));

      if (values1.length > 1 && values2.length > 1) {
        const correlation = calculateCorrelation(values1, values2);
        if (Math.abs(correlation) > 0.7) {
          correlations.push({
            column1: col1.name,
            column2: col2.name,
            correlation: correlation,
            strength: Math.abs(correlation) > 0.9 ? "STRONG" : "MODERATE",
          });
        }
      }
    }
  }

  return correlations;
}

function calculateCorrelation(x, y) {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  return (
    (n * sumXY - sumX * sumY) /
    Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  );
}

function detectPotentialRelationships(schema, data) {
  const relationships = [];

  Object.entries(schema).forEach(([tableName, columns]) => {
    columns.forEach((column) => {
      if (column.name.toLowerCase().endsWith("_id")) {
        const referencedTable = column.name.replace(/_id$/, "");
        if (schema[referencedTable]) {
          relationships.push({
            fromTable: tableName,
            fromColumn: column.name,
            toTable: referencedTable,
            toColumn: "id",
            type: "POTENTIAL_FOREIGN_KEY",
            confidence: "HIGH",
          });
        }
      }
    });
  });

  return relationships;
}

function analyzeCardinality(schema, data) {
  const cardinality = {};

  Object.entries(schema).forEach(([tableName, columns]) => {
    const tableData = data[tableName] || [];
    cardinality[tableName] = {
      rowCount: tableData.length,
      estimatedCardinality: tableData.length,
      uniqueValues: {},
    };

    columns.forEach((column) => {
      const values = tableData
        .map((row) => row[column.name])
        .filter((val) => val !== null && val !== undefined);
      const uniqueValues = new Set(values);
      cardinality[tableName].uniqueValues[column.name] = {
        total: values.length,
        unique: uniqueValues.size,
        cardinality: values.length > 0 ? uniqueValues.size / values.length : 0,
      };
    });
  });

  return cardinality;
}

function checkReferentialIntegrity(schema, data) {
  const integrity = {};

  Object.entries(schema).forEach(([tableName, columns]) => {
    const tableData = data[tableName] || [];
    integrity[tableName] = {
      orphanedRecords: [],
      referentialIssues: [],
    };

    // Check for orphaned foreign key references
    columns.forEach((column) => {
      if (column.name.toLowerCase().endsWith("_id")) {
        const referencedTable = column.name.replace(/_id$/, "");
        if (schema[referencedTable]) {
          const referencedData = data[referencedTable] || [];
          const referencedIds = new Set(referencedData.map((row) => row.id));

          tableData.forEach((row, index) => {
            const fkValue = row[column.name];
            if (fkValue && !referencedIds.has(fkValue)) {
              integrity[tableName].orphanedRecords.push({
                row: index,
                column: column.name,
                value: fkValue,
                referencedTable: referencedTable,
              });
            }
          });
        }
      }
    });
  });

  return integrity;
}

module.exports = {
  buildSelect,
  analyzeNormalization,
  generateNormalizationSQL,
  detectForeignKeys,
  validateConstraints,
  generateConstraintSQL,
  extractDataInsights,
};
