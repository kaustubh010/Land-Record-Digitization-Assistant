import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';

// POST /api/parcels - Create a new parcel
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { user } = await getCurrentSession();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.plotId || !body.ownerName || body.areaRecord === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: plotId, ownerName, areaRecord' },
        { status: 400 }
      );
    }

    // Check if parcel already exists for this user
    const existingParcel = await prisma.parcel.findFirst({
      where: {
        plotId: body.plotId,
        userId: user.id
      }
    });

    if (existingParcel) {
      return NextResponse.json(
        { error: 'Parcel already exists for this plot ID' },
        { status: 409 }
      );
    }

    // Create parcel
    const newParcel = await prisma.parcel.create({
      data: {
        plotId: body.plotId,
        ownerName: body.ownerName,
        areaRecord: body.areaRecord,
        userId: user.id
      }
    });

    // Create changelog entry
    await prisma.changeLog.create({
      data: {
        parcelId: newParcel.id,
        userId: user.id,
        action: 'create',
        fieldName: 'parcel',
        oldValue: '',
        newValue: body.plotId,
        description: `Created new parcel for plot ${body.plotId}`
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newParcel.id,
        plot_id: newParcel.plotId,
        owner_name: newParcel.ownerName,
        area_record: newParcel.areaRecord
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create parcel error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}