import { useState, FormEvent } from 'react';
import { Modal } from './Modal';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from './NotificationSystem';
import './UserLogin.css';

interface UserLoginProps {
  isOpen: boolean;
  onLogin: (name: string) => void;
  existingUsers: string[];
}

export const UserLogin = ({ isOpen, onLogin, existingUsers }: UserLoginProps) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const theme = useTheme();
  const { showNotification } = useNotifications();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Name is required');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 20) {
      setError('Name must be less than 20 characters');
      return;
    }

    const normalizedName = trimmedName.toLowerCase();
    const isDuplicate = existingUsers.some((u) => u.toLowerCase() === normalizedName);

    if (isDuplicate) {
      setError('This name is already taken. Please choose another.');
      showNotification('Name is already taken', 'error');
      return;
    }

    onLogin(trimmedName);
    setName('');
    setError('');
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Enter Your Name" showCloseButton={false}>
      <form onSubmit={handleSubmit} className="user-login-form">
        <div className="user-login-input-group">
          <label
            htmlFor="user-name"
            className="user-login-label"
            style={{ color: theme.colors.text.secondary }}
          >
            Your name (must be unique in this session)
          </label>
          <input
            id="user-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="Enter your name"
            className="user-login-input"
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              borderColor: error ? theme.colors.status.error : theme.colors.border.default,
              color: theme.colors.text.primary,
            }}
            autoFocus
            maxLength={20}
          />
          {error && (
            <span className="user-login-error" style={{ color: theme.colors.status.error }}>
              {error}
            </span>
          )}
        </div>
        <div className="user-login-actions">
          <button
            type="submit"
            className="user-login-submit"
            style={{
              backgroundColor: theme.colors.purple[600],
              color: theme.colors.text.primary,
            }}
          >
            Join Session
          </button>
        </div>
      </form>
    </Modal>
  );
};

