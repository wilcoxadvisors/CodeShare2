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
 * Schema for dimension tags
 */
export const dimensionTagSchema = z.object({
  dimensionId: z.number().int().positive({ message: "Valid Dimension ID required" }),
  dimensionValueId: z.number().int().positive({ message: "Valid Dimension Value ID required" }),
  dimensionName: z.string().optional(),
  dimensionValueName: z.string().optional(),
});

/**
 * Schema for individual Journal Entry Lines
 */
export const journalEntryLineSchema = z.object({
  accountId: z.union([z.string(), z.number()]),
  type: z.enum(['debit', 'credit']),
  amount: z.union([z.string(), z.number()]),
  description: z.string().optional().nullable(),
  entityCode: z.string().optional().nullable(),
  
  // ADD THE FOLLOWING DEFINITION FOR TAGS:
  tags: z.array(z.object({
    dimensionId: z.number(),
    dimensionValueId: z.number(),
    dimensionName: z.string().optional(),
    dimensionValueName: z.string().optional(),
  })).optional(),

  // Include fields moved from Account schema
  fsliBucket: optionalString.nullable(),
  internalReportingBucket: optionalString.nullable(),
  item: optionalString.nullable(),
}).passthrough(); // Use passthrough to avoid stripping other potential fields

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
  
  // Automatic Accrual Reversal fields
  isAccrual: z.boolean().optional(),
  reversalDate: z.string().optional().nullable().transform(val => {
    if (!val || val === '') return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      throw new Error("Reversal date must be in YYYY-MM-DD format");
    }
    return val;
  }),
  lines: z.array(
    z.object({
      accountId: z.union([z.string(), z.number()]),
      type: z.enum(['debit', 'credit']),
      amount: z.union([z.string(), z.number()]),
      description: z.string().optional().nullable(),
      entityCode: z.string().optional().nullable(),

      // THIS DEFINITION FOR TAGS IS MANDATORY
      tags: z.array(z.object({
        dimensionId: z.number(),
        dimensionValueId: z.number(),
        dimensionName: z.string().optional(),
        dimensionValueName: z.string().optional(),
      })).optional()

    }).passthrough()
  ).min(1, "Journal Entry must have at least one line"),
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
})
// Third refinement: Check accrual reversal date requirement
.refine(data => {
  // If isAccrual is true, reversalDate must be present and valid
  if (data.isAccrual) {
    return !!data.reversalDate;
  }
  // Otherwise, we don't care about reversalDate
  return true;
}, {
  message: "Reversal date is required for accrual entries",
  path: ["reversalDate"],
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
  lines: z.array(journalEntryLineSchema).optional(), // Make lines optional for status-only updates
  
  // Accrual fields
  isAccrual: z.boolean().optional(),
  reversalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Reversal date must be in YYYY-MM-DD format" }).optional(),
  
  // File attachments for preservation during updates
  files: z.array(z.object({
    id: z.number().int().positive(),
    filename: z.string().optional(),
    mimeType: z.string().optional(),
    size: z.number().optional()
  })).optional(),
})
// First refinement: Check overall balance (debits = credits) only when lines are provided
.refine(data => {
  // Skip balance validation if no lines are provided (status-only update)
  if (!data.lines || !Array.isArray(data.lines) || data.lines.length === 0) {
    return true;
  }
  
  let totalDebits = 0;
  let totalCredits = 0;
  
  data.lines.forEach((line: any) => {
    const amount = parseFloat(line?.amount || 0);
    if (line?.type === 'debit') totalDebits += amount;
    if (line?.type === 'credit') totalCredits += amount;
  });
  
  const tolerance = 0.0001;
  return Math.abs(totalDebits - totalCredits) < tolerance;
}, {
  message: "Overall debits must equal credits when lines are provided",
  path: ["lines"],
})
// Second refinement: Ensure lines are provided for content updates (not status-only)
.refine(data => {
  // If updating content fields (date, description, referenceNumber) but not status, require lines
  const hasContentUpdates = data.date || data.description || data.referenceNumber;
  const hasStatusUpdate = data.status;
  const hasLines = data.lines && Array.isArray(data.lines) && data.lines.length > 0;
  
  // Allow pure status updates without lines
  if (hasStatusUpdate && !hasContentUpdates) {
    return true;
  }
  
  // Require lines for content updates
  if (hasContentUpdates && !hasLines) {
    return false;
  }
  
  return true;
}, {
  message: "Lines are required when updating journal entry content",
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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format" })
    .refine((val) => {
      // Additional date validation to ensure it's a valid date (without creating Date objects)
      const [year, month, day] = val.split('-').map(Number);
      // Simple validation for days in month and leap years
      const daysInMonth = [0, 31, 28 + (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 1 : 0), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month];
    }, { message: "Invalid date" }),
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
  // Additional filter fields for enhanced search
  accountId: z.number().int().positive().optional(),
  descriptionText: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  // Pagination and sorting fields - all made optional
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
}).partial(); // Make all fields optional to support partial filter sets

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