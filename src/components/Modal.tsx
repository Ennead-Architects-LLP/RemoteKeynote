import { useEffect, ReactNode } from 'react';
import { useTheme } from '../context/ThemeContext';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large';
  showCloseButton?: boolean;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
}: ModalProps) => {
  const theme = useTheme();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content modal-${size}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: theme.colors.bg.secondary,
          borderColor: theme.colors.border.default,
        }}
      >
        {(title || showCloseButton) && (
          <div className="modal-header" style={{ borderBottomColor: theme.colors.border.default }}>
            {title && (
              <h2 className="modal-title" style={{ color: theme.colors.text.primary }}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                className="modal-close"
                onClick={onClose}
                style={{ color: theme.colors.text.secondary }}
                aria-label="Close modal"
              >
                ×
              </button>
            )}
          </div>
        )}
        <div className="modal-body" style={{ color: theme.colors.text.primary }}>
          {children}
        </div>
      </div>
    </div>
  );
};

