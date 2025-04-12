import pg from 'pg';
const { Pool } = pg;

// Create the api_keys table manually
async function createApiKeysTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Creating api_keys table...');
    
    // Create the api_keys table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        user_id INTEGER NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE,
        api_key TEXT NOT NULL UNIQUE,
        active BOOLEAN DEFAULT TRUE NOT NULL,
        permissions JSONB NOT NULL,
        last_used TIMESTAMP WITH TIME ZONE,
        ip_restrictions JSONB
      );
    `);
    
    // Add foreign key constraint
    await pool.query(`
      ALTER TABLE api_keys 
      ADD CONSTRAINT fk_api_keys_user
      FOREIGN KEY (user_id) 
      REFERENCES users(id)
      ON DELETE CASCADE;
    `);

    console.log('Successfully created api_keys table');
  } catch (error) {
    console.error('Error creating api_keys table:', error);
  } finally {
    await pool.end();
  }
}

createApiKeysTable();