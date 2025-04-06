/**
 * String utility functions
 */

/**
 * Generate a URL-friendly slug from a string
 * 
 * @param text The text to convert to a slug
 * @returns A URL-friendly slug
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove non-word characters (except spaces and hyphens)
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with a single hyphen
    .trim();                  // Trim leading/trailing spaces
}

/**
 * Truncate a string to a maximum length and add ellipsis if needed
 * 
 * @param text The text to truncate
 * @param maxLength The maximum length (default: 100)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  // Find the last space before maxLength to avoid cutting words
  const lastSpace = text.lastIndexOf(' ', maxLength);
  const truncated = text.substring(0, lastSpace > 0 ? lastSpace : maxLength);
  
  return `${truncated}...`;
}

/**
 * Capitalize the first letter of a string
 * 
 * @param text The text to capitalize
 * @returns Text with first letter capitalized
 */
export function capitalizeFirstLetter(text: string): string {
  if (!text || text.length === 0) {
    return text;
  }
  
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Remove HTML tags from a string
 * 
 * @param html HTML string
 * @returns Plain text without HTML tags
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '');
}

/**
 * Estimate reading time for a text
 * 
 * @param text The text to estimate
 * @param wordsPerMinute Average reading speed (default: 200)
 * @returns Reading time in minutes as a string (e.g., "3 min read")
 */
export function calculateReadingTime(text: string, wordsPerMinute: number = 200): string {
  const wordCount = text.split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  
  return `${minutes} min read`;
}