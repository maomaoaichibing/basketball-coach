import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/leaves - 获取请假列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const playerId = searchParams.get('playerId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (playerId) where.playerId = playerId;
    if (status) where.status = status;

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.leave.count({ where }),
    ]);

    // 解析JSON字段
    const parsedLeaves = leaves.map(leave => ({
      ...leave,
      dates: JSON.parse(leave.dates || '[]'),
      scheduleIds: JSON.parse(leave.scheduleIds || '[]'),
    }));

    return NextResponse.json({
      success: true,
      leaves: parsedLeaves,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('获取请假列表失败:', error);
    return NextResponse.json({ success: false, error: '获取请假列表失败' }, { status: 500 });
  }
}

// POST /api/leaves - 创建请假申请
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      playerId,
      playerName,
      guardianId,
      guardianName,
      leaveType = 'absence',
      reason,
      dates,
      scheduleIds = '[]',
      totalHours = 0,
    } = body;

    if (!playerId || !playerName || !dates) {
      return NextResponse.json({ success: false, error: '缺少必填字段' }, { status: 400 });
    }

    const leave = await prisma.leave.create({
      data: {
        playerId,
        playerName,
        guardianId,
        guardianName,
        leaveType,
        reason,
        dates: typeof dates === 'string' ? dates : JSON.stringify(dates),
        scheduleIds: typeof scheduleIds === 'string' ? scheduleIds : JSON.stringify(scheduleIds),
        totalHours,
        status: 'pending',
      },
    });

    return NextResponse.json({ success: true, leave });
  } catch (error) {
    console.error('创建请假申请失败:', error);
    return NextResponse.json({ success: false, error: '创建请假申请失败' }, { status: 500 });
  }
}
