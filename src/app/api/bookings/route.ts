import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/bookings - 获取预约列表
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('scheduleId');
    const playerId = searchParams.get('playerId');
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    const where: Prisma.BookingWhereInput = {};
    if (scheduleId) where.scheduleId = scheduleId;
    if (playerId) where.playerId = playerId;
    if (date) where.bookingDate = new Date(date);
    if (status && status !== 'all') where.status = status;

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            location: true,
            group: true,
          },
        },
        player: { select: { id: true, name: true, group: true } },
      },
      orderBy: { bookingDate: 'desc' },
    });

    return NextResponse.json({
      success: true,
      bookings,
      total: bookings.length,
    });
  } catch (error) {
    console.error('获取预约失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// POST /api/bookings - 创建预约
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { scheduleId, playerId, bookingDate, source } = body;

    if (!scheduleId || !playerId || !bookingDate) {
      return NextResponse.json({ success: false, error: '请填写完整信息' }, { status: 400 });
    }

    // 检查是否已存在相同预约
    const existing = await prisma.booking.findFirst({
      where: {
        scheduleId,
        playerId,
        bookingDate: new Date(bookingDate),
      },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: '该学员已预约此课程' }, { status: 400 });
    }

    // 检查容量
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) {
      return NextResponse.json({ success: false, error: '课程不存在' }, { status: 404 });
    }

    const todayBookings = await prisma.booking.count({
      where: {
        scheduleId,
        bookingDate: new Date(bookingDate),
        status: 'confirmed',
      },
    });

    if (todayBookings >= schedule.maxPlayers) {
      return NextResponse.json({ success: false, error: '课程已满员' }, { status: 400 });
    }

    const booking = await prisma.booking.create({
      data: {
        scheduleId,
        playerId,
        bookingDate: new Date(bookingDate),
        source: source || 'online',
      },
    });

    // 更新课程当前报名人数
    await prisma.schedule.update({
      where: { id: scheduleId },
      data: { currentCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error('创建预约失败:', error);
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 });
  }
}
