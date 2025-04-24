/**
 * Interface for file storage implementations
 * This provides a common interface for different storage backends
 * (Database, Filesystem, Cloud storage like Backblaze B2, etc.)
 */
export interface IFileStorage {
  /**
   * Save a file to storage
   * @param buf The file buffer to store
   * @returns A storage key that can be used to retrieve the file later
   */
  save(buf: Buffer): Promise<number | string>;
  
  /**
   * Load a file from storage
   * @param key The storage key previously returned by save()
   * @returns The file buffer
   */
  load(key: number | string): Promise<Buffer>;
  
  /**
   * Delete a file from storage
   * @param key The storage key previously returned by save()
   */
  delete(key: number | string): Promise<void>;
}