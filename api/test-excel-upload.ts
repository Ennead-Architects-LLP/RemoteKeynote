/**
 * Test endpoint for Excel file upload and parsing
 * This allows us to test the parsing logic separately from the frontend
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as XLSX from 'xlsx';

interface ParsedData {
  rows: (string | number | null)[][];
  columnCount: number;
  rowCount: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    console.log('[test-excel-upload] Request received');

    // Check if file is provided
    if (!req.body || !req.body.file) {
      return res.status(400).json({ 
        error: 'No file provided',
        usage: 'Send POST request with { file: base64EncodedFile } or FormData'
      });
    }

    let fileBuffer: Buffer;
    let fileName: string = 'test.xlsx';

    // Handle different input formats
    if (req.body.file instanceof Buffer) {
      fileBuffer = req.body.file;
    } else if (typeof req.body.file === 'string') {
      // Assume base64 encoded
      fileBuffer = Buffer.from(req.body.file, 'base64');
    } else if (req.body.data && typeof req.body.data === 'string') {
      // Handle base64 data URL
      const base64Data = req.body.data.split(',')[1] || req.body.data;
      fileBuffer = Buffer.from(base64Data, 'base64');
    } else {
      return res.status(400).json({ 
        error: 'Invalid file format. Provide file as Buffer, base64 string, or FormData'
      });
    }

    console.log(`[test-excel-upload] File received: ${fileBuffer.length} bytes`);

    // Parse Excel file (same logic as frontend)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    console.log(`[test-excel-upload] Parsing sheet: ${firstSheetName}`);

    // Convert to JSON array format (same as frontend)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      raw: false,
    }) as (string | number | null)[][];

    // Normalize rows (same as frontend)
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

    const parsedData: ParsedData = {
      rows: normalizedData,
      columnCount: maxCols || 10,
      rowCount: normalizedData.length,
    };

    console.log(`[test-excel-upload] Parsing successful: ${parsedData.rowCount} rows × ${parsedData.columnCount} cols`);

    // Count rows with actual data
    const rowsWithData = normalizedData.filter(row => 
      row.some(cell => cell !== null && cell !== '')
    ).length;

    return res.status(200).json({
      success: true,
      data: {
        rowCount: parsedData.rowCount,
        columnCount: parsedData.columnCount,
        rowsWithData,
        sheets: workbook.SheetNames,
        usedSheet: firstSheetName,
        sampleRows: parsedData.rows.slice(0, 3), // First 3 rows for preview
        validation: {
          hasData: parsedData.rowCount > 0 && parsedData.columnCount > 0,
          isEmpty: parsedData.rowCount === 1 && normalizedData[0].every(cell => cell === null),
          rowsWithDataCount: rowsWithData,
        }
      },
      message: 'Excel file parsed successfully'
    });
  } catch (error) {
    console.error('[test-excel-upload] Error:', error);
    return res.status(500).json({
      error: 'Failed to parse Excel file',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

