// In server/storage/dimensionStorage.ts

import { db } from "../db";
import { dimensions, dimensionValues, clients, txDimensionLink } from "../../shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { ApiError } from "../errorHandling";

// Interface for creating a new Dimension
interface CreateDimensionInput {
  clientId: number;
  code: string;
  name: string;
  description?: string;
}

// Interface for creating a new Dimension Value
interface CreateDimensionValueInput {
  dimensionId: number;
  code: string;
  name: string;
  description?: string;
}

// Interface for bulk upsert processed row
interface BulkUpsertRow {
  rowIndex: number;
  dimensionId: number;
  dimensionCode: string;
  valueCode: string;
  valueName: string;
  valueDescription: string;
  isActive: boolean;
  existingValue?: any;
  isUpdate: boolean;
}

export class DimensionStorage {
  /**
   * Get all dimensions for a specific client.
   * @param clientId - The ID of the client.
   * @returns A promise that resolves to an array of dimensions.
   */
  async getDimensionsByClient(clientId: number) {
    try {
      console.log(`[Storage] Attempting to get dimensions for clientId: ${clientId}`);
      
      const results = await db.query.dimensions.findMany({
        where: eq(dimensions.clientId, clientId),
        orderBy: [desc(dimensions.name)],
        with: {
          values: {
            orderBy: [desc(dimensionValues.name)],
          },
        },
      });

      console.log(`[Storage] Successfully fetched ${results.length} dimensions for clientId: ${clientId}`);
      return results;

    } catch (error) {
      // THIS IS THE CRITICAL LOGGING THAT WAS MISSED
      console.error(`[Storage] FATAL ERROR in getDimensionsByClient for clientId: ${clientId}`);
      console.error(error); // Log the full, raw error object
      throw new ApiError(500, "Failed to retrieve dimensions from storage due to a server error.");
    }
  }

  /**
   * Get a single dimension by ID with its values.
   * @param dimensionId - The ID of the dimension.
   * @returns A promise that resolves to the dimension or null if not found.
   */
  async getDimensionById(dimensionId: number) {
    try {
      console.log(`[Storage] Attempting to get dimension by ID: ${dimensionId}`);
      
      const result = await db.query.dimensions.findFirst({
        where: eq(dimensions.id, dimensionId),
        with: {
          values: {
            orderBy: [desc(dimensionValues.name)],
          },
        },
      });

      console.log(`[Storage] ${result ? 'Found' : 'Did not find'} dimension with ID: ${dimensionId}`);
      return result || null;

    } catch (error) {
      console.error(`[Storage] Error getting dimension by ID ${dimensionId}:`, error);
      throw new ApiError(500, "Failed to retrieve dimension from storage due to a server error.");
    }
  }

  /**
   * Create a new dimension for a client.
   * @param data - The data for the new dimension.
   * @returns The newly created dimension.
   */
  async createDimension(data: CreateDimensionInput) {
    try {
      const [newDimension] = await db.insert(dimensions).values(data).returning();
      return newDimension;
    } catch (error: any) {
      // Handle potential unique constraint errors
      if (error.message?.includes('dimension_code_client_unique')) {
          throw new ApiError(409, `A dimension with code '${data.code}' already exists for this client.`);
      }
      console.error("Error creating dimension:", error);
      throw new ApiError(500, "Failed to create dimension.");
    }
  }

  /**
   * Create a new value for a specific dimension.
   * @param data - The data for the new dimension value.
   * @returns The newly created dimension value.
   */
  async createDimensionValue(data: CreateDimensionValueInput) {
    try {
      const [newValue] = await db.insert(dimensionValues).values(data).returning();
      return newValue;
    } catch (error: any) {
        // Handle potential unique constraint errors
        if (error.message?.includes('dimension_value_code_unique')) {
            throw new ApiError(409, `A value with code '${data.code}' already exists for this dimension.`);
        }
      console.error("Error creating dimension value:", error);
      throw new ApiError(500, "Failed to create dimension value.");
    }
  }

  /**
   * Update an existing dimension.
   * @param id - The ID of the dimension to update.
   * @param data - The data to update.
   * @returns The updated dimension.
   */
  async updateDimension(id: number, data: Partial<CreateDimensionInput>) {
    try {
        const [updatedDimension] = await db.update(dimensions)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(dimensions.id, id))
            .returning();
        if (!updatedDimension) {
            throw new ApiError(404, "Dimension not found.");
        }
        return updatedDimension;
    } catch (error) {
        console.error("Error updating dimension:", error);
        throw new ApiError(500, "Failed to update dimension.");
    }
  }

  /**
   * Delete a dimension and all its associated values.
   * @param id - The ID of the dimension to delete.
   */
  async deleteDimension(id: number) {
    try {
        // Delete the dimension (associated values will be deleted due to CASCADE)
        const [deletedDimension] = await db.delete(dimensions)
            .where(eq(dimensions.id, id))
            .returning();
        if (!deletedDimension) {
            throw new ApiError(404, "Dimension not found.");
        }
        return deletedDimension;
    } catch (error) {
        console.error("Error deleting dimension:", error);
        throw new ApiError(500, "Failed to delete dimension.");
    }
  }

  /**
   * Update an existing dimension value.
   * @param id - The ID of the dimension value to update.
   * @param data - The data to update.
   * @returns The updated dimension value.
   */
  async updateDimensionValue(id: number, data: Partial<Omit<CreateDimensionValueInput, 'dimensionId'>>) {
    try {
        const [updatedValue] = await db.update(dimensionValues)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(dimensionValues.id, id))
            .returning();
        if (!updatedValue) {
            throw new ApiError(404, "Dimension value not found.");
        }
        return updatedValue;
    } catch (error) {
        console.error("Error updating dimension value:", error);
        throw new ApiError(500, "Failed to update dimension value.");
    }
  }

  /**
   * Delete a dimension value.
   * @param id - The ID of the dimension value to delete.
   */
  async deleteDimensionValue(id: number) {
    try {
        // First, check if this dimension value is used in any transactions
        const txLinks = await db.select()
            .from(txDimensionLink)
            .where(eq(txDimensionLink.dimensionValueId, id))
            .limit(1);

        if (txLinks.length > 0) {
            throw new ApiError(409, "This value cannot be deleted because it has been used in transactions. Please make it inactive instead.");
        }

        // If no transaction links found, proceed with deletion
        const [deletedValue] = await db.delete(dimensionValues)
            .where(eq(dimensionValues.id, id))
            .returning();
        
        if (!deletedValue) {
            throw new ApiError(404, "Dimension value not found.");
        }
        
        return deletedValue;
    } catch (error) {
        console.error("Error deleting dimension value:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, "Failed to delete dimension value.");
    }
  }

  /**
   * Create multiple dimension values in a single transaction.
   * @param dimensionId - The ID of the dimension.
   * @param values - Array of values to create.
   * @returns Object containing created count and any skipped items.
   */
  async createManyDimensionValues(dimensionId: number, values: { code: string; name: string; description?: string }[]) {
    try {
      // First, verify the dimension exists
      const dimension = await db.select()
        .from(dimensions)
        .where(eq(dimensions.id, dimensionId))
        .limit(1);
      
      if (dimension.length === 0) {
        throw new ApiError(404, "Dimension not found.");
      }

      // Get existing codes for this dimension to check for duplicates
      const existingValues = await db.select({ code: dimensionValues.code })
        .from(dimensionValues)
        .where(eq(dimensionValues.dimensionId, dimensionId));
      
      const existingCodes = new Set(existingValues.map(v => v.code));

      // Filter out values that would create duplicates
      const valuesToCreate = values.filter(value => !existingCodes.has(value.code));
      const skippedCount = values.length - valuesToCreate.length;

      if (valuesToCreate.length === 0) {
        return {
          success: true,
          message: "No new values to create - all codes already exist.",
          createdCount: 0,
          skippedCount: skippedCount
        };
      }

      // Use a transaction to ensure all or nothing
      const result = await db.transaction(async (tx) => {
        const insertData = valuesToCreate.map(value => ({
          dimensionId,
          code: value.code,
          name: value.name,
          description: value.description || null
        }));

        const createdValues = await tx.insert(dimensionValues)
          .values(insertData)
          .returning();

        return createdValues;
      });

      return {
        success: true,
        message: "Successfully imported dimension values.",
        createdCount: result.length,
        skippedCount: skippedCount
      };

    } catch (error: any) {
      console.error("Error creating multiple dimension values:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Failed to create dimension values in batch.");
    }
  }

  /**
   * Bulk upsert dimension values from master upload
   * @param processedRows - Array of processed row data from CSV
   * @returns Summary of operations performed
   */
  async bulkUpsertDimensionValues(processedRows: BulkUpsertRow[]) {
    try {
      console.log(`[Storage] Starting bulk upsert for ${processedRows.length} rows`);

      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      // Use a transaction to ensure data integrity
      await db.transaction(async (tx) => {
        for (const row of processedRows) {
          try {
            if (row.isUpdate) {
              // Update existing value
              const updateData = {
                name: row.valueName,
                description: row.valueDescription || null,
                isActive: row.isActive
              };

              await tx.update(dimensionValues)
                .set(updateData)
                .where(eq(dimensionValues.id, row.existingValue.id));

              updatedCount++;
              console.log(`[Storage] Updated value: ${row.dimensionCode}|${row.valueCode}`);
            } else {
              // Create new value
              const insertData = {
                dimensionId: row.dimensionId,
                code: row.valueCode,
                name: row.valueName,
                description: row.valueDescription || null,
                isActive: row.isActive
              };

              await tx.insert(dimensionValues).values(insertData);

              createdCount++;
              console.log(`[Storage] Created value: ${row.dimensionCode}|${row.valueCode}`);
            }
          } catch (rowError: any) {
            console.error(`[Storage] Error processing row ${row.rowIndex}:`, rowError);
            errors.push(`Row ${row.rowIndex}: ${rowError.message}`);
            skippedCount++;
          }
        }
      });

      const summary = {
        totalProcessed: processedRows.length,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errors
      };

      console.log(`[Storage] Bulk upsert completed:`, summary);
      return summary;

    } catch (error: any) {
      console.error("Error in bulk upsert dimension values:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Failed to perform bulk upsert of dimension values.");
    }
  }
}

export const dimensionStorage = new DimensionStorage();