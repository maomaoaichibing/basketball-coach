import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { runAllAutoChecks } from '@/server/services/notificationService';

// GET /api/notifications/check - 全量自动检查（课时不足 + 课程到期）
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;
  try {
    const result = await runAllAutoChecks();

    return NextResponse.json({
      success: true,
      total: result.total,
      results: result.details,
      summary: `检查完成，共发送 ${result.total} 条提醒`,
    });
  } catch (error) {
    console.error('检查通知失败:', error);
    return NextResponse.json({ error: '检查通知失败' }, { status: 500 });
  }
}
