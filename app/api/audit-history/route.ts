import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';

// GET /api/audit-history - Get all audit logs for the current user
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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const plotId = searchParams.get('plotId');

    // Build where clause
    const where: any = {
      userId: user.id
    };

    if (action) {
      where.action = action;
    }

    // Fetch changelog entries with parcel details
    let changeLogs = await prisma.changeLog.findMany({
      where,
      include: {
        parcel: {
          select: {
            plotId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Limit to 100 most recent entries
    });

    // Filter by plotId if provided (case-insensitive search)
    if (plotId) {
      changeLogs = changeLogs.filter(log => 
        log.parcel?.plotId.toLowerCase().includes(plotId.toLowerCase())
      );
    }

    // Format response
    const formattedLogs = changeLogs.map(log => ({
      id: log.id,
      plotId: log.parcel?.plotId || 'N/A',
      action: log.action,
      fieldName: log.fieldName,
      oldValue: log.oldValue,
      newValue: log.newValue,
      description: log.description,
      createdAt: log.createdAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: formattedLogs
    });

  } catch (error) {
    console.error('Fetch audit history error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
