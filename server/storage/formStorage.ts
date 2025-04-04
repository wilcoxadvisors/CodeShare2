/**
 * Form Storage Module
 * 
 * This module contains the storage interface and implementation for form submissions,
 * including contact forms, checklist submissions, consultation requests, and blog subscriptions.
 */
import { db } from "../db";
import { 
  contactSubmissions, ContactSubmission, InsertContactSubmission,
  checklistSubmissions, ChecklistSubmission, InsertChecklistSubmission,
  consultationSubmissions, ConsultationSubmission, InsertConsultationSubmission,
  checklistFiles, ChecklistFile, InsertChecklistFile,
  blogSubscribers, BlogSubscriber, InsertBlogSubscriber,
  locations, Location, InsertLocation
} from "@shared/schema";
import { eq, and, desc, isNull, not } from "drizzle-orm";
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
 * Interface for form storage operations
 */
export interface IFormStorage {
  // Contact form operations
  createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission>;
  getContactSubmissions(): Promise<ContactSubmission[]>;
  getContactSubmission(id: number): Promise<ContactSubmission | undefined>;
  updateContactSubmission(id: number, data: Partial<ContactSubmission>): Promise<ContactSubmission | undefined>;
  
  // Checklist operations
  createChecklistSubmission(submission: InsertChecklistSubmission): Promise<ChecklistSubmission>;
  getChecklistSubmissions(): Promise<ChecklistSubmission[]>;
  getChecklistSubmission(id: number): Promise<ChecklistSubmission | undefined>;
  updateChecklistSubmission(id: number, data: Partial<ChecklistSubmission>): Promise<ChecklistSubmission | undefined>;
  
  // Checklist file operations
  createChecklistFile(file: InsertChecklistFile): Promise<ChecklistFile>;
  getChecklistFiles(): Promise<ChecklistFile[]>;
  getChecklistFile(id: number): Promise<ChecklistFile | undefined>;
  getActiveChecklistFile(): Promise<ChecklistFile | undefined>;
  updateChecklistFile(id: number, isActive: boolean): Promise<ChecklistFile | undefined>;
  deleteChecklistFile(id: number): Promise<void>;
  
  // Consultation operations
  createConsultationSubmission(submission: InsertConsultationSubmission): Promise<ConsultationSubmission>;
  getConsultationSubmissions(): Promise<ConsultationSubmission[]>;
  getConsultationSubmission(id: number): Promise<ConsultationSubmission | undefined>;
  updateConsultationSubmission(id: number, data: Partial<ConsultationSubmission>): Promise<ConsultationSubmission | undefined>;
  
  // Blog subscriber operations
  createBlogSubscriber(subscriber: InsertBlogSubscriber): Promise<BlogSubscriber>;
  getBlogSubscribers(): Promise<BlogSubscriber[]>;
  getBlogSubscriber(id: number): Promise<BlogSubscriber | undefined>;
  getBlogSubscriberByEmail(email: string): Promise<BlogSubscriber | undefined>;
  updateBlogSubscriber(id: number, data: Partial<BlogSubscriber>): Promise<BlogSubscriber | undefined>;
  unsubscribeBlogSubscriber(email: string): Promise<boolean>;
  
  // Location operations
  createLocation(location: InsertLocation): Promise<Location>;
  getLocations(): Promise<Location[]>;
  getLocation(id: number): Promise<Location | undefined>;
  updateLocation(id: number, data: Partial<Location>): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<void>;
  listLocationsByClient(clientId: number): Promise<Location[]>;
}

/**
 * Implementation of form storage operations using Drizzle ORM
 */
export class FormStorage implements IFormStorage {
  /**
   * Create a new contact form submission
   */
  async createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission> {
    try {
      const [newSubmission] = await db
        .insert(contactSubmissions)
        .values({
          ...submission,
          createdAt: new Date(),
          status: submission.status || 'new'
        })
        .returning();
      
      return newSubmission;
    } catch (error) {
      throw handleDbError(error, "creating contact submission");
    }
  }
  
  /**
   * Get all contact form submissions
   */
  async getContactSubmissions(): Promise<ContactSubmission[]> {
    try {
      return await db
        .select()
        .from(contactSubmissions)
        .orderBy(desc(contactSubmissions.createdAt));
    } catch (error) {
      throw handleDbError(error, "getting contact submissions");
    }
  }
  
  /**
   * Get a contact form submission by ID
   */
  async getContactSubmission(id: number): Promise<ContactSubmission | undefined> {
    try {
      const [submission] = await db
        .select()
        .from(contactSubmissions)
        .where(eq(contactSubmissions.id, id))
        .limit(1);
      
      return submission;
    } catch (error) {
      throw handleDbError(error, `getting contact submission ${id}`);
    }
  }
  
  /**
   * Update a contact form submission
   */
  async updateContactSubmission(id: number, data: Partial<ContactSubmission>): Promise<ContactSubmission | undefined> {
    try {
      const [updated] = await db
        .update(contactSubmissions)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(contactSubmissions.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      throw handleDbError(error, `updating contact submission ${id}`);
    }
  }
  
  /**
   * Create a new checklist submission
   */
  async createChecklistSubmission(submission: InsertChecklistSubmission): Promise<ChecklistSubmission> {
    try {
      const [newSubmission] = await db
        .insert(checklistSubmissions)
        .values({
          ...submission,
          createdAt: new Date(),
          status: submission.status || 'pending'
        })
        .returning();
      
      return newSubmission;
    } catch (error) {
      throw handleDbError(error, "creating checklist submission");
    }
  }
  
  /**
   * Get all checklist submissions
   */
  async getChecklistSubmissions(): Promise<ChecklistSubmission[]> {
    try {
      return await db
        .select()
        .from(checklistSubmissions)
        .orderBy(desc(checklistSubmissions.createdAt));
    } catch (error) {
      throw handleDbError(error, "getting checklist submissions");
    }
  }
  
  /**
   * Get a checklist submission by ID
   */
  async getChecklistSubmission(id: number): Promise<ChecklistSubmission | undefined> {
    try {
      const [submission] = await db
        .select()
        .from(checklistSubmissions)
        .where(eq(checklistSubmissions.id, id))
        .limit(1);
      
      return submission;
    } catch (error) {
      throw handleDbError(error, `getting checklist submission ${id}`);
    }
  }
  
  /**
   * Update a checklist submission
   */
  async updateChecklistSubmission(id: number, data: Partial<ChecklistSubmission>): Promise<ChecklistSubmission | undefined> {
    try {
      const [updated] = await db
        .update(checklistSubmissions)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(checklistSubmissions.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      throw handleDbError(error, `updating checklist submission ${id}`);
    }
  }
  
  /**
   * Create a new checklist file
   */
  async createChecklistFile(file: InsertChecklistFile): Promise<ChecklistFile> {
    try {
      // If this file should be active, first deactivate all other files
      if (file.isActive) {
        await db
          .update(checklistFiles)
          .set({ isActive: false })
          .where(eq(checklistFiles.isActive, true));
      }
      
      const [newFile] = await db
        .insert(checklistFiles)
        .values({
          ...file,
          createdAt: new Date()
        })
        .returning();
      
      return newFile;
    } catch (error) {
      throw handleDbError(error, "creating checklist file");
    }
  }
  
  /**
   * Get all checklist files
   */
  async getChecklistFiles(): Promise<ChecklistFile[]> {
    try {
      return await db
        .select()
        .from(checklistFiles)
        .orderBy(desc(checklistFiles.createdAt));
    } catch (error) {
      throw handleDbError(error, "getting checklist files");
    }
  }
  
  /**
   * Get a checklist file by ID
   */
  async getChecklistFile(id: number): Promise<ChecklistFile | undefined> {
    try {
      const [file] = await db
        .select()
        .from(checklistFiles)
        .where(eq(checklistFiles.id, id))
        .limit(1);
      
      return file;
    } catch (error) {
      throw handleDbError(error, `getting checklist file ${id}`);
    }
  }
  
  /**
   * Get the active checklist file
   */
  async getActiveChecklistFile(): Promise<ChecklistFile | undefined> {
    try {
      const [file] = await db
        .select()
        .from(checklistFiles)
        .where(eq(checklistFiles.isActive, true))
        .limit(1);
      
      return file;
    } catch (error) {
      throw handleDbError(error, "getting active checklist file");
    }
  }
  
  /**
   * Update a checklist file
   */
  async updateChecklistFile(id: number, isActive: boolean): Promise<ChecklistFile | undefined> {
    try {
      // If this file should be active, first deactivate all other files
      if (isActive) {
        await db
          .update(checklistFiles)
          .set({ isActive: false })
          .where(not(eq(checklistFiles.id, id)));
      }
      
      const [updated] = await db
        .update(checklistFiles)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(checklistFiles.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      throw handleDbError(error, `updating checklist file ${id}`);
    }
  }
  
  /**
   * Delete a checklist file
   */
  async deleteChecklistFile(id: number): Promise<void> {
    try {
      await db
        .delete(checklistFiles)
        .where(eq(checklistFiles.id, id));
    } catch (error) {
      throw handleDbError(error, `deleting checklist file ${id}`);
    }
  }
  
  /**
   * Create a new consultation submission
   */
  async createConsultationSubmission(submission: InsertConsultationSubmission): Promise<ConsultationSubmission> {
    try {
      const [newSubmission] = await db
        .insert(consultationSubmissions)
        .values({
          ...submission,
          createdAt: new Date(),
          status: submission.status || 'new'
        })
        .returning();
      
      return newSubmission;
    } catch (error) {
      throw handleDbError(error, "creating consultation submission");
    }
  }
  
  /**
   * Get all consultation submissions
   */
  async getConsultationSubmissions(): Promise<ConsultationSubmission[]> {
    try {
      return await db
        .select()
        .from(consultationSubmissions)
        .orderBy(desc(consultationSubmissions.createdAt));
    } catch (error) {
      throw handleDbError(error, "getting consultation submissions");
    }
  }
  
  /**
   * Get a consultation submission by ID
   */
  async getConsultationSubmission(id: number): Promise<ConsultationSubmission | undefined> {
    try {
      const [submission] = await db
        .select()
        .from(consultationSubmissions)
        .where(eq(consultationSubmissions.id, id))
        .limit(1);
      
      return submission;
    } catch (error) {
      throw handleDbError(error, `getting consultation submission ${id}`);
    }
  }
  
  /**
   * Update a consultation submission
   */
  async updateConsultationSubmission(id: number, data: Partial<ConsultationSubmission>): Promise<ConsultationSubmission | undefined> {
    try {
      const [updated] = await db
        .update(consultationSubmissions)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(consultationSubmissions.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      throw handleDbError(error, `updating consultation submission ${id}`);
    }
  }
  
  /**
   * Create a new blog subscriber
   */
  async createBlogSubscriber(subscriber: InsertBlogSubscriber): Promise<BlogSubscriber> {
    try {
      // Check if email already exists
      const existing = await this.getBlogSubscriberByEmail(subscriber.email);
      
      if (existing) {
        if (!existing.isActive) {
          // Reactivate if previously unsubscribed
          const [updated] = await db
            .update(blogSubscribers)
            .set({
              isActive: true,
              updatedAt: new Date()
            })
            .where(eq(blogSubscribers.id, existing.id))
            .returning();
          
          return updated;
        }
        
        // Already subscribed and active
        return existing;
      }
      
      // Create new subscriber
      const [newSubscriber] = await db
        .insert(blogSubscribers)
        .values({
          ...subscriber,
          isActive: true,
          unsubscribeToken: Math.random().toString(36).substring(2, 15),
          createdAt: new Date()
        })
        .returning();
      
      return newSubscriber;
    } catch (error) {
      throw handleDbError(error, `creating blog subscriber for ${subscriber.email}`);
    }
  }
  
  /**
   * Get all blog subscribers
   */
  async getBlogSubscribers(): Promise<BlogSubscriber[]> {
    try {
      return await db
        .select()
        .from(blogSubscribers)
        .where(eq(blogSubscribers.isActive, true))
        .orderBy(desc(blogSubscribers.createdAt));
    } catch (error) {
      throw handleDbError(error, "getting blog subscribers");
    }
  }
  
  /**
   * Get a blog subscriber by ID
   */
  async getBlogSubscriber(id: number): Promise<BlogSubscriber | undefined> {
    try {
      const [subscriber] = await db
        .select()
        .from(blogSubscribers)
        .where(eq(blogSubscribers.id, id))
        .limit(1);
      
      return subscriber;
    } catch (error) {
      throw handleDbError(error, `getting blog subscriber ${id}`);
    }
  }
  
  /**
   * Get a blog subscriber by email
   */
  async getBlogSubscriberByEmail(email: string): Promise<BlogSubscriber | undefined> {
    try {
      const [subscriber] = await db
        .select()
        .from(blogSubscribers)
        .where(eq(blogSubscribers.email, email))
        .limit(1);
      
      return subscriber;
    } catch (error) {
      throw handleDbError(error, `getting blog subscriber by email ${email}`);
    }
  }
  
  /**
   * Update a blog subscriber
   */
  async updateBlogSubscriber(id: number, data: Partial<BlogSubscriber>): Promise<BlogSubscriber | undefined> {
    try {
      const [updated] = await db
        .update(blogSubscribers)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(blogSubscribers.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      throw handleDbError(error, `updating blog subscriber ${id}`);
    }
  }
  
  /**
   * Unsubscribe a blog subscriber by email
   */
  async unsubscribeBlogSubscriber(email: string): Promise<boolean> {
    try {
      const subscriber = await this.getBlogSubscriberByEmail(email);
      
      if (!subscriber) {
        return false;
      }
      
      await db
        .update(blogSubscribers)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(blogSubscribers.id, subscriber.id));
      
      return true;
    } catch (error) {
      throw handleDbError(error, `unsubscribing blog subscriber ${email}`);
    }
  }
  
  /**
   * Create a new location
   */
  async createLocation(location: InsertLocation): Promise<Location> {
    try {
      const [newLocation] = await db
        .insert(locations)
        .values({
          ...location,
          isActive: location.isActive ?? true,
          createdAt: new Date()
        })
        .returning();
      
      return newLocation;
    } catch (error) {
      throw handleDbError(error, "creating location");
    }
  }
  
  /**
   * Get all locations
   */
  async getLocations(): Promise<Location[]> {
    try {
      return await db
        .select()
        .from(locations)
        .orderBy(locations.name);
    } catch (error) {
      throw handleDbError(error, "getting locations");
    }
  }
  
  /**
   * Get a location by ID
   */
  async getLocation(id: number): Promise<Location | undefined> {
    try {
      const [location] = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.id, id),
            eq(locations.isActive, true)
          )
        )
        .limit(1);
      
      return location;
    } catch (error) {
      throw handleDbError(error, `getting location ${id}`);
    }
  }
  
  /**
   * Update a location
   */
  async updateLocation(id: number, data: Partial<Location>): Promise<Location | undefined> {
    try {
      const [updated] = await db
        .update(locations)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(locations.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      throw handleDbError(error, `updating location ${id}`);
    }
  }
  
  /**
   * Delete a location
   */
  async deleteLocation(id: number): Promise<void> {
    try {
      await db
        .delete(locations)
        .where(eq(locations.id, id));
    } catch (error) {
      throw handleDbError(error, `deleting location ${id}`);
    }
  }
  
  /**
   * List locations by client ID
   */
  async listLocationsByClient(clientId: number): Promise<Location[]> {
    try {
      return await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.clientId, clientId),
            eq(locations.isActive, true)
          )
        )
        .orderBy(locations.name);
    } catch (error) {
      throw handleDbError(error, `listing locations for client ${clientId}`);
    }
  }
}

// Export singleton instance
export const formStorage = new FormStorage();