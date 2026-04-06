import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/courses/[id] - 获取单个课程包
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const course = await prisma.course.findUnique({
      where: { id: params.id },
    });

    if (!course) {
      return NextResponse.json({ success: false, error: '课程包不存在' }, { status: 404 });
    }

    // 获取该课程包的所有购买记录
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId: params.id },
      include: {
        player: {
          select: { id: true, name: true, group: true },
        },
      },
      orderBy: { purchaseDate: 'desc' },
    });

    return NextResponse.json({
      success: true,
      course: {
        ...course,
        groups: JSON.parse(course.groups as string),
      },
      enrollments: enrollments.map(e => ({
        ...e,
        recordIds: JSON.parse((e.recordIds as string) || '[]'),
      })),
    });
  } catch (error) {
    console.error('获取课程包失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// PUT /api/courses/[id] - 更新课程包
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { name, type, totalHours, price, validDays, groups, description, notes, status } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (totalHours !== undefined) updateData.totalHours = totalHours;
    if (price !== undefined) updateData.price = price;
    if (validDays !== undefined) updateData.validDays = validDays;
    if (groups !== undefined) updateData.groups = JSON.stringify(groups);
    if (description !== undefined) updateData.description = description;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const course = await prisma.course.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      course: {
        ...course,
        groups: JSON.parse(course.groups as string),
      },
    });
  } catch (error) {
    console.error('更新课程包失败:', error);
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}

// DELETE /api/courses/[id] - 删除课程包
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;

  try {
    // 检查是否有购买记录
    const enrollments = await prisma.courseEnrollment.count({
      where: { courseId: params.id },
    });

    if (enrollments > 0) {
      // 有购买记录，软删除
      await prisma.course.update({
        where: { id: params.id },
        data: { status: 'inactive' },
      });
    } else {
      // 无购买记录，硬删除
      await prisma.course.delete({
        where: { id: params.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除课程包失败:', error);
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
