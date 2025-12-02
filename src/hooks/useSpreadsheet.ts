import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, set, update, get } from 'firebase/database';
import { database } from '../firebase/config';
import { useRaceConditionHandler } from './useRaceConditionHandler';
import { logError } from '../utils/errorLogger';
import type { CellValue } from '../utils/raceConditionHandler';

export interface SpreadsheetData {
  [rowIndex: string]: {
    [colIndex: string]: CellValue;
  };
}

export interface SpreadsheetMetadata {
  name: string;
  createdAt: number;
  lastModified: number;
  columnWidths?: { [colIndex: string]: number };
  rowHeights?: { [rowIndex: string]: number };
}

export function useSpreadsheet(sessionId: string, userId: string) {
  const [data, setData] = useState<SpreadsheetData>({});
  const [metadata, setMetadata] = useState<SpreadsheetMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { updateCell, executeStructuralOperation, flushBatchUpdates } =
    useRaceConditionHandler(userId);

  const dataRefPath = ref(database, `spreadsheets/${sessionId}/data`);
  const metadataRefPath = ref(database, `spreadsheets/${sessionId}/metadata`);

  // Note: Batch updates are handled by the race condition handler
  // This hook uses updateCell which internally handles batching

  // Listen to Firebase changes
  useEffect(() => {
    console.log('[useSpreadsheet] Setting up Firebase listeners', { 
      sessionId,
      dataRefPath: `spreadsheets/${sessionId}/data`,
      metadataRefPath: `spreadsheets/${sessionId}/metadata`,
    });
    setLoading(true);

    const unsubscribeData = onValue(
      dataRefPath,
      (snapshot) => {
        const firebaseData = snapshot.val() || {};
        console.log('[useSpreadsheet] Firebase data listener triggered', {
          hasData: Object.keys(firebaseData).length > 0,
          rowCount: Object.keys(firebaseData).length,
          firstRowKeys: Object.keys(firebaseData).slice(0, 5),
          sampleRow: firebaseData[Object.keys(firebaseData)[0]],
          timestamp: Date.now(),
        });
        console.log('[useSpreadsheet] Firebase data RAW:', JSON.stringify(firebaseData, null, 2).substring(0, 500));
        
        console.log('[useSpreadsheet] Updating data state...');
        setData(firebaseData);
        setLoading(false);
        setError(null);
        
        // Log state after update (will be available in next render)
        setTimeout(() => {
          console.log('[useSpreadsheet] Data state updated, checking grid data...');
          // This will be logged in getGridData/getColumnDefs
        }, 100);
      },
      (err) => {
        const errorMessage = err.message || 'Failed to load spreadsheet data';
        console.error('[useSpreadsheet] Firebase listener error', err);
        setError(errorMessage);
        setLoading(false);
        logError(err instanceof Error ? err : new Error(errorMessage), {
          component: 'useSpreadsheet',
          sessionId,
          operation: 'loadData',
        });
      }
    );

    const unsubscribeMetadata = onValue(
      metadataRefPath,
      (snapshot) => {
        const firebaseMetadata = snapshot.val();
        if (firebaseMetadata) {
          setMetadata(firebaseMetadata);
        } else {
          // Initialize metadata if it doesn't exist
          const initialMetadata: SpreadsheetMetadata = {
            name: 'Untitled Spreadsheet',
            createdAt: Date.now(),
            lastModified: Date.now(),
          };
          set(metadataRefPath, initialMetadata);
        }
      },
      (err) => {
        logError(err instanceof Error ? err : new Error(String(err)), {
          component: 'useSpreadsheet',
          sessionId,
          operation: 'loadMetadata',
        });
      }
    );

    return () => {
      unsubscribeData();
      unsubscribeMetadata();
    };
  }, [sessionId]);

  // Update cell value
  const setCellValue = useCallback(
    async (row: number, col: number, value: string | number | null) => {
      const cellId = `${row}:${col}`;
      const success = await updateCell(cellId, value, async (id, cellValue) => {
        const [r, c] = id.split(':');
        const updates: any = {};
        if (!updates[r]) {
          updates[r] = {};
        }
        updates[r][c] = cellValue;
        await update(dataRefPath, updates);
        await update(metadataRefPath, { lastModified: Date.now() });
      });

      return success;
    },
    [updateCell, dataRefPath, metadataRefPath]
  );

  // Flush any pending batch updates on unmount
  useEffect(() => {
    return () => {
      flushBatchUpdates(async (updates) => {
        const updatesObj: any = {};
        for (const [cellId, cellValue] of updates.entries()) {
          const [row, col] = cellId.split(':');
          if (!updatesObj[row]) {
            updatesObj[row] = {};
          }
          updatesObj[row][col] = cellValue;
        }
        if (Object.keys(updatesObj).length > 0) {
          await update(dataRefPath, updatesObj);
          await update(metadataRefPath, { lastModified: Date.now() });
        }
      });
    };
  }, [flushBatchUpdates, dataRefPath, metadataRefPath]);

  // Initialize spreadsheet with data
  const initializeSpreadsheet = useCallback(
    async (rows: (string | number | null)[][]) => {
      try {
        console.log('[useSpreadsheet] STEP 1: initializeSpreadsheet called', {
          rowCount: rows?.length || 0,
          columnCount: rows?.[0]?.length || 0,
          sessionId,
          userId,
          dataRefPath: `spreadsheets/${sessionId}/data`,
        });

        if (!rows || rows.length === 0) {
          const errorMsg = 'No data to initialize. Rows array is empty.';
          console.error('[useSpreadsheet] ERROR:', errorMsg);
          setError(errorMsg);
          logError(new Error(errorMsg), {
            component: 'useSpreadsheet',
            sessionId,
            operation: 'initializeSpreadsheet',
          });
          return;
        }

        console.log('[useSpreadsheet] STEP 2: Transforming rows to SpreadsheetData format...');
        const newData: SpreadsheetData = {};
        rows.forEach((row, rowIndex) => {
          newData[String(rowIndex)] = {};
          row.forEach((cell, colIndex) => {
            const cellValue: CellValue = {
              value: cell,
              timestamp: Date.now(),
              userId,
              version: 1,
            };
            newData[String(rowIndex)][String(colIndex)] = cellValue;
          });
        });

        console.log('[useSpreadsheet] STEP 3: Data transformation complete', {
          rowCount: rows.length,
          columnCount: rows[0]?.length || 0,
          dataKeys: Object.keys(newData).slice(0, 5),
          firstRowKeys: Object.keys(newData['0'] || {}).slice(0, 5),
          firstRowSample: newData['0'],
        });

        console.log('[useSpreadsheet] STEP 4: Writing data to Firebase...');
        await set(dataRefPath, newData);
        console.log('[useSpreadsheet] STEP 5: Data written to Firebase successfully');

        console.log('[useSpreadsheet] STEP 6: Writing metadata to Firebase...');
        await set(metadataRefPath, {
          name: 'Uploaded Spreadsheet',
          createdAt: Date.now(),
          lastModified: Date.now(),
        });
        console.log('[useSpreadsheet] STEP 7: Metadata written to Firebase successfully');

        console.log('[useSpreadsheet] STEP 8: Updating local state immediately...');
        // Also update local state immediately to avoid waiting for Firebase listener
        setData(newData);
        setLoading(false);
        console.log('[useSpreadsheet] STEP 9: Local state updated', {
          newDataKeys: Object.keys(newData),
          firstRowSample: newData['0'],
          totalRows: Object.keys(newData).length,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to initialize spreadsheet';
        console.error('[useSpreadsheet] ERROR: Initialization failed', error);
        setError(errorMsg);
        logError(error instanceof Error ? error : new Error(errorMsg), {
          component: 'useSpreadsheet',
          sessionId,
          operation: 'initializeSpreadsheet',
          rowCount: rows?.length || 0,
        });
        throw error;
      }
    },
    [userId, dataRefPath, metadataRefPath, sessionId]
  );

  // Insert row
  const insertRow = useCallback(
    async (rowIndex: number) => {
      await executeStructuralOperation(async () => {
        const snapshot = await get(dataRefPath);
        const currentData = snapshot.val() || {};
        const newData: SpreadsheetData = {};

        // Shift rows down
        Object.keys(currentData)
          .map(Number)
          .sort((a, b) => b - a)
          .forEach((r) => {
            if (r >= rowIndex) {
              newData[r + 1] = currentData[r];
            } else {
              newData[r] = currentData[r];
            }
          });

        // Insert empty row
        const maxCols = Math.max(
          ...Object.values(currentData).map((row: any) => Object.keys(row || {}).length),
          0
        );
        newData[rowIndex] = {};
        for (let c = 0; c < maxCols; c++) {
          newData[rowIndex][c] = {
            value: null,
            timestamp: Date.now(),
            userId,
            version: 1,
          };
        }

        await set(dataRefPath, newData);
        await update(metadataRefPath, { lastModified: Date.now() });
      });
    },
    [userId, dataRefPath, metadataRefPath, executeStructuralOperation]
  );

  // Delete row
  const deleteRow = useCallback(
    async (rowIndex: number) => {
      await executeStructuralOperation(async () => {
        const snapshot = await get(dataRefPath);
        const currentData = snapshot.val() || {};
        const newData: SpreadsheetData = {};

        // Shift rows up
        Object.keys(currentData)
          .map(Number)
          .forEach((r) => {
            if (r < rowIndex) {
              newData[r] = currentData[r];
            } else if (r > rowIndex) {
              newData[r - 1] = currentData[r];
            }
            // Skip the deleted row
          });

        await set(dataRefPath, newData);
        await update(metadataRefPath, { lastModified: Date.now() });
      });
    },
    [dataRefPath, metadataRefPath, executeStructuralOperation]
  );

  // Insert column
  const insertColumn = useCallback(
    async (colIndex: number) => {
      await executeStructuralOperation(async () => {
        const snapshot = await get(dataRefPath);
        const currentData = snapshot.val() || {};
        const newData: SpreadsheetData = {};

        Object.keys(currentData).forEach((r) => {
          const row = currentData[r] || {};
          newData[r] = {};
          const cols = Object.keys(row).map(Number).sort((a, b) => a - b);
          cols.forEach((c) => {
            if (c < colIndex) {
              newData[r][c] = row[c];
            } else {
              newData[r][c + 1] = row[c];
            }
          });
          // Insert empty cell
          newData[r][colIndex] = {
            value: null,
            timestamp: Date.now(),
            userId,
            version: 1,
          };
        });

        await set(dataRefPath, newData);
        await update(metadataRefPath, { lastModified: Date.now() });
      });
    },
    [userId, dataRefPath, metadataRefPath, executeStructuralOperation]
  );

  // Delete column
  const deleteColumn = useCallback(
    async (colIndex: number) => {
      await executeStructuralOperation(async () => {
        const snapshot = await get(dataRefPath);
        const currentData = snapshot.val() || {};
        const newData: SpreadsheetData = {};

        Object.keys(currentData).forEach((r) => {
          const row = currentData[r] || {};
          newData[r] = {};
          Object.keys(row).forEach((c) => {
            const colNum = Number(c);
            if (colNum < colIndex) {
              newData[r][c] = row[c];
            } else if (colNum > colIndex) {
              newData[r][colNum - 1] = row[c];
            }
            // Skip the deleted column
          });
        });

        await set(dataRefPath, newData);
        await update(metadataRefPath, { lastModified: Date.now() });
      });
    },
    [dataRefPath, metadataRefPath, executeStructuralOperation]
  );

  // Update column width
  const setColumnWidth = useCallback(
    async (colIndex: number, width: number) => {
      const snapshot = await get(metadataRefPath);
      const currentMetadata = snapshot.val() || {};
      const columnWidths = currentMetadata.columnWidths || {};
      columnWidths[colIndex] = width;

      await update(metadataRefPath, {
        columnWidths,
        lastModified: Date.now(),
      });
    },
    [metadataRefPath]
  );

  // Update row height
  const setRowHeight = useCallback(
    async (rowIndex: number, height: number) => {
      const snapshot = await get(metadataRefPath);
      const currentMetadata = snapshot.val() || {};
      const rowHeights = currentMetadata.rowHeights || {};
      rowHeights[rowIndex] = height;

      await update(metadataRefPath, {
        rowHeights,
        lastModified: Date.now(),
      });
    },
    [metadataRefPath]
  );

  // Get cell value helper
  const getCellValue = useCallback(
    (row: number, col: number): string | number | null => {
      // Firebase stores keys as strings, so we need to convert to strings
      return data[String(row)]?.[String(col)]?.value ?? null;
    },
    [data]
  );

  // Convert data to grid format for AG Grid
  const getGridData = useCallback((): any[] => {
    console.log('[getGridData] STEP 1: Called', {
      dataKeys: Object.keys(data).slice(0, 5),
      dataSize: Object.keys(data).length,
      timestamp: Date.now(),
    });
    console.log('[getGridData] STEP 1.1: Data object RAW:', JSON.stringify(data, null, 2).substring(0, 500));

    try {
      const rows: any[] = [];
      const rowIndices = Object.keys(data)
        .map(Number)
        .sort((a, b) => a - b);

      console.log('[getGridData] STEP 2: Row indices calculated', {
        rowIndicesCount: rowIndices.length,
        rowIndices: rowIndices.slice(0, 5),
      });

      if (rowIndices.length === 0) {
        console.log('[getGridData] STEP 3: No data, returning empty row');
        return [{ col0: null }];
      }

      // Validation: Check data structure
      const invalidRows = rowIndices.filter(r => {
        const rowData = data[String(r)];
        return !rowData || typeof rowData !== 'object';
      });

      if (invalidRows.length > 0) {
        console.warn('[getGridData] WARNING: Found invalid row structures', {
          invalidRows: invalidRows.slice(0, 5),
        });
      }

      console.log('[getGridData] STEP 3: Calculating max column...');
      const maxCol = Math.max(
        ...rowIndices.map((r) => {
          // Firebase stores keys as strings, so access with string key
          const rowData = data[String(r)];
          if (!rowData || typeof rowData !== 'object') {
            return 0;
          }
          const cols = Object.keys(rowData).map(Number);
          return cols.length > 0 ? Math.max(...cols) : 0;
        }),
        0
      );

      console.log('[getGridData] STEP 4: Max column calculated', {
        rowCount: rowIndices.length,
        maxCol,
        firstRowSample: rowIndices.length > 0 ? data[String(rowIndices[0])] : null,
      });

      // Validation: Check if maxCol calculation is valid
      if (isNaN(maxCol) || maxCol < 0) {
        console.error('[getGridData] ERROR: Invalid max column calculated', { maxCol });
        logError(new Error(`Invalid max column calculated: ${maxCol}`), {
          component: 'getGridData',
          sessionId,
          operation: 'calculateMaxColumn',
          dataSize: Object.keys(data).length,
          rowIndicesCount: rowIndices.length,
        });
        return [{ col0: null }];
      }

      console.log('[getGridData] STEP 5: Transforming rows to AG Grid format...');
      let transformationErrors = 0;
      
      rowIndices.forEach((rowIndex, idx) => {
        try {
          const row: any = {};
          for (let col = 0; col <= maxCol; col++) {
            row[`col${col}`] = getCellValue(rowIndex, col);
          }
          rows.push(row);
          
          if (idx === 0) {
            console.log('[getGridData] STEP 5.1: First row transformed', {
              rowIndex,
              rowKeys: Object.keys(row),
              rowValues: Object.values(row).slice(0, 5),
            });
          }
        } catch (rowError) {
          transformationErrors++;
          console.error(`[getGridData] ERROR: Failed to transform row ${rowIndex}`, rowError);
          if (transformationErrors <= 3) {
            logError(rowError instanceof Error ? rowError : new Error(String(rowError)), {
              component: 'getGridData',
              sessionId,
              operation: 'transformRow',
              rowIndex,
            });
          }
        }
      });

      if (transformationErrors > 0) {
        console.warn('[getGridData] WARNING: Some rows failed to transform', {
          totalRows: rowIndices.length,
          errors: transformationErrors,
        });
      }

      console.log('[getGridData] STEP 6: Transformation complete', {
        rowCount: rows.length,
        firstRow: rows[0],
        firstRowKeys: rows[0] ? Object.keys(rows[0]) : [],
        firstRowValues: rows[0] ? Object.values(rows[0]).slice(0, 5) : [],
        transformationErrors,
      });

      // Validation: Check if transformation produced valid results
      if (rows.length === 0 && rowIndices.length > 0) {
        console.error('[getGridData] ERROR: Transformation produced no rows despite having data', {
          rowIndicesCount: rowIndices.length,
          maxCol,
        });
        logError(new Error('Data transformation produced no rows'), {
          component: 'getGridData',
          sessionId,
          operation: 'validateTransformation',
          rowIndicesCount: rowIndices.length,
          maxCol,
        });
        return [{ col0: null }];
      }

      const result = rows.length > 0 ? rows : [{ col0: null }];
      console.log('[getGridData] STEP 7: Returning result', {
        resultLength: result.length,
        resultType: result.length > 0 ? 'data' : 'empty',
      });

      return result;
    } catch (error) {
      console.error('[getGridData] ERROR: Fatal error during transformation', error);
      logError(error instanceof Error ? error : new Error(String(error)), {
        component: 'getGridData',
        sessionId,
        operation: 'fatalError',
        dataSize: Object.keys(data).length,
      });
      return [{ col0: null }];
    }
  }, [data, getCellValue, sessionId]);

  // Get column definitions for AG Grid
  const getColumnDefs = useCallback((): any[] => {
    console.log('[getColumnDefs] STEP 1: Called', {
      dataKeys: Object.keys(data).slice(0, 5),
      dataSize: Object.keys(data).length,
      hasMetadata: !!metadata,
      timestamp: Date.now(),
    });

    try {
      const rowIndices = Object.keys(data).map(Number);
      console.log('[getColumnDefs] STEP 2: Row indices', {
        rowIndicesCount: rowIndices.length,
        rowIndices: rowIndices.slice(0, 5),
      });

      let maxCol = 0;
      
      if (rowIndices.length === 0) {
        console.log('[getColumnDefs] STEP 2.1: No data, returning default column');
        return [{ field: 'col0', headerName: 'A', editable: true, width: 120 }];
      }

      // Calculate max column with validation
      try {
        maxCol = Math.max(
          ...rowIndices.map((r) => {
            // Firebase stores keys as strings, so access with string key
            const rowData = data[String(r)];
            if (!rowData || typeof rowData !== 'object') {
              return 0;
            }
            const cols = Object.keys(rowData).map(Number);
            return cols.length > 0 ? Math.max(...cols) : 0;
          }),
          0
        );
      } catch (calcError) {
        console.error('[getColumnDefs] ERROR: Failed to calculate max column', calcError);
        logError(calcError instanceof Error ? calcError : new Error(String(calcError)), {
          component: 'getColumnDefs',
          sessionId,
          operation: 'calculateMaxColumn',
          rowIndicesCount: rowIndices.length,
        });
        maxCol = 0;
      }

      console.log('[getColumnDefs] STEP 3: Max column calculated', {
        maxCol,
      });

      // Validation: Check if maxCol is valid
      if (isNaN(maxCol) || maxCol < 0) {
        console.error('[getColumnDefs] ERROR: Invalid max column calculated', { maxCol });
        logError(new Error(`Invalid max column calculated: ${maxCol}`), {
          component: 'getColumnDefs',
          sessionId,
          operation: 'validateMaxColumn',
          dataSize: Object.keys(data).length,
          rowIndicesCount: rowIndices.length,
        });
        return [{ field: 'col0', headerName: 'A', editable: true, width: 120 }];
      }

      console.log('[getColumnDefs] STEP 4: Generating column definitions...');
      const cols: any[] = [];
      
      try {
        for (let col = 0; col <= maxCol; col++) {
          const colWidth = metadata?.columnWidths?.[col];
          
          // Validation: Check column width is valid
          const validWidth = typeof colWidth === 'number' && colWidth > 0 ? colWidth : 120;
          
          const colDef = {
            field: `col${col}`,
            headerName: String.fromCharCode(65 + (col % 26)) + (col >= 26 ? Math.floor(col / 26) : ''),
            editable: true,
            width: validWidth,
            resizable: true,
            sortable: false,
            filter: false,
          };
          cols.push(colDef);
          
          if (col === 0) {
            console.log('[getColumnDefs] STEP 4.1: First column definition', colDef);
          }
        }
      } catch (colGenError) {
        console.error('[getColumnDefs] ERROR: Failed to generate column definitions', colGenError);
        logError(colGenError instanceof Error ? colGenError : new Error(String(colGenError)), {
          component: 'getColumnDefs',
          sessionId,
          operation: 'generateColumns',
          maxCol,
        });
        // Return default column if generation fails
        return [{ field: 'col0', headerName: 'A', editable: true, width: 120 }];
      }

      console.log('[getColumnDefs] STEP 5: Column definitions generated', {
        columnCount: cols.length,
        firstColumn: cols[0],
        allColumns: cols.map(c => c.field),
      });

      // Validation: Check if we generated valid columns
      if (cols.length === 0) {
        console.error('[getColumnDefs] ERROR: No columns generated despite maxCol > 0', { maxCol });
        logError(new Error('Column generation produced no results'), {
          component: 'getColumnDefs',
          sessionId,
          operation: 'validateColumns',
          maxCol,
        });
        return [{ field: 'col0', headerName: 'A', editable: true, width: 120 }];
      }

      const result = cols.length > 0 ? cols : [{ field: 'col0', headerName: 'A', editable: true, width: 120 }];
      console.log('[getColumnDefs] STEP 6: Returning result', {
        resultLength: result.length,
        resultType: result.length > 0 ? 'columns' : 'default',
      });

      return result;
    } catch (error) {
      console.error('[getColumnDefs] ERROR: Fatal error during column generation', error);
      logError(error instanceof Error ? error : new Error(String(error)), {
        component: 'getColumnDefs',
        sessionId,
        operation: 'fatalError',
        dataSize: Object.keys(data).length,
      });
      return [{ field: 'col0', headerName: 'A', editable: true, width: 120 }];
    }
  }, [data, metadata, sessionId]);

  return {
    data,
    metadata,
    loading,
    error,
    setCellValue,
    initializeSpreadsheet,
    insertRow,
    deleteRow,
    insertColumn,
    deleteColumn,
    setColumnWidth,
    setRowHeight,
    getCellValue,
    getGridData,
    getColumnDefs,
  };
}

