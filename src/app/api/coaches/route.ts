import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/coaches - 获取教练列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campusId = searchParams.get('campusId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (campusId) where.campusId = campusId;
    if (status) where.status = status;

    const coaches = await prisma.coach.findMany({
      where,
      include: {
        campus: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ coaches });
  } catch (error) {
    console.error('获取教练列表失败:', error);
    return NextResponse.json({ error: '获取教练列表失败' }, { status: 500 });
  }
}

// POST /api/coaches - 创建教练
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, campusId, specialties, hireDate, notes, password } = body;

    const coach = await prisma.coach.create({
      data: {
        name,
        phone,
        email,
        password: password || '123456', // 默认密码，生产环境应该要求必填
        campusId,
        specialties: JSON.stringify(specialties || []),
        hireDate: hireDate ? new Date(hireDate) : null,
        notes,
        status: 'active',
      },
      include: {
        campus: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ coach });
  } catch (error) {
    console.error('创建教练失败:', error);
    return NextResponse.json({ error: '创建教练失败' }, { status: 500 });
  }
}
