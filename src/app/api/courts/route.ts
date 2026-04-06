import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/courts - 获取场地列表
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const campusId = searchParams.get('campusId');
    const status = searchParams.get('status');

    const where: Prisma.CourtWhereInput = {};
    if (campusId) where.campusId = campusId;
    if (status) where.status = status;

    const courts = await prisma.court.findMany({
      where,
      include: {
        campus: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ courts });
  } catch (error) {
    console.error('获取场地列表失败:', error);
    return NextResponse.json({ error: '获取场地列表失败' }, { status: 500 });
  }
}

// POST /api/courts - 创建场地
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { name, campusId, type, capacity, description } = body;

    const court = await prisma.court.create({
      data: {
        name,
        campusId,
        type: type || 'indoor',
        capacity: capacity || 20,
        description,
        status: 'active',
      },
      include: {
        campus: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ court });
  } catch (error) {
    console.error('创建场地失败:', error);
    return NextResponse.json({ error: '创建场地失败' }, { status: 500 });
  }
}
