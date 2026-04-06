import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// GET 获取智能推荐列表
export async function GET(request: NextRequest) {const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const where: Record<string, string> = {};
    if (playerId) where.playerId = playerId;
    if (type) where.recommendType = type;
    if (status) where.status = status;

    const recommendations = await prisma.trainingRecommend.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('获取推荐失败:', error);
    return NextResponse.json({ error: '获取推荐失败' }, { status: 500 });
  }
}

// POST 创建/生成智能推荐
export async function POST(request: NextRequest) {const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  
  try {
    const body = await request.json();
    const {
      playerId,
      recommendType,
      title,
      content,
      reason,
      targetType,
      targetId,
      targetName,
      priority,
      coachId,
      coachName,
    } = body;

    // 验证必填字段
    if (!playerId || !title || !content) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 获取球员名字
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      return NextResponse.json({ error: '学员不存在' }, { status: 404 });
    }

    const recommend = await prisma.trainingRecommend.create({
      data: {
        playerId,
        playerName: player.name,
        recommendType: recommendType || 'training',
        title,
        content,
        reason,
        targetType,
        targetId,
        targetName,
        priority: priority || 3,
        coachId,
        coachName,
        isAuto: false,
      },
    });

    return NextResponse.json(recommend);
  } catch (error) {
    console.error('创建推荐失败:', error);
    return NextResponse.json({ error: '创建推荐失败' }, { status: 500 });
  }
}
