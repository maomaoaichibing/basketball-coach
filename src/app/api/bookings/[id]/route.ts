import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-middleware';

const prisma = new PrismaClient();

// GET /api/bookings/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        schedule: true,
        player: { select: { id: true, name: true, group: true } },
      },
    });
    if (!booking)
      return NextResponse.json({ success: false, error: '预约不存在' }, { status: 404 });
    return NextResponse.json({ success: true, booking });
  } catch {
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// PUT /api/bookings/[id] - 更新预约状态
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { status, cancelReason } = body;

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
    });
    if (!booking)
      return NextResponse.json({ success: false, error: '预约不存在' }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) {
      updateData.status = status;
      // 如果取消预约，减少课程报名人数
      if (status === 'cancelled' && booking.status === 'confirmed') {
        await prisma.schedule.update({
          where: { id: booking.scheduleId },
          data: { currentCount: { decrement: 1 } },
        });
      }
    }
    if (cancelReason !== undefined) updateData.cancelReason = cancelReason;

    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch {
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}

// DELETE /api/bookings/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
    });
    if (booking?.status === 'confirmed') {
      await prisma.schedule.update({
        where: { id: booking.scheduleId },
        data: { currentCount: { decrement: 1 } },
      });
    }
    await prisma.booking.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
