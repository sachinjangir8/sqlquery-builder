function sanitizeIdentifier(name) {
  return String(name)
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^([0-9])/, '_$1')
    .toLowerCase();
}

function buildWhereClause(where) {
  if (!where || !Array.isArray(where) || where.length === 0) return { sql: '', params: [] };
  const params = [];
  const parts = where.map((w) => {
    const col = w.table ? `${sanitizeIdentifier(w.table)}.${sanitizeIdentifier(w.column)}` : sanitizeIdentifier(w.column);
    const op = (w.operator || '=').toUpperCase();
    if (op === 'IN' && Array.isArray(w.value)) {
      const ph = w.value.map(() => '?').join(', ');
      params.push(...w.value);
      return `${col} IN (${ph})`;
    }
    if (op === 'LIKE') {
      params.push(String(w.value));
      return `${col} LIKE ?`;
    }
    params.push(w.value);
    return `${col} ${op} ?`;
  });
  return { sql: ` WHERE ${parts.join(' AND ')}`, params };
}

function buildJoins(joins) {
  if (!joins || joins.length === 0) return '';
  return joins
    .map((j) => {
      const t = sanitizeIdentifier(j.table);
      const jt = (j.type || 'INNER').toUpperCase();
      const left = `${sanitizeIdentifier(j.on.left.table)}.${sanitizeIdentifier(j.on.left.column)}`;
      const right = `${sanitizeIdentifier(j.on.right.table)}.${sanitizeIdentifier(j.on.right.column)}`;
      return ` ${jt} JOIN ${t} ON ${left} = ${right}`;
    })
    .join('');
}

function buildSelect({ table, columns = ['*'], where = [], aggregations = [], joins = [] }) {
  const baseTable = sanitizeIdentifier(table);
  const selectCols = Array.isArray(columns) && columns.length > 0 ? columns.map((c) => {
    if (c.includes('.')) {
      const [t, col] = c.split('.');
      return `${sanitizeIdentifier(t)}.${sanitizeIdentifier(col)}`;
    }
    return sanitizeIdentifier(c);
  }) : ['*'];

  const aggCols = (aggregations || []).map((a) => {
    const fn = (a.fn || '').toUpperCase();
    const col = a.column.includes('.')
      ? `${sanitizeIdentifier(a.column.split('.')[0])}.${sanitizeIdentifier(a.column.split('.')[1])}`
      : sanitizeIdentifier(a.column);
    const alias = a.as ? ` AS ${sanitizeIdentifier(a.as)}` : '';
    return `${fn}(${col})${alias}`;
  });

  const allSelect = [...selectCols, ...aggCols].join(', ');
  const joinSql = buildJoins(joins);
  const { sql: whereSql, params } = buildWhereClause(where);
  const sql = `SELECT ${allSelect} FROM ${baseTable}${joinSql}${whereSql};`;
  return { sql, params };
}

module.exports = { buildSelect };


