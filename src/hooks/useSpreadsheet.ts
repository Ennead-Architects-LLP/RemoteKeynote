import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, set, update, get, DataSnapshot } from 'firebase/database';
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
  const dataRef = useRef<DataSnapshot | null>(null);
  const { updateCell, executeStructuralOperation, flushBatchUpdates } =
    useRaceConditionHandler(userId);

  const spreadsheetRef = ref(database, `spreadsheets/${sessionId}`);
  const dataRefPath = ref(database, `spreadsheets/${sessionId}/data`);
  const metadataRefPath = ref(database, `spreadsheets/${sessionId}/metadata`);

  // Note: Batch updates are handled by the race condition handler
  // This hook uses updateCell which internally handles batching

  // Listen to Firebase changes
  useEffect(() => {
    setLoading(true);

    const unsubscribeData = onValue(
      dataRefPath,
      (snapshot) => {
        const firebaseData = snapshot.val() || {};
        setData(firebaseData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        const errorMessage = err.message || 'Failed to load spreadsheet data';
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
        console.error('Metadata error:', err);
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
      const newData: SpreadsheetData = {};
      rows.forEach((row, rowIndex) => {
        newData[rowIndex] = {};
        row.forEach((cell, colIndex) => {
          const cellValue: CellValue = {
            value: cell,
            timestamp: Date.now(),
            userId,
            version: 1,
          };
          newData[rowIndex][colIndex] = cellValue;
        });
      });

      await set(dataRefPath, newData);
      await set(metadataRefPath, {
        name: 'Uploaded Spreadsheet',
        createdAt: Date.now(),
        lastModified: Date.now(),
      });
    },
    [userId, dataRefPath, metadataRefPath]
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
      return data[row]?.[col]?.value ?? null;
    },
    [data]
  );

  // Convert data to grid format for AG Grid
  const getGridData = useCallback((): any[] => {
    const rows: any[] = [];
    const rowIndices = Object.keys(data)
      .map(Number)
      .sort((a, b) => a - b);

    if (rowIndices.length === 0) {
      return [{ col0: null }];
    }

    const maxCol = Math.max(
      ...rowIndices.map((r) => {
        const cols = Object.keys(data[r] || {}).map(Number);
        return cols.length > 0 ? Math.max(...cols) : 0;
      }),
      0
    );

    rowIndices.forEach((rowIndex) => {
      const row: any = {};
      for (let col = 0; col <= maxCol; col++) {
        row[`col${col}`] = getCellValue(rowIndex, col);
      }
      rows.push(row);
    });

    return rows.length > 0 ? rows : [{ col0: null }];
  }, [data, getCellValue]);

  // Get column definitions for AG Grid
  const getColumnDefs = useCallback((): any[] => {
    const rowIndices = Object.keys(data).map(Number);
    const maxCol = Math.max(
      ...rowIndices.map((r) => {
        const cols = Object.keys(data[r] || {}).map(Number);
        return cols.length > 0 ? Math.max(...cols) : 0;
      }),
      0
    );

    const cols: any[] = [];
    for (let col = 0; col <= maxCol; col++) {
      const colWidth = metadata?.columnWidths?.[col];
      cols.push({
        field: `col${col}`,
        headerName: String.fromCharCode(65 + (col % 26)) + (col >= 26 ? Math.floor(col / 26) : ''),
        editable: true,
        width: colWidth || 120,
        resizable: true,
        sortable: false,
        filter: false,
      });
    }

    return cols.length > 0 ? cols : [{ field: 'col0', headerName: 'A', editable: true, width: 120 }];
  }, [data, metadata]);

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

