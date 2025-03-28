CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"subtype" text,
	"is_subledger" boolean DEFAULT false NOT NULL,
	"subledger_type" text,
	"parent_id" integer,
	"active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"subscription_date" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp,
	"confirmed" boolean DEFAULT false NOT NULL,
	"verification_token" text,
	"verification_expires" timestamp,
	"unsubscribed_at" timestamp,
	"active" boolean DEFAULT true NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"last_email_sent" timestamp,
	"email_count" integer DEFAULT 0,
	"industry" text,
	"source" text,
	"unsubscribe_token" text NOT NULL,
	CONSTRAINT "blog_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "budget_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"budget_id" integer NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"path" text NOT NULL,
	"extracted_data" json,
	"uploaded_by" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"file_type" text NOT NULL,
	"processing_status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"budget_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"description" text,
	"amount" numeric DEFAULT '0' NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"category" text,
	"tags" text[],
	"notes" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"fiscal_year" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"period_type" text DEFAULT 'monthly' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"base_scenario" boolean DEFAULT true NOT NULL,
	"created_by" integer NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"total_amount" numeric DEFAULT '0' NOT NULL,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE "chat_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"entity_id" integer,
	"title" text,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"user_id" integer,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"token_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "chat_usage_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"entity_id" integer,
	"max_messages_per_day" integer DEFAULT 50 NOT NULL,
	"max_tokens_per_day" integer DEFAULT 5000 NOT NULL,
	"limit_reset_time" timestamp NOT NULL,
	"messages_used_today" integer DEFAULT 0 NOT NULL,
	"tokens_used_today" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "checklist_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"path" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"uploaded_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "checklist_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text NOT NULL,
	"revenue_range" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"status" text DEFAULT 'unread' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"industry" text,
	"address" text,
	"city" text,
	"state" text,
	"country" text,
	"postal_code" text,
	"website" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"referral_source" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consolidation_group_entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"entity_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consolidation_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner_id" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"period_type" text DEFAULT 'monthly' NOT NULL,
	"rules" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run" timestamp,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consultation_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyName" text NOT NULL,
	"industry" text NOT NULL,
	"companySize" text NOT NULL,
	"annualRevenue" text NOT NULL,
	"services" json NOT NULL,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"preferredContact" text NOT NULL,
	"message" text,
	"ipAddress" text,
	"userAgent" text,
	"status" text DEFAULT 'unread' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"status" text DEFAULT 'unread' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "data_consent" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"entity_id" integer,
	"consent_type" text NOT NULL,
	"granted" boolean DEFAULT false,
	"granted_at" timestamp,
	"revoked_at" timestamp,
	"consent_version" text NOT NULL,
	"ip_address" text,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"owner_id" integer NOT NULL,
	"client_id" integer,
	"active" boolean DEFAULT true NOT NULL,
	"fiscal_year_start" text DEFAULT '01-01' NOT NULL,
	"fiscal_year_end" text DEFAULT '12-31' NOT NULL,
	"tax_id" text,
	"address" text,
	"city" text,
	"state" text,
	"country" text,
	"postal_code" text,
	"phone" text,
	"email" text,
	"website" text,
	"industry" text,
	"sub_industry" text,
	"employee_count" integer,
	"founded_year" integer,
	"annual_revenue" text,
	"business_type" text,
	"publicly_traded" boolean DEFAULT false,
	"stock_symbol" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"timezone" text DEFAULT 'UTC',
	"data_collection_consent" boolean DEFAULT false,
	"last_audit_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feature_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"entity_id" integer,
	"feature_name" text NOT NULL,
	"usage_count" integer DEFAULT 1,
	"first_used" timestamp DEFAULT now() NOT NULL,
	"last_used" timestamp DEFAULT now() NOT NULL,
	"use_time" integer,
	"successful" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "fixed_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"acquisition_date" timestamp NOT NULL,
	"acquisition_cost" numeric NOT NULL,
	"depreciation_method" text NOT NULL,
	"useful_life" integer NOT NULL,
	"salvage_value" numeric DEFAULT '0' NOT NULL,
	"asset_account_id" integer NOT NULL,
	"accumulated_depreciation_account_id" integer NOT NULL,
	"depreciation_expense_account_id" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"disposal_date" timestamp,
	"disposal_amount" numeric,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forecasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"period_type" text DEFAULT 'monthly' NOT NULL,
	"base_scenario" boolean DEFAULT true NOT NULL,
	"model_config" json,
	"forecast_data" json,
	"ai_insights" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"confidence_interval" numeric DEFAULT '0.95'
);
--> statement-breakpoint
CREATE TABLE "industry_benchmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"industry" text NOT NULL,
	"sub_industry" text,
	"metric_name" text NOT NULL,
	"metric_value" numeric NOT NULL,
	"entity_size_range" text,
	"year" integer NOT NULL,
	"quarter" integer,
	"data_source" text,
	"confidence_level" numeric,
	"sample_size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"journal_id" integer NOT NULL,
	"reference" text NOT NULL,
	"date" timestamp NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"needs_review" boolean DEFAULT false,
	"is_recurring" boolean DEFAULT false,
	"recurring_frequency" text,
	"recurring_end_date" timestamp,
	"requested_by" integer,
	"requested_at" timestamp,
	"approved_by" integer,
	"approved_at" timestamp,
	"rejected_by" integer,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"posted_by" integer,
	"posted_at" timestamp,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entry_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"journal_entry_id" integer NOT NULL,
	"filename" text NOT NULL,
	"path" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"uploaded_by" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entry_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"journal_entry_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"description" text,
	"debit" numeric DEFAULT '0' NOT NULL,
	"credit" numeric DEFAULT '0' NOT NULL,
	"entity_id" integer NOT NULL,
	"line_no" integer,
	"reference" text,
	"date" timestamp,
	"tax_id" integer,
	"tax_amount" numeric,
	"reconciled" boolean DEFAULT false,
	"reconciled_at" timestamp,
	"reconciled_by" integer,
	"reconciled_with" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journals" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"default_account_id" integer,
	"suspense_account_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"show_in_dashboard" boolean DEFAULT true NOT NULL,
	"sequence" integer DEFAULT 10,
	"sequence_prefix" text,
	"color" text DEFAULT '#4A6CF7',
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"filters" json NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_run" timestamp,
	"run_count" integer DEFAULT 0,
	"export_count" integer DEFAULT 0,
	"is_public" boolean DEFAULT false,
	"tags" text[]
);
--> statement-breakpoint
CREATE TABLE "user_activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"entity_id" integer,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" integer,
	"details" json,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_entity_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"entity_id" integer NOT NULL,
	"access_level" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'client' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"login_count" integer DEFAULT 0,
	"industry" text,
	"company_size" text,
	"job_title" text,
	"location" text,
	"preferred_language" text DEFAULT 'en',
	"device_info" text,
	"last_session" json,
	"session_count" integer DEFAULT 0,
	"referral_source" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_id_accounts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_documents" ADD CONSTRAINT "budget_documents_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_documents" ADD CONSTRAINT "budget_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_usage_limits" ADD CONSTRAINT "chat_usage_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_usage_limits" ADD CONSTRAINT "chat_usage_limits_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_files" ADD CONSTRAINT "checklist_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_group_entities" ADD CONSTRAINT "consolidation_group_entities_group_id_consolidation_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."consolidation_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_group_entities" ADD CONSTRAINT "consolidation_group_entities_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_groups" ADD CONSTRAINT "consolidation_groups_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_groups" ADD CONSTRAINT "consolidation_groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_consent" ADD CONSTRAINT "data_consent_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_consent" ADD CONSTRAINT "data_consent_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_usage" ADD CONSTRAINT "feature_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_usage" ADD CONSTRAINT "feature_usage_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_asset_account_id_accounts_id_fk" FOREIGN KEY ("asset_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_accumulated_depreciation_account_id_accounts_id_fk" FOREIGN KEY ("accumulated_depreciation_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_depreciation_expense_account_id_accounts_id_fk" FOREIGN KEY ("depreciation_expense_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_files" ADD CONSTRAINT "journal_entry_files_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_files" ADD CONSTRAINT "journal_entry_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_reconciled_by_users_id_fk" FOREIGN KEY ("reconciled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journals" ADD CONSTRAINT "journals_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journals" ADD CONSTRAINT "journals_default_account_id_accounts_id_fk" FOREIGN KEY ("default_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journals" ADD CONSTRAINT "journals_suspense_account_id_accounts_id_fk" FOREIGN KEY ("suspense_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journals" ADD CONSTRAINT "journals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_logs" ADD CONSTRAINT "user_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_logs" ADD CONSTRAINT "user_activity_logs_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_entity_access" ADD CONSTRAINT "user_entity_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_entity_access" ADD CONSTRAINT "user_entity_access_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_entity_idx" ON "consolidation_group_entities" USING btree ("group_id","entity_id");