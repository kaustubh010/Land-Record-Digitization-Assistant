import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';

// GET /api/parcels - Fetch user's parcels
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { user } = await getCurrentSession();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch parcels for the user
    const parcels = await prisma.parcel.findMany({
      where: { userId: user.id },
      orderBy: { plotId: 'asc' }
    });

    // Transform to match LandRecord interface
    const records = parcels.map(p => ({
      id: p.id,
      plot_id: p.plotId,
      owner_name: p.ownerName,
      area_record: p.areaRecord,
      north: p.north,
      south: p.south,
      east: p.east,
      west: p.west
    }));

    return NextResponse.json({
      success: true,
      data: records,
      count: records.length
    });

  } catch (error) {
    console.error('Fetch parcels error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
