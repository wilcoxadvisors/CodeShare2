import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure neon to use websockets
neonConfig.webSocketConstructor = ws;

// Additional connection stability options
// Note: We only use standard Neon configuration options

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool with improved configuration for stability
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients the pool should contain
  idleTimeoutMillis: 60000, // How long a client is allowed to remain idle before being closed (1 minute)
  connectionTimeoutMillis: 10000, // How long to wait for a connection to become available (10 seconds)
});

// Add event handlers to monitor pool connection status
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  // Do not crash the server on connection errors, just log them
});

// Create Drizzle ORM instance with our configured pool
export const db = drizzle({ client: pool, schema });
