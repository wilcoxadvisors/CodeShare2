import { z } from 'zod';
import { AccountType, UserRole, BudgetPeriodType, ReportType, JournalType, JournalEntryStatus } from './types';

// Basic schema definitions

export const enhancedUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  role: z.enum([UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.CLIENT]).default(UserRole.CLIENT),
  phone: z.string().optional(),
  address: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  profileImage: z.string().optional(),
  bio: z.string().optional(),
  preferences: z.record(z.any()).optional(),
  lastLoginAt: z.date().optional(),
  active: z.boolean().default(true),
  resetPasswordToken: z.string().optional(),
  resetPasswordExpires: z.date().optional(),
  verificationToken: z.string().optional(),
  verified: z.boolean().default(false),
  referralSource: z.string().optional(),
});

export const enhancedEntitySchema = z.object({
  name: z.string().min(2, "Entity name must be at least 2 characters long"),
  code: z.string().min(2, "Entity code must be at least 2 characters long"),
  fiscalYearStart: z.string().min(1, "Please enter fiscal year start date"),
  fiscalYearEnd: z.string().min(1, "Please enter fiscal year end date"),
  taxId: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email("Please enter a valid email address").optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().url("Please enter a valid website URL").optional().nullable(),
  industry: z.string().min(1, "Please select an industry"),
  subIndustry: z.string().optional().nullable(),
  currency: z.string().min(1, "Please select a currency"),
  timezone: z.string().min(1, "Please select a timezone"),
  businessType: z.string().min(1, "Please select a business type"),
  publiclyTraded: z.boolean().default(false),
  stockSymbol: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  active: z.boolean().default(true),
  ownerId: z.number().optional(),
});

export const enhancedAccountSchema = z.object({
  code: z.string().min(3, "Account code must be at least 3 characters long"),
  name: z.string().min(2, "Account name must be at least 2 characters long"),
  type: z.enum([AccountType.ASSET, AccountType.LIABILITY, AccountType.EQUITY, AccountType.REVENUE, AccountType.EXPENSE]),
  entityId: z.number(),
  description: z.string().optional().nullable(),
  active: z.boolean().default(true),
  subtype: z.string().optional().nullable(),
  isSubledger: z.boolean().default(false),
  subledgerType: z.string().optional().nullable(),
  parentId: z.number().optional().nullable(),
});

export const enhancedJournalEntrySchema = z.object({
  reference: z.string().min(1, "Reference is required"),
  date: z.coerce.date(),
  description: z.string().optional().nullable(),
  status: z.enum([
    JournalEntryStatus.DRAFT,
    JournalEntryStatus.PENDING_APPROVAL,
    JournalEntryStatus.APPROVED,
    JournalEntryStatus.POSTED,
    JournalEntryStatus.REJECTED,
    JournalEntryStatus.VOIDED
  ]).default(JournalEntryStatus.DRAFT),
  entityId: z.number(),
  journalId: z.number(),
  createdBy: z.number(),
  needsReview: z.boolean().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  attachments: z.array(z.string()).optional().nullable(),
  requestedBy: z.number().optional().nullable(),
  approvedBy: z.number().optional().nullable(),
  rejectedBy: z.number().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
  postedBy: z.number().optional().nullable(),
  voidedBy: z.number().optional().nullable(),
  voidReason: z.string().optional().nullable(),
});

export const enhancedJournalEntryLineSchema = z.object({
  journalEntryId: z.number(),
  accountId: z.number(),
  // Entity code field for intercompany support
  entityCode: z.string().min(1, "Entity code is required for intercompany transactions"),
  description: z.string().optional().nullable(),
  debit: z.union([z.string(), z.number()]).transform(val => val.toString()),
  credit: z.union([z.string(), z.number()]).transform(val => val.toString()),
  lineNo: z.number().optional(),
  memo: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  dimensions: z.record(z.any()).optional().nullable(),
});

export const batchUploadSchema = z.object({
  entries: z.array(
    z.object({
      reference: z.string().min(1, "Reference is required"),
      date: z.string().min(1, "Date is required"),
      description: z.string().optional(),
      lines: z.array(
        z.object({
          accountId: z.number().int().positive(),
          // Entity code field for intercompany support
          entityCode: z.string().min(1, "Entity code is required"),
          description: z.string().optional(),
          debit: z.string(),
          credit: z.string()
        })
      ).min(1, "At least one journal entry line is required")
    })
  ).min(1, "At least one journal entry is required")
});

// The journalEntryWithLinesSchema was removed as it was unused

export const enhancedFixedAssetSchema = z.object({
  name: z.string().min(2, "Asset name must be at least 2 characters long"),
  entityId: z.number(),
  accountId: z.number(),
  acquisitionDate: z.coerce.date(),
  acquisitionCost: z.union([z.string(), z.number()]).transform(val => val.toString()),
  usefulLife: z.number().int().positive("Useful life must be a positive integer"),
  residualValue: z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
  depreciationMethod: z.string().optional().nullable(),
  status: z.string().default('active'),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  disposalDate: z.coerce.date().optional().nullable(),
  disposalAmount: z.union([z.string(), z.number()]).transform(val => val.toString()).optional().nullable(),
});

export const enhancedConsolidationGroupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional().nullable(),
  currency: z.string().min(1, "Please select a currency"),
  periodType: z.string().min(1, "Please select a period type"),
  startDate: z.string().min(1, "Please select a start date"),
  endDate: z.string().min(1, "Please select an end date"),
  isActive: z.boolean().default(true),
  ownerId: z.number().optional(),
  createdBy: z.number().optional(),
  entityIds: z.array(z.number()).min(1, "At least one entity must be selected"),
  reportTypes: z.array(z.string()).optional(),
  rules: z.record(z.any()).optional(),
});

export function formatZodError(error: z.ZodError) {
  return error.errors.reduce((acc, curr) => {
    const path = curr.path.join('.');
    acc[path] = curr.message;
    return acc;
  }, {} as Record<string, string>);
}

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: ReturnType<typeof formatZodError> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: formatZodError(result.error) };
  }
}

/**
 * Validate form data against a schema
 * Returns an object with success status and either the validated data or an error
 */
export function validateForm<T>(data: unknown, schema: z.ZodSchema<T>): { valid: boolean; data?: T; errors?: Record<string, string> } {
  try {
    const validated = schema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, errors: formatZodError(error) };
    }
    // Handle other types of errors
    return { valid: false, errors: { _form: 'Validation failed' } };
  }
}