import { db as drizzleDb } from './db';
import * as schema from '@shared/schema';

// Database schema migration utility

export async function migrateTables() {
  console.log("Starting database migration...");
  
  try {
    // Add missing columns to users table
    await drizzleDb.execute(`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS industry TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS company_size TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS device_info TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS last_session JSONB;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 0;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_source TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
      END $$;
    `);

    // Add missing columns to entities table
    await drizzleDb.execute(`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE entities ADD COLUMN IF NOT EXISTS city TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE entities ADD COLUMN IF NOT EXISTS state TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE entities ADD COLUMN IF NOT EXISTS country TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE entities ADD COLUMN IF NOT EXISTS postal_code TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE entities ADD COLUMN IF NOT EXISTS industry TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE entities ADD COLUMN IF NOT EXISTS sub_industry TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE entities ADD COLUMN IF NOT EXISTS employee_count INTEGER;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE entities ADD COLUMN IF NOT EXISTS founded_year INTEGER;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE entities ADD COLUMN IF NOT EXISTS annual_revenue TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE entities ADD COLUMN IF NOT EXISTS business_type TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE entities ADD COLUMN IF NOT EXISTS publicly_traded BOOLEAN DEFAULT FALSE;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE entities ADD COLUMN IF NOT EXISTS stock_symbol TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE entities ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE entities ADD COLUMN IF NOT EXISTS data_collection_consent BOOLEAN DEFAULT FALSE;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE entities ADD COLUMN IF NOT EXISTS last_audit_date TIMESTAMP;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE entities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
      END $$;
    `);

    // Create new analytics tables
    await drizzleDb.execute(`
      CREATE TABLE IF NOT EXISTS user_activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        entity_id INTEGER REFERENCES entities(id),
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id INTEGER,
        details JSONB,
        ip_address TEXT,
        user_agent TEXT,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS feature_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        entity_id INTEGER REFERENCES entities(id),
        feature_name TEXT NOT NULL,
        usage_count INTEGER DEFAULT 1,
        first_used TIMESTAMP NOT NULL DEFAULT NOW(),
        last_used TIMESTAMP NOT NULL DEFAULT NOW(),
        use_time INTEGER,
        successful BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS industry_benchmarks (
        id SERIAL PRIMARY KEY,
        industry TEXT NOT NULL,
        sub_industry TEXT,
        metric_name TEXT NOT NULL,
        metric_value NUMERIC NOT NULL,
        entity_size_range TEXT,
        year INTEGER NOT NULL,
        quarter INTEGER,
        data_source TEXT,
        confidence_level NUMERIC,
        sample_size INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS data_consent (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        entity_id INTEGER REFERENCES entities(id),
        consent_type TEXT NOT NULL,
        granted BOOLEAN DEFAULT FALSE,
        granted_at TIMESTAMP,
        revoked_at TIMESTAMP,
        consent_version TEXT NOT NULL,
        ip_address TEXT,
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      ALTER TABLE saved_reports 
      ADD COLUMN IF NOT EXISTS run_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS export_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS tags TEXT[];
    `);

    console.log("Database migration completed successfully!");
    return true;
  } catch (error) {
    console.error("Database migration failed:", error);
    return false;
  }
}