import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseCSV, validateParcels, ParsedParcel } from '@/lib/csv-parser';
import { getCurrentSession } from '@/lib/auth';
import { performOCR } from '@/lib/ocr';
import { extractDataFromText } from '@/lib/extraction';

function parseExtractedDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  // Handle DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getCurrentSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const csvFile = formData.get('file') as File | null;
    const imageFiles = formData.getAll('images') as File[];

    if (!csvFile && imageFiles.length === 0) {
      return NextResponse.json({ error: 'No data provided. Please upload a CSV or images.' }, { status: 400 });
    }

    const results = [];

    // ================= CASE 1: CSV PROVIDED (CSV-DRIVEN) =================
    if (csvFile) {
      const content = await csvFile.text();
      const parseResult = parseCSV(content);
      
      if (!parseResult.success || !parseResult.data) {
        return NextResponse.json({ error: 'Failed to parse CSV', details: parseResult.errors }, { status: 400 });
      }

      const validationErrors = validateParcels(parseResult.data);
      if (validationErrors.length > 0) {
        return NextResponse.json({ error: 'Validation failed', details: validationErrors }, { status: 400 });
      }

      // Map images by filename for quick lookup
      const imageMap = new Map<string, File>();
      imageFiles.forEach(file => imageMap.set(file.name, file));

      // Delete existing parcels for this user (Replace Strategy)
      await prisma.parcel.deleteMany({ where: { userId: user.id } });

      for (const p of parseResult.data) {
        let extractedData: any = null;
        let rawText: string | null = null;

        // Handle associated images first to get OCR data
        if (p.images) {
           const filenames = p.images.split(',').map(s => s.trim());
           for (const filename of filenames) {
             const imageFile = imageMap.get(filename);
             if (imageFile) {
               const buffer = Buffer.from(await imageFile.arrayBuffer());
               rawText = await performOCR(buffer);
               extractedData = await extractDataFromText(rawText);
               break; 
             }
           }
        }

        // Create the Parcel
        const parcel = await prisma.parcel.create({
          data: {
            plotId: p.plot_id,
            ownerName: p.owner_name,
            aadhaarNumber: p.aadhaar_number,
            areaRecord: p.area_record,
            userId: user.id,
            north: extractedData?.north,
            south: extractedData?.south,
            east: extractedData?.east,
            west: extractedData?.west,
          }
        });

        if (rawText && extractedData) {
          const doc = await prisma.document.create({
            data: {
              parcelId: parcel.id,
              rawOcrText: rawText,
              extractedData: extractedData as any,
            }
          });

          await prisma.plotHistory.create({
            data: {
              parcelId: parcel.id,
              ownerName: extractedData.ownerName || p.owner_name,
              aadhaarNumber: extractedData.aadhaarNumber || p.aadhaar_number,
              area: extractedData.area || p.area_record,
              transactionType: 'initial',
              sourceDocumentId: doc.id,
            }
          });

          if (extractedData.history) {
            for (const tx of extractedData.history) {
              await prisma.plotHistory.create({
                data: {
                  parcelId: parcel.id,
                  ownerName: tx.owner || extractedData.ownerName || p.owner_name,
                  area: tx.area || extractedData.area || p.area_record,
                  transactionType: tx.type || 'Transfer',
                  sourceDocumentId: doc.id,
                  ownershipStartDate: parseExtractedDate(tx.date),
                  ownershipEndDate: parseExtractedDate(tx.endDate),
                  documentNo: tx.documentNo,
                  remarks: tx.remarks
                }
              });
            }
          }
        } else {
          await prisma.plotHistory.create({
            data: {
              parcelId: parcel.id,
              ownerName: p.owner_name,
              aadhaarNumber: p.aadhaar_number,
              area: p.area_record,
              transactionType: 'initial',
            }
          });
        }
        results.push(parcel);
      }
    } 
    // ================= CASE 2: IMAGE ONLY (AI-DRIVEN) =================
    else {
      // Clear user parcels
      await prisma.parcel.deleteMany({ where: { userId: user.id } });

      for (const imageFile of imageFiles) {
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const rawText = await performOCR(buffer);
        const extractedData = await extractDataFromText(rawText);

        if (!extractedData.plotNumber) {
          console.warn(`Skipping image ${imageFile.name}: No plot number extracted.`);
          continue;
        }

        // Create the Parcel from AI data
        const parcel = await prisma.parcel.create({
          data: {
            plotId: extractedData.plotNumber,
            ownerName: extractedData.ownerName || 'Unknown Owner',
            aadhaarNumber: extractedData.aadhaarNumber,
            areaRecord: extractedData.area || 0,
            userId: user.id,
            north: extractedData.north,
            south: extractedData.south,
            east: extractedData.east,
            west: extractedData.west,
          }
        });

        const doc = await prisma.document.create({
          data: {
            parcelId: parcel.id,
            rawOcrText: rawText,
            extractedData: extractedData as any,
          }
        });

        // Current record entry
        await prisma.plotHistory.create({
          data: {
            parcelId: parcel.id,
            ownerName: extractedData.ownerName || 'Unknown Owner',
            aadhaarNumber: extractedData.aadhaarNumber,
            area: extractedData.area || 0,
            transactionType: 'extraction',
            sourceDocumentId: doc.id,
          }
        });

        // Past history entries
        if (extractedData.history) {
          for (const tx of extractedData.history) {
            await prisma.plotHistory.create({
              data: {
                parcelId: parcel.id,
                ownerName: tx.owner || extractedData.ownerName || 'Unknown',
                area: tx.area || extractedData.area || 0,
                transactionType: tx.type || 'History',
                sourceDocumentId: doc.id,
                ownershipStartDate: parseExtractedDate(tx.date),
                ownershipEndDate: parseExtractedDate(tx.endDate),
                documentNo: tx.documentNo,
                remarks: tx.remarks
              }
            });
          }
        }
        results.push(parcel);
      }
    }

    await prisma.changeLog.create({
      data: {
        userId: user.id,
        action: 'bulk_upload',
        description: `Processed ${results.length} parcels via ${csvFile ? 'CSV + OCR' : 'Direct AI OCR'}.`,
        newValue: `${results.length} parcels`
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.length} parcels.`,
      count: results.length
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
