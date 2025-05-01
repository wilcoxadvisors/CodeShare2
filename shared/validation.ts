import { z } from 'zod';
import * as schema from './schema';
import { isValid, format } from 'date-fns';

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
});

/**
 * Schema for Creating a Journal Entry
 */
export const createJournalEntrySchema = z.object({
  // Accept only YYYY-MM-DD strings to avoid timezone issues
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format" })
    .refine((val) => {
      // Additional date validation to ensure it's a valid date (without creating Date objects)
      const [year, month, day] = val.split('-').map(Number);
      // Simple validation for days in month and leap years
      const daysInMonth = [0, 31, 28 + (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 1 : 0), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month];
    }, { message: "Invalid date" }),
  clientId: z.number().int().positive({ message: "Client ID is required" }),
  entityId: z.number().int().positive({ message: "Entity ID is required" }),
  createdBy: z.number().int().positive({ message: "Creator ID is required" }),
  referenceNumber: optionalString.nullable(),
  description: z.string().min(1, "Description is required").max(255, "Description cannot exceed 255 characters"),
  journalType: z.enum(['JE', 'AJ', 'SJ', 'CL']).default('JE'),
  status: z.enum(['draft', 'posted', 'pending_approval', 'approved', 'rejected', 'void']).optional(),
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
  // Accept only YYYY-MM-DD strings to avoid timezone issues
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format" }).optional(),
  clientId: z.number().int().positive().optional(),
  entityId: z.number().int().positive().optional().nullable(),
  createdBy: z.number().int().positive().optional(),
  referenceNumber: optionalString.nullable(),
  description: z.string().max(255, "Description cannot exceed 255 characters").optional().nullable(),
  journalType: z.enum(['JE', 'AJ', 'SJ', 'CL']).optional(),
  status: z.enum(['draft', 'posted', 'pending_approval', 'approved', 'rejected', 'void']).optional(),
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
  // Accept only YYYY-MM-DD strings to avoid timezone issues
  date: z.preprocess((arg) => {
    // Handle only Date objects, let string validation happen directly
    if (arg instanceof Date) {
      return format(arg, 'yyyy-MM-dd');
    }
    return arg;
  }, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format" })
     .refine((val) => {
       // Additional date validation to ensure it's a valid date
       const [year, month, day] = val.split('-').map(Number);
       const date = new Date(year, month - 1, day);
       return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
     }, { message: "Invalid date" })),
  description: z.string().min(1, "Description is required").max(255, "Description cannot exceed 255 characters"),
  referenceNumber: optionalString.nullable(),
  journalType: z.enum(['JE', 'AJ', 'SJ', 'CL']).default('JE'),
  entityId: z.number().int().positive({ message: "Entity ID is required" }),
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
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Start date must be in YYYY-MM-DD format" }).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "End date must be in YYYY-MM-DD format" }).optional(),
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