import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { sendBulkNotification } from '@/server/services/notificationService';

// POST /api/notifications/trigger/bulk - 批量发送通知
// body: { playerIds, title, content, type, relatedType?, relatedId? }
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { playerIds, title, content, type, relatedType, relatedId } = body;

    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json({ error: '请选择至少一个学员' }, { status: 400 });
    }
    if (!title || !content) {
      return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 });
    }
    if (playerIds.length > 100) {
      return NextResponse.json({ error: '单次最多发送 100 条通知' }, { status: 400 });
    }

    const result = await sendBulkNotification({
      playerIds,
      title,
      content,
      type: type || 'system',
      relatedType,
      relatedId,
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: `已发送 ${result.sent} 条通知`,
    });
  } catch (error) {
    console.error('批量发送通知失败:', error);
    return NextResponse.json({ error: '批量发送通知失败' }, { status: 500 });
  }
}
