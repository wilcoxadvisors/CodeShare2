import { db as drizzleDb } from './db';
import * as schema from '@shared/schema';
import { updateJunctionTableSchema } from './migrations/update-junction-table-schema';

// Database schema migration utility

export async function migrateTables() {
  console.log("Starting database migration...");
  // Make console.log output immediately visible
  process.stdout.isTTY = true;
  
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

    // Create budget and forecast tables
    await drizzleDb.execute(`
      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        entity_id INTEGER NOT NULL REFERENCES entities(id),
        name TEXT NOT NULL,
        description TEXT,
        fiscal_year INTEGER NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        period_type TEXT NOT NULL DEFAULT 'monthly',
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        is_template BOOLEAN DEFAULT FALSE NOT NULL,
        base_scenario BOOLEAN DEFAULT TRUE NOT NULL,
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        notes TEXT,
        total_amount TEXT DEFAULT '0',
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP,
        metadata JSONB
      );

      CREATE TABLE IF NOT EXISTS budget_items (
        id SERIAL PRIMARY KEY,
        budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES accounts(id),
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        amount TEXT NOT NULL,
        description TEXT,
        tags TEXT[],
        notes TEXT,
        category TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS budget_documents (
        id SERIAL PRIMARY KEY,
        budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        path TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        file_type TEXT NOT NULL,
        uploaded_by INTEGER NOT NULL REFERENCES users(id),
        uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
        processing_status TEXT DEFAULT 'pending',
        extracted_data JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS forecasts (
        id SERIAL PRIMARY KEY,
        entity_id INTEGER NOT NULL REFERENCES entities(id),
        name TEXT NOT NULL,
        description TEXT,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        period_type TEXT DEFAULT 'monthly',
        base_scenario BOOLEAN DEFAULT true,
        model_config JSONB,
        forecast_data JSONB,
        ai_insights TEXT,
        confidence_interval TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      );
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
        last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP
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
        max_messages_per_day INTEGER NOT NULL DEFAULT 50,
        max_tokens_per_day INTEGER NOT NULL DEFAULT 5000,
        messages_used_today INTEGER NOT NULL DEFAULT 0,
        tokens_used_today INTEGER NOT NULL DEFAULT 0,
        limit_reset_time TIMESTAMP NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
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
      
      CREATE TABLE IF NOT EXISTS checklist_files (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        path TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        uploaded_by INTEGER REFERENCES users(id),
        file_data BYTEA,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP
      );
      
      -- Create consultation_submissions table if it doesn't exist
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
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP
      );
    `);

    // Add missing updatedAt column to consultation_submissions table
    await drizzleDb.execute(`
      ALTER TABLE consultation_submissions ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP;
    `);
    
    // Create blog_subscribers table if it doesn't exist
    await drizzleDb.execute(`
      CREATE TABLE IF NOT EXISTS blog_subscribers (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        subscription_date TIMESTAMP NOT NULL DEFAULT NOW(),
        confirmed_at TIMESTAMP,
        confirmed BOOLEAN NOT NULL DEFAULT FALSE,
        unsubscribed_at TIMESTAMP,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        ip_address TEXT,
        user_agent TEXT,
        last_email_sent TIMESTAMP,
        email_count INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Fix column naming inconsistencies between database and schema.ts
    await drizzleDb.execute(`
      DO $$ 
      BEGIN 
        -- Rename entity_id to entityId
        BEGIN
          ALTER TABLE budgets RENAME COLUMN entity_id TO "entityId";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE forecasts RENAME COLUMN entity_id TO "entityId";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename start_date to startDate
        BEGIN
          ALTER TABLE budgets RENAME COLUMN start_date TO "startDate";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE forecasts RENAME COLUMN start_date TO "startDate";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename end_date to endDate
        BEGIN
          ALTER TABLE budgets RENAME COLUMN end_date TO "endDate";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE forecasts RENAME COLUMN end_date TO "endDate";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename fiscal_year to fiscalYear
        BEGIN
          ALTER TABLE budgets RENAME COLUMN fiscal_year TO "fiscalYear";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename period_type to periodType
        BEGIN
          ALTER TABLE budgets RENAME COLUMN period_type TO "periodType";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE forecasts RENAME COLUMN period_type TO "periodType";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename total_amount to totalAmount
        BEGIN
          ALTER TABLE budgets RENAME COLUMN total_amount TO "totalAmount";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename created_by to createdBy
        BEGIN
          ALTER TABLE budgets RENAME COLUMN created_by TO "createdBy";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE forecasts RENAME COLUMN created_by TO "createdBy";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename created_at to createdAt
        BEGIN
          ALTER TABLE budgets RENAME COLUMN created_at TO "createdAt";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        BEGIN
          ALTER TABLE forecasts RENAME COLUMN created_at TO "createdAt";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename updated_at to updatedAt for budgets
        BEGIN
          ALTER TABLE budgets RENAME COLUMN updated_at TO "updatedAt";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename last_updated to lastUpdated for forecasts
        BEGIN
          ALTER TABLE forecasts RENAME COLUMN last_updated TO "lastUpdated";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename approved_by to approvedBy
        BEGIN
          ALTER TABLE budgets RENAME COLUMN approved_by TO "approvedBy";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename approved_at to approvedAt
        BEGIN
          ALTER TABLE budgets RENAME COLUMN approved_at TO "approvedAt";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename base_scenario to baseScenario
        BEGIN
          ALTER TABLE forecasts RENAME COLUMN base_scenario TO "baseScenario";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename model_config to modelConfig
        BEGIN
          ALTER TABLE forecasts RENAME COLUMN model_config TO "modelConfig";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename forecast_data to forecastData
        BEGIN
          ALTER TABLE forecasts RENAME COLUMN forecast_data TO "forecastData";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename ai_insights to aiInsights
        BEGIN
          ALTER TABLE forecasts RENAME COLUMN ai_insights TO "aiInsights";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename confidence_interval to confidenceInterval
        BEGIN
          ALTER TABLE forecasts RENAME COLUMN confidence_interval TO "confidenceInterval";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename is_active to isActive
        BEGIN
          ALTER TABLE budgets RENAME COLUMN is_active TO "isActive";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename is_template to isTemplate
        BEGIN
          ALTER TABLE budgets RENAME COLUMN is_template TO "isTemplate";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Budget items table fixes
        -- Rename budget_id to budgetId
        BEGIN
          ALTER TABLE budget_items RENAME COLUMN budget_id TO "budgetId";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename account_id to accountId
        BEGIN
          ALTER TABLE budget_items RENAME COLUMN account_id TO "accountId";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename period_start to periodStart
        BEGIN
          ALTER TABLE budget_items RENAME COLUMN period_start TO "periodStart";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename period_end to periodEnd
        BEGIN
          ALTER TABLE budget_items RENAME COLUMN period_end TO "periodEnd";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename created_by to createdBy
        BEGIN
          ALTER TABLE budget_items RENAME COLUMN created_by TO "createdBy";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename created_at to createdAt
        BEGIN
          ALTER TABLE budget_items RENAME COLUMN created_at TO "createdAt";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename updated_at to updatedAt
        BEGIN
          ALTER TABLE budget_items RENAME COLUMN updated_at TO "updatedAt";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Budget documents table fixes
        -- Rename budget_id to budgetId
        BEGIN
          ALTER TABLE budget_documents RENAME COLUMN budget_id TO "budgetId";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename original_filename to originalFilename
        BEGIN
          ALTER TABLE budget_documents RENAME COLUMN original_filename TO "originalFilename";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename mime_type to mimeType
        BEGIN
          ALTER TABLE budget_documents RENAME COLUMN mime_type TO "mimeType";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename file_type to fileType
        BEGIN
          ALTER TABLE budget_documents RENAME COLUMN file_type TO "fileType";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename uploaded_by to uploadedBy
        BEGIN
          ALTER TABLE budget_documents RENAME COLUMN uploaded_by TO "uploadedBy";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename uploaded_at to uploadedAt
        BEGIN
          ALTER TABLE budget_documents RENAME COLUMN uploaded_at TO "uploadedAt";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename processing_status to processingStatus
        BEGIN
          ALTER TABLE budget_documents RENAME COLUMN processing_status TO "processingStatus";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename extracted_data to extractedData
        BEGIN
          ALTER TABLE budget_documents RENAME COLUMN extracted_data TO "extractedData";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename created_at to createdAt
        BEGIN
          ALTER TABLE budget_documents RENAME COLUMN created_at TO "createdAt";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename updated_at to updatedAt
        BEGIN
          ALTER TABLE budget_documents RENAME COLUMN updated_at TO "updatedAt";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Consultation submissions table fixes
        -- Rename company_name to companyName
        BEGIN
          ALTER TABLE consultation_submissions RENAME COLUMN company_name TO "companyName";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename company_size to companySize
        BEGIN
          ALTER TABLE consultation_submissions RENAME COLUMN company_size TO "companySize";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename annual_revenue to annualRevenue
        BEGIN
          ALTER TABLE consultation_submissions RENAME COLUMN annual_revenue TO "annualRevenue";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename first_name to firstName
        BEGIN
          ALTER TABLE consultation_submissions RENAME COLUMN first_name TO "firstName";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename last_name to lastName
        BEGIN
          ALTER TABLE consultation_submissions RENAME COLUMN last_name TO "lastName";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename preferred_contact to preferredContact
        BEGIN
          ALTER TABLE consultation_submissions RENAME COLUMN preferred_contact TO "preferredContact";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename ip_address to ipAddress
        BEGIN
          ALTER TABLE consultation_submissions RENAME COLUMN ip_address TO "ipAddress";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename user_agent to userAgent
        BEGIN
          ALTER TABLE consultation_submissions RENAME COLUMN user_agent TO "userAgent";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename created_at to createdAt
        BEGIN
          ALTER TABLE consultation_submissions RENAME COLUMN created_at TO "createdAt";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
        
        -- Rename updated_at to updatedAt
        BEGIN
          ALTER TABLE consultation_submissions RENAME COLUMN updated_at TO "updatedAt";
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN duplicate_column THEN NULL;
        END;
      END $$;
    `);
    
    // Apply junction table schema update for consolidation_group_entities
    await updateJunctionTableSchema();
    
    console.log("Database migration completed successfully!");
    return true;
  } catch (error) {
    console.error("Database migration failed:", error);
    return false;
  }
}