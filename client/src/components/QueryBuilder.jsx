import { useMemo, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Alert,
  CircularProgress,
  Typography,
} from "@mui/material";
import { useAppStore } from "../store";
import { runQuery } from "../api";

const OPERATORS = [
  "=",
  "!=",
  ">",
  ">=",
  "<",
  "<=",
  "LIKE",
  "IN",
  "IS NULL",
  "IS NOT NULL",
];

const AGGREGATION_FUNCTIONS = [
  { value: "SUM", label: "SUM - Sum of values" },
  { value: "COUNT", label: "COUNT - Count of rows" },
  { value: "AVG", label: "AVG - Average of values" },
  { value: "MIN", label: "MIN - Minimum value" },
  { value: "MAX", label: "MAX - Maximum value" },
  { value: "STDDEV", label: "STDDEV - Standard deviation" },
  { value: "VARIANCE", label: "VARIANCE - Variance" },
  { value: "DISTINCT", label: "DISTINCT - Count distinct values" },
  { value: "TOTAL", label: "TOTAL - Sum with NULL handling" },
  { value: "GROUP_CONCAT", label: "GROUP_CONCAT - Concatenate values" },
];

export default function QueryBuilder() {
  const {
    tables,
    schema,
    selectedTable,
    selectedColumns,
    where,
    joins,
    aggregations,
  } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const setSelectedTable = useAppStore((s) => s.setSelectedTable);
  const setSelectedColumns = useAppStore((s) => s.setSelectedColumns);
  const setWhere = useAppStore((s) => s.setWhere);
  const setJoins = useAppStore((s) => s.setJoins);
  const setAggregations = useAppStore((s) => s.setAggregations);
  const setResult = useAppStore((s) => s.setResult);

  const columns = useMemo(
    () =>
      selectedTable ? (schema[selectedTable] || []).map((c) => c.name) : [],
    [schema, selectedTable]
  );

  // Get all available columns from all tables for joins
  const allColumns = useMemo(() => {
    const cols = [];
    tables.forEach((table) => {
      const tableCols = schema[table] || [];
      tableCols.forEach((col) => {
        cols.push({ table, column: col.name, display: `${table}.${col.name}` });
      });
    });
    return cols;
  }, [tables, schema]);

  const addCondition = () =>
    setWhere([...(where || []), { column: "", operator: "=", value: "" }]);
  const updateCondition = (idx, patch) => {
    const next = where.slice();
    next[idx] = { ...next[idx], ...patch };
    setWhere(next);
  };
  const removeCondition = (idx) => setWhere(where.filter((_, i) => i !== idx));

  const addAggregation = () =>
    setAggregations([
      ...(aggregations || []),
      { fn: "SUM", column: "", as: "" },
    ]);
  const updateAggregation = (idx, patch) => {
    const next = aggregations.slice();
    next[idx] = { ...next[idx], ...patch };
    setAggregations(next);
  };
  const removeAggregation = (idx) =>
    setAggregations(aggregations.filter((_, i) => i !== idx));

  const addJoin = () =>
    setJoins([
      ...(joins || []),
      {
        table: "",
        type: "INNER",
        on: {
          left: { table: "", column: "" },
          right: { table: "", column: "" },
        },
      },
    ]);
  const updateJoin = (idx, patch) => {
    const next = joins.slice();
    next[idx] = { ...next[idx], ...patch };
    setJoins(next);
  };
  const removeJoin = (idx) => setJoins(joins.filter((_, i) => i !== idx));

  const onRun = async () => {
    if (!selectedTable) return;

    // Validate aggregations
    const invalidAggregations = (aggregations || []).filter(
      (agg) =>
        !agg.fn || !agg.column || (agg.fn !== "COUNT" && agg.column === "*")
    );

    if (invalidAggregations.length > 0) {
      setError("Please complete all aggregation functions with valid columns");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const builder = {
        table: selectedTable,
        columns: selectedColumns,
        where,
        joins,
        aggregations,
      };
      const data = await runQuery(builder);
      setResult(data);
    } catch (err) {
      setError(err.message || "Query failed");
      console.error("Query error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <FormControl fullWidth>
        <InputLabel>Table</InputLabel>
        <Select
          label="Table"
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
        >
          {tables.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth disabled={!selectedTable}>
        <InputLabel>Columns</InputLabel>
        <Select
          multiple
          label="Columns"
          value={selectedColumns}
          onChange={(e) => setSelectedColumns(e.target.value)}
        >
          {allColumns.map((c) => (
            <MenuItem key={c.display} value={c.display}>
              {c.display}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ display: "grid", gap: 1 }}>
        {(where || []).map((w, idx) => (
          <Box key={idx} sx={{ display: "flex", gap: 1 }}>
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel>Column</InputLabel>
              <Select
                label="Column"
                value={w.column}
                onChange={(e) =>
                  updateCondition(idx, { column: e.target.value })
                }
              >
                {allColumns.map((c) => (
                  <MenuItem key={c.display} value={c.display}>
                    {c.display}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Operator</InputLabel>
              <Select
                label="Operator"
                value={w.operator}
                onChange={(e) =>
                  updateCondition(idx, { operator: e.target.value })
                }
              >
                {OPERATORS.map((op) => (
                  <MenuItem key={op} value={op}>
                    {op}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {w.operator === "IS NULL" || w.operator === "IS NOT NULL" ? (
              <TextField
                label="Value"
                value="N/A"
                disabled
                helperText="No value needed for NULL checks"
              />
            ) : w.operator === "IN" ? (
              <TextField
                label="Values (comma-separated)"
                value={
                  Array.isArray(w.value) ? w.value.join(", ") : w.value || ""
                }
                onChange={(e) => {
                  const values = e.target.value
                    .split(",")
                    .map((v) => v.trim())
                    .filter((v) => v);
                  updateCondition(idx, { value: values });
                }}
                helperText="Enter values separated by commas"
              />
            ) : (
              <TextField
                label="Value"
                value={w.value || ""}
                onChange={(e) =>
                  updateCondition(idx, { value: e.target.value })
                }
              />
            )}
            <Button color="error" onClick={() => removeCondition(idx)}>
              Remove
            </Button>
          </Box>
        ))}
        <Button onClick={addCondition} disabled={!selectedTable}>
          Add WHERE
        </Button>
      </Box>

      {/* Aggregation Section */}
      <Box sx={{ display: "grid", gap: 1 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Aggregation Functions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Use aggregation functions to calculate summary statistics like SUM,
            COUNT, AVG, etc. When using aggregations, non-aggregated columns
            will be automatically grouped.
          </Typography>
        </Box>
        {(aggregations || []).map((agg, idx) => (
          <Box key={idx} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Function</InputLabel>
              <Select
                label="Function"
                value={agg.fn}
                onChange={(e) => updateAggregation(idx, { fn: e.target.value })}
              >
                {AGGREGATION_FUNCTIONS.map((func) => (
                  <MenuItem key={func.value} value={func.value}>
                    {func.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {agg.fn === "COUNT" ? (
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel>Column</InputLabel>
                <Select
                  label="Column"
                  value={agg.column}
                  onChange={(e) =>
                    updateAggregation(idx, { column: e.target.value })
                  }
                >
                  <MenuItem value="*">* (All rows)</MenuItem>
                  {allColumns.map((c) => (
                    <MenuItem key={c.display} value={c.display}>
                      {c.display}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel>Column</InputLabel>
                <Select
                  label="Column"
                  value={agg.column}
                  onChange={(e) =>
                    updateAggregation(idx, { column: e.target.value })
                  }
                >
                  {allColumns.map((c) => (
                    <MenuItem key={c.display} value={c.display}>
                      {c.display}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label="Alias (optional)"
              value={agg.as || ""}
              onChange={(e) => updateAggregation(idx, { as: e.target.value })}
              placeholder="e.g., total_sales"
              sx={{ minWidth: 150 }}
            />

            <Button color="error" onClick={() => removeAggregation(idx)}>
              Remove
            </Button>
          </Box>
        ))}
        <Button onClick={addAggregation} disabled={!selectedTable}>
          Add Aggregation
        </Button>

        {/* Common Examples */}
        <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            💡 Common Aggregation Examples:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • <strong>SUM(price)</strong> - Total of all prices
            <br />• <strong>COUNT(*)</strong> - Count all rows
            <br />• <strong>AVG(score)</strong> - Average score
            <br />• <strong>MIN(date)</strong> - Earliest date
            <br />• <strong>MAX(amount)</strong> - Highest amount
            <br />• <strong>DISTINCT(category)</strong> - Count unique
            categories
            <br />• <strong>TOTAL(sales)</strong> - Sum with NULL handling
            <br />• <strong>GROUP_CONCAT(name)</strong> - Concatenate values
          </Typography>
        </Box>
      </Box>

      {/* JOIN Section */}
      <Box sx={{ display: "grid", gap: 1 }}>
        <h4>JOIN Tables</h4>
        {(joins || []).map((j, idx) => (
          <Box
            key={idx}
            sx={{
              display: "grid",
              gap: 1,
              p: 2,
              border: "1px solid #ccc",
              borderRadius: 1,
            }}
          >
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Join Type</InputLabel>
                <Select
                  label="Join Type"
                  value={j.type}
                  onChange={(e) => updateJoin(idx, { type: e.target.value })}
                >
                  <MenuItem value="INNER">INNER JOIN</MenuItem>
                  <MenuItem value="LEFT">LEFT JOIN</MenuItem>
                  <MenuItem value="RIGHT">RIGHT JOIN</MenuItem>
                  <MenuItem value="FULL">FULL JOIN</MenuItem>
                  <MenuItem value="LEFT OUTER">LEFT OUTER JOIN</MenuItem>
                  <MenuItem value="RIGHT OUTER">RIGHT OUTER JOIN</MenuItem>
                  <MenuItem value="FULL OUTER">FULL OUTER JOIN</MenuItem>
                  <MenuItem value="CROSS">CROSS JOIN</MenuItem>
                  <MenuItem value="NATURAL">NATURAL JOIN</MenuItem>
                  <MenuItem value="SELF">SELF JOIN</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel>Table</InputLabel>
                <Select
                  label="Table"
                  value={j.table}
                  onChange={(e) => updateJoin(idx, { table: e.target.value })}
                >
                  {j.type === "SELF"
                    ? tables.map((t) => (
                        <MenuItem key={t} value={t}>
                          {t}
                        </MenuItem>
                      ))
                    : tables
                        .filter((t) => t !== selectedTable)
                        .map((t) => (
                          <MenuItem key={t} value={t}>
                            {t}
                          </MenuItem>
                        ))}
                </Select>
              </FormControl>
              {j.type === "SELF" && (
                <TextField
                  label="Alias"
                  value={j.alias || ""}
                  onChange={(e) => updateJoin(idx, { alias: e.target.value })}
                  placeholder="e.g., t2"
                  sx={{ minWidth: 120 }}
                />
              )}
              <Button color="error" onClick={() => removeJoin(idx)}>
                Remove
              </Button>
            </Box>
            {/* Only show join conditions for non-CROSS and non-NATURAL joins */}
            {j.type !== "CROSS" && j.type !== "NATURAL" && (
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <FormControl sx={{ minWidth: 160 }}>
                  <InputLabel>Left Column</InputLabel>
                  <Select
                    label="Left Column"
                    value={
                      j.on?.left?.table && j.on?.left?.column
                        ? `${j.on.left.table}.${j.on.left.column}`
                        : ""
                    }
                    onChange={(e) => {
                      const [table, column] = e.target.value.split(".");
                      updateJoin(idx, {
                        on: { ...j.on, left: { table, column } },
                      });
                    }}
                  >
                    {allColumns.map((c) => (
                      <MenuItem key={c.display} value={c.display}>
                        {c.display}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 100 }}>
                  <InputLabel>Operator</InputLabel>
                  <Select
                    label="Operator"
                    value={j.on?.operator || "="}
                    onChange={(e) => {
                      updateJoin(idx, {
                        on: { ...j.on, operator: e.target.value },
                      });
                    }}
                  >
                    <MenuItem value="=">=</MenuItem>
                    <MenuItem value="!=">!=</MenuItem>
                    <MenuItem value=">">></MenuItem>
                    <MenuItem value=">=">>=</MenuItem>
                    <MenuItem value="<"></MenuItem>
                    <MenuItem value="<="></MenuItem>
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 160 }}>
                  <InputLabel>Right Column</InputLabel>
                  <Select
                    label="Right Column"
                    value={
                      j.on?.right?.table && j.on?.right?.column
                        ? `${j.on.right.table}.${j.on.right.column}`
                        : ""
                    }
                    onChange={(e) => {
                      const [table, column] = e.target.value.split(".");
                      updateJoin(idx, {
                        on: { ...j.on, right: { table, column } },
                      });
                    }}
                  >
                    {allColumns.map((c) => (
                      <MenuItem key={c.display} value={c.display}>
                        {c.display}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Show info for CROSS and NATURAL joins */}
            {(j.type === "CROSS" || j.type === "NATURAL") && (
              <Box sx={{ p: 1, bgcolor: "grey.100", borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {j.type === "CROSS"
                    ? "CROSS JOIN creates a Cartesian product - no ON condition needed"
                    : "NATURAL JOIN automatically matches columns with the same name - no ON condition needed"}
                </Typography>
              </Box>
            )}
          </Box>
        ))}
        <Button onClick={addJoin} disabled={tables.length < 2}>
          Add JOIN
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      <Button
        variant="contained"
        onClick={onRun}
        disabled={!selectedTable || loading}
      >
        {loading ? <CircularProgress size={20} /> : "Run Query"}
      </Button>
    </Box>
  );
}
