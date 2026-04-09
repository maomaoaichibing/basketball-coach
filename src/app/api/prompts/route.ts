import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// GET /api/prompts - 获取所有 Prompt 模板
export async function GET(request: NextRequest) {
  try {
    // 认证检查
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const includeAll = searchParams.get('all') === 'true';

    // 获取指定 key 的所有版本
    if (key && includeAll) {
      const templates = await prisma.promptTemplate.findMany({
        where: { key },
        orderBy: { version: 'desc' },
      });
      return NextResponse.json({ success: true, templates });
    }

    // 获取指定 key 的激活版本
    if (key) {
      const template = await prisma.promptTemplate.findFirst({
        where: { key, isActive: true },
      });
      // 如果没有激活版本，返回最新版本
      if (!template) {
        const latest = await prisma.promptTemplate.findFirst({
          where: { key },
          orderBy: { version: 'desc' },
        });
        return NextResponse.json({ success: true, template: latest || null });
      }
      return NextResponse.json({ success: true, template });
    }

    // 获取所有模板（每个 key 只返回最新版本）
    const allTemplates = await prisma.promptTemplate.findMany({
      orderBy: [{ key: 'asc' }, { version: 'desc' }],
    });

    // 按 key 分组，取每个 key 的最新版本
    const grouped = new Map<string, (typeof allTemplates)[0]>();
    for (const t of allTemplates) {
      if (!grouped.has(t.key)) {
        grouped.set(t.key, t);
      }
    }

    // 统计每个 key 的版本数
    const keyCounts = new Map<string, number>();
    for (const t of allTemplates) {
      keyCounts.set(t.key, (keyCounts.get(t.key) || 0) + 1);
    }

    const templates = Array.from(grouped.values()).map((t) => ({
      ...t,
      totalVersions: keyCounts.get(t.key) || 1,
    }));

    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error('获取 Prompt 模板失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}
