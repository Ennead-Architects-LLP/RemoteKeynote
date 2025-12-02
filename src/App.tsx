import { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider, useNotifications } from './components/NotificationSystem';
import { UserLogin } from './components/UserLogin';
import { FileUpload } from './components/FileUpload';
import { Toolbar } from './components/Toolbar';
import { SpreadsheetGrid } from './components/SpreadsheetGrid';
import { UserPresence } from './components/UserPresence';
import { ErrorDashboard } from './components/ErrorDashboard';
import { useSpreadsheet } from './hooks/useSpreadsheet';
import { useUserPresence } from './hooks/useUserPresence';
import { getOrCreateSessionId, copySessionURL } from './utils/sessionManager';
import { exportToCSV } from './utils/csvExporter';
import { useRaceConditionHandler } from './hooks/useRaceConditionHandler';
import { logError, setUserContext } from './utils/errorLogger';
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
  const [showErrorDashboard, setShowErrorDashboard] = useState(false);
  const { showNotification } = useNotifications();

  // Initialize session
  useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);
    const uid = Math.random().toString(36).substring(2, 15);
    setUserId(uid);
    setUserContext(uid, undefined);
  }, []);

  // Update user context when userId or userName changes
  useEffect(() => {
    setUserContext(userId, userName);
  }, [userId, userName]);

  // Keyboard shortcut for error dashboard (Ctrl+Shift+E or Cmd+Shift+E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        setShowErrorDashboard((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    setUserContext(userId, name);
    showNotification(`Welcome, ${name}!`, 'success');
  };

  const handleFileUpload = async (data: ParsedData) => {
    try {
      console.log('[App] STEP 1: handleFileUpload called', {
        rowCount: data.rowCount,
        columnCount: data.columnCount,
        firstRowSample: data.rows[0]?.slice(0, 5),
        totalRows: data.rows.length,
        sessionId,
        userId,
      });

      if (!data.rows || data.rows.length === 0) {
        console.error('[App] ERROR: No rows in uploaded data');
        showNotification('Uploaded file appears to be empty', 'error');
        return;
      }

      console.log('[App] STEP 2: Calling initializeSpreadsheet...');
      await initializeSpreadsheet(data.rows);
      console.log('[App] STEP 3: initializeSpreadsheet completed');

      // Wait a bit for Firebase listener to update
      console.log('[App] STEP 4: Waiting for data propagation...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check data state
      const currentGridData = getGridData();
      const currentColumnDefs = getColumnDefs();
      console.log('[App] STEP 5: Data state after initialization', {
        gridDataLength: currentGridData.length,
        columnDefsLength: currentColumnDefs.length,
        hasData: currentGridData.length > 0 && currentColumnDefs.length > 0,
        firstRow: currentGridData[0],
        firstColumnDef: currentColumnDefs[0],
      });

      showNotification('Spreadsheet loaded successfully', 'success');
    } catch (error) {
      console.error('[App] ERROR: File upload failed', error);
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

  console.log('[App] STEP 1: App render - calling getGridData and getColumnDefs...');
  const gridData = getGridData();
  const columnDefs = getColumnDefs();
  const lockedCells = getAllLockedCells();
  
  // Show grid if we have rows (even if empty) or if we have column definitions
  const hasData = gridData.length > 0 && columnDefs.length > 0;
  
  console.log('[App] STEP 2: Grid state calculated', {
    gridDataLength: gridData.length,
    columnDefsLength: columnDefs.length,
    hasData,
    firstRow: gridData[0],
    firstRowKeys: gridData[0] ? Object.keys(gridData[0]) : [],
    firstRowValues: gridData[0] ? Object.values(gridData[0]).slice(0, 5) : [],
    firstColumnDef: columnDefs[0],
    loading,
    error,
    sessionId,
    userId,
  });
  console.log('[App] STEP 2.1: Grid data RAW:', JSON.stringify(gridData, null, 2).substring(0, 500));

  console.log('[App] STEP 3: Conditional rendering decision', {
    willRenderGrid: hasData,
    willShowEmptyState: !hasData,
    reason: hasData 
      ? 'hasData is true - grid will render' 
      : `hasData is false - gridData.length=${gridData.length}, columnDefs.length=${columnDefs.length}`,
  });

  return (
    <div className="app">
      <UserLogin
        isOpen={showLogin}
        onLogin={handleLogin}
        existingUsers={existingUserNames}
      />

      <FileUpload isOpen={showUpload} onClose={() => setShowUpload(false)} onUpload={handleFileUpload} />
      
      <ErrorDashboard isOpen={showErrorDashboard} onClose={() => setShowErrorDashboard(false)} />

      <div className="app-header">
        <div className="app-header-content">
          <h1 className="app-title">EnneadTabRemoteKeynote</h1>
          <div className="app-header-actions">
            <button className="app-copy-link" onClick={handleCopyLink}>
              🔗 Copy Link
            </button>
            <button 
              className="app-error-dashboard-btn" 
              onClick={() => setShowErrorDashboard(true)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
              title="View Error Dashboard"
            >
              🐛 Errors
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
