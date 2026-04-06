import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

// 从返回数据中移除 password 字段
function sanitizeCoach(coach: Record<string, unknown>) {
  const { password, ...safe } = coach;
  return safe;
}

// GET /api/coaches - 获取教练列表（仅管理员）
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const campusId = searchParams.get('campusId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (campusId) where.campusId = campusId;
    if (status) where.status = status;

    const coaches = await prisma.coach.findMany({
      where,
      include: {
        campus: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: coaches.map(c => sanitizeCoach(c as Record<string, unknown>)),
      total: coaches.length,
    });
  } catch (error) {
    console.error('获取教练列表失败:', error);
    return NextResponse.json({ success: false, message: '获取教练列表失败' }, { status: 500 });
  }
}

// POST /api/coaches - 创建教练（仅管理员）
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { name, phone, email, campusId, specialties, hireDate, notes, password, role } = body;

    // 验证必填字段
    if (!name || !phone) {
      return NextResponse.json(
        { success: false, message: '姓名和手机号是必填项' },
        { status: 400 }
      );
    }

    // 检查手机号是否已存在
    const existingCoach = await prisma.coach.findUnique({
      where: { phone },
    });

    if (existingCoach) {
      return NextResponse.json({ success: false, message: '该手机号已被使用' }, { status: 400 });
    }

    // 检查邮箱是否已被使用
    if (email) {
      const existingEmail = await prisma.coach.findFirst({
        where: { email },
      });
      if (existingEmail) {
        return NextResponse.json({ success: false, message: '该邮箱已被使用' }, { status: 400 });
      }
    }

    // 加密密码（如果有提供）
    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : await bcrypt.hash('123456', 10); // 默认密码，首次登录需修改

    const coach = await prisma.coach.create({
      data: {
        name,
        phone,
        email: email || null,
        password: hashedPassword,
        campusId: campusId || null,
        specialties: JSON.stringify(specialties || []),
        hireDate: hireDate ? new Date(hireDate) : null,
        notes: notes || null,
        role: role || 'coach',
        status: 'active',
      },
      include: {
        campus: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: '教练创建成功',
        data: sanitizeCoach(coach as unknown as Record<string, unknown>),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('创建教练失败:', error);
    return NextResponse.json({ success: false, message: '创建教练失败' }, { status: 500 });
  }
}
