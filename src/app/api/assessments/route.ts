import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import prisma from '@/lib/db';

// GET /api/assessments - 获取评估记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Prisma.PlayerAssessmentWhereInput = {};
    if (playerId) {
      where.playerId = playerId;
    }

    const assessments = await prisma.playerAssessment.findMany({
      where,
      orderBy: { assessedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      assessments,
      total: assessments.length,
    });
  } catch (error) {
    console.error('获取评估记录失败:', error);
    return NextResponse.json({ success: false, error: '获取评估记录失败' }, { status: 500 });
  }
}

// POST /api/assessments - 创建评估记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      playerId,
      dribbling,
      passing,
      shooting,
      defending,
      physical,
      tactical,
      overall,
      notes,
      assessor,
    } = body;

    // 验证必填字段
    if (!playerId) {
      return NextResponse.json({ success: false, error: '学员ID是必填项' }, { status: 400 });
    }

    // 检查学员是否存在
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return NextResponse.json({ success: false, error: '学员不存在' }, { status: 404 });
    }

    // 计算综合评分（如果未提供）
    const calculatedOverall =
      overall ||
      Math.round(
        ((dribbling || player.dribbling) +
          (passing || player.passing) +
          (shooting || player.shooting) +
          (defending || player.defending) +
          (physical || player.physical) +
          (tactical || player.tactical)) /
          6
      );

    const assessment = await prisma.playerAssessment.create({
      data: {
        playerId,
        dribbling: dribbling ?? player.dribbling,
        passing: passing ?? player.passing,
        shooting: shooting ?? player.shooting,
        defending: defending ?? player.defending,
        physical: physical ?? player.physical,
        tactical: tactical ?? player.tactical,
        overall: calculatedOverall,
        notes,
        assessor,
      },
    });

    return NextResponse.json({
      success: true,
      assessment,
    });
  } catch (error) {
    console.error('创建评估记录失败:', error);
    return NextResponse.json({ success: false, error: '创建评估记录失败' }, { status: 500 });
  }
}
