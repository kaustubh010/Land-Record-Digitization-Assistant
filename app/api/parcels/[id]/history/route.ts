import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const parcel = await prisma.parcel.findFirst({
      where: {
        plotId: id,
        userId: user.id
      },
      include: {
        history: {
          orderBy: {
            ownershipStartDate: 'asc'
          },
          include: {
             sourceDocument: true
          }
        }
      }
    });

    if (!parcel) {
      return NextResponse.json({ error: 'Parcel not found' }, { status: 404 });
    }

    return NextResponse.json({
      parcel,
      history: parcel.history
    });

  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
