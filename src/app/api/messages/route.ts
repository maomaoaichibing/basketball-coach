import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/messages - 获取消息列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const playerId = searchParams.get('playerId');
    const senderId = searchParams.get('senderId');
    const receiverId = searchParams.get('receiverId');
    const isRead = searchParams.get('isRead');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, string | boolean | undefined> = {};
    if (playerId) where.playerId = playerId;
    if (senderId) where.senderId = senderId;
    if (receiverId) where.receiverId = receiverId;
    if (isRead !== null) where.isRead = isRead === 'true';

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.message.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      messages,
      total,
      unreadCount: await prisma.message.count({
        where: { isRead: false, receiverId },
      }),
    });
  } catch (error) {
    console.error('获取消息列表失败:', error);
    return NextResponse.json({ success: false, error: '获取消息列表失败' }, { status: 500 });
  }
}

// POST /api/messages - 发送消息
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      senderId,
      senderName,
      senderType,
      senderAvatar,
      content,
      messageType = 'text',
      playerId,
      relatedType,
      relatedId,
      receiverId,
      receiverName,
    } = body;

    if (!senderId || !senderName || !content) {
      return NextResponse.json({ success: false, error: '缺少必填字段' }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        senderName,
        senderType,
        senderAvatar,
        content,
        messageType,
        playerId,
        relatedType,
        relatedId,
        receiverId,
        receiverName,
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('发送消息失败:', error);
    return NextResponse.json({ success: false, error: '发送消息失败' }, { status: 500 });
  }
}
