import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import prisma from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// GET /api/teams - 获取所有球队
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group');

    const where: Prisma.TeamWhereInput = {};
    if (group && group !== 'all') {
      where.group = group;
    }

    const teams = await prisma.team.findMany({
      where,
      include: {
        _count: {
          select: {
            players: true,
          },
        },
      },
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });

    // 格式化数据
    const formattedTeams = teams.map((t) => ({
      id: t.id,
      name: t.name,
      group: t.group,
      coachName: t.coachName,
      coachPhone: t.coachPhone,
      location: t.location,
      trainingTime: t.trainingTime,
      playerCount: t._count.players,
      createdAt: t.createdAt,
    }));

    return NextResponse.json({
      success: true,
      teams: formattedTeams,
      total: formattedTeams.length,
    });
  } catch (error) {
    console.error('获取球队列表失败:', error);
    return NextResponse.json({ success: false, error: '获取球队列表失败' }, { status: 500 });
  }
}

// POST /api/teams - 创建新球队
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();

    const { name, group = 'U10', coachName, coachPhone, location, trainingTime } = body;

    // 验证必填字段
    if (!name) {
      return NextResponse.json({ success: false, error: '球队名称是必填项' }, { status: 400 });
    }

    const team = await prisma.team.create({
      data: {
        name,
        group,
        coachName,
        coachPhone,
        location,
        trainingTime,
      },
    });

    return NextResponse.json({
      success: true,
      team,
    });
  } catch (error) {
    console.error('创建球队失败:', error);
    return NextResponse.json({ success: false, error: '创建球队失败' }, { status: 500 });
  }
}
