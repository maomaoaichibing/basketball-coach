import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/courses - 获取课程包列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const group = searchParams.get('group');

    const where: Prisma.CourseWhereInput = {};
    if (status !== 'all') {
      where.status = status;
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // 解析 JSON 字段
    const parsedCourses = courses.map(course => ({
      ...course,
      groups: JSON.parse((course.groups as string) || '[]'),
    }));

    // 如果指定了分组，过滤适用分组
    let filteredCourses = parsedCourses;
    if (group) {
      filteredCourses = parsedCourses.filter(
        c => c.groups.length === 0 || c.groups.includes(group)
      );
    }

    return NextResponse.json({
      success: true,
      courses: filteredCourses,
      total: filteredCourses.length,
    });
  } catch (error) {
    console.error('获取课程包失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// POST /api/courses - 创建课程包
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, totalHours, price, validDays, groups, description, notes } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: '请填写课程包名称' }, { status: 400 });
    }

    const course = await prisma.course.create({
      data: {
        name,
        type: type || 'package',
        totalHours: totalHours || 0,
        price: price || 0,
        validDays: validDays || 365,
        groups: JSON.stringify(groups || []),
        description,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      course: {
        ...course,
        groups: JSON.parse(course.groups as string),
      },
    });
  } catch (error) {
    console.error('创建课程包失败:', error);
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 });
  }
}
