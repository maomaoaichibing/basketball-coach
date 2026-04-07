import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { onTrainingCompleted } from '@/server/services/notificationService';

// POST /api/notifications/trigger - 训练完成后触发通知
// body: { planId, planTitle, planTheme, records: [{ playerId, playerName, attendance, performance, feedback }] }
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { planId, planTitle, planTheme, records } = body;

    if (!planId || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const result = await onTrainingCompleted(
      planId,
      planTitle || '训练课',
      planTheme,
      records.map((r: Record<string, unknown>) => ({
        playerId: r.playerId as string,
        playerName: r.playerName as string,
        attendance: (r.attendance as string) || 'present',
        performance: r.performance as number | null,
        feedback: r.feedback as string | null,
      }))
    );

    return NextResponse.json({
      success: true,
      ...result,
      message: `已发送 ${result.sent} 条训练完成通知`,
    });
  } catch (error) {
    console.error('触发通知失败:', error);
    return NextResponse.json({ error: '触发通知失败' }, { status: 500 });
  }
}
