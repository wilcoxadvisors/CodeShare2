/**
 * File Handler Module
 * 
 * This module provides functions for handling file serving operations with appropriate
 * path resolution capabilities.
 * 
 * @module fileHandler
 * @author Financial Management Platform Team
 * @version 1.0.0
 */

/**
 * Serves a file with proper path resolution by checking multiple possible locations
 * 
 * The function first attempts to find the file at the provided path. If not found,
 * it checks in the public directory as a fallback. This handles different deployment
 * scenarios and file storage configurations.
 * 
 * @param {Object} file - The file object containing metadata
 * @param {string} file.path - The file's storage path
 * @param {string} file.filename - The file's original filename
 * @param {string} file.mimeType - The file's MIME type
 * @param {Object} res - Express response object
 * @param {Object} fs - File system module
 * @param {Object} path - Path module
 * @returns {boolean} - True if file was successfully found and served
 */
const serveFileWithCorrectPath = (file, res, fs, path) => {
  // Try the path as is first
  let filePath = path.join(process.cwd(), file.path);
  
  // If not found, try in the public directory (removing leading slash if present)
  if (!fs.existsSync(filePath)) {
    const publicPath = path.join(process.cwd(), 'public', file.path.replace(/^\//, ''));
    
    if (fs.existsSync(publicPath)) {
      filePath = publicPath;
      console.log(`File found at public path: ${filePath}`);
    } else {
      console.error(`File not found at either path: ${filePath} or ${publicPath}`);
      return res.status(404).json({ message: 'File not found on server' });
    }
  }
  
  // Set appropriate headers for the file download
  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  
  // Stream the file to the response for efficient delivery
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  
  return true;
};

// Export the function for use in other modules
module.exports = {
  serveFileWithCorrectPath
};
