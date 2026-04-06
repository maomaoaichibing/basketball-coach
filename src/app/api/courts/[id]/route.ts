import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// GET /api/courts/[id] - 获取场地详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;

    const court = await prisma.court.findUnique({
      where: { id },
      include: {
        campus: { select: { id: true, name: true } },
      },
    });

    if (!court) {
      return NextResponse.json({ success: false, error: '场地不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      court,
    });
  } catch (error) {
    console.error('获取场地详情失败:', error);
    return NextResponse.json({ success: false, error: '获取场地详情失败' }, { status: 500 });
  }
}

// PUT /api/courts/[id] - 更新场地信息
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;

  try {
    const { id } = params;
    const body = await request.json();

    const { name, campusId, type, capacity, status, description } = body;

    // 检查是否存在
    const existing = await prisma.court.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: '场地不存在' }, { status: 404 });
    }

    const court = await prisma.court.update({
      where: { id },
      data: {
        name,
        campusId,
        type,
        capacity,
        status,
        description,
      },
    });

    return NextResponse.json({
      success: true,
      court,
    });
  } catch (error) {
    console.error('更新场地失败:', error);
    return NextResponse.json({ success: false, error: '更新场地失败' }, { status: 500 });
  }
}

// DELETE /api/courts/[id] - 删除场地
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;

  try {
    const { id } = params;

    // 检查是否存在
    const existing = await prisma.court.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: '场地不存在' }, { status: 404 });
    }

    await prisma.court.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '场地已删除',
    });
  } catch (error) {
    console.error('删除场地失败:', error);
    return NextResponse.json({ success: false, error: '删除场地失败' }, { status: 500 });
  }
}
