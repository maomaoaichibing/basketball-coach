import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// 从返回数据中移除敏感字段
function sanitizeCoach(coach: Record<string, unknown>) {
  const { ...safe } = coach;
  return safe;
}

// GET /api/coaches/[id] - 获取教练详情（需登录）
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = params;

    const coach = await prisma.coach.findUnique({
      where: { id },
      include: {
        campus: { select: { id: true, name: true } },
      },
    });

    if (!coach) {
      return NextResponse.json({ success: false, message: '教练不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: sanitizeCoach(coach as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error('获取教练详情失败:', error);
    return NextResponse.json({ success: false, message: '获取教练详情失败' }, { status: 500 });
  }
}

// PUT /api/coaches/[id] - 更新教练信息（仅管理员）
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;

  try {
    const { id } = params;
    const body = await request.json();
    const { name, phone, email, campusId, specialties, status, hireDate, notes, role } = body;

    // 检查是否存在
    const existing = await prisma.coach.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: '教练不存在' }, { status: 404 });
    }

    // 如果修改了手机号，检查唯一性
    if (phone && phone !== existing.phone) {
      const phoneExists = await prisma.coach.findUnique({ where: { phone } });
      if (phoneExists) {
        return NextResponse.json({ success: false, message: '该手机号已被使用' }, { status: 400 });
      }
    }

    // 如果修改了邮箱，检查唯一性
    if (email && email !== existing.email) {
      const emailExists = await prisma.coach.findFirst({ where: { email } });
      if (emailExists) {
        return NextResponse.json({ success: false, message: '该邮箱已被使用' }, { status: 400 });
      }
    }

    // 构建 updateData
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email || null;
    if (campusId !== undefined) updateData.campusId = campusId || null;
    if (specialties !== undefined) {
      updateData.specialties =
        typeof specialties === 'string' ? specialties : JSON.stringify(specialties || []);
    }
    if (status !== undefined) updateData.status = status;
    if (hireDate !== undefined) updateData.hireDate = hireDate ? new Date(hireDate) : null;
    if (notes !== undefined) updateData.notes = notes;
    if (role !== undefined) updateData.role = role;

    const coach = await prisma.coach.update({
      where: { id },
      data: updateData,
      include: {
        campus: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: '教练信息已更新',
      data: sanitizeCoach(coach as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error('更新教练失败:', error);
    return NextResponse.json({ success: false, message: '更新教练失败' }, { status: 500 });
  }
}

// DELETE /api/coaches/[id] - 删除教练（仅管理员）
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;

  try {
    const { id } = params;

    // 不能删除自己
    if (id === auth.user.id) {
      return NextResponse.json({ success: false, message: '不能删除自己的账号' }, { status: 400 });
    }

    const existing = await prisma.coach.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: '教练不存在' }, { status: 404 });
    }

    await prisma.coach.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: '教练已删除',
    });
  } catch (error) {
    console.error('删除教练失败:', error);
    return NextResponse.json({ success: false, message: '删除教练失败' }, { status: 500 });
  }
}
