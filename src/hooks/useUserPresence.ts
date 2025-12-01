import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, set, onDisconnect, serverTimestamp, DataSnapshot } from 'firebase/database';
import { database } from '../firebase/config';

export interface User {
  userId: string;
  name: string;
  color: string;
  activeCell: { row: number; col: number } | null;
  lastSeen: number;
}

const USER_COLORS = [
  '#9333ea', // purple
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
];

export function useUserPresence(sessionId: string, userId: string, userName: string) {
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const userColorRef = useRef<string>('');
  const presenceRef = useRef<any>(null);

  // Generate or retrieve user color
  useEffect(() => {
    const colorIndex = userId.charCodeAt(0) % USER_COLORS.length;
    userColorRef.current = USER_COLORS[colorIndex];
  }, [userId]);

  // Set up user presence
  useEffect(() => {
    if (!sessionId || !userId || !userName) return;

    const userRef = ref(database, `spreadsheets/${sessionId}/users/${userId}`);
    const userData = {
      name: userName,
      color: userColorRef.current,
      activeCell: null,
      lastSeen: serverTimestamp(),
    };

    set(userRef, userData);

    // Set up disconnect handler
    onDisconnect(userRef).remove();

    presenceRef.current = userRef;

    // Update last seen periodically
    const interval = setInterval(() => {
      set(userRef, {
        ...userData,
        lastSeen: serverTimestamp(),
      });
    }, 30000); // Every 30 seconds

    setCurrentUser({
      userId,
      name: userName,
      color: userColorRef.current,
      activeCell: null,
      lastSeen: Date.now(),
    });

    return () => {
      clearInterval(interval);
      // Remove user on disconnect
      set(userRef, null);
    };
  }, [sessionId, userId, userName]);

  // Listen to all users in session
  useEffect(() => {
    if (!sessionId) return;

    const usersRef = ref(database, `spreadsheets/${sessionId}/users`);

    const unsubscribe = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val() || {};
      const usersMap = new Map<string, User>();

      Object.keys(usersData).forEach((uid) => {
        const userData = usersData[uid];
        // Filter out stale users (not seen in last 2 minutes)
        const lastSeen = userData.lastSeen || 0;
        const now = Date.now();
        if (now - lastSeen < 120000) {
          usersMap.set(uid, {
            userId: uid,
            name: userData.name,
            color: userData.color || USER_COLORS[0],
            activeCell: userData.activeCell || null,
            lastSeen: lastSeen || now,
          });
        }
      });

      setUsers(usersMap);
    });

    return () => {
      unsubscribe();
    };
  }, [sessionId]);

  // Update active cell
  const setActiveCell = useCallback(
    (row: number | null, col: number | null) => {
      if (!presenceRef.current) return;

      const activeCell = row !== null && col !== null ? { row, col } : null;
      set(presenceRef.current, {
        name: userName,
        color: userColorRef.current,
        activeCell,
        lastSeen: serverTimestamp(),
      });

      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          activeCell,
        });
      }
    },
    [userName, currentUser]
  );

  // Get user by ID
  const getUser = useCallback(
    (uid: string): User | null => {
      return users.get(uid) || null;
    },
    [users]
  );

  // Get all users except current
  const getOtherUsers = useCallback((): User[] => {
    return Array.from(users.values()).filter((u) => u.userId !== userId);
  }, [users, userId]);

  return {
    currentUser,
    users: Array.from(users.values()),
    getOtherUsers,
    getUser,
    setActiveCell,
    userColor: userColorRef.current,
  };
}

