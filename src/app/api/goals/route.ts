import { NextRequest, NextResponse } from 'next/server';
import { Prisma, Player } from '@prisma/client';

import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// 技能类型映射
type SkillType = keyof Pick<
  Player,
  'dribbling' | 'passing' | 'shooting' | 'defending' | 'physical' | 'tactical'
>;

// 获取目标列表
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const status = searchParams.get('status');

    const where: Prisma.PlayerGoalWhereInput = {};
    if (playerId) where.playerId = playerId;
    if (status) where.status = status;

    const goals = await prisma.playerGoal.findMany({
      where,
      include: {
        player: {
          select: {
            id: true,
            name: true,
            group: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, goals });
  } catch (error) {
    console.error('获取目标列表失败:', error);
    return NextResponse.json({ success: false, error: '获取目标列表失败' }, { status: 500 });
  }
}

// 创建目标
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { playerId, skillType, targetScore, targetDate } = body;

    if (!playerId || !skillType || targetScore === undefined) {
      return NextResponse.json({ success: false, error: '缺少必填字段' }, { status: 400 });
    }

    // 获取学员当前能力值
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return NextResponse.json({ success: false, error: '学员不存在' }, { status: 404 });
    }

    // 根据skillType获取当前分数
    const currentScore = (player[skillType as SkillType] as number) || 0;

    const goal = await prisma.playerGoal.create({
      data: {
        playerId,
        skillType,
        targetScore: parseInt(targetScore),
        currentScore,
        targetDate: targetDate ? new Date(targetDate) : null,
        status: 'active',
      },
    });

    return NextResponse.json({ success: true, goal });
  } catch (error) {
    console.error('创建目标失败:', error);
    return NextResponse.json({ success: false, error: '创建目标失败' }, { status: 500 });
  }
}
