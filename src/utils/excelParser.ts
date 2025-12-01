// @ts-ignore - xlsx types may not be available
import * as XLSX from 'xlsx';

export interface ParsedData {
  rows: (string | number | null)[][];
  columnCount: number;
  rowCount: number;
}

/**
 * Parse Excel file and convert to grid format
 */
export function parseExcelFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON array format
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: null,
          raw: false,
        }) as (string | number | null)[][];

        // Normalize rows to have the same length
        let maxCols = 0;
        jsonData.forEach((row) => {
          if (row.length > maxCols) {
            maxCols = row.length;
          }
        });

        const normalizedData = jsonData.map((row) => {
          const normalizedRow = [...row];
          while (normalizedRow.length < maxCols) {
            normalizedRow.push(null);
          }
          return normalizedRow;
        });

        // Ensure we have at least some rows
        if (normalizedData.length === 0) {
          normalizedData.push(Array(maxCols || 10).fill(null));
        }

        resolve({
          rows: normalizedData,
          columnCount: maxCols || 10,
          rowCount: normalizedData.length,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Validate Excel file
 */
export function validateExcelFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
  ];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 5MB limit' };
  }

  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)',
    };
  }

  return { valid: true };
}

