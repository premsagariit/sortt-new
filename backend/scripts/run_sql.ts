import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { query, pool } = require('../src/lib/db') as typeof import('../src/lib/db');

async function main() {
  const sql = process.argv.slice(2).join(' ').trim();
  if (!sql) {
    console.error('Usage: ts-node scripts/run_sql.ts <SQL>');
    process.exit(1);
  }

  try {
    const result = await query(sql);
    console.log(JSON.stringify({ rowCount: result.rowCount, rows: result.rows }, null, 2));
  } catch (error: any) {
    console.error('SQL_ERROR:', error?.message ?? error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
