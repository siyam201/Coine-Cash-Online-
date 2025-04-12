import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";
// Import pg package in a way compatible with ESM
import pg from 'pg';
const { Pool } = pg;

// Create a connection pool for session store and direct queries
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL!,
});

// Create postgres.js client for Drizzle ORM
const client = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

// Create the Drizzle ORM instance with postgres.js client
export const db = drizzle(client, { schema });

/**
 * Database optimization and maintenance utilities
 */
export async function performDatabaseMaintenance() {
  try {
    // Call the maintenance_db function we created in the database
    await db.execute(`SELECT maintenance_db()`);
    console.log('Database maintenance executed successfully');
    return true;
  } catch (error) {
    console.error('Error performing database maintenance:', error);
    return false;
  }
}

// Schedule automatic maintenance to run every 24 hours
export function scheduleAutomaticMaintenance() {
  const MAINTENANCE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  
  setInterval(async () => {
    console.log('Running scheduled database maintenance...');
    await performDatabaseMaintenance();
  }, MAINTENANCE_INTERVAL);
  
  console.log('Scheduled automatic database maintenance (every 24 hours)');
}
