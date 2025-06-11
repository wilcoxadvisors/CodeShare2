// In server/storage/dimensionStorage.ts

import { db } from "../db";
import { dimensions, dimensionValues, clients } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
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
}

export const dimensionStorage = new DimensionStorage();