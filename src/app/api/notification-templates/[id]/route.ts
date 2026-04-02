import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/db';

// GET /api/notification-templates/[id] - 获取模板详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const template = await prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json({ success: false, error: '通知模板不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('获取模板详情失败:', error);
    return NextResponse.json({ success: false, error: '获取模板详情失败' }, { status: 500 });
  }
}

// PUT /api/notification-templates/[id] - 更新模板
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();

    const { name, category, title, content, variables, isActive, isAutomated, priority } = body;

    // 检查是否存在
    const existing = await prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: '通知模板不存在' }, { status: 404 });
    }

    const template = await prisma.notificationTemplate.update({
      where: { id },
      data: {
        name,
        category,
        title,
        content,
        variables,
        isActive,
        isAutomated,
        priority,
      },
    });

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('更新模板失败:', error);
    return NextResponse.json({ success: false, error: '更新模板失败' }, { status: 500 });
  }
}

// DELETE /api/notification-templates/[id] - 删除模板
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // 检查是否存在
    const existing = await prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: '通知模板不存在' }, { status: 404 });
    }

    await prisma.notificationTemplate.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '通知模板已删除',
    });
  } catch (error) {
    console.error('删除模板失败:', error);
    return NextResponse.json({ success: false, error: '删除模板失败' }, { status: 500 });
  }
}
