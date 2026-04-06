import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/db';

// 简单限流：每个手机号每分钟最多请求5次
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分钟
const RATE_LIMIT_MAX = 5; // 每分钟最多5次请求

function checkRateLimit(phone: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(phone);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(phone, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// GET /api/parent - 家长端查询接口
// 通过手机号查询自己孩子的训练情况
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ success: false, error: '请提供手机号' }, { status: 400 });
    }

    // 限流检查
    if (!checkRateLimit(phone)) {
      return NextResponse.json(
        { success: false, error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    // 通过手机号查找学员
    const players = await prisma.player.findMany({
      where: {
        OR: [{ parentPhone: phone }, { guardians: { some: { mobile: phone } } }],
      },
      include: {
        team: {
          select: { name: true, coachName: true },
        },
        guardians: {
          select: { name: true, relation: true, mobile: true },
        },
      },
    });

    if (players.length === 0) {
      return NextResponse.json({
        success: true,
        players: [],
        message: '未找到关联的学员，请确认手机号是否正确',
      });
    }

    // 批量查询：收集所有 playerIds，一次查完所有关联数据（避免 N+1）
    const playerIds = players.map(p => p.id);

    const [allRecords, allAssessments, allGoals, allEnrollments] = await Promise.all([
      // 所有学员最近10条训练记录
      prisma.trainingRecord.findMany({
        where: { playerId: { in: playerIds } },
        include: {
          plan: { select: { title: true, date: true, duration: true, group: true } },
        },
        orderBy: { recordedAt: 'desc' },
        take: playerIds.length * 10, // 每个学员最多10条
      }),
      // 所有学员最新评估
      prisma.playerAssessment.groupBy({
        by: ['playerId'],
        where: { playerId: { in: playerIds } },
        _max: { assessedAt: true },
      }),
      // 所有学员进行中的目标
      prisma.playerGoal.findMany({
        where: { playerId: { in: playerIds }, status: 'active' },
      }),
      // 所有学员课程信息
      prisma.courseEnrollment.findMany({
        where: { playerId: { in: playerIds } },
        include: { course: true },
        orderBy: { purchaseDate: 'desc' },
      }),
    ]);

    // 获取每个学员的最新完整评估记录
    const assessmentDates = allAssessments.map(a => a._max.assessedAt).filter(Boolean) as Date[];
    const fullAssessments =
      assessmentDates.length > 0
        ? await prisma.playerAssessment.findMany({
            where: { assessedAt: { in: assessmentDates } },
          })
        : [];

    // 按 playerId 索引关联数据
    const recordsByPlayer = new Map<string, typeof allRecords>();
    for (const r of allRecords) {
      if (!r.playerId) continue;
      if (!recordsByPlayer.has(r.playerId)) recordsByPlayer.set(r.playerId, []);
      const list = recordsByPlayer.get(r.playerId)!;
      if (list.length < 10) list.push(r);
    }

    const assessmentByPlayer = new Map(fullAssessments.map(a => [a.playerId, a]));

    const goalsByPlayer = new Map<string, typeof allGoals>();
    for (const g of allGoals) {
      if (!goalsByPlayer.has(g.playerId)) goalsByPlayer.set(g.playerId, []);
      goalsByPlayer.get(g.playerId)!.push(g);
    }

    const enrollmentsByPlayer = new Map<string, typeof allEnrollments>();
    for (const e of allEnrollments) {
      if (!enrollmentsByPlayer.has(e.playerId)) enrollmentsByPlayer.set(e.playerId, []);
      enrollmentsByPlayer.get(e.playerId)!.push(e);
    }

    // 组装结果
    const playersWithRecords = players.map(player => {
      const records = recordsByPlayer.get(player.id) || [];
      const latestAssessment = assessmentByPlayer.get(player.id) || null;
      const activeGoals = goalsByPlayer.get(player.id) || [];
      const enrollments = enrollmentsByPlayer.get(player.id) || [];

      return {
        ...player,
        injuries: JSON.parse((player.injuries as string) || '[]'),
        tags: JSON.parse((player.tags as string) || '[]'),
        records: records.map(r => ({
          ...r,
          skillScores: r.skillScores ? JSON.parse(r.skillScores) : null,
        })),
        latestAssessment: latestAssessment
          ? {
              ...latestAssessment,
              dribbling: latestAssessment.dribbling,
              passing: latestAssessment.passing,
              shooting: latestAssessment.shooting,
              defending: latestAssessment.defending,
              physical: latestAssessment.physical,
              tactical: latestAssessment.tactical,
            }
          : null,
        activeGoals,
        enrollments: enrollments.map(e => ({
          ...e,
          recordIds: JSON.parse((e.recordIds as string) || '[]'),
        })),
      };
    });

    return NextResponse.json({
      success: true,
      players: playersWithRecords,
      total: playersWithRecords.length,
    });
  } catch (error) {
    console.error('获取家长数据失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}
