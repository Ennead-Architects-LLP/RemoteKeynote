# Race Condition Handling Strategy

This document outlines how race conditions are handled in the collaborative Excel editor.

## Overview

When multiple users edit the same spreadsheet simultaneously, race conditions can occur. We implement multiple strategies to handle these gracefully.

## Strategies Implemented

### 1. Cell-Level Conflict Resolution

**Problem**: Multiple users editing the same cell at the same time.

**Solution**: Timestamp-based last-write-wins with version tracking.

- Each cell update includes a timestamp and version number
- When conflicts occur, the update with the newer timestamp wins
- If timestamps are equal, higher version number wins
- User context is preserved for visual indicators

**Implementation**: `resolveCellConflict()` in `raceConditionHandler.ts`

### 2. Optimistic Updates with Rollback

**Problem**: UI should feel responsive even when network is slow.

**Solution**: Update UI immediately, then sync with server.

- Local changes are applied optimistically
- If a conflict is detected, the UI is updated with the winning value
- User is notified if their change was overwritten (via notification system)

**Implementation**: `VersionManager` class tracks pending updates

### 3. Operation Queue for Structural Changes

**Problem**: Inserting/deleting rows/columns simultaneously can cause data corruption.

**Solution**: Serialize structural operations in a queue.

- All insert/delete operations are queued
- Operations execute one at a time
- Prevents index shifting conflicts

**Implementation**: `OperationQueue` class

### 4. Cell Locking

**Problem**: Visual indication when someone is editing a cell.

**Solution**: Temporary cell locks with automatic expiration.

- When a user starts editing, the cell is locked
- Other users see a visual indicator (colored border)
- Locks expire after 5 seconds of inactivity
- Prevents simultaneous edits to the same cell

**Implementation**: `CellLockManager` class

### 5. Batch Updates

**Problem**: Too many Firebase writes cause performance issues and conflicts.

**Solution**: Group multiple cell updates into batches.

- Updates are collected for 100ms
- All updates in the batch are sent together
- Reduces write operations and potential conflicts

**Implementation**: `BatchUpdateManager` class

### 6. Debounced Auto-Save

**Problem**: Every keystroke shouldn't trigger a save.

**Solution**: Debounce save operations.

- Wait 500ms after last edit before saving
- Reduces conflicts from rapid typing
- Still feels responsive to users

**Implementation**: `createDebouncer()` function

## Usage Example

```typescript
import { useRaceConditionHandler } from './hooks/useRaceConditionHandler';

function SpreadsheetGrid() {
  const { updateCell, executeStructuralOperation, isCellLocked } = 
    useRaceConditionHandler(userId);

  const handleCellEdit = async (cellId: string, value: string) => {
    // Check if cell is locked
    if (isCellLocked(cellId)) {
      showNotification('Cell is being edited by another user', 'warning');
      return;
    }

    // Update with conflict resolution
    const success = await updateCell(cellId, value, async (id, cellValue) => {
      await firebaseRef.child(id).set(cellValue);
    });

    if (!success) {
      showNotification('Could not update cell - it is locked', 'error');
    }
  };

  const handleInsertRow = async (index: number) => {
    // Structural operations are queued
    await executeStructuralOperation(async () => {
      // Insert row logic
      await firebaseRef.child('rows').push(newRow);
    });
  };
}
```

## Testing

Run the test utilities to verify race condition handling:

```typescript
import { testRaceConditionHandling } from './utils/raceConditionHandler.test';
testRaceConditionHandling();
```

## Best Practices

1. **Always check locks before editing**: Use `isCellLocked()` before allowing edits
2. **Use batch updates for bulk changes**: Group related updates together
3. **Queue structural operations**: Never perform insert/delete operations directly
4. **Handle conflicts gracefully**: Show notifications when user's changes are overwritten
5. **Clean up on unmount**: Ensure locks and queues are cleared when component unmounts

## Future Improvements

- Implement Operational Transformation (OT) for more sophisticated conflict resolution
- Add undo/redo with conflict awareness
- Implement cell-level cursors for better collaboration UX
- Add conflict resolution UI for manual resolution when needed

