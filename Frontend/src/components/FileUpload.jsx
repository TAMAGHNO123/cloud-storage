// FileUpload.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const FileUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'application/pdf', 'text/plain'].includes(file.type)) {
      toast.error('Invalid file type');
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await axios.post('http://localhost:4050/upload', formData, {
        onUploadProgress: (progressEvent) => {
          setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        },
      });
      toast.success('File uploaded successfully!');
      setSelectedFile(null);
      setUploadProgress(0);
    } catch (err) {
      toast.error('Failed to upload file.');
    }
  };

  return (
    <div className="flex flex-col items-center p-4">
      <input
        type="file"
        onChange={handleFileChange}
        className="mb-4"
      />
      <button
        onClick={handleUpload}
        className="bg-blue-500 text-white py-2 px-4 rounded"
      >
        Upload
      </button>
      {uploadProgress > 0 && (
        <progress
          value={uploadProgress}
          max="100"
          className="mt-4 w-full"
        />
      )}
      {error && <p className="text-red-500 mt-2">{error}</p>}
      <ToastContainer />
    </div>
  );
};

export default FileUpload;
