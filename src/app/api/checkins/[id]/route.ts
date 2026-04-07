import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/checkins/[id] - 获取打卡详情
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;

    const checkin = await prisma.checkIn.findUnique({ where: { id } });

    if (!checkin) {
      return NextResponse.json({ success: false, error: '打卡记录不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      checkin: {
        ...checkin,
        mediaUrls: JSON.parse((checkin.mediaUrls as unknown as string) || '[]'),
      },
    });
  } catch (error) {
    console.error('获取打卡详情失败:', error);
    return NextResponse.json({ success: false, error: '获取打卡详情失败' }, { status: 500 });
  }
}

// PUT /api/checkins/[id] - 更新打卡（添加教练反馈）
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.checkIn.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: '打卡记录不存在' }, { status: 404 });
    }

    const { coachFeedback, coachId, coachName, feedbackAt } = body;

    const checkin = await prisma.checkIn.update({
      where: { id },
      data: {
        ...(coachFeedback !== undefined && { coachFeedback }),
        ...(coachId !== undefined && { coachId }),
        ...(coachName !== undefined && { coachName }),
        ...(feedbackAt && { feedbackAt: new Date(feedbackAt) }),
      },
    });

    return NextResponse.json({ success: true, checkin });
  } catch (error) {
    console.error('更新打卡失败:', error);
    return NextResponse.json({ success: false, error: '更新打卡失败' }, { status: 500 });
  }
}
