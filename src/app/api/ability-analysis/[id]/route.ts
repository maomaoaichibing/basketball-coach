import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// GET 获取能力分析详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;
    const analysis = await prisma.abilityAnalysis.findUnique({
      where: { id },
    });

    if (!analysis) {
      return NextResponse.json({ error: '分析不存在' }, { status: 404 });
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('获取能力分析详情失败:', error);
    return NextResponse.json({ error: '获取能力分析详情失败' }, { status: 500 });
  }
}

// PUT 更新能力分析
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;
    const body = await request.json();
    const {
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

    const analysis = await prisma.abilityAnalysis.update({
      where: { id },
      data: {
        overallScore: overallScore || undefined,
        dimensions: dimensions ? JSON.stringify(dimensions) : undefined,
        progress: progress ? JSON.stringify(progress) : undefined,
        strengths: strengths ? JSON.stringify(strengths) : undefined,
        weaknesses: weaknesses ? JSON.stringify(weaknesses) : undefined,
        potential,
        trainingSuggestions: trainingSuggestions ? JSON.stringify(trainingSuggestions) : undefined,
        method: method || undefined,
        analystId,
        analystName,
      },
    });

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('更新能力分析失败:', error);
    return NextResponse.json({ error: '更新能力分析失败' }, { status: 500 });
  }
}

// DELETE 删除能力分析
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;
    await prisma.abilityAnalysis.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除能力分析失败:', error);
    return NextResponse.json({ error: '删除能力分析失败' }, { status: 500 });
  }
}
