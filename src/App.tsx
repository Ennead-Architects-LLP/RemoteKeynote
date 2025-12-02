import { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider, useNotifications } from './components/NotificationSystem';
import { UserLogin } from './components/UserLogin';
import { FileUpload } from './components/FileUpload';
import { Toolbar } from './components/Toolbar';
import { SpreadsheetGrid } from './components/SpreadsheetGrid';
import { UserPresence } from './components/UserPresence';
import { useSpreadsheet } from './hooks/useSpreadsheet';
import { useUserPresence } from './hooks/useUserPresence';
import { getOrCreateSessionId, copySessionURL } from './utils/sessionManager';
import { exportToCSV } from './utils/csvExporter';
import { useRaceConditionHandler } from './hooks/useRaceConditionHandler';
import { logError } from './utils/errorLogger';
import type { ParsedData } from './utils/excelParser';
import './App.css';

function AppContent() {
  const [sessionId, setSessionId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [showLogin, setShowLogin] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedCol, setSelectedCol] = useState<number | null>(null);
  const { showNotification } = useNotifications();

  // Initialize session
  useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);
    const uid = Math.random().toString(36).substring(2, 15);
    setUserId(uid);
  }, []);

  // Spreadsheet hook
  const {
    loading,
    error,
    setCellValue,
    initializeSpreadsheet,
    insertRow,
    deleteRow,
    insertColumn,
    deleteColumn,
    setColumnWidth,
    getGridData,
    getColumnDefs,
  } = useSpreadsheet(sessionId, userId);

  // User presence hook
  const { users, setActiveCell } = useUserPresence(
    sessionId,
    userId,
    userName
  );

  // Race condition handler
  const { getAllLockedCells } = useRaceConditionHandler(userId);

  const handleLogin = (name: string) => {
    setUserName(name);
    setShowLogin(false);
    showNotification(`Welcome, ${name}!`, 'success');
  };

  const handleFileUpload = async (data: ParsedData) => {
    try {
      console.log('Handling file upload:', {
        rowCount: data.rowCount,
        columnCount: data.columnCount,
        firstRowSample: data.rows[0]?.slice(0, 5),
      });

      if (!data.rows || data.rows.length === 0) {
        showNotification('Uploaded file appears to be empty', 'error');
        return;
      }

      await initializeSpreadsheet(data.rows);
      showNotification('Spreadsheet loaded successfully', 'success');
    } catch (error) {
      console.error('File upload error:', error);
      showNotification(
        error instanceof Error ? error.message : 'Failed to load spreadsheet',
        'error'
      );
    }
  };

  const handleCellValueChanged = useCallback(
    async (row: number, col: number, value: any) => {
      await setCellValue(row, col, value);
      setActiveCell(row, col);
    },
    [setCellValue, setActiveCell]
  );

  const handleSelectionChanged = useCallback(
    (row: number | null, col: number | null) => {
      setSelectedRow(row);
      setSelectedCol(col);
      setActiveCell(row ?? null, col ?? null);
    },
    [setActiveCell]
  );

  const handleInsertRow = useCallback(async () => {
    if (selectedRow === null) return;
    await insertRow(selectedRow);
  }, [selectedRow, insertRow]);

  const handleDeleteRow = useCallback(async () => {
    if (selectedRow === null) return;
    await deleteRow(selectedRow);
  }, [selectedRow, deleteRow]);

  const handleInsertColumn = useCallback(async () => {
    if (selectedCol === null) return;
    await insertColumn(selectedCol);
  }, [selectedCol, insertColumn]);

  const handleDeleteColumn = useCallback(async () => {
    if (selectedCol === null) return;
    await deleteColumn(selectedCol);
  }, [selectedCol, deleteColumn]);

  const handleDownloadCSV = useCallback(() => {
    const gridData = getGridData();
    const csvData = gridData.map((row) => {
      return Object.values(row).map((val) => (val === null ? '' : String(val)));
    });
    exportToCSV(csvData, `spreadsheet-${sessionId.substring(0, 8)}.csv`);
  }, [getGridData, sessionId]);

  const handleColumnResized = useCallback(
    async (col: number, width: number) => {
      await setColumnWidth(col, width);
    },
    [setColumnWidth]
  );

  const handleCopyLink = useCallback(async () => {
    try {
      await copySessionURL();
      showNotification('Session link copied to clipboard!', 'success');
    } catch (error) {
      showNotification('Failed to copy link', 'error');
    }
  }, [showNotification]);

  const existingUserNames = users.map((u) => u.name);
  // Log data loading errors (if any)
  useEffect(() => {
    if (!error) return;
    logError(new Error(error), {
      component: 'App',
      sessionId,
      userId,
    });
  }, [error, sessionId, userId]);

  if (loading && !userName) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <h2>Error</h2>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--purple-600)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  const gridData = getGridData();
  const columnDefs = getColumnDefs();
  const lockedCells = getAllLockedCells();
  const hasData = gridData.length > 0 && Object.keys(gridData[0] || {}).length > 0;

  return (
    <div className="app">
      <UserLogin
        isOpen={showLogin}
        onLogin={handleLogin}
        existingUsers={existingUserNames}
      />

      <FileUpload isOpen={showUpload} onClose={() => setShowUpload(false)} onUpload={handleFileUpload} />

      <div className="app-header">
        <div className="app-header-content">
          <h1 className="app-title">RemoteKeynote</h1>
          <div className="app-header-actions">
            <button className="app-copy-link" onClick={handleCopyLink}>
              🔗 Copy Link
            </button>
            <div className="app-session-id">Session: {sessionId.substring(0, 8)}...</div>
          </div>
        </div>
        <UserPresence users={users} currentUserId={userId} />
      </div>

      <Toolbar
        onInsertRow={handleInsertRow}
        onDeleteRow={handleDeleteRow}
        onInsertColumn={handleInsertColumn}
        onDeleteColumn={handleDeleteColumn}
        onDownloadCSV={handleDownloadCSV}
        onUploadFile={() => setShowUpload(true)}
        selectedRow={selectedRow}
        selectedCol={selectedCol}
        hasData={hasData}
      />

      <div className="app-main">
        {hasData ? (
          <SpreadsheetGrid
            rowData={gridData}
            columnDefs={columnDefs}
            onCellValueChanged={handleCellValueChanged}
            onSelectionChanged={handleSelectionChanged}
            onColumnResized={handleColumnResized}
            lockedCells={lockedCells}
            userId={userId}
          />
        ) : (
          <div className="app-empty-state">
            <h2>No spreadsheet loaded</h2>
            <p>Upload an Excel file to get started</p>
            <button
              className="app-upload-button"
              onClick={() => setShowUpload(true)}
            >
              Upload Excel File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
