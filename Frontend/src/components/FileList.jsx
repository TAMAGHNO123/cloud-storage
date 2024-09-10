// FileList.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const FileList = () => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await axios.get('http://localhost:4050/files');
        setFiles(response.data);
      } catch (err) {
        setError('Failed to fetch files.');
      }
    };

    fetchFiles();
  }, []);

  return (
    <div className="p-4">
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <ul>
        {files.map((file) => (
          <li key={file.id} className="mb-2">
            <a
              href={`http://localhost:4050/uploads/${file.fileName}`}
              download
              className="text-blue-500 underline"
            >
              {file.originalName}
            </a> - {file.size} bytes
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FileList;
