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
  console.log('[SpreadsheetGrid] STEP 1: Component render', {
    rowDataLength: rowData.length,
    columnDefsLength: columnDefs.length,
    firstRow: rowData[0],
    firstRowKeys: rowData[0] ? Object.keys(rowData[0]) : [],
    firstRowValues: rowData[0] ? Object.values(rowData[0]).slice(0, 5) : [],
    firstColumnDef: columnDefs[0],
    userId,
    timestamp: Date.now(),
  });
  console.log('[SpreadsheetGrid] STEP 1.1: Full first row data:', JSON.stringify(rowData[0], null, 2));

  const gridRef = useRef<AgGridReact>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const { getCellLockedBy } = useRaceConditionHandler(userId);

  useEffect(() => {
    console.log('[SpreadsheetGrid] STEP 2: Applying theme colors');
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
    console.log('[SpreadsheetGrid] STEP 2.1: Theme colors applied');
  }, [theme]);

  // Ensure grid container has explicit height
  useEffect(() => {
    const updateGridHeight = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const height = rect.height;
        console.log('[SpreadsheetGrid] STEP 2.2: Container height calculation', {
          containerHeight: height,
          rectHeight: rect.height,
          clientHeight: container.clientHeight,
          offsetHeight: container.offsetHeight,
        });
        
        // Ensure AG Grid container has explicit height
        const agTheme = container.querySelector('.ag-theme-quartz') as HTMLElement;
        if (agTheme && height > 0) {
          agTheme.style.height = `${height}px`;
          console.log('[SpreadsheetGrid] STEP 2.3: Set explicit height on AG Grid container', height);
        }
      }
    };

    updateGridHeight();
    window.addEventListener('resize', updateGridHeight);
    // Also update after a short delay to catch any layout changes
    const timeoutId = setTimeout(updateGridHeight, 100);
    
    return () => {
      window.removeEventListener('resize', updateGridHeight);
      clearTimeout(timeoutId);
    };
  }, []);

  // Force grid refresh when data changes
  useEffect(() => {
    console.log('[SpreadsheetGrid] STEP 3: Data change detected', {
      rowCount: rowData.length,
      columnCount: columnDefs.length,
      hasGridApi: !!gridRef.current?.api,
      rowDataSample: rowData.slice(0, 2),
    });

    if (gridRef.current?.api) {
      console.log('[SpreadsheetGrid] STEP 3.1: Updating grid with new data...');
      // Use setGridOption to update rowData - this is the recommended way for AG Grid
      gridRef.current.api.setGridOption('rowData', rowData);
      gridRef.current.api.setGridOption('columnDefs', columnDefs);
      console.log('[SpreadsheetGrid] STEP 3.2: Grid options updated', {
        rowDataLength: rowData.length,
        columnDefsLength: columnDefs.length,
      });
      
      // Force AG Grid to refresh and redraw
      setTimeout(() => {
        if (gridRef.current?.api) {
          console.log('[SpreadsheetGrid] STEP 3.3: Forcing grid refresh...');
          gridRef.current.api.refreshCells({ force: true });
          gridRef.current.api.sizeColumnsToFit();
          const rowCount = gridRef.current.api.getDisplayedRowCount();
          console.log('[SpreadsheetGrid] STEP 3.4: Grid refreshed', {
            displayedRowCount: rowCount,
            expectedRowCount: rowData.length,
          });
          
          // Verify grid is actually rendering cells
          setTimeout(() => {
            const displayedRowCount = gridRef.current?.api?.getDisplayedRowCount() || 0;
            const renderedCells = document.querySelectorAll('.ag-cell');
            const cellValues = Array.from(renderedCells).slice(0, 5).map(cell => cell.textContent);
            const headerCells = document.querySelectorAll('.ag-header-cell');
            const gridContainer = document.querySelector('.spreadsheet-grid-container');
            const agTheme = document.querySelector('.ag-theme-quartz');
            
            console.log('[SpreadsheetGrid] STEP 3.5: Grid rendering verification after data update', {
              displayedRowCount,
              renderedCellCount: renderedCells.length,
              headerCellCount: headerCells.length,
              firstCellValues: cellValues,
              gridContainerVisible: gridContainer !== null,
              gridContainerHeight: gridContainer?.clientHeight,
              agThemeVisible: agTheme !== null,
              agThemeHeight: agTheme?.clientHeight,
              agThemeWidth: agTheme?.clientWidth,
              hasRows: displayedRowCount > 0,
              hasCells: renderedCells.length > 0,
            });
            
            // If no cells are rendered but we have data, try more aggressive refresh
            if (renderedCells.length === 0 && rowData.length > 0 && gridRef.current?.api) {
              console.log('[SpreadsheetGrid] STEP 3.6: No cells rendered, attempting aggressive refresh...');
              gridRef.current.api.setRowData(rowData);
              gridRef.current.api.setColumnDefs(columnDefs);
              setTimeout(() => {
                gridRef.current?.api?.refreshCells({ force: true });
                gridRef.current?.api?.sizeColumnsToFit();
              }, 100);
            }
          }, 300);
        }
      }, 50);
    } else {
      console.log('[SpreadsheetGrid] STEP 3.1: Grid API not available yet, will update when ready');
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

  console.log('[SpreadsheetGrid] STEP 4: Rendering JSX', {
    rowDataLength: rowData.length,
    columnDefsLength: columnDefs.length,
    willRenderGrid: rowData.length > 0 && columnDefs.length > 0,
  });

  return (
    <div ref={containerRef} className="spreadsheet-grid-container" style={{ backgroundColor: theme.colors.bg.primary, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div className="ag-theme-quartz" style={{ flex: 1, width: '100%', height: '100%', minHeight: '400px' }}>
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          domLayout="normal"
          onGridReady={(event: GridReadyEvent) => {
            console.log('[SpreadsheetGrid] STEP 5: AG Grid ready event fired', {
              rowCount: event.api.getDisplayedRowCount(),
              columnCount: columnDefs.length,
              rowDataLength: rowData.length,
              columnDefsLength: columnDefs.length,
              gridApiAvailable: !!event.api,
              timestamp: Date.now(),
            });
            console.log('[SpreadsheetGrid] STEP 5.0: Row data passed to AG Grid:', JSON.stringify(rowData.slice(0, 2), null, 2));
            console.log('[SpreadsheetGrid] STEP 5.0.1: Column defs passed to AG Grid:', JSON.stringify(columnDefs.slice(0, 3), null, 2));
            
            // Ensure data is set via API (sometimes needed for AG Grid to properly render)
            if (rowData.length > 0) {
              console.log('[SpreadsheetGrid] STEP 5.0.2: Setting initial row data via API...');
              event.api.setGridOption('rowData', rowData);
              event.api.setGridOption('columnDefs', columnDefs);
            }
            
            try {
              event.api.sizeColumnsToFit();
              console.log('[SpreadsheetGrid] STEP 5.1: Columns sized to fit');
            } catch (error) {
              console.error('[SpreadsheetGrid] ERROR: Failed to size columns', error);
            }

            // Verify grid is actually rendering
            setTimeout(() => {
              const displayedRowCount = event.api.getDisplayedRowCount();
              const renderedCells = document.querySelectorAll('.ag-cell');
              const cellValues = Array.from(renderedCells).slice(0, 5).map(cell => cell.textContent);
              const headerCells = document.querySelectorAll('.ag-header-cell');
              const gridContainer = document.querySelector('.spreadsheet-grid-container') as HTMLElement;
              const agTheme = document.querySelector('.ag-theme-quartz') as HTMLElement;
              
              console.log('[SpreadsheetGrid] STEP 5.2: Grid rendering verification');
              console.log('[SpreadsheetGrid] STEP 5.2.1: displayedRowCount =', displayedRowCount);
              console.log('[SpreadsheetGrid] STEP 5.2.2: renderedCellCount =', renderedCells.length);
              console.log('[SpreadsheetGrid] STEP 5.2.3: headerCellCount =', headerCells.length);
              console.log('[SpreadsheetGrid] STEP 5.2.4: firstCellValues =', cellValues);
              console.log('[SpreadsheetGrid] STEP 5.2.5: gridContainer exists =', gridContainer !== null);
              console.log('[SpreadsheetGrid] STEP 5.2.6: agTheme exists =', agTheme !== null);
              console.log('[SpreadsheetGrid] STEP 5.2.7: gridHeight =', agTheme?.clientHeight);
              console.log('[SpreadsheetGrid] STEP 5.2.8: gridWidth =', agTheme?.clientWidth);
              console.log('[SpreadsheetGrid] STEP 5.2.9: containerHeight =', gridContainer?.clientHeight);
              console.log('[SpreadsheetGrid] STEP 5.2.10: containerWidth =', gridContainer?.clientWidth);
              console.log('[SpreadsheetGrid] STEP 5.2.11: hasRows =', displayedRowCount > 0);
              
              // Check visibility and cell content
              if (agTheme) {
                const computedStyle = window.getComputedStyle(agTheme);
                const rect = agTheme.getBoundingClientRect();
                const isInViewport = rect.top >= 0 && rect.left >= 0 && 
                                   rect.bottom <= window.innerHeight && 
                                   rect.right <= window.innerWidth;
                
                // Check first few cells for content and visibility
                const firstCell = renderedCells[0] as HTMLElement;
                const firstCellStyle = firstCell ? window.getComputedStyle(firstCell) : null;
                const firstCellRect = firstCell?.getBoundingClientRect();
                
                // Check multiple cells for better diagnostics
                const sampleCells = Array.from(renderedCells).slice(0, 5) as HTMLElement[];
                const cellDiagnostics = sampleCells.map(cell => {
                  const style = window.getComputedStyle(cell);
                  const rect = cell.getBoundingClientRect();
                  return {
                    text: cell.textContent?.substring(0, 20),
                    width: rect.width,
                    height: rect.height,
                    color: style.color,
                    bgColor: style.backgroundColor,
                    display: style.display,
                    visibility: style.visibility,
                    opacity: style.opacity,
                    zIndex: style.zIndex,
                    isVisible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
                  };
                });
                
                console.log('[SpreadsheetGrid] STEP 5.2.12: Visibility check', {
                  display: computedStyle.display,
                  visibility: computedStyle.visibility,
                  opacity: computedStyle.opacity,
                  zIndex: computedStyle.zIndex,
                  position: computedStyle.position,
                  top: rect.top,
                  left: rect.left,
                  isInViewport,
                  isVisible: computedStyle.display !== 'none' && 
                            computedStyle.visibility !== 'hidden' && 
                            parseFloat(computedStyle.opacity) > 0,
                  firstCellColor: firstCellStyle?.color,
                  firstCellBgColor: firstCellStyle?.backgroundColor,
                  firstCellText: firstCell?.textContent,
                  firstCellDisplay: firstCellStyle?.display,
                  firstCellWidth: firstCellRect?.width,
                  firstCellHeight: firstCellRect?.height,
                  cellDiagnostics,
                });
                
                // If cells exist but text might be invisible, log a warning
                if (renderedCells.length > 0 && firstCell && firstCellStyle) {
                  const textColor = firstCellStyle.color;
                  const bgColor = firstCellStyle.backgroundColor;
                  if (textColor === bgColor || (textColor === 'rgba(0, 0, 0, 0)' && bgColor === 'rgba(0, 0, 0, 0)')) {
                    console.warn('[SpreadsheetGrid] WARNING: Cell text color might match background!', {
                      textColor,
                      bgColor,
                    });
                  }
                  
                  // Check if cells have zero dimensions
                  if (firstCellRect && (firstCellRect.width === 0 || firstCellRect.height === 0)) {
                    console.warn('[SpreadsheetGrid] WARNING: Cells have zero dimensions!', {
                      width: firstCellRect.width,
                      height: firstCellRect.height,
                    });
                  }
                }
              }
              
              // If no cells are rendered, try to force a refresh
              if (renderedCells.length === 0 && rowData.length > 0) {
                console.log('[SpreadsheetGrid] STEP 5.3: No cells rendered, forcing refresh...');
                event.api.refreshCells({ force: true });
                event.api.sizeColumnsToFit();
                
                // Try again after refresh
                setTimeout(() => {
                  const newRenderedCells = document.querySelectorAll('.ag-cell');
                  console.log('[SpreadsheetGrid] STEP 5.3.1: After refresh, renderedCellCount =', newRenderedCells.length);
                  if (newRenderedCells.length === 0) {
                    console.error('[SpreadsheetGrid] ERROR: Grid still not rendering cells after refresh!');
                    console.error('[SpreadsheetGrid] ERROR: rowData.length =', rowData.length);
                    console.error('[SpreadsheetGrid] ERROR: columnDefs.length =', columnDefs.length);
                  }
                }, 200);
              }
            }, 500);
          }}
          onCellValueChanged={handleCellValueChanged}
          onSelectionChanged={handleSelectionChanged}
          onColumnResized={handleColumnResized}
          rowSelection="single"
          suppressRowClickSelection={false}
          animateRows={true}
          enableCellTextSelection={true}
          ensureDomOrder={true}
          suppressColumnVirtualisation={false}
          suppressRowVirtualisation={false}
        />
      </div>
    </div>
  );
};

