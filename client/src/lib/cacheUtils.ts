import { QueryClient } from "@tanstack/react-query";

/**
 * Comprehensive cache invalidation utilities to fix system-wide data staleness
 * This ensures immediate UI updates after any data modification
 */

export interface CacheInvalidationOptions {
  clientId?: number;
  entityId?: number;
  journalEntryId?: number;
  immediate?: boolean;
}

export class CacheManager {
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Invalidate all journal entry related queries for immediate UI updates
   */
  async invalidateJournalEntries(options: CacheInvalidationOptions = {}) {
    const { clientId, entityId, journalEntryId, immediate = true } = options;
    
    const invalidations = [];
    
    // Core journal entry queries
    if (clientId && entityId) {
      invalidations.push(
        this.queryClient.invalidateQueries({ 
          queryKey: ['journal-entries', clientId, entityId] 
        })
      );
    }
    
    // Specific journal entry
    if (journalEntryId && clientId && entityId) {
      invalidations.push(
        this.queryClient.invalidateQueries({ 
          queryKey: ['journal-entry', clientId, entityId, journalEntryId] 
        })
      );
      
      // Journal entry attachments
      invalidations.push(
        this.queryClient.invalidateQueries({ 
          queryKey: ['journalEntryAttachments', journalEntryId] 
        })
      );
    }
    
    // General patterns
    invalidations.push(
      this.queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('journal-entries') || 
                 key?.includes('journal-entry') ||
                 key?.includes('journalEntryAttachments');
        }
      })
    );

    if (immediate) {
      await Promise.all(invalidations);
    }
    
    return invalidations;
  }

  /**
   * Invalidate all client and entity related queries
   */
  async invalidateClientData(options: CacheInvalidationOptions = {}) {
    const { clientId, immediate = true } = options;
    
    const invalidations = [];
    
    // Client specific queries
    if (clientId) {
      invalidations.push(
        this.queryClient.invalidateQueries({ 
          queryKey: ['clients', clientId] 
        })
      );
      
      invalidations.push(
        this.queryClient.invalidateQueries({ 
          queryKey: ['client-entities', clientId] 
        })
      );
    }
    
    // General client and entity queries
    invalidations.push(
      this.queryClient.invalidateQueries({ queryKey: ['/api/clients'] })
    );
    
    invalidations.push(
      this.queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('/api/clients') || 
                 key?.includes('entities') ||
                 key?.includes('client-entities');
        }
      })
    );

    if (immediate) {
      await Promise.all(invalidations);
    }
    
    return invalidations;
  }

  /**
   * Invalidate account related queries
   */
  async invalidateAccountData(options: CacheInvalidationOptions = {}) {
    const { clientId, immediate = true } = options;
    
    const invalidations = [];
    
    if (clientId) {
      invalidations.push(
        this.queryClient.invalidateQueries({ 
          queryKey: ['accounts', clientId] 
        })
      );
      
      invalidations.push(
        this.queryClient.invalidateQueries({ 
          queryKey: ['account-tree', clientId] 
        })
      );
    }
    
    // General account queries
    invalidations.push(
      this.queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('accounts') || 
                 key?.includes('account-tree') ||
                 key?.includes('/accounts');
        }
      })
    );

    if (immediate) {
      await Promise.all(invalidations);
    }
    
    return invalidations;
  }

  /**
   * Invalidate dimension related queries
   */
  async invalidateDimensionData(options: CacheInvalidationOptions = {}) {
    const { clientId, immediate = true } = options;
    
    const invalidations = [];
    
    if (clientId) {
      invalidations.push(
        this.queryClient.invalidateQueries({ 
          queryKey: ['dimensions', clientId] 
        })
      );
    }
    
    // General dimension queries
    invalidations.push(
      this.queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('dimensions') || 
                 key?.includes('/dimensions');
        }
      })
    );

    if (immediate) {
      await Promise.all(invalidations);
    }
    
    return invalidations;
  }

  /**
   * Comprehensive invalidation for all data - use after major changes
   */
  async invalidateAll(options: CacheInvalidationOptions = {}) {
    const { immediate = true } = options;
    
    const invalidations = [
      this.invalidateJournalEntries({ ...options, immediate: false }),
      this.invalidateClientData({ ...options, immediate: false }),
      this.invalidateAccountData({ ...options, immediate: false }),
      this.invalidateDimensionData({ ...options, immediate: false })
    ];

    if (immediate) {
      await Promise.all(invalidations);
    }
    
    return invalidations;
  }

  /**
   * Force immediate UI update using setQueryData
   */
  setQueryData<T>(queryKey: unknown[], data: T) {
    this.queryClient.setQueryData(queryKey, data);
  }

  /**
   * Force refetch of specific queries
   */
  async refetchQueries(queryKey: unknown[]) {
    return this.queryClient.refetchQueries({ queryKey });
  }
}

// Export singleton instance
export const createCacheManager = (queryClient: QueryClient) => 
  new CacheManager(queryClient);