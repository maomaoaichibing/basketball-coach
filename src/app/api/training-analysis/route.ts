import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/training-analysis - 获取训练分析数据
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const group = searchParams.get('group');

    // 基础筛选条件
    const whereClause: Prisma.TrainingRecordWhereInput = {};
    if (playerId) whereClause.playerId = playerId;
    if (group) whereClause.player = { group };

    // 1. 获取训练记录统计
    const records = await prisma.trainingRecord.findMany({
      where: whereClause,
      include: {
        player: { select: { name: true, group: true } },
        plan: { select: { title: true, theme: true, group: true } },
      },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });

    // 2. 按技能统计平均表现
    const skillStats: Record<string, { total: number; count: number; avg: number }> = {};
    for (const record of records) {
      if (record.skillScores) {
        const scores = JSON.parse(record.skillScores);
        for (const [skill, score] of Object.entries(scores)) {
          if (!skillStats[skill]) {
            skillStats[skill] = { total: 0, count: 0, avg: 0 };
          }
          skillStats[skill].total += score as number;
          skillStats[skill].count += 1;
          skillStats[skill].avg = skillStats[skill].total / skillStats[skill].count;
        }
      }
    }

    // 3. 出勤统计
    const totalRecords = records.length;
    const presentCount = records.filter((r) => r.attendance === 'present').length;
    const absentCount = records.filter((r) => r.attendance === 'absent').length;
    const lateCount = records.filter((r) => r.attendance === 'late').length;

    // 4. 表现趋势（最近10次）
    const performanceTrend = records
      .filter((r) => r.performance !== null)
      .slice(0, 10)
      .reverse()
      .map((r, i) => ({
        index: i + 1,
        date: r.recordedAt.toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric',
        }),
        performance: r.performance,
        effort: r.effort,
        attitude: r.attitude,
      }));

    // 5. 按月份统计训练次数
    const monthlyStats: Record<string, number> = {};
    for (const record of records) {
      const month = record.recordedAt.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
      });
      monthlyStats[month] = (monthlyStats[month] || 0) + 1;
    }

    // 6. 高频问题统计
    const issueStats: Record<string, number> = {};
    for (const record of records) {
      if (record.issues) {
        const issues = JSON.parse(record.issues);
        for (const issue of issues) {
          issueStats[issue] = (issueStats[issue] || 0) + 1;
        }
      }
    }
    const topIssues = Object.entries(issueStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue, count]) => ({ issue, count }));

    // 7. 亮点统计
    const highlightStats: Record<string, number> = {};
    for (const record of records) {
      if (record.highlights) {
        const highlights = JSON.parse(record.highlights);
        for (const highlight of highlights) {
          highlightStats[highlight] = (highlightStats[highlight] || 0) + 1;
        }
      }
    }
    const topHighlights = Object.entries(highlightStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([highlight, count]) => ({ highlight, count }));

    // 8. 班级训练分布
    const groupDistribution = await prisma.trainingRecord.groupBy({
      by: ['coachName'],
      _count: true,
      where: whereClause,
      orderBy: { _count: { coachName: 'desc' } },
      take: 10,
    });

    return NextResponse.json({
      totalRecords,
      attendance: {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        rate: totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : 0,
      },
      skillStats,
      performanceTrend,
      monthlyStats,
      topIssues,
      topHighlights,
      groupDistribution,
    });
  } catch (error) {
    console.error('获取训练分析失败:', error);
    return NextResponse.json({ error: '获取训练分析失败' }, { status: 500 });
  }
}
