export interface ParsedParcel {
  plot_id: string;
  owner_name: string;
  aadhaar_number?: string;
  area_record: number;
  images?: string; // Comma-separated filenames
}

export interface CSVParseResult {
  success: boolean;
  data?: ParsedParcel[];
  errors?: string[];
}

/**
 * Parse CSV content to JSON
 */
export function parseCSV(csvContent: string): CSVParseResult {
  const errors: string[] = [];
  const data: ParsedParcel[] = [];

  try {
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
      return {
        success: false,
        errors: ['CSV file is empty or has no data rows']
      };
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredFields = ['plot_id', 'owner_name', 'area_record'];
    
    // Validate header
    for (const field of requiredFields) {
      if (!header.includes(field)) {
        errors.push(`Missing required column: ${field}`);
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Get column indices
    const plotIdIndex = header.indexOf('plot_id');
    const ownerNameIndex = header.indexOf('owner_name');
    const aadhaarIndex = header.indexOf('aadhaar_number');
    const areaRecordIndex = header.indexOf('area_record');
    const imagesIndex = header.indexOf('images');

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const values = line.split(',').map(v => v.trim());
      
      const plotId = values[plotIdIndex];
      const ownerName = values[ownerNameIndex];
      const areaRecordStr = values[areaRecordIndex];

      // Validate row
      if (!plotId) {
        errors.push(`Row ${i + 1}: Missing plot_id`);
        continue;
      }

      if (!ownerName) {
        errors.push(`Row ${i + 1}: Missing owner_name`);
        continue;
      }

      if (!areaRecordStr) {
        errors.push(`Row ${i + 1}: Missing area_record`);
        continue;
      }

      const areaRecord = parseFloat(areaRecordStr);
      if (isNaN(areaRecord) || areaRecord <= 0) {
        errors.push(`Row ${i + 1}: Invalid area_record (must be a positive number)`);
        continue;
      }

      data.push({
        plot_id: plotId,
        owner_name: ownerName,
        aadhaar_number: aadhaarIndex !== -1 ? values[aadhaarIndex] : undefined,
        area_record: areaRecord,
        images: imagesIndex !== -1 ? values[imagesIndex] : undefined
      });
    }

    if (data.length === 0 && errors.length === 0) {
      return {
        success: false,
        errors: ['No valid data rows found in CSV']
      };
    }

    return {
      success: errors.length === 0,
      data,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    return {
      success: false,
      errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Validate parsed parcel data
 */
export function validateParcels(parcels: ParsedParcel[]): string[] {
  const errors: string[] = [];
  const plotIds = new Set<string>();

  for (let i = 0; i < parcels.length; i++) {
    const parcel = parcels[i];
    
    // Check for duplicate plot IDs
    if (plotIds.has(parcel.plot_id)) {
      errors.push(`Duplicate plot_id found: ${parcel.plot_id}`);
    }
    plotIds.add(parcel.plot_id);

    // Validate plot_id format (alphanumeric)
    if (!/^[a-zA-Z0-9-_]+$/.test(parcel.plot_id)) {
      errors.push(`Invalid plot_id format: ${parcel.plot_id} (use only letters, numbers, hyphens, and underscores)`);
    }

    // Validate owner_name (not empty, reasonable length)
    if (parcel.owner_name.length > 100) {
      errors.push(`Owner name too long for plot ${parcel.plot_id} (max 100 characters)`);
    }

    // Validate area_record (positive number, reasonable range)
    if (parcel.area_record > 10000) {
      errors.push(`Area too large for plot ${parcel.plot_id} (max 10000 hectares)`);
    }
  }

  return errors;
}
