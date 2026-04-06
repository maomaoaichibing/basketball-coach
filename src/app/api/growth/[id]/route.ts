import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// GET /api/growth/[id] - 获取成长数据详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;

    // 检查是学员ID还是记录ID
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        assessments: { orderBy: { assessedAt: 'desc' }, take: 20 },
        records: { orderBy: { createdAt: 'desc' }, take: 20 },
        enrollments: { include: { course: true } },
      },
    });

    if (!player) {
      return NextResponse.json({ success: false, error: '学员不存在' }, { status: 404 });
    }

    // 计算统计数据
    const stats = {
      totalAssessments: player.assessments.length,
      totalRecords: player.records.length,
      averageScore:
        player.assessments.length > 0
          ? Math.round(
              player.assessments.reduce((sum, a) => sum + (a.overall || 0), 0) /
                player.assessments.length
            )
          : 0,
      latestAssessment: player.assessments[0] || null,
      attendanceRate:
        player.records.length > 0
          ? Math.round(
              (player.records.filter(r => r.attendance === 'present').length /
                player.records.length) *
                100
            )
          : 0,
    };

    return NextResponse.json({
      success: true,
      player,
      stats,
    });
  } catch (error) {
    console.error('获取成长数据失败:', error);
    return NextResponse.json({ success: false, error: '获取成长数据失败' }, { status: 500 });
  }
}
