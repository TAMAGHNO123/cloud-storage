// App.jsx
import React from 'react';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';

const App = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl mb-4">Online Storage Application</h1>
      <FileUpload />
      <FileList />
    </div>
  );
};

export default App;
