// src/app/api/admin/tiktok-imports/route.ts

import { NextRequest, NextResponse } from 'next/server';
import {
  createTiktokImportsBatch,
  createImportBatch,
  updateImportBatch,
  getImportBatches,
  getAllTiktokImports,
  getTiktokImportStats,
  normalizeTiktokUsername,
} from '@/lib/firestore';
import {
  TiktokCreatorImport,
  TiktokImportResult,
  Size,
  ShippingAddress,
  TiktokImportStatus,
} from '@/types';

// CSV Column mappings from TikTok Shop export
const CSV_COLUMNS = {
  orderId: 'Order ID',
  buyerUsername: 'Buyer Username',
  recipient: 'Recipient',
  phone: 'Phone #',
  addressLine1: 'Address Line 1',
  addressLine2: 'Address Line 2',
  city: 'City',
  state: 'State',
  zipcode: 'Zipcode',
  country: 'Country',
  productName: 'Product Name',
  variation: 'Variation', // Size: S, M, L, XL, XXL
  createdTime: 'Created Time',
};

/**
 * Maps size string from CSV to Size type
 */
function mapSize(sizeString: string): Size {
  const normalized = sizeString.toUpperCase().trim();
  
  // Handle common variations
  if (normalized === 'S' || normalized === 'SMALL') return 'S';
  if (normalized === 'M' || normalized === 'MEDIUM' || normalized === 'MED') return 'M';
  if (normalized === 'L' || normalized === 'LARGE') return 'L';
  if (normalized === 'XL' || normalized === 'X-LARGE' || normalized === 'XLARGE') return 'XL';
  if (normalized === 'XXL' || normalized === '2XL' || normalized === 'XX-LARGE') return 'XXL';
  
  // Default to M if unrecognized
  return 'M';
}

/**
 * Parses CSV date format from TikTok Shop
 * Format: "12/08/2025 9:19:23 AM"
 */
function parseDate(dateString: string): Date {
  if (!dateString || dateString.trim() === '') {
    return new Date();
  }
  
  try {
    // Try parsing the TikTok format
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch {
    // Fall through to default
  }
  
  return new Date();
}

/**
 * Parses CSV text into rows
 * Handles quoted fields and multi-line values
 */
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);
  
  const rows: Record<string, string>[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines
    if (!line.trim() && !inQuotes) continue;

    currentLine += (currentLine ? '\n' : '') + line;

    // Count quotes to determine if we're in a multi-line quoted field
    const quoteCount = (currentLine.match(/"/g) || []).length;
    inQuotes = quoteCount % 2 !== 0;

    if (!inQuotes) {
      // Parse complete row
      const values = parseCSVLine(currentLine);
      
      if (values.length > 0) {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        rows.push(row);
      }
      
      currentLine = '';
    }
  }

  return rows;
}

/**
 * Parses a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Push last value
  values.push(current.trim());

  return values;
}

/**
 * Validates a row has required fields
 */
function validateRow(row: Record<string, string>, rowIndex: number): { valid: boolean; error?: string } {
  const username = row[CSV_COLUMNS.buyerUsername];
  const recipient = row[CSV_COLUMNS.recipient];
  const addressLine1 = row[CSV_COLUMNS.addressLine1];
  const city = row[CSV_COLUMNS.city];
  const state = row[CSV_COLUMNS.state];
  const zipcode = row[CSV_COLUMNS.zipcode];

  if (!username || username.trim() === '') {
    return { valid: false, error: `Row ${rowIndex}: Missing TikTok username (Buyer Username)` };
  }

  if (!recipient || recipient.trim() === '') {
    return { valid: false, error: `Row ${rowIndex}: Missing recipient name` };
  }

  if (!addressLine1 || addressLine1.trim() === '') {
    return { valid: false, error: `Row ${rowIndex}: Missing street address` };
  }

  if (!city || city.trim() === '') {
    return { valid: false, error: `Row ${rowIndex}: Missing city` };
  }

  if (!state || state.trim() === '') {
    return { valid: false, error: `Row ${rowIndex}: Missing state` };
  }

  if (!zipcode || zipcode.trim() === '') {
    return { valid: false, error: `Row ${rowIndex}: Missing ZIP code` };
  }

  return { valid: true };
}

/**
 * Converts a CSV row to TiktokCreatorImport format
 */
function rowToImport(
  row: Record<string, string>,
  batchId: string
): Omit<TiktokCreatorImport, 'id' | 'status' | 'importedAt'> {
  const shippingAddress: ShippingAddress = {
    street: row[CSV_COLUMNS.addressLine1]?.trim() || '',
    unit: row[CSV_COLUMNS.addressLine2]?.trim() || undefined,
    city: row[CSV_COLUMNS.city]?.trim() || '',
    state: row[CSV_COLUMNS.state]?.trim() || '',
    zipCode: row[CSV_COLUMNS.zipcode]?.trim() || '',
  };

  // Remove undefined unit to avoid Firestore issues
  if (!shippingAddress.unit) {
    delete shippingAddress.unit;
  }

  return {
    tiktokUsername: normalizeTiktokUsername(row[CSV_COLUMNS.buyerUsername] || ''),
    tiktokUsernameOriginal: row[CSV_COLUMNS.buyerUsername]?.trim() || '',
    fullName: row[CSV_COLUMNS.recipient]?.trim() || '',
    phone: row[CSV_COLUMNS.phone]?.trim() || '',
    shippingAddress,
    productOrdered: row[CSV_COLUMNS.productName]?.trim() || 'Unknown Product',
    sizeOrdered: mapSize(row[CSV_COLUMNS.variation] || 'M'),
    orderId: row[CSV_COLUMNS.orderId]?.trim() || '',
    orderDate: parseDate(row[CSV_COLUMNS.createdTime] || ''),
    importBatchId: batchId,
  };
}

/**
 * POST /api/admin/tiktok-imports
 * Uploads and processes a TikTok Shop CSV file
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add proper admin authentication check
    // For now, we'll assume authentication is handled by middleware

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const adminId = formData.get('adminId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      );
    }

    // Read file content
    const csvText = await file.text();

    // Parse CSV
    let rows: Record<string, string>[];
    try {
      rows = parseCSV(csvText);
    } catch (parseError) {
      return NextResponse.json(
        { error: `Failed to parse CSV: ${parseError instanceof Error ? parseError.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV contains no data rows' },
        { status: 400 }
      );
    }

    // Create import batch record first
    const batchId = await createImportBatch({
      fileName: file.name,
      totalRows: rows.length,
      importedCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      importedBy: adminId,
    });

    // Process rows
    const errors: { row: number; reason: string }[] = [];
    const validImports: Omit<TiktokCreatorImport, 'id' | 'status' | 'importedAt'>[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because row 1 is header, and we're 0-indexed

      // Validate row
      const validation = validateRow(row, rowNumber);
      if (!validation.valid) {
        errors.push({ row: rowNumber, reason: validation.error || 'Unknown validation error' });
        continue;
      }

      try {
        const importData = rowToImport(row, batchId);
        validImports.push(importData);
      } catch (conversionError) {
        errors.push({
          row: rowNumber,
          reason: `Failed to process row: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`,
        });
      }
    }

    // Batch create imports
    let created = 0;
    let duplicates: string[] = [];

    if (validImports.length > 0) {
      const result = await createTiktokImportsBatch(validImports, batchId);
      created = result.created;
      duplicates = result.duplicates;
    }

    // Add duplicate errors to error list
    duplicates.forEach(username => {
      errors.push({
        row: 0, // We don't track exact row for duplicates
        reason: `Duplicate username: @${username} already exists`,
      });
    });

    // Update batch with final counts
    await updateImportBatch(batchId, {
      importedCount: created,
      duplicateCount: duplicates.length,
      errorCount: errors.length,
      errors: errors.slice(0, 50), // Limit stored errors to prevent huge documents
    });

    const result: TiktokImportResult = {
      success: true,
      batchId,
      totalRows: rows.length,
      imported: created,
      duplicates: duplicates.length,
      errors,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('TikTok import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process import' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/tiktok-imports
 * Lists TikTok imports with optional filters
 * 
 * Query params:
 * - view: 'imports' | 'batches' | 'stats' (default: 'imports')
 * - status: 'available' | 'claimed' | 'expired'
 * - batchId: Filter by specific batch
 * - limit: Number of results (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'imports';
    const status = searchParams.get('status') as TiktokImportStatus | null;
    const batchId = searchParams.get('batchId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    // Return stats
    if (view === 'stats') {
      const stats = await getTiktokImportStats();
      return NextResponse.json(stats);
    }

    // Return batches
    if (view === 'batches') {
      const batches = await getImportBatches(limit);
      return NextResponse.json({ batches });
    }

    // Return imports (default)
    const { imports, hasMore } = await getAllTiktokImports({
      status: status || undefined,
      batchId: batchId || undefined,
      limit,
    });

    return NextResponse.json({
      imports,
      hasMore,
    });

  } catch (error) {
    console.error('Error fetching TikTok imports:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch imports' },
      { status: 500 }
    );
  }
}