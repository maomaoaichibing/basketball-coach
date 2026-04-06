import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// GET 获取能力分析列表
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    const where: Record<string, string> = {};
    if (playerId) where.playerId = playerId;

    const analyses = await prisma.abilityAnalysis.findMany({
      where,
      orderBy: { periodStart: 'desc' },
      take: 50,
    });

    return NextResponse.json(analyses);
  } catch (error) {
    console.error('获取能力分析失败:', error);
    return NextResponse.json({ error: '获取能力分析失败' }, { status: 500 });
  }
}

// POST 创建能力分析
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const {
      playerId,
      playerName,
      periodStart,
      periodEnd,
      overallScore,
      dimensions,
      progress,
      strengths,
      weaknesses,
      potential,
      trainingSuggestions,
      method,
      analystId,
      analystName,
    } = body;

    if (!playerId || !playerName || !periodStart || !periodEnd) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const analysis = await prisma.abilityAnalysis.create({
      data: {
        playerId,
        playerName,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        overallScore: overallScore || 0,
        dimensions: JSON.stringify(dimensions || {}),
        progress: JSON.stringify(progress || {}),
        strengths: JSON.stringify(strengths || []),
        weaknesses: JSON.stringify(weaknesses || []),
        potential,
        trainingSuggestions: JSON.stringify(trainingSuggestions || []),
        method: method || 'auto',
        analystId,
        analystName,
      },
    });

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('创建能力分析失败:', error);
    return NextResponse.json({ error: '创建能力分析失败' }, { status: 500 });
  }
}
