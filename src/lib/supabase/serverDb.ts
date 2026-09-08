import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPgPool(): Pool {
  if (!pool) {
    const connectionString =
      process.env.SUPABASE_DATABASE_URL ||
      'postgresql://postgres.uwigrkumdxeoshzlxpek:pAGXlCaFx0d51UTg@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}
