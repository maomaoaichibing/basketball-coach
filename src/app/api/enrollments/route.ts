import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/enrollments - 获取学员课程记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const status = searchParams.get('status');

    const where: any = {};
    if (playerId) where.playerId = playerId;
    if (status && status !== 'all') where.status = status;

    const enrollments = await prisma.courseEnrollment.findMany({
      where,
      include: {
        player: {
          select: { id: true, name: true, group: true },
        },
        course: {
          select: { id: true, name: true, type: true, totalHours: true },
        },
      },
      orderBy: { purchaseDate: 'desc' },
    });

    // 解析 recordIds JSON
    const parsedEnrollments = enrollments.map(e => ({
      ...e,
      recordIds: JSON.parse((e.recordIds as string) || '[]'),
    }));

    return NextResponse.json({
      success: true,
      enrollments: parsedEnrollments,
      total: parsedEnrollments.length,
    });
  } catch (error) {
    console.error('获取学员课程记录失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// POST /api/enrollments - 为学员购买课程
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, courseId, purchaseDate, startDate, totalHours, notes } = body;

    if (!playerId || !courseId) {
      return NextResponse.json({ success: false, error: '请选择学员和课程包' }, { status: 400 });
    }

    // 获取课程包信息
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ success: false, error: '课程包不存在' }, { status: 404 });
    }

    const hours = totalHours || course.totalHours;
    const start = startDate ? new Date(startDate) : new Date();
    const expire = new Date(start);
    expire.setDate(expire.getDate() + course.validDays);

    const enrollment = await prisma.courseEnrollment.create({
      data: {
        playerId,
        courseId,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        startDate: start,
        expireDate: expire,
        totalHours: hours,
        usedHours: 0,
        remainingHours: hours,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      enrollment: {
        ...enrollment,
        recordIds: [],
      },
    });
  } catch (error) {
    console.error('创建学员课程记录失败:', error);
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 });
  }
}
