import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/players/[id]/growth-curve - 获取学员成长曲线数据
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const months = parseInt(searchParams.get('months') || '6'); // 默认查询最近6个月

    // 计算起始日期
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // 获取学员历史评估记录
    const assessments = await prisma.playerAssessment.findMany({
      where: {
        playerId: id,
        assessedAt: {
          gte: startDate,
        },
      },
      orderBy: {
        assessedAt: 'asc',
      },
    });

    // 获取学员当前能力值（从Player表）
    const player = await prisma.player.findUnique({
      where: { id },
      select: {
        dribbling: true,
        passing: true,
        shooting: true,
        defending: true,
        physical: true,
        tactical: true,
        updatedAt: true,
      },
    });

    if (!player) {
      return NextResponse.json({ success: false, error: '学员不存在' }, { status: 404 });
    }

    // 构建成长曲线数据点
    const dataPoints = assessments.map((assessment) => ({
      date: assessment.assessedAt.toISOString().split('T')[0],
      dribbling: assessment.dribbling || 0,
      passing: assessment.passing || 0,
      shooting: assessment.shooting || 0,
      defending: assessment.defending || 0,
      physical: assessment.physical || 0,
      tactical: assessment.tactical || 0,
      overall: assessment.overall || 0,
      notes: assessment.notes,
      assessor: assessment.assessor,
    }));

    // 添加当前能力值作为最后一个数据点
    dataPoints.push({
      date: new Date().toISOString().split('T')[0],
      dribbling: player.dribbling,
      passing: player.passing,
      shooting: player.shooting,
      defending: player.defending,
      physical: player.physical,
      tactical: player.tactical,
      overall: Math.round(
        (player.dribbling +
          player.passing +
          player.shooting +
          player.defending +
          player.physical +
          player.tactical) /
          6
      ),
      notes: '当前能力值',
      assessor: null,
    });

    // 计算各项能力的成长趋势
    const calculateTrend = (key: 'dribbling' | 'passing' | 'shooting' | 'defending' | 'physical' | 'tactical') => {
      if (dataPoints.length < 2) return { change: 0, trend: 'stable' as const };
      const first = dataPoints[0][key] as number;
      const last = dataPoints[dataPoints.length - 1][key] as number;
      const change = last - first;
      return {
        change,
        trend: change > 0.5 ? ('up' as const) : change < -0.5 ? ('down' as const) : ('stable' as const),
      };
    };

    const trends = {
      dribbling: calculateTrend('dribbling'),
      passing: calculateTrend('passing'),
      shooting: calculateTrend('shooting'),
      defending: calculateTrend('defending'),
      physical: calculateTrend('physical'),
      tactical: calculateTrend('tactical'),
    };

    // 计算平均成长速度（每月）
    const monthsDiff = Math.max(1, months);
    const growthRate = {
      dribbling: Number((trends.dribbling.change / monthsDiff).toFixed(2)),
      passing: Number((trends.passing.change / monthsDiff).toFixed(2)),
      shooting: Number((trends.shooting.change / monthsDiff).toFixed(2)),
      defending: Number((trends.defending.change / monthsDiff).toFixed(2)),
      physical: Number((trends.physical.change / monthsDiff).toFixed(2)),
      tactical: Number((trends.tactical.change / monthsDiff).toFixed(2)),
    };

    return NextResponse.json({
      success: true,
      data: {
        playerId: id,
        dataPoints,
        trends,
        growthRate,
        totalAssessments: assessments.length,
        period: {
          start: startDate.toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0],
        },
      },
    });
  } catch (error) {
    console.error('获取成长曲线数据失败:', error);
    return NextResponse.json({ success: false, error: '获取成长曲线数据失败' }, { status: 500 });
  }
}
