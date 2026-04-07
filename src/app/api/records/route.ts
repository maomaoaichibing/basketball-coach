import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import prisma from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// GET /api/records - 获取训练记录列表
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const planId = searchParams.get('planId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Prisma.TrainingRecordWhereInput = {};
    if (playerId) where.playerId = playerId;
    if (planId) where.planId = planId;

    const records = await prisma.trainingRecord.findMany({
      where,
      include: {
        player: {
          select: {
            id: true,
            name: true,
            group: true,
          },
        },
        plan: {
          select: {
            id: true,
            title: true,
            date: true,
            group: true,
            theme: true,
          },
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });

    // 格式化数据
    const formattedRecords = records.map((r) => ({
      id: r.id,
      playerId: r.playerId,
      playerName: r.player?.name,
      playerGroup: r.player?.group,
      planId: r.planId,
      planTitle: r.plan?.title,
      planDate: r.plan?.date,
      planGroup: r.plan?.group,
      planTheme: r.plan?.theme,
      coachId: r.coachId,
      coachName: r.coachName,
      attendance: r.attendance,
      signInTime: r.signInTime,
      signOutTime: r.signOutTime,
      performance: r.performance,
      effort: r.effort,
      attitude: r.attitude,
      feedback: r.feedback,
      highlights: r.highlights,
      issues: r.issues,
      improvements: r.improvements,
      skillScores: r.skillScores ? JSON.parse(r.skillScores) : null,
      homework: r.homework,
      mediaUrls: r.mediaUrls ? JSON.parse(r.mediaUrls) : [],
      coachConfirmed: r.coachConfirmed,
      parentViewed: r.parentViewed,
      recordedAt: r.recordedAt,
    }));

    return NextResponse.json({
      success: true,
      records: formattedRecords,
      total: formattedRecords.length,
    });
  } catch (error) {
    console.error('获取训练记录失败:', error);
    return NextResponse.json({ success: false, error: '获取训练记录失败' }, { status: 500 });
  }
}

// POST /api/records - 创建训练记录
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();

    const {
      planId,
      playerId,
      coachId,
      coachName,
      attendance = 'present',
      signInTime,
      signOutTime,
      performance,
      effort,
      attitude,
      feedback,
      highlights,
      issues,
      improvements,
      skillScores,
      homework,
      mediaUrls,
    } = body;

    // 验证必填字段
    if (!planId) {
      return NextResponse.json({ success: false, error: '教案ID是必填项' }, { status: 400 });
    }

    const record = await prisma.trainingRecord.create({
      data: {
        planId,
        playerId,
        coachId,
        coachName,
        attendance,
        signInTime: signInTime ? new Date(signInTime) : null,
        signOutTime: signOutTime ? new Date(signOutTime) : null,
        performance,
        effort,
        attitude,
        feedback,
        highlights,
        issues,
        improvements,
        skillScores: skillScores ? JSON.stringify(skillScores) : null,
        homework,
        mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : null,
      },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            group: true,
          },
        },
        plan: {
          select: {
            id: true,
            title: true,
            date: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      record: {
        ...record,
        skillScores: skillScores || null,
        mediaUrls: mediaUrls || [],
      },
    });
  } catch (error) {
    console.error('创建训练记录失败:', error);
    return NextResponse.json({ success: false, error: '创建训练记录失败' }, { status: 500 });
  }
}
