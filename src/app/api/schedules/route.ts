import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/schedules - 获取排课列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group');
    const dayOfWeek = searchParams.get('dayOfWeek');
    const status = searchParams.get('status');

    const where: any = {};
    if (group && group !== 'all') where.group = group;
    if (dayOfWeek && dayOfWeek !== 'all') where.dayOfWeek = parseInt(dayOfWeek);
    if (status && status !== 'all') where.status = status;

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        team: { select: { id: true, name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      schedules,
      total: schedules.length,
    });
  } catch (error) {
    console.error('获取排课失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// POST /api/schedules - 创建排课
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      group,
      teamId,
      dayOfWeek,
      startTime,
      endTime,
      duration,
      location,
      coachId,
      coachName,
      maxPlayers,
      applicableCourses,
      notes,
    } = body;

    if (!title || dayOfWeek === undefined || !startTime || !endTime || !location) {
      return NextResponse.json({ success: false, error: '请填写完整信息' }, { status: 400 });
    }

    const schedule = await prisma.schedule.create({
      data: {
        title,
        group: group || 'U10',
        teamId,
        dayOfWeek,
        startTime,
        endTime,
        duration: duration || 90,
        location,
        coachId,
        coachName,
        maxPlayers: maxPlayers || 20,
        applicableCourses: JSON.stringify(applicableCourses || ['package']),
        notes,
      },
    });

    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error('创建排课失败:', error);
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 });
  }
}
