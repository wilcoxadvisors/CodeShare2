import { z } from 'zod';
import * as schema from './schema';

// Helper schemas for string validations
const optionalString = z.string().optional();
const requiredString = z.string().min(1, "This field is required");

/**
 * Enhanced schema for validating user input
 */
export const enhancedUserSchema = schema.insertUserSchema.extend({
  // Add additional validation requirements
  password: z.string().min(8, "Password must be at least 8 characters long")
});

/**
 * Enhanced schema for validating entity input
 */
export const enhancedEntitySchema = schema.insertEntitySchema.extend({
  name: z.string().min(2, "Entity name must be at least 2 characters long"),
  taxId: z.string().optional()
});

/**
 * Enhanced schema for validating account input
 */
export const enhancedAccountSchema = schema.insertAccountSchema.extend({
  accountCode: z.string().min(3, "Account code must be at least 3 characters long"),
  name: z.string().min(2, "Account name must be at least 2 characters long")
});

/**
 * Enhanced schema for validating journal entry input
 */
export const enhancedJournalEntrySchema = schema.insertJournalEntrySchema.extend({
  reference: z.string().min(1, "Reference is required"),
  date: z.coerce.date()
});

/**
 * Enhanced schema for validating journal entry line input
 */
export const enhancedJournalEntryLineSchema = schema.insertJournalEntryLineSchema.extend({
  // Make sure debit and credit are valid numbers or strings
  debit: z.union([z.string(), z.number()]).transform(val => val.toString()),
  credit: z.union([z.string(), z.number()]).transform(val => val.toString())
});

/**
 * Batch upload validation schema
 */
export const batchUploadSchema = z.object({
  entries: z.array(
    z.object({
      reference: z.string().min(1, "Reference is required"),
      date: z.string().min(1, "Date is required"),
      description: z.string().optional(),
      lines: z.array(
        z.object({
          accountId: z.number().int().positive(),
          description: z.string().optional(),
          debit: z.string(),
          credit: z.string()
        })
      ).min(1, "At least one journal entry line is required")
    })
  ).min(1, "At least one journal entry is required")
});

/**
 * Schema for individual Journal Entry Lines
 */
export const journalEntryLineSchema = z.object({
  accountId: z.number().int().positive({ message: "Valid Account ID required" }),
  amount: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : typeof val === 'number' ? val : undefined),
    z.number({ invalid_type_error: "Amount must be a number" }).positive({ message: "Amount must be positive" })
  ),
  type: z.enum(['debit', 'credit'], { required_error: "Line type ('debit' or 'credit') is required" }),
  // Entity code for intercompany transactions
  entityCode: z.string().min(1, { message: "Entity code is required for intercompany support" }),
  description: optionalString.nullable(),
  // Include fields moved from Account schema
  fsliBucket: optionalString.nullable(),
  internalReportingBucket: optionalString.nullable(),
  item: optionalString.nullable(),
  // Optional fields
  locationId: z.number().int().positive().optional().nullable(),
});

/**
 * Schema for Creating a Journal Entry
 */
export const createJournalEntrySchema = z.object({
  date: z.preprocess((arg) => {
    if (typeof arg === "string" || arg instanceof Date) {
      const date = new Date(arg);
      return isNaN(date.getTime()) ? undefined : date; // Handle invalid date strings
    }
    return undefined;
  }, z.date({ required_error: "Date is required", invalid_type_error: "Invalid date format" })),
  clientId: z.number().int().positive({ message: "Client ID is required" }),
  entityId: z.number().int().positive({ message: "Entity ID is required" }),
  createdBy: z.number().int().positive({ message: "Creator ID is required" }),
  referenceNumber: optionalString.nullable(),
  description: z.string().min(1, "Description is required").max(255, "Description cannot exceed 255 characters"),
  journalType: z.enum(['JE', 'AJ', 'SJ', 'CL']).default('JE'),
  locationId: z.number().int().positive().optional().nullable(),
  lines: z.array(journalEntryLineSchema).min(1, "Journal Entry must have at least one line"),
})
// First refinement: Check overall balance (debits = credits)
.refine(data => {
  // Additional cross-field validation for balance
  let totalDebits = 0;
  let totalCredits = 0;
  
  // Ensure lines is treated as an array
  const lines = Array.isArray(data.lines) ? data.lines : [];
  
  lines.forEach((line: any) => {
    const amount = line?.amount || 0;
    if (line?.type === 'debit') totalDebits += amount;
    if (line?.type === 'credit') totalCredits += amount;
  });
  
  const tolerance = 0.0001; // Adjust as needed
  return Math.abs(totalDebits - totalCredits) < tolerance;
}, {
  message: "Overall debits must equal credits",
  path: ["lines"],
})
// Second refinement: Check balance within each entity
.refine(data => {
  // Group lines by entity code
  const entities: Record<string, { debits: number, credits: number }> = {};
  
  // Ensure lines is treated as an array
  const lines = Array.isArray(data.lines) ? data.lines : [];
  
  // Calculate totals per entity
  lines.forEach((line: any) => {
    const entityCode = line?.entityCode || '';
    const amount = line?.amount || 0;
    
    if (!entities[entityCode]) {
      entities[entityCode] = { debits: 0, credits: 0 };
    }
    
    if (line?.type === 'debit') {
      entities[entityCode].debits += amount;
    } else if (line?.type === 'credit') {
      entities[entityCode].credits += amount;
    }
  });
  
  // Check if each entity is balanced
  const tolerance = 0.0001;
  const unbalancedEntities = Object.entries(entities)
    .filter(([, totals]) => Math.abs(totals.debits - totals.credits) >= tolerance)
    .map(([entityCode]) => entityCode);
  
  return unbalancedEntities.length === 0;
}, {
  message: "Each entity's debits must equal credits for intercompany transactions",
  path: ["lines"],
});

/**
 * Schema for Updating a Journal Entry
 */
export const updateJournalEntrySchema = z.object({
  date: z.preprocess((arg) => {
    if (typeof arg === "string" || arg instanceof Date) {
      const date = new Date(arg);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  }, z.date({ invalid_type_error: "Invalid date format" }).optional()),
  clientId: z.number().int().positive().optional(),
  entityId: z.number().int().positive().optional().nullable(),
  createdBy: z.number().int().positive().optional(),
  referenceNumber: optionalString.nullable(),
  description: z.string().max(255, "Description cannot exceed 255 characters").optional().nullable(),
  journalType: z.enum(['JE', 'AJ', 'SJ', 'CL']).optional(),
  locationId: z.number().int().positive().optional().nullable(),
  lines: z.array(journalEntryLineSchema).min(1, "Journal Entry update must include at least one line"),
})
// First refinement: Check overall balance (debits = credits)
.refine(data => {
  // Also validate balance for updates
  let totalDebits = 0;
  let totalCredits = 0;
  
  // Ensure lines is treated as an array
  const lines = Array.isArray(data.lines) ? data.lines : [];
  
  lines.forEach((line: any) => {
    const amount = line?.amount || 0;
    if (line?.type === 'debit') totalDebits += amount;
    if (line?.type === 'credit') totalCredits += amount;
  });
  
  const tolerance = 0.0001;
  return Math.abs(totalDebits - totalCredits) < tolerance;
}, {
  message: "Overall debits must equal credits in update",
  path: ["lines"],
})
// Second refinement: Check balance within each entity
.refine(data => {
  // Group lines by entity code
  const entities: Record<string, { debits: number, credits: number }> = {};
  
  // Ensure lines is treated as an array
  const lines = Array.isArray(data.lines) ? data.lines : [];
  
  // Calculate totals per entity
  lines.forEach((line: any) => {
    const entityCode = line?.entityCode || '';
    const amount = line?.amount || 0;
    
    if (!entities[entityCode]) {
      entities[entityCode] = { debits: 0, credits: 0 };
    }
    
    if (line?.type === 'debit') {
      entities[entityCode].debits += amount;
    } else if (line?.type === 'credit') {
      entities[entityCode].credits += amount;
    }
  });
  
  // Check if each entity is balanced
  const tolerance = 0.0001;
  const unbalancedEntities = Object.entries(entities)
    .filter(([, totals]) => Math.abs(totals.debits - totals.credits) >= tolerance)
    .map(([entityCode]) => entityCode);
  
  return unbalancedEntities.length === 0;
}, {
  message: "Each entity's debits must equal credits for intercompany transactions",
  path: ["lines"],
});

// This section was removed as it was part of an unused schema

/**
 * Enhanced schema for validating fixed asset input
 */
export const enhancedFixedAssetSchema = schema.insertFixedAssetSchema.extend({
  name: z.string().min(2, "Asset name must be at least 2 characters long"),
  acquisitionDate: z.coerce.date(),
  acquisitionCost: z.union([z.string(), z.number()]).transform(val => val.toString()),
  usefulLife: z.number().int().positive("Useful life must be a positive integer")
});

/**
 * Schema for batch journal entry uploads
 */
export const singleJournalEntrySchema = z.object({
  date: z.preprocess((arg) => {
    if (typeof arg === "string" || arg instanceof Date) {
      const date = new Date(arg);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  }, z.date({ required_error: "Date is required", invalid_type_error: "Invalid date format" })),
  description: z.string().min(1, "Description is required").max(255, "Description cannot exceed 255 characters"),
  referenceNumber: optionalString.nullable(),
  journalType: z.enum(['JE', 'AJ', 'SJ', 'CL']).default('JE'),
  entityId: z.number().int().positive({ message: "Entity ID is required" }),
  locationId: z.number().int().positive().optional().nullable(),
  lines: z.array(journalEntryLineSchema).min(1, "Journal Entry must have at least one line"),
})
// First refinement: Check overall balance (debits = credits)
.refine(data => {
  // Additional cross-field validation for balance
  let totalDebits = 0;
  let totalCredits = 0;
  
  // Ensure lines is treated as an array
  const lines = Array.isArray(data.lines) ? data.lines : [];
  
  lines.forEach((line: any) => {
    const amount = line?.amount || 0;
    if (line?.type === 'debit') totalDebits += amount;
    if (line?.type === 'credit') totalCredits += amount;
  });
  
  const tolerance = 0.0001; // Adjust as needed
  return Math.abs(totalDebits - totalCredits) < tolerance;
}, {
  message: "Overall debits must equal credits",
  path: ["lines"],
})
// Second refinement: Check balance within each entity
.refine(data => {
  // Group lines by entity code
  const entities: Record<string, { debits: number, credits: number }> = {};
  
  // Ensure lines is treated as an array
  const lines = Array.isArray(data.lines) ? data.lines : [];
  
  // Calculate totals per entity
  lines.forEach((line: any) => {
    const entityCode = line?.entityCode || '';
    const amount = line?.amount || 0;
    
    if (!entities[entityCode]) {
      entities[entityCode] = { debits: 0, credits: 0 };
    }
    
    if (line?.type === 'debit') {
      entities[entityCode].debits += amount;
    } else if (line?.type === 'credit') {
      entities[entityCode].credits += amount;
    }
  });
  
  // Check if each entity is balanced
  const tolerance = 0.0001;
  const unbalancedEntities = Object.entries(entities)
    .filter(([, totals]) => Math.abs(totals.debits - totals.credits) >= tolerance)
    .map(([entityCode]) => entityCode);
  
  return unbalancedEntities.length === 0;
}, {
  message: "Each entity's debits must equal credits for intercompany transactions",
  path: ["lines"],
});

export const batchJournalEntryImportSchema = z.array(singleJournalEntrySchema)
  .min(1, "At least one journal entry is required");

/**
 * Format Zod error into a user-friendly format
 */
export function formatZodError(error: z.ZodError) {
  return error.errors.reduce((acc, curr) => {
    const path = curr.path.join('.');
    acc[path] = curr.message;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Schema for listing journal entries with filters
 */
export const listJournalEntriesFiltersSchema = z.object({
  clientId: z.preprocess(
    (val) => val === undefined ? undefined : (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().positive().optional()
  ),
  entityId: z.preprocess(
    (val) => val === undefined ? undefined : (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().positive().optional()
  ),
  startDate: z.preprocess((arg) => {
    if (arg === undefined) return undefined;
    if (typeof arg === "string" || arg instanceof Date) {
      const date = new Date(arg);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  }, z.date().optional()),
  endDate: z.preprocess((arg) => {
    if (arg === undefined) return undefined;
    if (typeof arg === "string" || arg instanceof Date) {
      const date = new Date(arg);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  }, z.date().optional()),
  status: z.enum(['draft', 'pending_approval', 'approved', 'posted', 'rejected', 'voided']).optional(),
  journalType: z.enum(['JE', 'AJ', 'SJ', 'CL']).optional(),
  referenceNumber: optionalString.nullable(),
  limit: z.preprocess(
    (val) => val === undefined ? 25 : (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(1).max(100).optional().default(25)
  ),
  offset: z.preprocess(
    (val) => val === undefined ? 0 : (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(0).optional().default(0)
  ),
  sortBy: z.enum(['date', 'referenceNumber', 'description', 'amount']).optional().default('date'),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc')
});

// Type for the filters
export type ListJournalEntriesFilters = z.infer<typeof listJournalEntriesFiltersSchema>;

/**
 * Validate request data against a schema
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: ReturnType<typeof formatZodError> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: formatZodError(result.error) };
  }
}