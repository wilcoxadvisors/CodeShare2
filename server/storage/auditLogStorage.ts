/**
 * Audit Log Storage Module
 * 
 * This module contains the storage interface and implementation for audit logs,
 * which track admin actions within the system for transparency and accountability.
 */
import { db } from "../db";
import { auditLogs, AuditLog, InsertAuditLog } from "@shared/schema";
import { eq, desc, and, like } from "drizzle-orm";
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
 * Interface for audit log storage operations
 */
export interface IAuditLogStorage {
  // Basic CRUD operations
  createAuditLog(audit: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  getAuditLogsByUser(userId: number, limit?: number): Promise<AuditLog[]>;
  getAuditLogsByAction(action: string, limit?: number): Promise<AuditLog[]>;
  getAuditLogsByDetails(searchTerm: string, limit?: number): Promise<AuditLog[]>;
}

/**
 * Implementation of audit log storage operations using Drizzle ORM
 */
export class AuditLogStorage implements IAuditLogStorage {
  /**
   * Create a new audit log entry
   */
  async createAuditLog(audit: InsertAuditLog): Promise<AuditLog> {
    try {
      const [newLog] = await db
        .insert(auditLogs)
        .values({
          ...audit,
          createdAt: new Date()
        })
        .returning();
      
      return newLog;
    } catch (error) {
      throw handleDbError(error, "creating audit log");
    }
  }
  
  /**
   * Get all audit logs
   */
  async getAuditLogs(limit?: number): Promise<AuditLog[]> {
    try {
      const query = db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt));
      
      // Apply limit if provided
      const results = limit 
        ? await query.limit(limit) 
        : await query;
      
      return results;
    } catch (error) {
      throw handleDbError(error, "retrieving audit logs");
    }
  }
  
  /**
   * Get audit logs by user ID (admin who performed the action)
   */
  async getAuditLogsByUser(userId: number, limit?: number): Promise<AuditLog[]> {
    try {
      const query = db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.performedBy, userId))
        .orderBy(desc(auditLogs.createdAt));
      
      // Apply limit if provided
      const results = limit 
        ? await query.limit(limit) 
        : await query;
      
      return results;
    } catch (error) {
      throw handleDbError(error, `retrieving audit logs for user ${userId}`);
    }
  }
  
  /**
   * Get audit logs by action type
   */
  async getAuditLogsByAction(action: string, limit?: number): Promise<AuditLog[]> {
    try {
      const query = db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.action, action))
        .orderBy(desc(auditLogs.createdAt));
      
      // Apply limit if provided
      const results = limit 
        ? await query.limit(limit) 
        : await query;
      
      return results;
    } catch (error) {
      throw handleDbError(error, `retrieving audit logs for action ${action}`);
    }
  }
  
  /**
   * Search audit logs by details text
   */
  async getAuditLogsByDetails(searchTerm: string, limit?: number): Promise<AuditLog[]> {
    try {
      const query = db
        .select()
        .from(auditLogs)
        .where(like(auditLogs.details, `%${searchTerm}%`))
        .orderBy(desc(auditLogs.createdAt));
      
      // Apply limit if provided
      const results = limit 
        ? await query.limit(limit) 
        : await query;
      
      return results;
    } catch (error) {
      throw handleDbError(error, `searching audit logs for "${searchTerm}"`);
    }
  }
}

/**
 * Memory-based implementation of audit log storage for testing
 */
export class MemAuditLogStorage implements IAuditLogStorage {
  private auditLogs: AuditLog[] = [];
  private currentId = 1;
  
  /**
   * Create a new audit log entry
   */
  async createAuditLog(audit: InsertAuditLog): Promise<AuditLog> {
    const id = this.currentId++;
    const newLog: AuditLog = {
      id,
      action: audit.action,
      performedBy: audit.performedBy,
      details: audit.details,
      createdAt: new Date()
    };
    
    this.auditLogs.push(newLog);
    return newLog;
  }
  
  /**
   * Get all audit logs
   */
  async getAuditLogs(limit?: number): Promise<AuditLog[]> {
    let logs = [...this.auditLogs]
      .sort((a, b) => {
        const bTime = b.createdAt ? b.createdAt.getTime() : 0;
        const aTime = a.createdAt ? a.createdAt.getTime() : 0;
        return bTime - aTime;
      });
    
    if (limit) {
      logs = logs.slice(0, limit);
    }
    
    return logs;
  }
  
  /**
   * Get audit logs by user ID (admin who performed the action)
   */
  async getAuditLogsByUser(userId: number, limit?: number): Promise<AuditLog[]> {
    let logs = this.auditLogs
      .filter(log => log.performedBy === userId)
      .sort((a, b) => {
        const bTime = b.createdAt ? b.createdAt.getTime() : 0;
        const aTime = a.createdAt ? a.createdAt.getTime() : 0;
        return bTime - aTime;
      });
    
    if (limit) {
      logs = logs.slice(0, limit);
    }
    
    return logs;
  }
  
  /**
   * Get audit logs by action type
   */
  async getAuditLogsByAction(action: string, limit?: number): Promise<AuditLog[]> {
    let logs = this.auditLogs
      .filter(log => log.action === action)
      .sort((a, b) => {
        const bTime = b.createdAt ? b.createdAt.getTime() : 0;
        const aTime = a.createdAt ? a.createdAt.getTime() : 0;
        return bTime - aTime;
      });
    
    if (limit) {
      logs = logs.slice(0, limit);
    }
    
    return logs;
  }
  
  /**
   * Search audit logs by details text
   */
  async getAuditLogsByDetails(searchTerm: string, limit?: number): Promise<AuditLog[]> {
    let logs = this.auditLogs
      .filter(log => log.details.includes(searchTerm))
      .sort((a, b) => {
        const bTime = b.createdAt ? b.createdAt.getTime() : 0;
        const aTime = a.createdAt ? a.createdAt.getTime() : 0;
        return bTime - aTime;
      });
    
    if (limit) {
      logs = logs.slice(0, limit);
    }
    
    return logs;
  }
}

// Export singleton instances
export const auditLogStorage = new AuditLogStorage();
export const memAuditLogStorage = new MemAuditLogStorage();