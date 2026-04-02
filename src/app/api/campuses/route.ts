import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/campuses - 获取校区列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Prisma.CampusWhereInput = {};
    if (status) where.status = status;

    const campuses = await prisma.campus.findMany({
      where,
      include: {
        _count: {
          select: {
            players: true,
            teams: true,
            coaches: true,
            courts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ campuses });
  } catch (error) {
    console.error('获取校区列表失败:', error);
    return NextResponse.json({ error: '获取校区列表失败' }, { status: 500 });
  }
}

// POST /api/campuses - 创建校区
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      code,
      address,
      phone,
      managerName,
      latitude,
      longitude,
      openTime,
      closeTime,
      description,
    } = body;

    const campus = await prisma.campus.create({
      data: {
        name,
        code,
        address,
        phone,
        managerName,
        latitude,
        longitude,
        openTime,
        closeTime,
        description,
        status: 'active',
      },
    });

    return NextResponse.json({ campus });
  } catch (error) {
    console.error('创建校区失败:', error);
    return NextResponse.json({ error: '创建校区失败' }, { status: 500 });
  }
}
