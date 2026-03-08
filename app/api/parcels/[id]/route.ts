import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';

// PUT /api/parcels/[id]/route.ts
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // <-- await params

    const { user } = await getCurrentSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Verify parcel exists and belongs to user
    const existingParcel = await prisma.parcel.findUnique({
      where: { id }
    });

    if (!existingParcel) {
      return NextResponse.json({ error: 'Parcel not found' }, { status: 404 });
    }

    if (existingParcel.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {};
    const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];

    if (body.ownerName !== undefined && body.ownerName !== existingParcel.ownerName) {
      updateData.ownerName = body.ownerName;
      changes.push({
        field: 'owner_name',
        oldValue: existingParcel.ownerName || '',
        newValue: body.ownerName
      });
    }

    if (body.areaRecord !== undefined && body.areaRecord !== existingParcel.areaRecord) {
      updateData.areaRecord = body.areaRecord;
      changes.push({
        field: 'area_record',
        oldValue: existingParcel.areaRecord?.toString() || '',
        newValue: body.areaRecord.toString()
      });
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No changes detected',
        data: {
          plot_id: existingParcel.plotId,
          owner_name: existingParcel.ownerName,
          area_record: existingParcel.areaRecord
        }
      });
    }

    // Update parcel
    const updatedParcel = await prisma.parcel.update({
      where: { id },
      data: updateData
    });

    // Create changelog entries
    if (changes.length > 0) {
      await prisma.changeLog.createMany({
        data: changes.map(change => ({
          parcelId: id,
          userId: user.id,
          action: 'update',
          fieldName: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          description: `Updated ${change.field} for plot ${existingParcel.plotId}`
        }))
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        plot_id: updatedParcel.plotId,
        owner_name: updatedParcel.ownerName,
        area_record: updatedParcel.areaRecord
      }
    });

  } catch (error) {
    console.error('Update parcel error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}