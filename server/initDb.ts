import * as bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  entities,
  userEntityAccess,
  accounts,
  AccountType,
  UserRole,
} from "@shared/schema";

// Initialize database with default data
export async function initDatabase() {
  // Check if admin user already exists
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.username, "admin"));

  // If admin user doesn't exist, create initial data
  if (existingAdmin.length === 0) {
    console.log("Creating default admin user and initial data...");

    // Create default admin user
    const hashedPassword = await bcrypt.hash("password123", 10);
    const [adminUser] = await db
      .insert(users)
      .values({
        username: "admin",
        password: hashedPassword,
        email: "admin@example.com",
        name: "Admin User",
        role: UserRole.ADMIN,
        active: true,
      })
      .returning();

    // Create default entity
    const [defaultEntity] = await db
      .insert(entities)
      .values({
        name: "Acme Corporation",
        code: "ACME",
        ownerId: adminUser.id,
        active: true,
        fiscalYearStart: "01-01",
        fiscalYearEnd: "12-31",
        currency: "USD",
        address: null,
        email: null,
        phone: null,
        taxId: null,
        website: null,
      })
      .returning();

    // Grant admin access to entity
    await db.insert(userEntityAccess).values({
      userId: adminUser.id,
      entityId: defaultEntity.id,
      accessLevel: "admin",
    });

    // Create basic chart of accounts for default entity
    const accountsData = [
      { code: "1000", name: "Cash", type: AccountType.ASSET, subtype: "current_asset" },
      {
        code: "1200",
        name: "Accounts Receivable",
        type: AccountType.ASSET,
        subtype: "current_asset",
        isSubledger: true,
        subledgerType: "accounts_receivable",
      },
      {
        code: "1500",
        name: "Fixed Assets: Equipment",
        type: AccountType.ASSET,
        subtype: "fixed_asset",
      },
      {
        code: "1600",
        name: "Accumulated Depreciation",
        type: AccountType.ASSET,
        subtype: "fixed_asset",
      },
      {
        code: "2000",
        name: "Accounts Payable",
        type: AccountType.LIABILITY,
        subtype: "current_liability",
        isSubledger: true,
        subledgerType: "accounts_payable",
      },
      {
        code: "3000",
        name: "Owner's Equity",
        type: AccountType.EQUITY,
        subtype: "equity",
      },
      { code: "4000", name: "Revenue", type: AccountType.REVENUE, subtype: "revenue" },
      {
        code: "5000",
        name: "Cost of Goods Sold",
        type: AccountType.EXPENSE,
        subtype: "cost_of_sales",
      },
      {
        code: "6000",
        name: "Operating Expenses",
        type: AccountType.EXPENSE,
        subtype: "operating_expense",
      },
      {
        code: "6150",
        name: "Office Expenses",
        type: AccountType.EXPENSE,
        subtype: "operating_expense",
      },
    ];

    // Insert accounts
    for (const account of accountsData) {
      await db.insert(accounts).values({
        entityId: defaultEntity.id,
        code: account.code,
        name: account.name,
        type: account.type,
        subtype: account.subtype || null,
        isSubledger: account.isSubledger || false,
        subledgerType: account.subledgerType || null,
        active: true,
        description: null,
        parentId: null,
      });
    }

    console.log("Database initialized with default data!");
  } else {
    console.log("Database already initialized.");
  }
}