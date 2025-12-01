import * as XLSX from 'xlsx';

/**
 * Export grid data to CSV file
 */
export function exportToCSV(data: (string | number | null)[][], filename: string = 'spreadsheet.csv') {
  // Create a worksheet from the data
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Convert to CSV
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert grid data to CSV string
 */
export function gridToCSVString(data: (string | number | null)[][]): string {
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  return XLSX.utils.sheet_to_csv(worksheet);
}

