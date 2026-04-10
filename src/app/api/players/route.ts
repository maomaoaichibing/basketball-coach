import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// GET /api/players - 获取所有学员
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    if (group && group !== 'all') {
      where.group = group;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { parentName: { contains: search } },
        { parentPhone: { contains: search } },
      ];
    }

    const players = await prisma.player.findMany({
      where,
      include: {
        team: true,
        guardians: true,
        _count: {
          select: {
            records: true,
            assessments: true,
          },
        },
      },
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });

    // 转换数据格式
    const formattedPlayers = players.map((p) => {
      // 计算年龄
      const birth = new Date(p.birthDate);
      const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

      return {
        id: p.id,
        name: p.name,
        birthDate: p.birthDate,
        gender: p.gender || 'male', // 确保有默认值
        group: p.group,
        height: p.height,
        weight: p.weight,
        status: p.status,
        school: p.school || '', // 确保有默认值
        position: p.position,
        parentName: p.parentName || '', // 确保有默认值
        parentPhone: p.parentPhone || '', // 确保有默认值
        parentWechat: p.parentWechat || '', // 确保有默认值
        enrollDate: p.enrollDate,
        tags: JSON.parse(p.tags || '[]'),
        injuries: JSON.parse(p.injuries || '[]'),
        team: p.team || null, // 确保有默认值
        guardians: p.guardians || [], // 确保有默认值
        trainingCount: p._count.records,
        assessmentCount: p._count.assessments,
        createdAt: p.createdAt,
        age, // 添加年龄字段
      };
    });

    return NextResponse.json({
      success: true,
      players: formattedPlayers,
      total: formattedPlayers.length,
    });
  } catch (error) {
    console.error('获取学员列表失败:', error);
    return NextResponse.json({ success: false, error: '获取学员列表失败' }, { status: 500 });
  }
}

// POST /api/players - 创建新学员
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();

    const {
      name,
      birthDate,
      gender = 'male',
      group = 'U10',
      height,
      weight,
      status = 'training',
      school,
      position,
      parentName,
      parentPhone,
      parentWechat,
      teamId,
      tags = [],
      guardians = [],
    } = body;

    // 验证必填字段
    if (!name || !birthDate) {
      return NextResponse.json(
        { success: false, error: '姓名和出生日期是必填项' },
        { status: 400 }
      );
    }

    // 计算年龄
    const birth = new Date(birthDate);

    const player = await prisma.player.create({
      data: {
        name,
        birthDate: birth,
        gender,
        group,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        status,
        school,
        position,
        parentName,
        parentPhone,
        parentWechat,
        teamId,
        tags: JSON.stringify(tags),
        injuries: '[]',
        // 初始技术能力设为5
        dribbling: 5,
        passing: 5,
        shooting: 5,
        defending: 5,
        physical: 5,
        tactical: 5,
      },
      include: {
        team: true,
        guardians: true,
      },
    });

    // 如果提供了监护人信息，一并创建
    if (guardians && guardians.length > 0) {
      for (const guardian of guardians) {
        await prisma.guardian.create({
          data: {
            playerId: player.id,
            name: guardian.name,
            relation: guardian.relation,
            mobile: guardian.mobile,
            wechat: guardian.wechat,
            email: guardian.email,
            isPrimary: guardian.isPrimary || false,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      player: {
        ...player,
        tags: JSON.parse(player.tags || '[]'),
        injuries: JSON.parse(player.injuries || '[]'),
      },
    });
  } catch (error) {
    console.error('创建学员失败:', error);
    return NextResponse.json({ success: false, error: '创建学员失败' }, { status: 500 });
  }
}
