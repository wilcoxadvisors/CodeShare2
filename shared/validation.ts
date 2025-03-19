import { z } from 'zod';
import { 
  AccountType, 
  JournalEntryStatus,
  insertUserSchema,
  insertEntitySchema,
  insertAccountSchema,
  insertJournalEntrySchema,
  insertJournalEntryLineSchema,
  insertFixedAssetSchema
} from './schema';

// Enhanced User validation schema
export const enhancedUserSchema = insertUserSchema.extend({
  username: z.string().min(3, "Username must be at least 3 characters").max(50, "Username cannot exceed 50 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters"),
});

// Enhanced Entity validation schema
export const enhancedEntitySchema = insertEntitySchema.extend({
  name: z.string().min(2, "Entity name must be at least 2 characters").max(100, "Entity name cannot exceed 100 characters"),
  code: z.string().min(2, "Entity code must be at least 2 characters").max(20, "Entity code cannot exceed 20 characters")
    .regex(/^[A-Za-z0-9-_]+$/, "Entity code can only contain letters, numbers, hyphens, and underscores"),
  currency: z.string().length(3, "Currency code must be 3 characters (ISO format)"),
  fiscalYearStart: z.string().regex(/^\d{2}-\d{2}$/, "Fiscal year start must be in MM-DD format"),
  fiscalYearEnd: z.string().regex(/^\d{2}-\d{2}$/, "Fiscal year end must be in MM-DD format"),
  email: z.string().email("Please enter a valid email address").optional().nullable(),
  website: z.string().url("Please enter a valid URL").optional().nullable(),
});

// Enhanced Account validation schema
export const enhancedAccountSchema = insertAccountSchema.extend({
  code: z.string().min(2, "Account code must be at least 2 characters").max(20, "Account code cannot exceed 20 characters")
    .regex(/^[A-Za-z0-9-_]+$/, "Account code can only contain letters, numbers, hyphens, and underscores"),
  name: z.string().min(2, "Account name must be at least 2 characters").max(100, "Account name cannot exceed 100 characters"),
  type: z.enum([
    AccountType.ASSET,
    AccountType.LIABILITY,
    AccountType.EQUITY,
    AccountType.REVENUE,
    AccountType.EXPENSE
  ], {
    errorMap: () => ({ message: "Invalid account type" })
  }),
});

// Enhanced Journal Entry validation schema
export const enhancedJournalEntrySchema = insertJournalEntrySchema.extend({
  reference: z.string().min(3, "Reference must be at least 3 characters").max(50, "Reference cannot exceed 50 characters"),
  date: z.string().or(z.date()),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional().nullable(),
  status: z.enum([
    JournalEntryStatus.DRAFT,
    JournalEntryStatus.PENDING_APPROVAL,
    JournalEntryStatus.APPROVED,
    JournalEntryStatus.POSTED,
    JournalEntryStatus.REJECTED,
    JournalEntryStatus.VOIDED
  ], {
    errorMap: () => ({ message: "Invalid journal entry status" })
  }),
});

// Enhanced Journal Entry Line validation schema
export const enhancedJournalEntryLineSchema = insertJournalEntryLineSchema.extend({
  description: z.string().max(255, "Line description cannot exceed 255 characters").optional().nullable(),
  debit: z.string().or(z.number()).refine(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return !isNaN(num) && num >= 0;
  }, {
    message: "Debit must be a non-negative number"
  }),
  credit: z.string().or(z.number()).refine(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return !isNaN(num) && num >= 0;
  }, {
    message: "Credit must be a non-negative number"
  }),
});

// Journal Entry with Lines validation schema
export const journalEntryWithLinesSchema = enhancedJournalEntrySchema.extend({
  lines: z.array(enhancedJournalEntryLineSchema.omit({ journalEntryId: true }))
    .min(2, "Journal entry must have at least 2 lines")
    .refine(lines => {
      // Check if there's at least one debit and one credit line
      const hasDebit = lines.some(line => 
        parseFloat(line.debit as string) > 0 || (typeof line.debit === 'number' && line.debit > 0)
      );
      const hasCredit = lines.some(line => 
        parseFloat(line.credit as string) > 0 || (typeof line.credit === 'number' && line.credit > 0)
      );
      return hasDebit && hasCredit;
    }, {
      message: "Journal entry must have at least one debit and one credit line"
    })
    .refine(lines => {
      // Check if debits equal credits
      let totalDebit = 0;
      let totalCredit = 0;
      
      lines.forEach(line => {
        const debit = typeof line.debit === 'string' ? parseFloat(line.debit) || 0 : line.debit || 0;
        const credit = typeof line.credit === 'string' ? parseFloat(line.credit) || 0 : line.credit || 0;
        totalDebit += debit;
        totalCredit += credit;
      });
      
      return Math.abs(totalDebit - totalCredit) < 0.001;
    }, {
      message: "Total debits must equal total credits"
    }),
});

// Enhanced Fixed Asset validation schema
export const enhancedFixedAssetSchema = insertFixedAssetSchema.extend({
  name: z.string().min(2, "Asset name must be at least 2 characters").max(100, "Asset name cannot exceed 100 characters"),
  acquisitionCost: z.string().or(z.number()).refine(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return !isNaN(num) && num > 0;
  }, {
    message: "Acquisition cost must be a positive number"
  }),
  deprecationMethod: z.enum(["straight_line", "declining_balance"], {
    errorMap: () => ({ message: "Invalid depreciation method" })
  }),
  usefulLife: z.number().int().positive("Useful life must be a positive integer"),
  salvageValue: z.string().or(z.number()).refine(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return !isNaN(num) && num >= 0;
  }, {
    message: "Salvage value must be a non-negative number"
  }),
});

// Generic validation error handler
export function formatZodError(error: z.ZodError) {
  return {
    message: "Validation failed",
    errors: error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message
    }))
  };
}

// Helper function to validate request body with proper error formatting
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: ReturnType<typeof formatZodError> } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: formatZodError(error) };
    }
    
    // If it's some other type of error, still format it consistently
    return { 
      success: false, 
      error: { 
        message: "Validation failed", 
        errors: [{ path: "", message: "An unknown validation error occurred" }] 
      } 
    };
  }
}