// src/components/dashboard/FileUpload.jsx
import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, Check, AlertCircle, X, File } from 'lucide-react';

export default function FileUpload({ onSuccess }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const fileInputRef = useRef(null);
  const dropzoneRef = useRef(null);

  const getFileIcon = (fileType) => {
    // Using just the standard File icon from lucide-react 
    // instead of specific file type icons that don't exist
    return <File size={20} />;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    dropzoneRef.current.classList.add('border-blue-500', 'bg-blue-50');
    dropzoneRef.current.classList.remove('border-gray-300', 'bg-gray-50');
  };

  const handleDragLeave = () => {
    dropzoneRef.current.classList.remove('border-blue-500', 'bg-blue-50');
    dropzoneRef.current.classList.add('border-gray-300', 'bg-gray-50');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleDragLeave();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (selectedFiles) => {
    const newFiles = [...files];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      // Add file if it doesn't already exist in the array
      if (!files.some(f => f.name === selectedFiles[i].name && f.size === selectedFiles[i].size)) {
        newFiles.push(selectedFiles[i]);
      }
    }
    
    setFiles(newFiles);
  };

  const removeFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setUploadStatus(null);
    
    try {
      const token = localStorage.getItem('token');
      const promises = files.map(file => {
        const formData = new FormData();
        formData.append('file', file);
        
        return axios.post(`${process.env.REACT_APP_API_URL}/api/upload`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
        });
      });
      
      await Promise.all(promises);
      
      setUploadStatus({
        success: true,
        message: `Successfully uploaded ${files.length} file${files.length !== 1 ? 's' : ''}`
      });
      
      setFiles([]);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus({
        success: false,
        message: 'Upload failed. Please check your connection and try again.'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">Upload Financial Documents</h3>
      
      {/* Dropzone */}
      <div 
        ref={dropzoneRef}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 text-center transition-colors duration-200"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-gray-700">Drag and drop your files here, or</p>
        <button 
          type="button"
          onClick={() => fileInputRef.current.click()}
          className="mt-2 inline-flex items-center px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Choose Files
        </button>
        <p className="mt-1 text-sm text-gray-500">
          Supported formats: PDF, Excel, CSV
        </p>
        <input 
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.xls,.xlsx,.csv,.doc,.docx"
        />
      </div>
      
      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-700 mb-2">Selected Files</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto p-1">
            {files.map((file, idx) => (
              <div 
                key={`${file.name}-${idx}`} 
                className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm border"
              >
                <div className="flex items-center">
                  {getFileIcon(file.type)}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-800 truncate max-w-xs">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => removeFile(idx)}
                  className="text-gray-500 hover:text-red-500"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={uploadFiles}
              disabled={uploading}
              className={`
                flex items-center px-4 py-2 rounded-md 
                ${uploading 
                  ? 'bg-gray-300 cursor-not-allowed text-gray-700' 
                  : 'bg-blue-800 hover:bg-blue-900 text-white'}
              `}
            >
              {uploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
            </button>
            
            <button
              type="button"
              onClick={() => setFiles([])}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
      
      {/* Status Message */}
      {uploadStatus && (
        <div className={`mt-4 p-3 rounded-md ${
          uploadStatus.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="flex items-center">
            {uploadStatus.success 
              ? <Check size={18} className="mr-2" /> 
              : <AlertCircle size={18} className="mr-2" />}
            <p>{uploadStatus.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
