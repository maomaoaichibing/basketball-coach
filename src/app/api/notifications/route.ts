import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/notifications - 获取通知列表
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const playerId = searchParams.get('playerId');
    const type = searchParams.get('type');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const where: Prisma.NotificationWhereInput = {};
    if (status) where.status = status;
    if (playerId) where.playerId = playerId;
    if (type) where.type = type;
    if (unreadOnly) where.status = { in: ['pending', 'sent'] };
    const guardianId = searchParams.get('guardianId');
    if (guardianId) where.guardianId = guardianId;

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        player: { select: { id: true, name: true } },
        template: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // 统计未读数量
    const unreadCount = await prisma.notification.count({
      where: { status: { in: ['pending', 'sent'] } },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('获取通知列表失败:', error);
    return NextResponse.json({ error: '获取通知列表失败' }, { status: 500 });
  }
}

// POST /api/notifications - 创建通知
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const {
      playerId,
      guardianId,
      guardianName,
      title,
      content,
      type = 'system',
      channel = 'in_app',
      scheduledAt,
      relatedType,
      relatedId,
      templateId,
    } = body;

    const notification = await prisma.notification.create({
      data: {
        playerId,
        guardianId,
        guardianName,
        templateId,
        title,
        content,
        type,
        channel,
        status: 'pending',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        relatedType,
        relatedId,
      },
      include: {
        player: { select: { id: true, name: true } },
      },
    });

    // 如果是立即发送，模拟发送
    if (!scheduledAt && channel === 'in_app') {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'sent', sentAt: new Date() },
      });
    }

    return NextResponse.json({ notification });
  } catch (error) {
    console.error('创建通知失败:', error);
    return NextResponse.json({ error: '创建通知失败' }, { status: 500 });
  }
}
