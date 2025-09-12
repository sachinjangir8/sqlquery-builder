import { useMemo, useState } from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, Alert, CircularProgress } from '@mui/material';
import { useAppStore } from '../store';
import { runQuery } from '../api';

const OPERATORS = ['=', '!=', '>', '>=', '<', '<=', 'LIKE'];

export default function QueryBuilder() {
  const { tables, schema, selectedTable, selectedColumns, where, joins } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setSelectedTable = useAppStore((s) => s.setSelectedTable);
  const setSelectedColumns = useAppStore((s) => s.setSelectedColumns);
  const setWhere = useAppStore((s) => s.setWhere);
  const setJoins = useAppStore((s) => s.setJoins);
  const setResult = useAppStore((s) => s.setResult);

  const columns = useMemo(() => (selectedTable ? (schema[selectedTable] || []).map((c) => c.name) : []), [schema, selectedTable]);
  
  // Get all available columns from all tables for joins
  const allColumns = useMemo(() => {
    const cols = [];
    tables.forEach(table => {
      const tableCols = schema[table] || [];
      tableCols.forEach(col => {
        cols.push({ table, column: col.name, display: `${table}.${col.name}` });
      });
    });
    return cols;
  }, [tables, schema]);

  const addCondition = () => setWhere([...(where || []), { column: '', operator: '=', value: '' }]);
  const updateCondition = (idx, patch) => {
    const next = where.slice();
    next[idx] = { ...next[idx], ...patch };
    setWhere(next);
  };
  const removeCondition = (idx) => setWhere(where.filter((_, i) => i !== idx));

  const addJoin = () => setJoins([...(joins || []), { table: '', type: 'INNER', on: { left: { table: '', column: '' }, right: { table: '', column: '' } } }]);
  const updateJoin = (idx, patch) => {
    const next = joins.slice();
    next[idx] = { ...next[idx], ...patch };
    setJoins(next);
  };
  const removeJoin = (idx) => setJoins(joins.filter((_, i) => i !== idx));

  const onRun = async () => {
    if (!selectedTable) return;
    setLoading(true);
    setError('');
    try {
      const builder = { table: selectedTable, columns: selectedColumns, where, joins };
      const data = await runQuery(builder);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Query failed');
      console.error('Query error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <FormControl fullWidth>
        <InputLabel>Table</InputLabel>
        <Select label="Table" value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}>
          {tables.map((t) => (
            <MenuItem key={t} value={t}>{t}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth disabled={!selectedTable}>
        <InputLabel>Columns</InputLabel>
        <Select multiple label="Columns" value={selectedColumns} onChange={(e) => setSelectedColumns(e.target.value)}>
          {allColumns.map((c) => (
            <MenuItem key={c.display} value={c.display}>{c.display}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ display: 'grid', gap: 1 }}>
        {(where || []).map((w, idx) => (
          <Box key={idx} sx={{ display: 'flex', gap: 1 }}>
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel>Column</InputLabel>
              <Select label="Column" value={w.column} onChange={(e) => updateCondition(idx, { column: e.target.value })}>
                {allColumns.map((c) => (
                  <MenuItem key={c.display} value={c.display}>{c.display}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Operator</InputLabel>
              <Select label="Operator" value={w.operator} onChange={(e) => updateCondition(idx, { operator: e.target.value })}>
                {OPERATORS.map((op) => (
                  <MenuItem key={op} value={op}>{op}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Value" value={w.value} onChange={(e) => updateCondition(idx, { value: e.target.value })} />
            <Button color="error" onClick={() => removeCondition(idx)}>Remove</Button>
          </Box>
        ))}
        <Button onClick={addCondition} disabled={!selectedTable}>Add WHERE</Button>
      </Box>

      {/* JOIN Section */}
      <Box sx={{ display: 'grid', gap: 1 }}>
        <h4>JOIN Tables</h4>
        {(joins || []).map((j, idx) => (
          <Box key={idx} sx={{ display: 'grid', gap: 1, p: 2, border: '1px solid #ccc', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Join Type</InputLabel>
                <Select label="Join Type" value={j.type} onChange={(e) => updateJoin(idx, { type: e.target.value })}>
                  <MenuItem value="INNER">INNER JOIN</MenuItem>
                  <MenuItem value="LEFT">LEFT JOIN</MenuItem>
                  <MenuItem value="RIGHT">RIGHT JOIN</MenuItem>
                  <MenuItem value="FULL">FULL JOIN</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel>Table</InputLabel>
                <Select label="Table" value={j.table} onChange={(e) => updateJoin(idx, { table: e.target.value })}>
                  {tables.filter(t => t !== selectedTable).map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button color="error" onClick={() => removeJoin(idx)}>Remove</Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel>Left Column</InputLabel>
                <Select 
                  label="Left Column" 
                  value={j.on?.left?.table && j.on?.left?.column ? `${j.on.left.table}.${j.on.left.column}` : ''} 
                  onChange={(e) => {
                    const [table, column] = e.target.value.split('.');
                    updateJoin(idx, { on: { ...j.on, left: { table, column } } });
                  }}
                >
                  {allColumns.map((c) => (
                    <MenuItem key={c.display} value={c.display}>{c.display}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <span>=</span>
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel>Right Column</InputLabel>
                <Select 
                  label="Right Column" 
                  value={j.on?.right?.table && j.on?.right?.column ? `${j.on.right.table}.${j.on.right.column}` : ''} 
                  onChange={(e) => {
                    const [table, column] = e.target.value.split('.');
                    updateJoin(idx, { on: { ...j.on, right: { table, column } } });
                  }}
                >
                  {allColumns.map((c) => (
                    <MenuItem key={c.display} value={c.display}>{c.display}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        ))}
        <Button onClick={addJoin} disabled={tables.length < 2}>Add JOIN</Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      <Button 
        variant="contained" 
        onClick={onRun} 
        disabled={!selectedTable || loading}
      >
        {loading ? <CircularProgress size={20} /> : 'Run Query'}
      </Button>
    </Box>
  );
}
