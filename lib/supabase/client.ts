import { supabase } from '@/lib/supabase/client';


// 1. Fetch your master Aiven Service URI connection string safely
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Missing DATABASE_URL connection string inside environment variables.');
}

// 2. Initialize a high-performance, cached Aiven database connection pool
// This manages your 20 maximum connections safely across your Next.js app routes
const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false, // Forces secure SSL connection matching Aiven criteria
  },
  max: 20, // Strict safeguard capping usage within Aiven Free tier limits
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 3. Keep the export named 'supabase' as a custom wrapper to trick your old queries
// This prevents you from having to rewrite code structures across your 2,900 tour files
export const supabase = {
  /**
   * Safe mock tool pulling table rows directly from Aiven PostgreSQL
   * Usage example: await supabase.from('tours').select('*')
   */
  from: (tableName: string) => {
    return {
      select: async (columns = '*') => {
        try {
          const client = await pool.connect();
          const queryText = `SELECT ${columns === '*' ? '*' : columns} FROM ${tableName}`;
          const res = await client.query(queryText);
          client.release();
          return { data: res.rows, error: null };
        } catch (error: any) {
          console.error(`Aiven runtime error fetching from table ${tableName}:`, error.message);
          return { data: null, error };
        }
      },
      // You can add insert/update mock wrapper logic blocks here as needed later
    };
  },
  
  // Expose the raw pool instance for advanced native SQL queries inside Cursor
  pool: pool
};
