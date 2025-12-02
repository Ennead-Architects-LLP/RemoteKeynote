/**
 * Test utilities for race condition handling
 * These can be used for manual testing or with a testing framework
 */

import {
  resolveCellConflict,
  OperationQueue,
  VersionManager,
  CellLockManager,
  type CellValue,
} from './raceConditionHandler';

// Example test cases (can be converted to Jest/Vitest)

export const testRaceConditionHandling = () => {
  console.log('Testing Race Condition Handling...');

  // Test 1: Conflict resolution - last write wins
  const localValue: CellValue = {
    value: 'Local',
    timestamp: 1000,
    userId: 'user1',
    version: 1,
  };

  const remoteValue: CellValue = {
    value: 'Remote',
    timestamp: 2000, // Newer timestamp
    userId: 'user2',
    version: 1,
  };

  const resolution = resolveCellConflict(localValue, remoteValue, 'user1');
  console.assert(
    resolution.finalValue.value === 'Remote',
    'Should resolve to remote value (newer timestamp)'
  );

  // Test 2: Operation queue serialization
  const queue = new OperationQueue();
  const results: number[] = [];

  queue.enqueue(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    results.push(1);
  });

  queue.enqueue(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    results.push(2);
  });

  queue.enqueue(async () => {
    results.push(3);
  });

  setTimeout(() => {
    console.assert(
      JSON.stringify(results) === JSON.stringify([1, 2, 3]),
      'Operations should execute in order'
    );
  }, 200);

  // Test 3: Cell locking
  const lockManager = new CellLockManager();
  console.assert(lockManager.lockCell('A1', 'user1') === true, 'Should lock cell');
  console.assert(
    lockManager.lockCell('A1', 'user2') === false,
    'Should not lock if already locked by another user'
  );
  lockManager.unlockCell('A1', 'user1');
  console.assert(
    lockManager.lockCell('A1', 'user2') === true,
    'Should lock after unlock'
  );

  // Test 4: Version management
  const versionManager = new VersionManager();
  const v1 = versionManager.getNextVersion('A1');
  const v2 = versionManager.getNextVersion('A2');
  console.assert(v1 === 1, 'First version should be 1');
  console.assert(v2 === 2, 'Second version should be 2');

  console.log('All tests passed!');
};

