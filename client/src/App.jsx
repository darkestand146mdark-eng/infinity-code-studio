import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

const API_URL = 'http://localhost:5000';

function App() {
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const editorRef = useRef(null);
  const autoSaveTimer = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/`)
      .then(res => res.json())
      .then(data => setServerStatus(data.success ? 'online' : 'offline'))
      .catch(() => setServerStatus('offline'));
  }, []);

  useEffect(() => {
    if (!searchQuery) setFilteredFiles(files);
    else setFilteredFiles(files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())));
  }, [files, searchQuery]);

  const loadFiles = async (dir = '') => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/workspace/list?dir=${dir}`);
      const data = await res.json();
      if (data.success) {
        setFiles(data.files);
        setCurrentPath(dir);
        setSelectedFile(null);
        setFileContent('');
        setSearchQuery('');
        setSearchResults(null);
      }
    } catch (err) { alert('Server connection failed.'); }
    setLoading(false);
  };

  const deepSearch = async () => {
    if (!searchQuery) return;
    try {
      const res = await fetch(`${API_URL}/workspace/search?q=${searchQuery}`);
      const data = await res.json();
      if (data.success) setSearchResults(data.results);
    } catch (err) { alert('Search failed.'); }
  };

  const openFile = async (path) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/workspace/file?path=${path}`);
      const data = await res.json();
      if (data.success) {
        setFileContent(data.content);
        setSelectedFile(path);
        setAutoSaveStatus('');
      }
    } catch (err) { alert('Failed to read file.'); }
    setLoading(false);
  };

  const saveFile = async (isAuto = false) => {
    if (!selectedFile) return;
    if (!isAuto) setLoading(true);
    try {
      await fetch(`${API_URL}/workspace/file`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: selectedFile, content: fileContent })
      });
      if (isAuto) {
        setAutoSaveStatus('✅ Auto-saved');
        setTimeout(() => setAutoSaveStatus(''), 2000);
      } else alert('File Saved Successfully!');
    } catch (err) { if (!isAuto) alert('Failed to save file.'); }
    if (!isAuto) setLoading(false);
  };

  const handleContentChange = (value) => {
    setFileContent(value || '');
    setAutoSaveStatus('⏳ Saving...');
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { if (selectedFile) saveFile(true); }, 3000);
  };

  const handleUndo = () => editorRef.current?.trigger('keyboard', 'undo', null);
  const handleRedo = () => editorRef.current?.trigger('keyboard', 'redo', null);

  const createFile = async () => {
    const name = prompt('Enter new file name (e.g., test.js):');
    if (!name) return;
    const fullPath = currentPath ? `${currentPath}/${name}` : name;
    try {
      await fetch(`${API_URL}/workspace/file`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: fullPath, content: '' })
      });
      loadFiles(currentPath);
    } catch (err) { alert('Failed to create file.'); }
  };

  const createFolder = async () => {
    const name = prompt('Enter new folder name:');
    if (!name) return;
    const fullPath = currentPath ? `${currentPath}/${name}` : name;
    try {
      await fetch(`${API_URL}/workspace/folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: fullPath })
      });
      loadFiles(currentPath);
    } catch (err) { alert('Failed to create folder.'); }
  };

  const deleteItem = async (path, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await fetch(`${API_URL}/workspace?path=${path}`, { method: 'DELETE' });
      loadFiles(currentPath);
    } catch (err) { alert('Delete failed.'); }
  };

  const renameItem = async (oldPath, oldName) => {
    const newName = prompt('Enter new name:', oldName);
    if (!newName || newName === oldName) return;
    const newPath = currentPath ? `${currentPath}/${newName}` : newName;
    try {
      await fetch(`${API_URL}/workspace/file/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath })
      });
      loadFiles(currentPath);
    } catch (err) { alert('Rename failed.'); }
  };

  useEffect(() => { loadFiles(''); }, []);

  const displayFiles = searchResults || filteredFiles;

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          background: #0a0a0f; 
          font-family: 'Inter', -apple-system, sans-serif;
          overflow: hidden;
        }
        .glass {
          background: rgba(20, 20, 30, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .glow-purple { box-shadow: 0 0 30px rgba(139, 92, 246, 0.3); }
        .glow-cyan { box-shadow: 0 0 30px rgba(6, 182, 212, 0.3); }
        .btn-primary {
          background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 12px;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.5);
        }
        .btn-icon {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #a0a0b0;
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 12px;
        }
        .btn-icon:hover {
          background: rgba(139, 92, 246, 0.2);
          color: #8b5cf6;
          border-color: #8b5cf6;
        }
        .file-item {
          padding: 10px 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #c0c0d0;
          font-size: 13px;
          border: 1px solid transparent;
        }
        .file-item:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.3);
          transform: translateX(4px);
        }
        .file-item.active {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(6, 182, 212, 0.2) 100%);
          border-color: #8b5cf6;
          color: white;
        }
        .search-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.03);
          color: white;
          font-size: 12px;
          outline: none;
          transition: all 0.3s ease;
        }
        .search-input:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
        }
        .search-input::placeholder { color: #666; }
        .status-dot {
          width: 8px; height: 8px; border-radius: 50%;
          display: inline-block; margin-right: 6px;
        }
        .online { background: #10b981; box-shadow: 0 0 10px #10b981; animation: pulse 2s infinite; }
        .offline { background: #ef4444; box-shadow: 0 0 10px #ef4444; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .scrollbar::-webkit-scrollbar { width: 6px; }
        .scrollbar::-webkit-scrollbar-track { background: transparent; }
        .scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(139, 92, 246, 0.3); 
          border-radius: 3px;
        }
        .scrollbar::-webkit-scrollbar-thumb:hover { background: #8b5cf6; }
        .header-bar {
          background: linear-gradient(90deg, rgba(20, 20, 30, 0.9) 0%, rgba(30, 20, 50, 0.9) 100%);
          border-bottom: 1px solid rgba(139, 92, 246, 0.2);
          padding: 12px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo-text {
          background: linear-gradient(135deg, #8b5cf6, #06b6d4, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 800;
          font-size: 16px;
          letter-spacing: -0.5px;
        }
        .welcome-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #888;
        }
        .welcome-icon {
          font-size: 60px;
          margin-bottom: 20px;
          filter: drop-shadow(0 0 30px rgba(139, 92, 246, 0.6));
          animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        .welcome-title {
          background: linear-gradient(135deg, #8b5cf6, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 10px;
        }
      `}</style>

      <div style={{ display: 'flex', height: '100vh', background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #0a0a0f 100%)' }}>
        
        {/* Sidebar */}
        <div 
          className="glass scrollbar"
          style={{ 
            width: sidebarOpen ? '300px' : '0px',
            transition: 'width 0.3s ease',
            overflow: 'hidden',
            borderRight: '1px solid rgba(139, 92, 246, 0.2)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: 'white', fontSize: '14px', fontWeight: '700', letterSpacing: '0.5px' }}>📁 EXPLORER</h3>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '10px', color: '#a0a0b0' }}>
                <span className={`status-dot ${serverStatus === 'online' ? 'online' : 'offline'}`}></span>
                {serverStatus === 'online' ? 'Online' : 'Offline'}
              </div>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="🔍  Search files..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchResults(null); }}
              className="search-input"
              style={{ marginBottom: '12px' }}
            />
            {searchQuery && (
              <button onClick={deepSearch} className="btn-primary" style={{ width: '100%', marginBottom: '12px' }}>
                🔎 Deep Search
              </button>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button onClick={createFile} className="btn-primary" style={{ flex: 1 }}>+ File</button>
              <button onClick={createFolder} className="btn-primary" style={{ flex: 1 }}>+ Folder</button>
              <button onClick={() => loadFiles(currentPath)} className="btn-icon" title="Refresh">🔄</button>
            </div>

            {currentPath && (
              <button onClick={() => loadFiles('')} className="btn-icon" style={{ width: '100%', marginBottom: '12px' }}>
                ← Back to Root
              </button>
            )}

            {loading && <p style={{ fontSize: '11px', color: '#8b5cf6', textAlign: 'center', padding: '10px' }}>Loading...</p>}
            {searchResults && <p style={{ fontSize: '11px', color: '#06b6d4', marginBottom: '8px' }}>🔎 {searchResults.length} results</p>}

            {displayFiles.length === 0 && !loading && (
              <p style={{ fontSize: '12px', color: '#555', textAlign: 'center', padding: '20px' }}>No files found</p>
            )}

            {/* File List */}
            {displayFiles.map((f) => (
              <div 
                key={f.path} 
                className={`file-item ${selectedFile === f.path ? 'active' : ''}`}
              >
                <span 
                  onClick={() => f.type === 'folder' ? loadFiles(f.path) : openFile(f.path)}
                  style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {f.type === 'folder' ? '📁' : '📄'} {f.name}
                </span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={(e) => { e.stopPropagation(); renameItem(f.path, f.name); }} className="btn-icon" style={{ padding: '2px 6px' }}>✏️</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteItem(f.path, f.name); }} className="btn-icon" style={{ padding: '2px 6px' }}>🗑️</button>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Editor Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* Header Bar */}
          <div className="header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="btn-icon" style={{ padding: '6px 10px' }}>
                {sidebarOpen ? '◀' : '▶'}
              </button>
              <span className="logo-text">⚡ Infinity Code Studio</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {autoSaveStatus && <span style={{ fontSize: '11px', color: '#10b981' }}>{autoSaveStatus}</span>}
              <button onClick={handleUndo} className="btn-icon" title="Undo">↶</button>
              <button onClick={handleRedo} className="btn-icon" title="Redo">↷</button>
              {selectedFile && (
                <button onClick={() => saveFile(false)} className="btn-primary">
                  💾 Save
                </button>
              )}
            </div>
          </div>

          {/* File Path Bar */}
          {selectedFile && (
            <div style={{ padding: '8px 20px', background: 'rgba(139, 92, 246, 0.05)', borderBottom: '1px solid rgba(139, 92, 246, 0.1)' }}>
              <span style={{ fontSize: '11px', color: '#8b5cf6', fontFamily: 'monospace' }}>
                📝 {selectedFile}
              </span>
            </div>
          )}

          {/* Editor or Welcome */}
          {selectedFile ? (
            <Editor
              height="100%"
              defaultLanguage="javascript"
              value={fileContent}
              onChange={handleContentChange}
              theme="vs-dark"
              onMount={(editor) => { editorRef.current = editor; }}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                automaticLayout: true,
                wordWrap: 'on',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                padding: { top: 20, bottom: 20 }
              }}
            />
          ) : (
            <div className="welcome-container">
              <div style={{ textAlign: 'center', maxWidth: '500px', padding: '20px' }}>
                <div className="welcome-icon">⚡</div>
                <h1 className="welcome-title">Infinity Code Studio</h1>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>
                  Select a file from the left or create a new one
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '30px' }}>
                  <span style={badgeStyle}>✨ Auto Save</span>
                  <span style={badgeStyle}>🎨 Monaco Editor</span>
                  <span style={badgeStyle}>🔍 Smart Search</span>
                  <span style={badgeStyle}>⚡ Live Sync</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const badgeStyle = {
  padding: '8px 16px',
  background: 'rgba(139, 92, 246, 0.1)',
  border: '1px solid rgba(139, 92, 246, 0.3)',
  borderRadius: '20px',
  fontSize: '11px',
  color: '#8b5cf6',
  fontWeight: '600'
};

export default App;
