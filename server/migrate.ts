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
      
      -- Chat system tables
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        entity_id INTEGER,
        title TEXT NOT NULL,
        last_message_at TIMESTAMP NOT NULL DEFAULT NOW(),
        total_messages INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL,
        user_id INTEGER,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        token_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS chat_usage_limits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        entity_id INTEGER,
        messages_used INTEGER NOT NULL DEFAULT 0,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        max_messages_per_day INTEGER NOT NULL DEFAULT 1000,
        max_tokens_per_day INTEGER NOT NULL DEFAULT 100000,
        reset_date TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP
      );
      
      ALTER TABLE saved_reports 
      ADD COLUMN IF NOT EXISTS run_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS export_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS tags TEXT[];
      
      -- Create form submission tables
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        message TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        status TEXT NOT NULL DEFAULT 'unread',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS checklist_submissions (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        company TEXT NOT NULL,
        revenue_range TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        status TEXT NOT NULL DEFAULT 'unread',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      -- Update the existing consultation_submissions table if it exists
      DROP TABLE IF EXISTS consultation_submissions;
      
      CREATE TABLE IF NOT EXISTS consultation_submissions (
        id SERIAL PRIMARY KEY,
        company_name TEXT NOT NULL,
        industry TEXT NOT NULL,
        company_size TEXT NOT NULL,
        annual_revenue TEXT NOT NULL,
        services JSONB NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        preferred_contact TEXT NOT NULL,
        message TEXT,
        ip_address TEXT,
        user_agent TEXT,
        status TEXT NOT NULL DEFAULT 'unread',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log("Database migration completed successfully!");
    return true;
  } catch (error) {
    console.error("Database migration failed:", error);
    return false;
  }
}