import { useRef } from 'react';
import type { User } from '../hooks/useUserPresence';
import './UserPresence.css';

interface UserPresenceProps {
  users: User[];
  currentUserId: string;
}

export const UserPresence = ({ users, currentUserId }: UserPresenceProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const otherUsers = users.filter((u) => u.userId !== currentUserId);

  return (
    <div ref={containerRef} className="user-presence-container">
      {otherUsers.map((user) => (
        <div
          key={user.userId}
          className="user-presence-badge"
          style={{
            backgroundColor: user.color + '20',
            borderColor: user.color,
            color: user.color,
          }}
          title={`${user.name} is editing`}
        >
          <span className="user-presence-initials">
            {user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </span>
          <span className="user-presence-name">{user.name}</span>
        </div>
      ))}
    </div>
  );
};

