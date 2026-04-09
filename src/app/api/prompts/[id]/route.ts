import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// GET /api/prompts/[id] - 获取单个 Prompt 模板
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const template = await prisma.promptTemplate.findUnique({
      where: { id: params.id },
    });

    if (!template) {
      return NextResponse.json({ success: false, error: '模板不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('获取 Prompt 模板失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// PATCH /api/prompts/[id] - 更新 Prompt 模板（创建新版本）
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const existing = await prisma.promptTemplate.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: '模板不存在' }, { status: 404 });
    }

    const body = await request.json();
    const { content, description } = body;

    if (!content) {
      return NextResponse.json({ success: false, error: 'Prompt 内容不能为空' }, { status: 400 });
    }

    // 获取当前 key 的最大版本号
    const maxVersion = await prisma.promptTemplate.findFirst({
      where: { key: existing.key },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const newVersion = (maxVersion?.version || 0) + 1;

    // 将旧版本设为非激活
    await prisma.promptTemplate.updateMany({
      where: { key: existing.key, isActive: true },
      data: { isActive: false },
    });

    // 创建新版本
    const newTemplate = await prisma.promptTemplate.create({
      data: {
        name: existing.name,
        key: existing.key,
        description: description || existing.description,
        content,
        version: newVersion,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, template: newTemplate });
  } catch (error) {
    console.error('更新 Prompt 模板失败:', error);
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}

// POST /api/prompts/[id]/activate - 激活指定版本
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const existing = await prisma.promptTemplate.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: '模板不存在' }, { status: 404 });
    }

    // 将同 key 的所有版本设为非激活
    await prisma.promptTemplate.updateMany({
      where: { key: existing.key, isActive: true },
      data: { isActive: false },
    });

    // 激活指定版本
    const activated = await prisma.promptTemplate.update({
      where: { id: params.id },
      data: { isActive: true },
    });

    return NextResponse.json({ success: true, template: activated });
  } catch (error) {
    console.error('激活 Prompt 模板失败:', error);
    return NextResponse.json({ success: false, error: '激活失败' }, { status: 500 });
  }
}

// DELETE /api/prompts/[id] - 删除 Prompt 模板版本
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const existing = await prisma.promptTemplate.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: '模板不存在' }, { status: 404 });
    }

    // 检查是否是最后一个版本
    const count = await prisma.promptTemplate.count({
      where: { key: existing.key },
    });

    if (count <= 1) {
      return NextResponse.json({ success: false, error: '至少保留一个版本' }, { status: 400 });
    }

    // 如果删除的是激活版本，需要先激活另一个
    if (existing.isActive) {
      const another = await prisma.promptTemplate.findFirst({
        where: { key: existing.key, id: { not: params.id } },
        orderBy: { version: 'desc' },
      });
      if (another) {
        await prisma.promptTemplate.update({
          where: { id: another.id },
          data: { isActive: true },
        });
      }
    }

    await prisma.promptTemplate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除 Prompt 模板失败:', error);
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
