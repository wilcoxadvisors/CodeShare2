import { z } from 'zod';
import * as schema from './schema';

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
  code: z.string().min(3, "Account code must be at least 3 characters long"),
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
 * Schema for journal entry with lines
 */
export const journalEntryWithLinesSchema = enhancedJournalEntrySchema.extend({
  lines: z.array(enhancedJournalEntryLineSchema)
});

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