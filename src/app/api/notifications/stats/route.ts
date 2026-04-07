import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getNotificationStats } from '@/server/services/notificationService';

// GET /api/notifications/stats - 获取通知统计数据
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const stats = await getNotificationStats();
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('获取通知统计失败:', error);
    return NextResponse.json({ error: '获取通知统计失败' }, { status: 500 });
  }
}
