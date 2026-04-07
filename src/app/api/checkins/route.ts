import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/checkins - 获取打卡列表
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const playerId = searchParams.get('playerId');
    const checkInType = searchParams.get('checkInType');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Prisma.CheckInWhereInput = {};
    if (playerId) where.playerId = playerId;
    if (checkInType) where.checkInType = checkInType;

    const [checkins, total] = await Promise.all([
      prisma.checkIn.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.checkIn.count({ where }),
    ]);

    // 解析JSON字段
    const parsedCheckins = checkins.map(checkin => ({
      ...checkin,
      mediaUrls: JSON.parse((checkin.mediaUrls as unknown as string) || '[]'),
    }));

    return NextResponse.json({
      success: true,
      checkins: parsedCheckins,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('获取打卡列表失败:', error);
    return NextResponse.json({ success: false, error: '获取打卡列表失败' }, { status: 500 });
  }
}

// POST /api/checkins - 创建打卡
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();

    const {
      playerId,
      playerName,
      guardianId,
      checkInType = 'training',
      date,
      duration = 0,
      content,
      mediaUrls = '[]',
      location,
    } = body;

    if (!playerId || !playerName || !date) {
      return NextResponse.json({ success: false, error: '缺少必填字段' }, { status: 400 });
    }

    const checkin = await prisma.checkIn.create({
      data: {
        playerId,
        playerName,
        guardianId,
        checkInType,
        date: new Date(date),
        duration,
        content,
        mediaUrls: typeof mediaUrls === 'string' ? mediaUrls : JSON.stringify(mediaUrls),
        location,
      },
    });

    return NextResponse.json({ success: true, checkin });
  } catch (error) {
    console.error('创建打卡失败:', error);
    return NextResponse.json({ success: false, error: '创建打卡失败' }, { status: 500 });
  }
}
