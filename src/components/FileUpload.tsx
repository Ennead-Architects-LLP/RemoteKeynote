import { useState, useRef, DragEvent, useEffect } from 'react';
import { Modal } from './Modal';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from './NotificationSystem';
import { parseExcelFile, validateExcelFile } from '../utils/excelParser';
import { logError } from '../utils/errorLogger';
import type { ParsedData } from '../utils/excelParser';
import './FileUpload.css';

interface FileUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: ParsedData) => void;
}

export const FileUpload = ({ isOpen, onClose, onUpload }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileRef = useRef<((file: File) => Promise<void>) | null>(null);
  const theme = useTheme();
  const { showNotification } = useNotifications();

  const handleFile = async (file: File) => {
    console.log('[FileUpload] STEP 1: File selected', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    const validation = validateExcelFile(file);
    console.log('[FileUpload] STEP 2: File validation', {
      valid: validation.valid,
      error: validation.error,
    });

    if (!validation.valid) {
      showNotification(validation.error || 'Invalid file', 'error');
      return;
    }

    setIsProcessing(true);
    let parseError = false;
    
    try {
      console.log('[FileUpload] STEP 3: Starting file parsing...');
      const parsedData = await parseExcelFile(file);
      console.log('[FileUpload] STEP 4: File parsed successfully', {
        rowCount: parsedData.rowCount,
        columnCount: parsedData.columnCount,
        firstRowSample: parsedData.rows[0]?.slice(0, 5),
        totalRows: parsedData.rows.length,
      });

      console.log('[FileUpload] STEP 5: Calling onUpload callback...');
      
      // Call the upload callback
      try {
        onUpload(parsedData);
        
        console.log('[FileUpload] STEP 6: onUpload callback completed');
        
        // Note: Success notification is now handled by App.tsx after validation
        // Close modal after callback completes (validation happens in App.tsx)
        onClose();
      } catch (callbackError) {
        console.error('[FileUpload] ERROR: onUpload callback failed', callbackError);
        const errorMessage = callbackError instanceof Error 
          ? callbackError.message 
          : 'Failed to process uploaded file';
        
        showNotification(errorMessage, 'error');
        logError(callbackError instanceof Error ? callbackError : new Error(errorMessage), {
          component: 'FileUpload',
          fileName: file.name,
          fileSize: file.size,
          operation: 'onUploadCallback',
        });
        // Don't close modal on callback error - let user see the error
        // Don't re-throw - we've already handled the error
      }
    } catch (error) {
      parseError = true;
      console.error('[FileUpload] ERROR: File parsing failed', error);
      showNotification('Failed to parse file. Please try again.', 'error');
      logError(error instanceof Error ? error : new Error('Failed to parse Excel file'), {
        component: 'FileUpload',
        fileName: file.name,
        fileSize: file.size,
      });
    } finally {
      setIsProcessing(false);
      console.log('[FileUpload] STEP 7: File processing completed', { parseError });
    }
  };

  // Keep handleFile ref updated
  handleFileRef.current = handleFile;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Temporary helper for browser agent testing - exposes handleFile globally
  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      (window as any).__uploadFile = async (file: File) => {
        if (handleFileRef.current) {
          await handleFileRef.current(file);
        }
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__uploadFile;
      }
    };
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Excel File" size="medium">
      <div className="file-upload-container">
        <div
          className={`file-upload-dropzone ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          style={{
            backgroundColor: theme.colors.bg.tertiary,
            borderColor: isDragging ? theme.colors.purple[600] : theme.colors.border.default,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={isProcessing}
          />
          {isProcessing ? (
            <div className="file-upload-processing">
              <div className="file-upload-spinner"></div>
              <p style={{ color: theme.colors.text.secondary }}>Processing file...</p>
            </div>
          ) : (
            <>
              <div className="file-upload-icon" style={{ color: theme.colors.purple[600] }}>
                📄
              </div>
              <p className="file-upload-text" style={{ color: theme.colors.text.primary }}>
                Drag and drop an Excel file here, or click to browse
              </p>
              <p className="file-upload-hint" style={{ color: theme.colors.text.tertiary }}>
                Maximum file size: 5MB
              </p>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

