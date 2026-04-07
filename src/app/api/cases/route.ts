import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// 获取案例列表
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const ageGroup = searchParams.get('ageGroup');
    const techType = searchParams.get('techType');
    const search = searchParams.get('search');
    const favorite = searchParams.get('favorite');
    const source = searchParams.get('source');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (category) where.category = category;
    if (ageGroup) where.ageGroup = ageGroup;
    if (techType) where.techType = techType;
    if (favorite === 'true') where.isFavorite = true;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { techType: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    const [cases, total] = await Promise.all([
      prisma.trainingCase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.trainingCase.count({ where }),
    ]);

    // 统计信息
    const stats = await prisma.trainingCase.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    return NextResponse.json({
      success: true,
      cases,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: stats.map((s) => ({ category: s.category, count: s._count.id })),
    });
  } catch (error) {
    console.error('获取案例列表失败:', error);
    return NextResponse.json({ success: false, error: '获取案例列表失败' }, { status: 500 });
  }
}

// 创建案例
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const {
      title,
      category,
      subCategory,
      ageGroup,
      skillLevel,
      content,
      method,
      keyPoints,
      coachGuide,
      duration,
      difficulty,
      equipment,
      minPlayers,
      maxPlayers,
      techType,
      tags,
      source,
      sourceUrl,
    } = body;

    if (!title || !category || !content) {
      return NextResponse.json(
        { success: false, error: '标题、分类和内容为必填项' },
        { status: 400 }
      );
    }

    const coachId = auth.coach?.id || null;

    const caseItem = await prisma.trainingCase.create({
      data: {
        title,
        category,
        subCategory: subCategory || null,
        ageGroup: ageGroup || 'U10',
        skillLevel: skillLevel || 'intermediate',
        content,
        method: method || null,
        keyPoints: keyPoints || null,
        coachGuide: coachGuide || null,
        duration: duration || 10,
        difficulty: difficulty || 1,
        equipment: JSON.stringify(equipment || []),
        minPlayers: minPlayers || 1,
        maxPlayers: maxPlayers || 20,
        techType: techType || null,
        tags: JSON.stringify(tags || []),
        source: source || 'manual',
        sourceUrl: sourceUrl || null,
        coachId,
      },
    });

    return NextResponse.json({ success: true, id: caseItem.id, case: caseItem });
  } catch (error) {
    console.error('创建案例失败:', error);
    return NextResponse.json({ success: false, error: '创建案例失败' }, { status: 500 });
  }
}

// 批量导入案例
export async function PUT(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { cases: casesData } = await request.json();

    if (!Array.isArray(casesData) || casesData.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供要导入的案例数组' },
        { status: 400 }
      );
    }

    if (casesData.length > 200) {
      return NextResponse.json({ success: false, error: '单次最多导入200条案例' }, { status: 400 });
    }

    const coachId = auth.coach?.id || null;

    const createData = casesData.map((c: Record<string, unknown>) => ({
      title: c.title as string,
      category: c.category as string,
      subCategory: (c.subCategory as string) || null,
      ageGroup: (c.ageGroup as string) || 'U10',
      skillLevel: (c.skillLevel as string) || 'intermediate',
      content: c.content as string,
      method: (c.method as string) || null,
      keyPoints: (c.keyPoints as string) || null,
      coachGuide: (c.coachGuide as string) || null,
      duration: (c.duration as number) || 10,
      difficulty: (c.difficulty as number) || 1,
      equipment: JSON.stringify(c.equipment || []),
      minPlayers: (c.minPlayers as number) || 1,
      maxPlayers: (c.maxPlayers as number) || 20,
      techType: (c.techType as string) || null,
      tags: JSON.stringify(c.tags || []),
      source: 'import',
      sourceUrl: (c.sourceUrl as string) || null,
      coachId,
    }));

    const result = await prisma.trainingCase.createMany({
      data: createData,
    });

    return NextResponse.json({
      success: true,
      imported: result.count,
      total: casesData.length,
    });
  } catch (error) {
    console.error('批量导入案例失败:', error);
    return NextResponse.json({ success: false, error: '批量导入案例失败' }, { status: 500 });
  }
}
