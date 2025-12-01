import { useTheme } from '../context/ThemeContext';
import { useNotifications } from './NotificationSystem';
import './Toolbar.css';

interface ToolbarProps {
  onInsertRow: () => void;
  onDeleteRow: () => void;
  onInsertColumn: () => void;
  onDeleteColumn: () => void;
  onDownloadCSV: () => void;
  onUploadFile: () => void;
  selectedRow?: number | null;
  selectedCol?: number | null;
  hasData: boolean;
}

export const Toolbar = ({
  onInsertRow,
  onDeleteRow,
  onInsertColumn,
  onDeleteColumn,
  onDownloadCSV,
  onUploadFile,
  selectedRow,
  selectedCol,
  hasData,
}: ToolbarProps) => {
  const theme = useTheme();
  const { showNotification } = useNotifications();

  const handleInsertRow = () => {
    if (selectedRow === null || selectedRow === undefined) {
      showNotification('Please select a row first', 'info');
      return;
    }
    onInsertRow();
    showNotification('Row inserted', 'success');
  };

  const handleDeleteRow = () => {
    if (selectedRow === null || selectedRow === undefined) {
      showNotification('Please select a row first', 'info');
      return;
    }
    onDeleteRow();
    showNotification('Row deleted', 'success');
  };

  const handleInsertColumn = () => {
    if (selectedCol === null || selectedCol === undefined) {
      showNotification('Please select a column first', 'info');
      return;
    }
    onInsertColumn();
    showNotification('Column inserted', 'success');
  };

  const handleDeleteColumn = () => {
    if (selectedCol === null || selectedCol === undefined) {
      showNotification('Please select a column first', 'info');
      return;
    }
    onDeleteColumn();
    showNotification('Column deleted', 'success');
  };

  const handleDownloadCSV = () => {
    if (!hasData) {
      showNotification('No data to download', 'warning');
      return;
    }
    onDownloadCSV();
    showNotification('CSV downloaded', 'success');
  };

  return (
    <div className="toolbar" style={{ backgroundColor: theme.colors.bg.secondary, borderBottomColor: theme.colors.border.default }}>
      <div className="toolbar-section">
        <button
          className="toolbar-button toolbar-button-primary"
          onClick={onUploadFile}
          style={{
            backgroundColor: theme.colors.purple[600],
            color: theme.colors.text.primary,
          }}
        >
          📤 Upload Excel
        </button>
      </div>

      <div className="toolbar-section">
        <div className="toolbar-group">
          <span className="toolbar-label" style={{ color: theme.colors.text.secondary }}>
            Rows:
          </span>
          <button
            className="toolbar-button"
            onClick={handleInsertRow}
            disabled={selectedRow === null || selectedRow === undefined}
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.default,
            }}
          >
            ➕ Insert
          </button>
          <button
            className="toolbar-button"
            onClick={handleDeleteRow}
            disabled={selectedRow === null || selectedRow === undefined}
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.default,
            }}
          >
            ➖ Delete
          </button>
        </div>

        <div className="toolbar-group">
          <span className="toolbar-label" style={{ color: theme.colors.text.secondary }}>
            Columns:
          </span>
          <button
            className="toolbar-button"
            onClick={handleInsertColumn}
            disabled={selectedCol === null || selectedCol === undefined}
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.default,
            }}
          >
            ➕ Insert
          </button>
          <button
            className="toolbar-button"
            onClick={handleDeleteColumn}
            disabled={selectedCol === null || selectedCol === undefined}
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.default,
            }}
          >
            ➖ Delete
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <button
          className="toolbar-button"
          onClick={handleDownloadCSV}
          disabled={!hasData}
          style={{
            backgroundColor: theme.colors.bg.tertiary,
            color: theme.colors.text.primary,
            borderColor: theme.colors.border.default,
          }}
        >
          💾 Download CSV
        </button>
      </div>
    </div>
  );
};

