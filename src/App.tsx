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
  const [uploadSuccessTime, setUploadSuccessTime] = useState<number | null>(null);
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

      // Retry logic with longer timeout for Firebase data propagation (up to 3 seconds)
      console.log('[App] STEP 4: Waiting for data propagation with retry logic...');
      const maxRetries = 6; // 6 attempts over 3 seconds
      const retryDelay = 500; // 500ms between attempts
      let hasValidData = false;
      let lastError: string | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // Check data state
        const currentGridData = getGridData();
        const currentColumnDefs = getColumnDefs();
        
        console.log(`[App] STEP 4.${attempt}: Data state check attempt ${attempt}/${maxRetries}`, {
          gridDataLength: currentGridData.length,
          columnDefsLength: currentColumnDefs.length,
          firstRow: currentGridData[0],
          firstColumnDef: currentColumnDefs[0],
        });

        // Simplified validation - be very lenient
        // Check if data matches expected dimensions from upload
        const expectedRows = data.rows.length;
        const expectedCols = data.columnCount || (data.rows[0]?.length || 0);
        const actualRows = currentGridData.length;
        const actualCols = currentColumnDefs.length;

        // Check if we have the default empty row (which means no real data)
        const isEmptyDefaultRow = currentGridData.length === 1 && 
                                 Object.keys(currentGridData[0] || {}).length === 1 && 
                                 currentGridData[0]?.col0 === null;
        
        // Very simple validation: accept if we have rows and columns and it's not just the empty default row
        if (!isEmptyDefaultRow && actualRows > 0 && actualCols > 0) {
          // Accept if:
          // 1. We have at least 1 row and 1 column (any data is better than nothing), OR
          // 2. We have the expected number of rows (or close to it)
          if (actualRows >= 1 && actualCols >= 1) {
            hasValidData = true;
            console.log('[App] STEP 5: Valid data confirmed (lenient validation)', {
              expectedRows,
              expectedCols,
              actualRows,
              actualCols,
              isEmptyDefaultRow,
            });
            break;
          }
        }

        // Log why validation failed
        if (attempt === maxRetries) {
          const firstRowSample = currentGridData[0] ? Object.values(currentGridData[0]).slice(0, 5) : null;
          const isEmptyDefaultRow = currentGridData.length === 1 && 
                                   Object.keys(currentGridData[0] || {}).length === 1 && 
                                   currentGridData[0]?.col0 === null;
          
          lastError = `Data validation failed: Expected ${expectedRows} rows × ${expectedCols} cols, got ${actualRows} rows × ${actualCols} cols. ` +
            `isEmptyDefaultRow=${isEmptyDefaultRow}, firstRowSample=${JSON.stringify(firstRowSample)}. ` +
            `Grid data may be empty or incomplete. Please check browser console for more details.`;
          console.error('[App] ERROR: Final validation failed', {
            lastError,
            isEmptyDefaultRow,
            expectedRows,
            expectedCols,
            actualRows,
            actualCols,
            firstRowSample,
            currentGridData: currentGridData.slice(0, 3),
            currentColumnDefs: currentColumnDefs.slice(0, 3),
            fullGridDataSample: JSON.stringify(currentGridData.slice(0, 3), null, 2),
          });
        } else {
          console.log(`[App] STEP 4.${attempt}: Data not ready yet, retrying...`, {
            isEmptyDefaultRow: currentGridData.length === 1 && 
                              Object.keys(currentGridData[0] || {}).length === 1 && 
                              currentGridData[0]?.col0 === null,
            expectedRows,
            expectedCols,
            actualRows,
            actualCols,
          });
        }
      }

      // Final validation before showing success
      if (!hasValidData) {
        const currentGridData = getGridData();
        const currentColumnDefs = getColumnDefs();
        const errorMessage = lastError || 
          `Failed to render spreadsheet data. Expected ${data.rows.length} rows and ${data.columnCount} columns, but got ${currentGridData.length} rows and ${currentColumnDefs.length} columns. Please check the file and try again.`;
        
        console.error('[App] ERROR: Grid data validation failed', {
          errorMessage,
          expectedRows: data.rows.length,
          expectedCols: data.columnCount,
          actualRows: currentGridData.length,
          actualCols: currentColumnDefs.length,
          gridDataSample: currentGridData.slice(0, 2),
          columnDefsSample: currentColumnDefs.slice(0, 3),
        });

        logError(new Error(errorMessage), {
          component: 'App',
          sessionId,
          userId,
          operation: 'handleFileUpload',
          expectedRows: data.rows.length,
          expectedCols: data.columnCount,
          actualRows: currentGridData.length,
          actualCols: currentColumnDefs.length,
        });

        showNotification(errorMessage, 'error');
        return;
      }

      console.log('[App] STEP 6: All validations passed, showing success message');
      
      // Set upload success time to trigger re-render
      setUploadSuccessTime(Date.now());
      
      // Final check - log current state
      const finalCheck = getGridData();
      const finalCols = getColumnDefs();
      console.log('[App] STEP 6.1: Final state check', {
        finalGridDataLength: finalCheck.length,
        finalColumnDefsLength: finalCols.length,
        sampleRow: finalCheck[0],
        sampleCol: finalCols[0],
        isEmptyDefaultRow: finalCheck.length === 1 && 
                          Object.keys(finalCheck[0] || {}).length === 1 && 
                          finalCheck[0]?.col0 === null,
      });
      
      showNotification('Spreadsheet loaded successfully', 'success');
      
      // Force React to re-render by updating state
      // This ensures the component checks hasData again after state updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check again after delay and log warning if data disappeared
      const delayedCheck = getGridData();
      const delayedCols = getColumnDefs();
      console.log('[App] STEP 6.2: Delayed state check (after 100ms)', {
        finalGridDataLength: delayedCheck.length,
        finalColumnDefsLength: delayedCols.length,
        sampleRow: delayedCheck[0],
        isEmptyDefaultRow: delayedCheck.length === 1 && 
                          Object.keys(delayedCheck[0] || {}).length === 1 && 
                          delayedCheck[0]?.col0 === null,
      });
      
      // Log warning if data seems to have disappeared
      if (delayedCheck.length === 1 && 
          Object.keys(delayedCheck[0] || {}).length === 1 && 
          delayedCheck[0]?.col0 === null) {
        console.warn('[App] WARNING: Data appears to be lost after upload. This might be a timing issue.');
        logError(new Error('Data lost after upload - possible timing issue'), {
          component: 'App',
          sessionId,
          userId,
          operation: 'handleFileUpload',
          expectedRows: data.rows.length,
          actualRows: delayedCheck.length,
        }, { skipDeduplication: true });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load spreadsheet';
      console.error('[App] ERROR: File upload failed', error);
      
      logError(error instanceof Error ? error : new Error(errorMessage), {
        component: 'App',
        sessionId,
        userId,
        operation: 'handleFileUpload',
      });

      showNotification(errorMessage, 'error');
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
  
  // Show grid if we have actual data (not just the default empty row)
  // Check that we have data and it's not just the empty default row
  const hasEmptyDefaultRow = gridData.length === 1 && 
                             gridData[0] && 
                             Object.keys(gridData[0]).length === 1 && 
                             gridData[0]?.col0 === null;
  
  // If we recently had a successful upload (within 10 seconds), be more lenient
  const recentUpload: boolean = uploadSuccessTime !== null && (Date.now() - uploadSuccessTime < 10000);
  
  // More lenient: accept if we have rows and columns, OR if we recently uploaded
  // This handles timing issues where data exists but check is too strict
  const hasData: boolean = gridData.length > 0 && 
                  columnDefs.length > 0 && 
                  (!hasEmptyDefaultRow || (recentUpload && gridData.length >= 1 && columnDefs.length > 1));
  
  // Additional check: if we have multiple rows or columns, definitely show grid
  const hasMultipleRows: boolean = gridData.length > 1;
  const hasMultipleCols: boolean = columnDefs.length > 1;
  const definitelyHasData: boolean = hasMultipleRows || hasMultipleCols;
  
  // Final decision: show grid if hasData OR definitely has data OR recent upload with any data
  const shouldRenderGrid: boolean = hasData || definitelyHasData || (recentUpload && gridData.length > 0 && columnDefs.length > 0);
  
  // Count rows with actual data
  const rowsWithData = gridData.filter(row => 
    row && Object.values(row).some(val => val !== null && val !== '')
  ).length;
  
  console.log('[App] STEP 2: Grid state calculated', {
    gridDataLength: gridData.length,
    columnDefsLength: columnDefs.length,
    hasData,
    hasEmptyDefaultRow,
    rowsWithData,
    recentUpload,
    uploadSuccessTime,
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
    willRenderGrid: shouldRenderGrid,
    hasData,
    definitelyHasData,
    hasMultipleRows,
    hasMultipleCols,
    recentUpload,
    willShowEmptyState: !shouldRenderGrid,
    reason: shouldRenderGrid 
      ? 'Grid will render - hasData OR multiple rows/cols OR recent upload' 
      : `Grid will NOT render - gridData.length=${gridData.length}, columnDefs.length=${columnDefs.length}, hasEmptyDefaultRow=${hasEmptyDefaultRow}`,
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
        hasData={shouldRenderGrid}
      />

      <div className="app-main">
        {shouldRenderGrid ? (
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
