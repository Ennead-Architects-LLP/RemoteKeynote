import { useRef, useCallback, useEffect } from 'react';
import {
  OperationQueue,
  VersionManager,
  CellLockManager,
  BatchUpdateManager,
  createDebouncer,
  type CellValue,
} from '../utils/raceConditionHandler';

/**
 * Custom hook for managing race conditions in collaborative editing
 */
export function useRaceConditionHandler(userId: string) {
  const operationQueueRef = useRef(new OperationQueue());
  const versionManagerRef = useRef(new VersionManager());
  const cellLockManagerRef = useRef(new CellLockManager());
  const batchUpdateManagerRef = useRef(new BatchUpdateManager());

  // Clean up stale locks periodically
  useEffect(() => {
    const interval = setInterval(() => {
      cellLockManagerRef.current.clearStaleLocks();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Safely update a cell with conflict resolution
   */
  const updateCell = useCallback(
    async (
      cellId: string,
      value: string | number | null,
      onUpdate: (cellId: string, cellValue: CellValue) => Promise<void>
    ): Promise<boolean> => {
      // Try to lock the cell
      if (!cellLockManagerRef.current.lockCell(cellId, userId)) {
        // Cell is locked by another user
        return false;
      }

      try {
        const version = versionManagerRef.current.getNextVersion(cellId);
        const cellValue: CellValue = {
          value,
          timestamp: Date.now(),
          userId,
          version,
        };

        // Use batch manager for efficient updates
        batchUpdateManagerRef.current.addUpdate(cellId, cellValue, async (updates) => {
          for (const [id, cellVal] of updates.entries()) {
            await onUpdate(id, cellVal);
            versionManagerRef.current.confirmUpdate(id);
            cellLockManagerRef.current.unlockCell(id, userId);
          }
        });

        return true;
      } catch (error) {
        versionManagerRef.current.rollbackUpdate(cellId);
        cellLockManagerRef.current.unlockCell(cellId, userId);
        throw error;
      }
    },
    [userId]
  );

  /**
   * Handle structural operations (insert/delete rows/columns) with queue
   */
  const executeStructuralOperation = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      return operationQueueRef.current.enqueue(operation);
    },
    []
  );

  /**
   * Check if a cell is currently locked by another user
   */
  const isCellLocked = useCallback(
    (cellId: string): boolean => {
      const lockedBy = cellLockManagerRef.current.getLockedBy(cellId);
      return lockedBy !== null && lockedBy !== userId;
    },
    [userId]
  );

  /**
   * Get the user ID who has locked a cell
   */
  const getCellLockedBy = useCallback((cellId: string): string | null => {
    return cellLockManagerRef.current.getLockedBy(cellId);
  }, []);

  /**
   * Get all currently locked cells
   */
  const getAllLockedCells = useCallback((): Map<string, string> => {
    return cellLockManagerRef.current.getAllLocks();
  }, []);

  /**
   * Force flush pending batch updates
   */
  const flushBatchUpdates = useCallback(
    async (onFlush: (updates: Map<string, CellValue>) => Promise<void>) => {
      batchUpdateManagerRef.current.forceFlush(onFlush);
    },
    []
  );

  /**
   * Create a debounced function for auto-save
   */
  const createDebouncedSave = useCallback(
    <T extends (...args: any[]) => void>(func: T, wait: number = 500) => {
      return createDebouncer(func, wait);
    },
    []
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      operationQueueRef.current.clear();
      batchUpdateManagerRef.current.clear();
    };
  }, []);

  return {
    updateCell,
    executeStructuralOperation,
    isCellLocked,
    getCellLockedBy,
    getAllLockedCells,
    flushBatchUpdates,
    createDebouncedSave,
    hasPendingUpdates: () => versionManagerRef.current.hasPendingUpdates(),
  };
}

