export interface ExtractedLandData {
  ownerName?: string;
  plotNumber?: string;
  aadhaarNumber?: string;
  area?: number;
  history?: Transaction[];
  north?: number;
  south?: number;
  east?: number;
  west?: number;
}

export interface Transaction {
  date?: string; // Start date
  endDate?: string;
  type: string;
  owner?: string;
  area?: number;
  documentNo?: string;
  remarks?: string;
}

/**
 * Converts Coordinates (DMS or DD) string to Decimal Degrees (DD).
 * Supports: 29° 56' 45.3" N OR 26.8124° N
 */
function parseCoordinate(coordStr: string | number): number | undefined {
  if (typeof coordStr === 'number') return coordStr;
  
  // Try DMS first
  const dmsMatch = coordStr.match(/(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"\s*([NSEW])/i);
  if (dmsMatch) {
    const degrees = parseFloat(dmsMatch[1]);
    const minutes = parseFloat(dmsMatch[2]);
    const seconds = parseFloat(dmsMatch[3]);
    const direction = dmsMatch[4].toUpperCase();
    let dd = degrees + (minutes / 60) + (seconds / 3600);
    if (direction === 'S' || direction === 'W') dd = dd * -1;
    return dd;
  }

  // Try Decimal Degrees
  const ddMatch = coordStr.match(/(\d+(?:\.\d+)?)\s*°\s*([NSEW])/i);
  if (ddMatch) {
    let dd = parseFloat(ddMatch[1]);
    const direction = ddMatch[2].toUpperCase();
    if (direction === 'S' || direction === 'W') dd = dd * -1;
    return dd;
  }

  // Pure number
  const num = parseFloat(coordStr);
  if (!isNaN(num)) return num;

  return undefined;
}

/**
 * Parses raw OCR text to extract structured land record information using Regex patterns.
 * Specialized for Rajasthan (Jamabandi) format.
 */
export async function extractDataFromText(text: string): Promise<ExtractedLandData> {
  const data: ExtractedLandData = {
    history: []
  };

  // 1. Extract Plot/Khasra Number
  // Matches: Khasra/Plot No.: 2
  const plotMatch = text.match(/(?:Khasra\/Plot\s*No\.?|Plot\s*No\.?|Khasra)\s*[:\-]?\s*(\d+)/i);
  if (plotMatch) data.plotNumber = plotMatch[1].trim();

  // 2. Extract Area
  // Matches: Total Area: 2.50 Hectares
  const areaMatch = text.match(/(?:Total\s*Area|Area|Extent)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:Hectares|Ha|Acres|Acre)?/i);
  if (areaMatch) data.area = parseFloat(areaMatch[1]);

  // 3. Extract GPS Coordinates
  const latMatch = text.match(/Latitude\s*[:\-]?\s*(\d+(?:\.\d+)?\s*°\s*[NS])/i);
  const lonMatch = text.match(/Longitude\s*[:\-]?\s*(\d+(?:\.\d+)?\s*°\s*[EW])/i);
  
  // Also handle combined format: Latitude: 26.8125° N, 75.7832° E
  const combinedCoordMatch = text.match(/Latitude\s*[:\-]?\s*(\d+(?:\.\d+)?\s*°\s*[NS])\s*,\s*(\d+(?:\.\d+)?\s*°\s*[EW])/i);

  if (combinedCoordMatch) {
    data.north = parseCoordinate(combinedCoordMatch[1]);
    data.east = parseCoordinate(combinedCoordMatch[2]);
  } else {
    if (latMatch) data.north = parseCoordinate(latMatch[1]);
    if (lonMatch) data.east = parseCoordinate(lonMatch[1]);
  }

  // 4. Extract Aadhaar (Generic)
  const aadhaarMatch = text.match(/(?:Aadhaar|UID)\s*[:\-]?\s*(\d{4}[\s\-]?\d{4}[\s\-]?\d{4})/i);
  if (aadhaarMatch) data.aadhaarNumber = aadhaarMatch[1].replace(/[\s\-]/g, '');

  // 5. Extract Detailed History Table
  // This looks for rows in the format: S.No | Name | Father's Name | Type | Start | End | Doc | Remarks
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  // Find where the table starts (after "Name of Past Holder" or similar)
  const tableStartIndex = lines.findIndex(l => /S\.No|Name of Past Holder/i.test(l));
  
  if (tableStartIndex !== -1) {
    for (let i = tableStartIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        
        // Match a row starting with a serial number 
        const rowMatch = line.match(/^(\d+)\s+(.+)$/);
        if (rowMatch) {
            // Split by broad spaces or tabs first
            let parts = line.split(/\s{2,}|\|/).map(p => p.trim()).filter(p => p.length > 0);
            
            // If parts are too few, try splitting by just single spaces 
            // but carefully (we know the expected structure)
            if (parts.length < 4) {
                // Fallback: split by space but keep names together if possible
                // This is tricky without a real NLP parser, but we can try to find dates
                const dateMatches = line.match(/\d{1,2}\/\d{1,2}\/\d{4}/g);
                if (dateMatches && dateMatches.length >= 1) {
                    // We found dates, use them as anchors
                    const firstDateIndex = line.indexOf(dateMatches[0]);
                    const beforeDates = line.substring(0, firstDateIndex).trim().split(/\s+/);
                    const docParts = line.substring(firstDateIndex).split(/\s{2,}/);
                    
                    parts = [...beforeDates, ...docParts];
                }
            }

            if (parts.length >= 4) {
                const sNo = parts[0];
                const owner = parts[1];
                const fatherName = parts[2] || '';
                const type = parts[3] || 'Transfer';
                
                // Find dates in the remaining parts
                const dateMatches = line.match(/\d{1,2}\/\d{1,2}\/\d{4}/g) || [];
                const startDate = dateMatches[0] || parts[4] || '';
                const endDate = dateMatches[1] || parts[5] || '';
                
                // Heuristic for Doc No and Remarks (usually at the end)
                const docNo = parts.find(p => /Sale|Lease|Deed|Order|Certificate/i.test(p) || /\d{3,}\/\d{4}/.test(p)) || '';
                const remarks = parts[parts.length - 1] === docNo ? '' : parts[parts.length - 1];

                data.history?.push({
                    owner: fatherName && !fatherName.startsWith('Khatedar') ? `${owner} S/o ${fatherName}` : owner,
                    type: type,
                    date: startDate,
                    endDate: endDate,
                    documentNo: docNo,
                    remarks: remarks,
                    area: data.area
                });
            }
        }
    }
  }

  // Fallback for current owner (Entry 1 in the table is usually the current/most recent)
  if (!data.ownerName && data.history && data.history.length > 0) {
    data.ownerName = data.history[0].owner;
  }

  return data;
}


