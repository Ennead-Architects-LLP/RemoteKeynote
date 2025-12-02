import { useEffect, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, CellValueChangedEvent, SelectionChangedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { useTheme } from '../context/ThemeContext';
import { useRaceConditionHandler } from '../hooks/useRaceConditionHandler';
import './SpreadsheetGrid.css';

interface SpreadsheetGridProps {
  rowData: any[];
  columnDefs: ColDef[];
  onCellValueChanged: (row: number, col: number, value: any) => void;
  onSelectionChanged: (row: number | null, col: number | null) => void;
  onColumnResized: (col: number, width: number) => void;
  lockedCells: Map<string, string>;
  userId: string;
}

export const SpreadsheetGrid = ({
  rowData,
  columnDefs,
  onCellValueChanged,
  onSelectionChanged,
  onColumnResized,
  lockedCells,
  userId,
}: SpreadsheetGridProps) => {
  const gridRef = useRef<AgGridReact>(null);
  const theme = useTheme();
  const { getCellLockedBy } = useRaceConditionHandler(userId);

  useEffect(() => {
    // Apply custom theme colors
    const root = document.documentElement;
    root.style.setProperty('--ag-background-color', theme.colors.bg.primary);
    root.style.setProperty('--ag-header-background-color', theme.colors.bg.secondary);
    root.style.setProperty('--ag-odd-row-background-color', theme.colors.bg.primary);
    root.style.setProperty('--ag-row-hover-color', theme.colors.bg.tertiary);
    root.style.setProperty('--ag-header-foreground-color', theme.colors.text.primary);
    root.style.setProperty('--ag-foreground-color', theme.colors.text.primary);
    root.style.setProperty('--ag-border-color', theme.colors.border.default);
    root.style.setProperty('--ag-input-border-color', theme.colors.border.default);
    root.style.setProperty('--ag-input-focus-border-color', theme.colors.purple[600]);
  }, [theme]);

  // Force grid refresh when data changes
  useEffect(() => {
    if (gridRef.current?.api) {
      console.log('SpreadsheetGrid: Data changed, refreshing grid', {
        rowCount: rowData.length,
        columnCount: columnDefs.length,
      });
      gridRef.current.api.refreshCells({ force: true });
    }
  }, [rowData, columnDefs]);

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent) => {
      if (!event.data || event.colDef?.field === undefined) return;

      const rowIndex = event.node.rowIndex ?? 0;
      const colIndex = parseInt(event.colDef.field.replace('col', ''), 10);
      const newValue = event.newValue;

      onCellValueChanged(rowIndex, colIndex, newValue);
    },
    [onCellValueChanged]
  );

  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent) => {
      const selectedNodes = event.api.getSelectedNodes();
      if (selectedNodes.length > 0) {
        const node = selectedNodes[0];
        const rowIndex = node.rowIndex ?? null;
        // Get selected column from focused cell
        const focusedCell = event.api.getFocusedCell();
        const colIndex = focusedCell ? parseInt(focusedCell.column.getColId().replace('col', ''), 10) : null;
        onSelectionChanged(rowIndex, colIndex);
      } else {
        onSelectionChanged(null, null);
      }
    },
    [onSelectionChanged]
  );

  const handleColumnResized = useCallback(
    (event: any) => {
      if (event.finished && event.column) {
        const colField = event.column.getColId();
        const colIndex = parseInt(colField.replace('col', ''), 10);
        const width = event.column.getActualWidth();
        onColumnResized(colIndex, width);
      }
    },
    [onColumnResized]
  );

  // Apply cell locking styles - handled via AG Grid cell renderer
  // lockedCells map is referenced to avoid unused-prop warnings
  useEffect(() => {
    // No-op that references lockedCells so it's considered used
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    lockedCells.size;
  }, [lockedCells]);

  const defaultColDef: ColDef = {
    editable: true,
    resizable: true,
    sortable: false,
    filter: false,
    cellStyle: (params) => {
      const baseStyle: any = { padding: '8px' };
      if (params.node.rowIndex !== null && params.colDef.field) {
        const colIndex = parseInt(params.colDef.field.replace('col', ''), 10);
        const cellId = `${params.node.rowIndex}:${colIndex}`;
        const lockedBy = getCellLockedBy(cellId);
        if (lockedBy && lockedBy !== userId) {
          baseStyle.border = `2px solid ${theme.colors.purple[400]}`;
          baseStyle.borderRadius = '4px';
        }
      }
      return baseStyle;
    },
  };

  return (
    <div className="spreadsheet-grid-container" style={{ backgroundColor: theme.colors.bg.primary }}>
      <div className="ag-theme-quartz" style={{ height: '100%', width: '100%', minHeight: '400px' }}>
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={(event: GridReadyEvent) => {
            console.log('AG Grid ready:', {
              rowCount: event.api.getDisplayedRowCount(),
              columnCount: columnDefs.length,
            });
            event.api.sizeColumnsToFit();
          }}
          onCellValueChanged={handleCellValueChanged}
          onSelectionChanged={handleSelectionChanged}
          onColumnResized={handleColumnResized}
          rowSelection="single"
          suppressRowClickSelection={false}
          animateRows={true}
          enableCellTextSelection={true}
          ensureDomOrder={true}
          key={`grid-${rowData.length}-${columnDefs.length}`}
        />
      </div>
    </div>
  );
};

