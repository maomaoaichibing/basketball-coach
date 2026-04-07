import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/schedules/[id] - 获取单个排课详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: params.id },
      include: {
        team: { select: { id: true, name: true, coachName: true } },
        plan: { select: { id: true, title: true, date: true, group: true, theme: true, status: true, duration: true } },
        bookings: {
          where: { status: 'confirmed' },
          include: {
            player: { select: { id: true, name: true, group: true } },
          },
          orderBy: { bookingDate: 'desc' },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json({ success: false, error: '排课不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      schedule: {
        ...schedule,
        applicableCourses: JSON.parse((schedule.applicableCourses as string) || '[]'),
      },
    });
  } catch (error) {
    console.error('获取排课失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// PUT /api/schedules/[id] - 更新排课
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;

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
      status,
      applicableCourses,
      planId,
      notes,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (group !== undefined) updateData.group = group;
    if (teamId !== undefined) updateData.teamId = teamId;
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (duration !== undefined) updateData.duration = duration;
    if (location !== undefined) updateData.location = location;
    if (coachId !== undefined) updateData.coachId = coachId;
    if (coachName !== undefined) updateData.coachName = coachName;
    if (maxPlayers !== undefined) updateData.maxPlayers = maxPlayers;
    if (status !== undefined) updateData.status = status;
    if (applicableCourses !== undefined)
      updateData.applicableCourses = JSON.stringify(applicableCourses);
    if (planId !== undefined) updateData.planId = planId || null;
    if (notes !== undefined) updateData.notes = notes;

    const schedule = await prisma.schedule.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      schedule: {
        ...schedule,
        applicableCourses: JSON.parse((schedule.applicableCourses as string) || '[]'),
      },
    });
  } catch (error) {
    console.error('更新排课失败:', error);
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}

// DELETE /api/schedules/[id] - 删除排课
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;

  try {
    // 先删除关联的预约
    await prisma.booking.deleteMany({
      where: { scheduleId: params.id },
    });

    await prisma.schedule.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除排课失败:', error);
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
