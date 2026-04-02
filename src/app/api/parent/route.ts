import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/parent - 家长端查询接口
// 通过手机号查询自己孩子的训练情况
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ success: false, error: '请提供手机号' }, { status: 400 });
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

    // 获取每个学员的训练记录
    const playersWithRecords = await Promise.all(
      players.map(async player => {
        // 获取最近10条训练记录
        const records = await prisma.trainingRecord.findMany({
          where: { playerId: player.id },
          include: {
            plan: {
              select: { title: true, date: true, duration: true, group: true },
            },
          },
          orderBy: { recordedAt: 'desc' },
          take: 10,
        });

        // 获取最新评估
        const latestAssessment = await prisma.playerAssessment.findFirst({
          where: { playerId: player.id },
          orderBy: { assessedAt: 'desc' },
        });

        // 获取进行中的目标
        const activeGoals = await prisma.playerGoal.findMany({
          where: { playerId: player.id, status: 'active' },
        });

        // 获取课程信息
        const enrollments = await prisma.courseEnrollment.findMany({
          where: { playerId: player.id },
          include: { course: true },
          orderBy: { purchaseDate: 'desc' },
        });

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
      })
    );

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
