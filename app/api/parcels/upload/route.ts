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
    // ================= CASE 2: IMAGE ONLY (DEMO/MOCK) =================
    else {
      // Clear user parcels
      await prisma.parcel.deleteMany({ where: { userId: user.id } });

      for (const imageFile of imageFiles) {
        // MOCK DATA for Plot 2 (as requested)
        const plotId = "2";
        const ownerName = "Suresh Kumar Sharma";
        const areaRecord = 2.50;
        const aadhaarNumber = "222233334444";

        // Create the Parcel from Demo data
        const parcel = await prisma.parcel.create({
          data: {
            plotId,
            ownerName,
            aadhaarNumber,
            areaRecord,
            userId: user.id,
            north: null,
            south: null,
            east: null,
            west: null,
          }
        });

        const doc = await prisma.document.create({
          data: {
            parcelId: parcel.id,
            rawOcrText: "MOCK OCR TEXT FOR DEMO",
            extractedData: {
                plotNumber: plotId,
                ownerName,
                area: areaRecord,
                aadhaarNumber,
            } as any,
          }
        });

        // History entries from seed_history.ts
        const historyEntries = [
            {
              ownerName: "Suresh Kumar Sharma",
              transactionType: "Khatedar Owner",
              ownershipStartDate: null,
              ownershipEndDate: null,
              documentNo: "Sale Deed 123/2024",
              remarks: "(Transition to current ROR)",
              area: 2.50,
            },
            {
              ownerName: "Geeta Devi W/o Dinesh Kumar",
              transactionType: "Khatedar Owner",
              ownershipStartDate: new Date("2019-01-01"),
              ownershipEndDate: new Date("2023-12-31"),
              documentNo: "Sale Deed 202/2019",
              remarks: "(Sold to Entry 1)",
              area: 2.50,
            },
            {
              ownerName: "Rampura Village Cooperative Society Ltd.",
              transactionType: "Village Leaseholder",
              ownershipStartDate: new Date("2010-01-01"),
              ownershipEndDate: new Date("2018-12-31"),
              documentNo: "Lease Agreement 50/2010",
              remarks: "(Lease for community farming)",
              area: 2.50,
            },
            {
              ownerName: "Mahendra Singh S/o Late Partap Singh",
              transactionType: "Khatedar Owner",
              ownershipStartDate: new Date("2000-01-01"),
              ownershipEndDate: new Date("2009-12-31"),
              documentNo: "Succession Certificate 10/2000",
              remarks: "(Inherited from father)",
              area: 2.50,
            },
            {
              ownerName: "Partap Singh S/o Late Kanhaiya Lal",
              transactionType: "Allotted Khatedar Owner",
              ownershipStartDate: new Date("1975-08-15"),
              ownershipEndDate: new Date("1999-12-31"),
              documentNo: "Revenue Allotment Order 300/1975",
              remarks: "(Government Land Allotment)",
              area: 2.50,
            },
          ];

        for (const entry of historyEntries) {
          await prisma.plotHistory.create({
            data: {
              parcelId: parcel.id,
              sourceDocumentId: doc.id,
              ...entry,
            }
          });
        }
        results.push(parcel);
        // Only one parcel for demo purposes
        break; 
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
