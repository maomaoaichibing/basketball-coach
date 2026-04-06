import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/messages/[id] - 获取消息详情
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;

    const message = await prisma.message.findUnique({ where: { id } });

    if (!message) {
      return NextResponse.json({ success: false, error: '消息不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('获取消息详情失败:', error);
    return NextResponse.json({ success: false, error: '获取消息详情失败' }, { status: 500 });
  }
}

// PUT /api/messages/[id] - 更新消息状态
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();

    const { isRead } = body;

    const message = await prisma.message.update({
      where: { id },
      data: {
        ...(isRead !== undefined && {
          isRead,
          readAt: isRead ? new Date() : null,
        }),
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('更新消息失败:', error);
    return NextResponse.json({ success: false, error: '更新消息失败' }, { status: 500 });
  }
}
