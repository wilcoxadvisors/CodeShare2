/**
 * User Storage Module
 * 
 * This module contains the storage interface and implementation for user operations
 * and user entity access management.
 */
import { db } from "../db";
import { 
  users, User, InsertUser, UserRole,
  userEntityAccess, userActivityLogs, UserActivityLog, InsertUserActivityLog,
  dataConsent, DataConsent, InsertDataConsent
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
 * Interface for user storage operations
 */
export interface IUserStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  findUserByRole(role: UserRole): Promise<User | undefined>;
  
  // User Entity Access methods
  getUserEntityAccess(userId: number, entityId: number): Promise<string | undefined>;
  grantUserEntityAccess(userId: number, entityId: number, accessLevel: string): Promise<void>;
  getUserEntityAccessList(userId: number): Promise<{ entityId: number, accessLevel: string }[]>;
  
  // User Activity Tracking methods
  logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog>;
  getUserActivities(userId: number, limit?: number): Promise<UserActivityLog[]>;
  getUserActivitiesByEntity(entityId: number, limit?: number): Promise<UserActivityLog[]>;
  getUserActivitiesByResourceType(resourceType: string, limit?: number): Promise<UserActivityLog[]>;
  
  // Data Consent methods
  recordDataConsent(consent: InsertDataConsent): Promise<DataConsent>;
  getUserConsent(userId: number, consentType: string): Promise<DataConsent | undefined>;
  updateUserConsent(id: number, granted: boolean): Promise<DataConsent | undefined>;
  hasUserConsented(userId: number, consentType: string): Promise<boolean>;
}

/**
 * Implementation of user storage operations using Drizzle ORM
 */
export class UserStorage implements IUserStorage {
  /**
   * Get a user by ID
   */
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      handleDbError(error, "Error retrieving user");
      return undefined;
    }
  }

  /**
   * Get a user by username
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      return user || undefined;
    } catch (error) {
      handleDbError(error, "Error retrieving user by username");
      return undefined;
    }
  }

  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    try {
      return await db.select().from(users);
    } catch (error) {
      handleDbError(error, "Error retrieving users");
      return [];
    }
  }

  /**
   * Create a new user
   */
  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values({
          username: insertUser.username,
          password: insertUser.password,
          email: insertUser.email,
          name: insertUser.name,
          role: insertUser.role,
          active: insertUser.active ?? true,
          industry: insertUser.industry || null,
          companySize: insertUser.companySize || null,
          jobTitle: insertUser.jobTitle || null,
          location: insertUser.location || null,
          preferredLanguage: insertUser.preferredLanguage || 'en',
          deviceInfo: insertUser.deviceInfo || null,
          lastSession: insertUser.lastSession || null,
          referralSource: insertUser.referralSource || null
        })
        .returning();
      return user;
    } catch (error) {
      handleDbError(error, "Error creating user");
      throw error;
    }
  }

  /**
   * Update an existing user
   */
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      return user || undefined;
    } catch (error) {
      handleDbError(error, "Error updating user");
      return undefined;
    }
  }

  /**
   * Find a user by role
   */
  async findUserByRole(role: UserRole): Promise<User | undefined> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.role, role))
        .limit(1);
      
      return result[0];
    } catch (error) {
      handleDbError(error, "Error finding user by role");
      return undefined;
    }
  }

  /**
   * Get a user's access level for an entity
   */
  async getUserEntityAccess(userId: number, entityId: number): Promise<string | undefined> {
    try {
      const [access] = await db
        .select()
        .from(userEntityAccess)
        .where(and(
          eq(userEntityAccess.userId, userId),
          eq(userEntityAccess.entityId, entityId)
        ));
      return access?.accessLevel;
    } catch (error) {
      handleDbError(error, "Error retrieving user entity access");
      return undefined;
    }
  }

  /**
   * Grant access to an entity for a user
   */
  async grantUserEntityAccess(userId: number, entityId: number, accessLevel: string): Promise<void> {
    try {
      await db
        .insert(userEntityAccess)
        .values({ userId, entityId, accessLevel })
        .onConflictDoUpdate({
          target: [userEntityAccess.userId, userEntityAccess.entityId],
          set: { accessLevel }
        });
    } catch (error) {
      handleDbError(error, "Error granting user entity access");
      throw error;
    }
  }

  /**
   * Get a list of all entities a user has access to
   */
  async getUserEntityAccessList(userId: number): Promise<{ entityId: number, accessLevel: string }[]> {
    try {
      const accessList = await db
        .select({
          entityId: userEntityAccess.entityId,
          accessLevel: userEntityAccess.accessLevel
        })
        .from(userEntityAccess)
        .where(eq(userEntityAccess.userId, userId));
      
      return accessList;
    } catch (error) {
      handleDbError(error, "Error retrieving user entity access list");
      return [];
    }
  }
  
  /**
   * Log a user activity
   */
  async logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog> {
    try {
      const [log] = await db
        .insert(userActivityLogs)
        .values({
          userId: activity.userId,
          entityId: activity.entityId,
          action: activity.action,
          resourceType: activity.resourceType,
          resourceId: activity.resourceId,
          details: activity.details,
          ipAddress: activity.ipAddress || null,
          userAgent: activity.userAgent || null,
          timestamp: activity.timestamp || new Date()
        })
        .returning();
      return log;
    } catch (error) {
      handleDbError(error, "Error logging user activity");
      throw error;
    }
  }
  
  /**
   * Get user activities with optional limit
   */
  async getUserActivities(userId: number, limit?: number): Promise<UserActivityLog[]> {
    try {
      let query = db
        .select()
        .from(userActivityLogs)
        .where(eq(userActivityLogs.userId, userId))
        .orderBy(desc(userActivityLogs.timestamp));
        
      if (limit) {
        query = query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      handleDbError(error, "Error retrieving user activities");
      return [];
    }
  }
  
  /**
   * Get user activities by entity with optional limit
   */
  async getUserActivitiesByEntity(entityId: number, limit?: number): Promise<UserActivityLog[]> {
    try {
      let query = db
        .select()
        .from(userActivityLogs)
        .where(eq(userActivityLogs.entityId, entityId))
        .orderBy(desc(userActivityLogs.timestamp));
        
      if (limit) {
        query = query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      handleDbError(error, "Error retrieving user activities by entity");
      return [];
    }
  }
  
  /**
   * Get user activities by resource type with optional limit
   */
  async getUserActivitiesByResourceType(resourceType: string, limit?: number): Promise<UserActivityLog[]> {
    try {
      let query = db
        .select()
        .from(userActivityLogs)
        .where(eq(userActivityLogs.resourceType, resourceType))
        .orderBy(desc(userActivityLogs.timestamp));
        
      if (limit) {
        query = query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      handleDbError(error, "Error retrieving user activities by resource type");
      return [];
    }
  }
  
  /**
   * Record user consent
   */
  async recordDataConsent(consent: InsertDataConsent): Promise<DataConsent> {
    try {
      const [record] = await db
        .insert(dataConsent)
        .values({
          userId: consent.userId,
          consentType: consent.consentType,
          granted: consent.granted,
          timestamp: consent.timestamp || new Date(),
          expiresAt: consent.expiresAt,
          version: consent.version || '1.0',
          ipAddress: consent.ipAddress || null,
          userAgent: consent.userAgent || null,
          additionalInfo: consent.additionalInfo || null
        })
        .returning();
      return record;
    } catch (error) {
      handleDbError(error, "Error recording user consent");
      throw error;
    }
  }
  
  /**
   * Get user consent by type
   */
  async getUserConsent(userId: number, consentType: string): Promise<DataConsent | undefined> {
    try {
      const [consent] = await db
        .select()
        .from(dataConsent)
        .where(and(
          eq(dataConsent.userId, userId),
          eq(dataConsent.consentType, consentType)
        ))
        .orderBy(desc(dataConsent.timestamp))
        .limit(1);
      
      return consent;
    } catch (error) {
      handleDbError(error, "Error retrieving user consent");
      return undefined;
    }
  }
  
  /**
   * Update user consent status
   */
  async updateUserConsent(id: number, granted: boolean): Promise<DataConsent | undefined> {
    try {
      const [consent] = await db
        .update(dataConsents)
        .set({
          granted,
          timestamp: new Date() // Update the timestamp to reflect the change
        })
        .where(eq(dataConsents.id, id))
        .returning();
      
      return consent;
    } catch (error) {
      handleDbError(error, "Error updating user consent");
      return undefined;
    }
  }
  
  /**
   * Check if user has consented to a specific type
   */
  async hasUserConsented(userId: number, consentType: string): Promise<boolean> {
    try {
      const consent = await this.getUserConsent(userId, consentType);
      return !!consent && consent.granted;
    } catch (error) {
      handleDbError(error, "Error checking user consent");
      return false;
    }
  }
}

/**
 * Memory-based implementation of user storage for development/testing
 */
export class MemUserStorage implements IUserStorage {
  private users: Map<number, User>;
  private userEntityAccess: Map<string, string>; // key: userId-entityId, value: accessLevel
  private userActivities: UserActivityLog[] = [];
  private userConsents: DataConsent[] = [];
  private currentUserId: number = 1;
  private currentActivityId: number = 1;
  private currentConsentId: number = 1;

  constructor() {
    this.users = new Map<number, User>();
    this.userEntityAccess = new Map<string, string>();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      id, 
      username: insertUser.username, 
      password: insertUser.password,
      email: insertUser.email,
      name: insertUser.name,
      role: (insertUser.role as UserRole) || UserRole.CLIENT,
      active: insertUser.active !== undefined ? insertUser.active : true,
      lastLogin: null,
      loginCount: 0,
      industry: insertUser.industry || null,
      companySize: insertUser.companySize || null,
      jobTitle: insertUser.jobTitle || null,
      location: insertUser.location || null,
      preferredLanguage: insertUser.preferredLanguage || 'en',
      deviceInfo: insertUser.deviceInfo || null,
      lastSession: insertUser.lastSession || null,
      sessionCount: 0,
      referralSource: insertUser.referralSource || null,
      createdAt: new Date(),
      updatedAt: null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async findUserByRole(role: UserRole): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.role === role);
  }
  
  async getUserEntityAccess(userId: number, entityId: number): Promise<string | undefined> {
    return this.userEntityAccess.get(`${userId}-${entityId}`);
  }
  
  async grantUserEntityAccess(userId: number, entityId: number, accessLevel: string): Promise<void> {
    this.userEntityAccess.set(`${userId}-${entityId}`, accessLevel);
  }

  async getUserEntityAccessList(userId: number): Promise<{ entityId: number, accessLevel: string }[]> {
    const accessList: { entityId: number, accessLevel: string }[] = [];
    
    for (const [key, value] of this.userEntityAccess.entries()) {
      const [userIdStr, entityIdStr] = key.split('-');
      const userIdNum = parseInt(userIdStr, 10);
      
      if (userIdNum === userId) {
        accessList.push({
          entityId: parseInt(entityIdStr, 10),
          accessLevel: value
        });
      }
    }
    
    return accessList;
  }
  
  /**
   * Log a user activity
   */
  async logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog> {
    const id = this.currentActivityId++;
    const logEntry: UserActivityLog = {
      id,
      userId: activity.userId,
      entityId: activity.entityId,
      action: activity.action,
      resourceType: activity.resourceType,
      resourceId: activity.resourceId,
      details: activity.details,
      ipAddress: activity.ipAddress || null,
      userAgent: activity.userAgent || null,
      timestamp: activity.timestamp || new Date(),
      createdAt: new Date(),
      updatedAt: null
    };
    
    this.userActivities.push(logEntry);
    return logEntry;
  }
  
  /**
   * Get user activities with optional limit
   */
  async getUserActivities(userId: number, limit?: number): Promise<UserActivityLog[]> {
    const activities = this.userActivities
      .filter(a => a.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? activities.slice(0, limit) : activities;
  }
  
  /**
   * Get user activities by entity with optional limit
   */
  async getUserActivitiesByEntity(entityId: number, limit?: number): Promise<UserActivityLog[]> {
    const activities = this.userActivities
      .filter(a => a.entityId === entityId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? activities.slice(0, limit) : activities;
  }
  
  /**
   * Get user activities by resource type with optional limit
   */
  async getUserActivitiesByResourceType(resourceType: string, limit?: number): Promise<UserActivityLog[]> {
    const activities = this.userActivities
      .filter(a => a.resourceType === resourceType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? activities.slice(0, limit) : activities;
  }
  
  /**
   * Record user consent
   */
  async recordDataConsent(consent: InsertDataConsent): Promise<DataConsent> {
    const id = this.currentConsentId++;
    const consentRecord: DataConsent = {
      id,
      userId: consent.userId,
      consentType: consent.consentType,
      granted: consent.granted,
      timestamp: consent.timestamp || new Date(),
      expiresAt: consent.expiresAt,
      version: consent.version || '1.0',
      ipAddress: consent.ipAddress || null,
      userAgent: consent.userAgent || null,
      additionalInfo: consent.additionalInfo || null,
      createdAt: new Date(),
      updatedAt: null
    };
    
    this.userConsents.push(consentRecord);
    return consentRecord;
  }
  
  /**
   * Get user consent by type
   */
  async getUserConsent(userId: number, consentType: string): Promise<DataConsent | undefined> {
    return this.userConsents
      .filter(c => c.userId === userId && c.consentType === consentType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  }
  
  /**
   * Update user consent status
   */
  async updateUserConsent(id: number, granted: boolean): Promise<DataConsent | undefined> {
    const consentIndex = this.userConsents.findIndex(c => c.id === id);
    if (consentIndex === -1) return undefined;
    
    const consent = this.userConsents[consentIndex];
    const updatedConsent: DataConsent = {
      ...consent,
      granted,
      timestamp: new Date(),
      updatedAt: new Date()
    };
    
    this.userConsents[consentIndex] = updatedConsent;
    return updatedConsent;
  }
  
  /**
   * Check if user has consented to a specific type
   */
  async hasUserConsented(userId: number, consentType: string): Promise<boolean> {
    const consent = await this.getUserConsent(userId, consentType);
    return !!consent && consent.granted;
  }
}

/**
 * Create and export a singleton instance based on the environment
 */
export const userStorage: IUserStorage = process.env.NODE_ENV === 'test' 
  ? new MemUserStorage()
  : new UserStorage();