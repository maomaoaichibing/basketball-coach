import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';
import { allPlans } from '@/lib/cases';

/**
 * 从内置 RAG 数据库导入案例到 TrainingCase 表
 * PUT /api/cases/import?source=rag
 * Body: { category?: string, ageGroup?: string, limit?: number }
 */
export async function PUT(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { category, ageGroup, limit = 50 } = body;
    const coachId = auth.coach?.id || null;

    // 从内置 RAG 数据中筛选
    let source = allPlans;

    if (category) source = source.filter((p) => p.category === category);
    if (ageGroup) source = source.filter((p) => p.age_group === ageGroup);

    source = source.slice(0, limit);

    if (source.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        message: '没有匹配的案例可导入',
      });
    }

    // 映射 RAG 数据格式到 TrainingCase 格式
    const createData = source.map((p) => ({
      title: `${p.tech_type || '训练'} - ${p.part || p.content?.substring(0, 20) || '活动'}`,
      category: p.category || 'technical',
      subCategory: ((p as unknown) as Record<string, unknown>).subCategory as string || null,
      ageGroup: p.age_group || 'U10',
      skillLevel: 'intermediate',
      content: p.content || '',
      method: p.method || null,
      keyPoints: p.key_points || null,
      coachGuide: p.coach_guide || null,
      duration: p.duration || 10,
      difficulty: 1,
      equipment: p.equipment ? JSON.stringify([p.equipment]) : '[]',
      minPlayers: 1,
      maxPlayers: 20,
      techType: p.tech_type || null,
      tags: JSON.stringify([p.tech_type, p.category].filter(Boolean)),
      source: 'import' as const,
      sourceUrl: null as string | null,
      coachId,
    }));

    const result = await prisma.trainingCase.createMany({
      data: createData,
    });

    return NextResponse.json({
      success: true,
      imported: result.count,
      available: source.length,
      message: `成功导入 ${result.count} 条案例（共筛选 ${source.length} 条）`,
    });
  } catch (error) {
    console.error('导入RAG案例失败:', error);
    return NextResponse.json({ success: false, error: '导入失败' }, { status: 500 });
  }
}
