import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-middleware';

const prisma = new PrismaClient();

// GET /api/enrollments/[id] - 获取单个学员课程记录
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { id: params.id },
      include: {
        player: {
          select: { id: true, name: true, group: true },
        },
        course: true,
      },
    });

    if (!enrollment) {
      return NextResponse.json({ success: false, error: '记录不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      enrollment: {
        ...enrollment,
        recordIds: JSON.parse((enrollment.recordIds as string) || '[]'),
      },
    });
  } catch (error) {
    console.error('获取学员课程记录失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// PUT /api/enrollments/[id] - 更新学员课程记录（如核销课时）
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { usedHours, recordIds, status, notes } = body;

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { id: params.id },
    });

    if (!enrollment) {
      return NextResponse.json({ success: false, error: '记录不存在' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (usedHours !== undefined) {
      const newUsedHours = enrollment.usedHours + usedHours;
      const newRemainingHours = Math.max(0, enrollment.remainingHours - usedHours);
      updateData.usedHours = newUsedHours;
      updateData.remainingHours = newRemainingHours;
    }
    if (recordIds !== undefined) {
      const existingIds = JSON.parse((enrollment.recordIds as string) || '[]');
      updateData.recordIds = JSON.stringify([...existingIds, ...recordIds]);
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updated = await prisma.courseEnrollment.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      enrollment: {
        ...updated,
        recordIds: JSON.parse((updated.recordIds as string) || '[]'),
      },
    });
  } catch (error) {
    console.error('更新学员课程记录失败:', error);
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}

// DELETE /api/enrollments/[id] - 删除学员课程记录
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;

  try {
    await prisma.courseEnrollment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除学员课程记录失败:', error);
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
