-- Rename code column to accountCode, add new fields, and create unique constraint
ALTER TABLE "accounts" RENAME COLUMN "code" TO "account_code";

-- Add new reporting fields to the accounts table
ALTER TABLE "accounts" ADD COLUMN "fsli_bucket" text;
ALTER TABLE "accounts" ADD COLUMN "internal_reporting_bucket" text;
ALTER TABLE "accounts" ADD COLUMN "item" text;

-- Update parentId to have onDelete: 'restrict'
-- Note: This should already be the default behavior, but making it explicit
ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_parent_id_accounts_id_fk";
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_id_accounts_id_fk" 
  FOREIGN KEY ("parent_id") REFERENCES "accounts"("id") ON DELETE RESTRICT;

-- Create unique index on accountCode scoped to clientId
CREATE UNIQUE INDEX "account_code_client_unique" ON "accounts" ("client_id", "account_code");

-- Create index on parentId
CREATE INDEX "parent_idx" ON "accounts" ("parent_id");
