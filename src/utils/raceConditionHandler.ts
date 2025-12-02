/**
 * Race Condition Handler for Collaborative Editing
 * 
 * Handles concurrent edits gracefully using:
 * - Timestamp-based conflict resolution
 * - Optimistic updates with rollback
 * - Cell-level versioning
 * - Operation queuing for structural changes
 */

export interface CellValue {
  value: string | number | null;
  timestamp: number;
  userId: string;
  version: number;
}

export interface ConflictResolution {
  resolved: boolean;
  finalValue: CellValue;
  conflicts: CellValue[];
}

/**
 * Resolves conflicts when multiple users edit the same cell
 * Strategy: Last-write-wins with timestamp, but preserve user context
 */
export function resolveCellConflict(
  localValue: CellValue,
  remoteValue: CellValue,
  _currentUserId: string
): ConflictResolution {
  // If timestamps are equal (rare), prefer the one with higher version
  if (localValue.timestamp === remoteValue.timestamp) {
    const winner = localValue.version > remoteValue.version ? localValue : remoteValue;
    return {
      resolved: true,
      finalValue: winner,
      conflicts: [localValue, remoteValue],
    };
  }

  // Last-write-wins based on timestamp
  const winner = remoteValue.timestamp > localValue.timestamp ? remoteValue : localValue;

  return {
    resolved: true,
    finalValue: winner,
    conflicts: [localValue, remoteValue],
  };
}

/**
 * Merge multiple concurrent cell updates
 */
export function mergeCellUpdates(updates: CellValue[]): CellValue {
  if (updates.length === 0) {
    throw new Error('Cannot merge empty updates');
  }

  if (updates.length === 1) {
    return updates[0];
  }

  // Sort by timestamp (newest first), then by version
  const sorted = [...updates].sort((a, b) => {
    if (a.timestamp !== b.timestamp) {
      return b.timestamp - a.timestamp;
    }
    return b.version - a.version;
  });

  return sorted[0];
}

/**
 * Operation queue for structural changes (insert/delete rows/columns)
 * Prevents race conditions by serializing structural operations
 */
export class OperationQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;

  async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        await operation();
      }
    }

    this.processing = false;
  }

  clear() {
    this.queue = [];
  }

  get length() {
    return this.queue.length;
  }
}

/**
 * Debounce function to reduce write conflicts
 */
export function createDebouncer<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Version manager for optimistic updates
 */
export class VersionManager {
  private version = 0;
  private pendingUpdates = new Map<string, number>();

  getNextVersion(cellId: string): number {
    this.version++;
    this.pendingUpdates.set(cellId, this.version);
    return this.version;
  }

  confirmUpdate(cellId: string) {
    this.pendingUpdates.delete(cellId);
  }

  rollbackUpdate(cellId: string) {
    this.pendingUpdates.delete(cellId);
    // Version stays incremented to prevent conflicts
  }

  getCurrentVersion(): number {
    return this.version;
  }

  hasPendingUpdates(): boolean {
    return this.pendingUpdates.size > 0;
  }
}

/**
 * Cell lock manager to prevent simultaneous edits
 * Shows visual indicators when cells are being edited
 */
export class CellLockManager {
  private lockedCells = new Map<string, { userId: string; timestamp: number }>();

  lockCell(cellId: string, userId: string): boolean {
    const existing = this.lockedCells.get(cellId);
    const now = Date.now();

    // Remove stale locks (older than 5 seconds)
    if (existing && now - existing.timestamp > 5000) {
      this.lockedCells.delete(cellId);
    }

    // If cell is locked by another user, return false
    if (this.lockedCells.has(cellId)) {
      const lock = this.lockedCells.get(cellId)!;
      if (lock.userId !== userId) {
        return false;
      }
    }

    this.lockedCells.set(cellId, { userId, timestamp: now });
    return true;
  }

  unlockCell(cellId: string, userId: string) {
    const lock = this.lockedCells.get(cellId);
    if (lock && lock.userId === userId) {
      this.lockedCells.delete(cellId);
    }
  }

  isLocked(cellId: string): boolean {
    return this.lockedCells.has(cellId);
  }

  getLockedBy(cellId: string): string | null {
    const lock = this.lockedCells.get(cellId);
    return lock ? lock.userId : null;
  }

  clearStaleLocks() {
    const now = Date.now();
    for (const [cellId, lock] of this.lockedCells.entries()) {
      if (now - lock.timestamp > 5000) {
        this.lockedCells.delete(cellId);
      }
    }
  }

  getAllLocks(): Map<string, string> {
    const result = new Map<string, string>();
    for (const [cellId, lock] of this.lockedCells.entries()) {
      result.set(cellId, lock.userId);
    }
    return result;
  }
}

/**
 * Batch update manager to group multiple cell updates
 * Reduces Firebase write operations and conflicts
 */
export class BatchUpdateManager {
  private batch: Map<string, CellValue> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 100; // ms

  addUpdate(cellId: string, value: CellValue, onFlush: (updates: Map<string, CellValue>) => Promise<void>) {
    this.batch.set(cellId, value);

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.flush(onFlush);
    }, this.BATCH_DELAY);
  }

  private async flush(onFlush: (updates: Map<string, CellValue>) => Promise<void>) {
    if (this.batch.size === 0) {
      return;
    }

    const updates = new Map(this.batch);
    this.batch.clear();
    this.batchTimeout = null;

    await onFlush(updates);
  }

  forceFlush(onFlush: (updates: Map<string, CellValue>) => Promise<void>) {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    this.flush(onFlush);
  }

  clear() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    this.batch.clear();
  }
}

