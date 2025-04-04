/**
 * Asset Storage Module
 * 
 * This module contains the storage interface and implementation for fixed asset operations.
 */
import { db } from "../db";
import { 
  fixedAssets, FixedAsset, InsertFixedAsset
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { ApiError } from "../errorHandling";

// Helper function to handle database errors consistently
function handleDbError(error: unknown, operation: string): Error {
  console.error(`Database error during ${operation}:`, error);
  if (error instanceof ApiError) {
    return error;
  }
  return new Error(`An error occurred during ${operation}: ${error instanceof Error ? error.message : String(error)}`);
}

/**
 * Interface for fixed asset storage operations
 */
export interface IAssetStorage {
  getFixedAsset(id: number): Promise<FixedAsset | undefined>;
  getFixedAssets(entityId: number): Promise<FixedAsset[]>;
  createFixedAsset(asset: InsertFixedAsset): Promise<FixedAsset>;
  updateFixedAsset(id: number, asset: Partial<FixedAsset>): Promise<FixedAsset | undefined>;
  deleteFixedAsset(id: number): Promise<void>;
}

/**
 * Implementation of fixed asset storage operations using Drizzle ORM
 */
export class AssetStorage implements IAssetStorage {
  /**
   * Get a fixed asset by ID
   */
  async getFixedAsset(id: number): Promise<FixedAsset | undefined> {
    try {
      const [asset] = await db
        .select()
        .from(fixedAssets)
        .where(eq(fixedAssets.id, id))
        .limit(1);
      
      return asset;
    } catch (error) {
      throw handleDbError(error, `getting fixed asset ${id}`);
    }
  }
  
  /**
   * Get all fixed assets for an entity
   */
  async getFixedAssets(entityId: number): Promise<FixedAsset[]> {
    try {
      return await db
        .select()
        .from(fixedAssets)
        .where(eq(fixedAssets.entityId, entityId))
        .orderBy(desc(fixedAssets.acquiredDate));
    } catch (error) {
      throw handleDbError(error, `getting fixed assets for entity ${entityId}`);
    }
  }
  
  /**
   * Create a new fixed asset
   */
  async createFixedAsset(asset: InsertFixedAsset): Promise<FixedAsset> {
    try {
      const [newAsset] = await db
        .insert(fixedAssets)
        .values({
          ...asset,
          createdAt: new Date()
        })
        .returning();
      
      return newAsset;
    } catch (error) {
      throw handleDbError(error, "creating fixed asset");
    }
  }
  
  /**
   * Update a fixed asset
   */
  async updateFixedAsset(id: number, asset: Partial<FixedAsset>): Promise<FixedAsset | undefined> {
    try {
      const [updated] = await db
        .update(fixedAssets)
        .set({
          ...asset,
          updatedAt: new Date()
        })
        .where(eq(fixedAssets.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      throw handleDbError(error, `updating fixed asset ${id}`);
    }
  }
  
  /**
   * Delete a fixed asset
   */
  async deleteFixedAsset(id: number): Promise<void> {
    try {
      await db
        .delete(fixedAssets)
        .where(eq(fixedAssets.id, id));
    } catch (error) {
      throw handleDbError(error, `deleting fixed asset ${id}`);
    }
  }
}

// Export singleton instance
export const assetStorage = new AssetStorage();