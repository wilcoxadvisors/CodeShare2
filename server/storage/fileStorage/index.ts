import { IFileStorage } from './IFileStorage';
import { DbFileStorage } from './DbFileStorage';

/**
 * Factory function to get the appropriate file storage implementation
 * This makes it easy to switch storage backends by setting an environment variable
 * @returns An implementation of IFileStorage
 */
export function getFileStorage(): IFileStorage {
  // For future use: Could check process.env.FILE_BACKEND to determine which implementation to use
  // For now, just use DbFileStorage since that's what we want
  return new DbFileStorage();
}

// Export the interface and implementations for use elsewhere
export { IFileStorage } from './IFileStorage';
export { DbFileStorage } from './DbFileStorage';