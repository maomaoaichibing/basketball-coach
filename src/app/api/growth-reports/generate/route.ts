import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// POST /api/growth-reports/generate - 自动生成成长报告
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { playerId, periodStart, periodEnd, reportType = 'quarterly' } = body;

    if (!playerId || !periodStart || !periodEnd) {
      return NextResponse.json({ success: false, error: '缺少必填字段' }, { status: 400 });
    }

    // 获取学员信息
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return NextResponse.json({ success: false, error: '学员不存在' }, { status: 404 });
    }

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    // 获取训练记录统计
    const trainingRecords = await prisma.trainingRecord.findMany({
      where: {
        playerId,
        recordedAt: { gte: startDate, lte: endDate },
      },
    });

    // 获取评估记录
    const assessments = await prisma.playerAssessment.findMany({
      where: {
        playerId,
        assessedAt: { gte: startDate, lte: endDate },
      },
    });

    // 获取比赛数据
    const matchEvents = await prisma.matchEvent.findMany({
      where: {
        playerId,
        match: {
          matchDate: { gte: startDate, lte: endDate },
        },
      },
      include: {
        match: true,
      },
    });

    // 计算能力数据（取最新的评估数据）
    const latestAssessment = assessments[0];
    const abilities: Record<string, number> = latestAssessment
      ? {
          dribbling: latestAssessment.dribbling || player.dribbling,
          passing: latestAssessment.passing || player.passing,
          shooting: latestAssessment.shooting || player.shooting,
          defending: latestAssessment.defending || player.defending,
          physical: latestAssessment.physical || player.physical,
          tactical: latestAssessment.tactical || player.tactical,
        }
      : {
          dribbling: player.dribbling,
          passing: player.passing,
          shooting: player.shooting,
          defending: player.defending,
          physical: player.physical,
          tactical: player.tactical,
        };

    // 计算训练统计
    const totalSessions = trainingRecords.length;
    const attendance = trainingRecords.filter(r => r.attendance === 'present').length;
    const attendanceRate = totalSessions > 0 ? Math.round((attendance / totalSessions) * 100) : 0;
    const avgPerformance =
      trainingRecords.reduce((sum, r) => sum + (r.performance || 0), 0) /
      (trainingRecords.filter(r => r.performance).length || 1);

    const trainingStats = {
      totalSessions,
      attendance,
      attendanceRate,
      avgPerformance: Math.round(avgPerformance * 10) / 10,
      totalHours: totalSessions * 1.5, // 假设每次训练1.5小时
    };

    // 计算比赛统计
    const matchIds = Array.from(new Set(matchEvents.map(e => e.matchId)));
    const totalMatches = matchIds.length;
    let wins = 0;
    let totalPoints = 0;
    let totalRebounds = 0;
    let totalAssists = 0;

    matchEvents.forEach(event => {
      if (event.eventType === 'score') {
        totalPoints += event.points || 0;
      } else if (event.eventType === 'rebound') {
        totalRebounds += 1;
      } else if (event.eventType === 'assist') {
        totalAssists += 1;
      }
    });

    // 计算胜负
    const matches = await prisma.match.findMany({
      where: {
        id: { in: matchIds },
      },
    });
    wins = matches.filter(m => m.result === 'win').length;

    const matchStats = {
      totalMatches,
      wins,
      losses: totalMatches - wins,
      winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
      avgPoints: totalMatches > 0 ? Math.round((totalPoints / totalMatches) * 10) / 10 : 0,
      totalPoints,
      totalRebounds,
      totalAssists,
    };

    // 生成 strengths 和 improvements
    const skillAbilities = [
      { name: '运球', value: abilities.dribbling, key: 'dribbling' },
      { name: '传球', value: abilities.passing, key: 'passing' },
      { name: '投篮', value: abilities.shooting, key: 'shooting' },
      { name: '防守', value: abilities.defending, key: 'defending' },
      { name: '体能', value: abilities.physical, key: 'physical' },
      { name: '战术', value: abilities.tactical, key: 'tactical' },
    ];

    // 排序找出强项和弱项
    const sortedAbilities = [...skillAbilities].sort((a, b) => b.value - a.value);
    const strengths = sortedAbilities.slice(0, 2).map(s => `${s.name}能力表现良好`);
    const improvements = sortedAbilities.slice(-2).map(s => `需要加强${s.name}训练`);

    // 整体评分
    const overallRating = Math.round(
      (abilities.dribbling +
        abilities.passing +
        abilities.shooting +
        abilities.defending +
        abilities.physical +
        abilities.tactical) /
        6
    );

    // 生成报告标题
    const startStr = startDate.toLocaleDateString('zh-CN', { month: 'long' });
    const endStr = endDate.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
    });
    let title = '';
    switch (reportType) {
      case 'monthly':
        title = `${startDate.getFullYear()}年${startDate.getMonth() + 1}月成长报告`;
        break;
      case 'quarterly': {
        const quarter = Math.ceil((startDate.getMonth() + 1) / 3);
        title = `${startDate.getFullYear()}年第${quarter}季度成长报告`;
        break;
      }
      case 'yearly':
        title = `${startDate.getFullYear()}年度成长报告`;
        break;
      default:
        title = `${startStr}-${endStr}成长报告`;
    }

    return NextResponse.json({
      success: true,
      preview: {
        playerName: player.name,
        title,
        periodStart: startDate,
        periodEnd: endDate,
        reportType,
        abilities,
        trainingStats,
        matchStats,
        strengths,
        improvements,
        overallRating,
        totalRecords: trainingRecords.length,
        assessmentCount: assessments.length,
        matchCount: totalMatches,
      },
    });
  } catch (error) {
    console.error('生成成长报告失败:', error);
    return NextResponse.json({ success: false, error: '生成成长报告失败' }, { status: 500 });
  }
}
