import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { homepageContent, InsertHomepageContent, HomepageContent } from "../../shared/schema";

/**
 * Interface for content storage operations
 */
export interface IContentStorage {
  createHomepageContent(data: InsertHomepageContent): Promise<HomepageContent>;
  getHomepageContentById(id: number): Promise<HomepageContent | null>;
  getHomepageContentBySection(section: string): Promise<HomepageContent[]>;
  updateHomepageContent(id: number, data: Partial<InsertHomepageContent>): Promise<HomepageContent | null>;
  deleteHomepageContent(id: number): Promise<boolean>;
  listHomepageContents(): Promise<HomepageContent[]>;
}

/**
 * ContentStorage class - Handles all database operations related to homepage content
 */
export class ContentStorage implements IContentStorage {
  /**
   * Creates a new homepage content section
   * @param data Homepage content data to be created
   * @returns The newly created homepage content
   */
  async createHomepageContent(data: InsertHomepageContent): Promise<HomepageContent> {
    try {
      const [newContent] = await db.insert(homepageContent).values({
        ...data,
        updatedAt: new Date(),
      }).returning();
      
      return newContent;
    } catch (error) {
      console.error("Error creating homepage content:", error);
      throw new Error(`Failed to create homepage content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves homepage content by ID
   * @param id Homepage content ID
   * @returns The homepage content or null if not found
   */
  async getHomepageContentById(id: number): Promise<HomepageContent | null> {
    try {
      const content = await db.query.homepageContent.findFirst({
        where: eq(homepageContent.id, id)
      });
      
      return content || null;
    } catch (error) {
      console.error("Error getting homepage content by ID:", error);
      throw new Error(`Failed to get homepage content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves homepage content by section name
   * @param section Section name
   * @returns The homepage content for the specified section
   */
  async getHomepageContentBySection(section: string): Promise<HomepageContent[]> {
    try {
      const contents = await db.select().from(homepageContent)
        .where(eq(homepageContent.section, section))
        .orderBy(homepageContent.displayOrder);
      
      return contents;
    } catch (error) {
      console.error("Error getting homepage content by section:", error);
      throw new Error(`Failed to get homepage content by section: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Updates homepage content
   * @param id Homepage content ID
   * @param data Homepage content data to update
   * @returns The updated homepage content
   */
  async updateHomepageContent(id: number, data: Partial<InsertHomepageContent>): Promise<HomepageContent | null> {
    try {
      const [updatedContent] = await db.update(homepageContent)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(homepageContent.id, id))
        .returning();
      
      return updatedContent || null;
    } catch (error) {
      console.error("Error updating homepage content:", error);
      throw new Error(`Failed to update homepage content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Deletes homepage content
   * @param id Homepage content ID
   * @returns True if deletion was successful
   */
  async deleteHomepageContent(id: number): Promise<boolean> {
    try {
      const result = await db.delete(homepageContent)
        .where(eq(homepageContent.id, id));
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting homepage content:", error);
      throw new Error(`Failed to delete homepage content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Lists all homepage content, organized by section
   * @returns All homepage content entries
   */
  async listHomepageContents(): Promise<HomepageContent[]> {
    try {
      const allContents = await db.select().from(homepageContent)
        .orderBy(homepageContent.section, homepageContent.displayOrder);
      
      return allContents;
    } catch (error) {
      console.error("Error listing homepage contents:", error);
      throw new Error(`Failed to list homepage contents: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Export a singleton instance of ContentStorage
export const contentStorage = new ContentStorage();