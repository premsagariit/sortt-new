import { Pool, PoolClient } from 'pg';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
}

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export async function withUser<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    return await fn(client);
  } finally {
    client.release();
  }
}
