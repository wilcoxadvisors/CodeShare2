/**
 * Function to handle file serving with appropriate path handling
 * This checks both the standard path and the path inside public folder
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
  
  // Serve the file
  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  
  // Stream the file to the response
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
};
