import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Type for the database connection
type Database = ReturnType<typeof drizzle<typeof schema>>;

// Create postgres client
const client = typeof window === 'undefined' && process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, {
      prepare: false, // Required for Supabase pooler in transaction mode
      ssl: 'require',
      max: 1
    })
  : null;

// Only initialize database on server-side
// Using a type assertion for client-side to avoid runtime errors
export const db: Database = client
  ? drizzle(client, { schema })
  : {} as Database;
