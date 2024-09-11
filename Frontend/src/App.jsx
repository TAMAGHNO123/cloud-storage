import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';
import axios from 'axios';

const App = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState([]);

  const handleSearch = async () => {
    try {
      const response = await axios.get(`http://localhost:4050/search?query=${searchQuery}`);
      setFiles(response.data);
    } catch (error) {
      console.error('Failed to search files', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl mb-4">Online Storage Application</h1>
      <FileUpload />
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files by name or tags"
          className="p-2 border rounded w-full"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-500 text-white py-2 px-4 rounded mt-2"
        >
          Search
        </button>
      </div>
      <FileList files={files} />
    </div>
  );
};

export default App;
