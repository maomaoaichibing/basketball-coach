import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// 保存教案
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();

    const {
      title,
      date,
      duration,
      group,
      location,
      weather,
      theme,
      focusSkills,
      intensity,
      sections,
      notes,
      generatedBy,
      playerIds,
    } = body;

    // 获取当前教练信息
    const coachId = auth.coach?.id || null;
    let coachName: string | null = null;
    if (coachId) {
      const coach = await prisma.coach.findUnique({ where: { id: coachId } });
      coachName = coach?.name || null;
    }

    const plan = await prisma.trainingPlan.create({
      data: {
        title,
        date: new Date(date),
        duration: parseInt(duration),
        group,
        location,
        weather,
        theme,
        focusSkills: JSON.stringify(focusSkills || []),
        intensity,
        sections: JSON.stringify(sections || []),
        notes,
        generatedBy: generatedBy || 'rule',
        status: 'published',
        playerIds: JSON.stringify(playerIds || []),
        coachId: coachId,
      },
    });

    // 如果有参训学员，自动创建训练记录（签到）
    const parsedPlayerIds: string[] = playerIds || [];
    if (parsedPlayerIds.length > 0) {
      // 获取学员信息（用于冗余存储姓名）
      const players = await prisma.player.findMany({
        where: { id: { in: parsedPlayerIds } },
        select: { id: true, name: true },
      });

      const playerMap = new Map(players.map(p => [p.id, p.name]));

      // 批量创建训练记录
      const recordData = parsedPlayerIds
        .filter(id => playerMap.has(id))
        .map(id => ({
          planId: plan.id,
          playerId: id,
          coachId: coachId,
          coachName: coachName,
          attendance: 'present' as const,
          signInTime: new Date(),
        }));

      if (recordData.length > 0) {
        await prisma.trainingRecord.createMany({ data: recordData });
      }
    }

    return NextResponse.json({
      success: true,
      id: plan.id,
      plan,
      attendanceCount: parsedPlayerIds.length,
    });
  } catch (error) {
    console.error('保存教案失败:', error);
    return NextResponse.json({ success: false, error: '保存教案失败' }, { status: 500 });
  }
}

// 获取教案列表
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where = group ? { group } : {};

    const plans = await prisma.trainingPlan.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return NextResponse.json({ success: true, plans });
  } catch (error) {
    console.error('获取教案列表失败:', error);
    return NextResponse.json({ success: false, error: '获取教案列表失败' }, { status: 500 });
  }
}
