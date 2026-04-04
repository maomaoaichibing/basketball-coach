import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import prisma from '@/lib/db';

// 扩展Player类型，包含技术能力字段
interface PlayerWithSkills {
  dribbling: number;
  passing: number;
  shooting: number;
  defending: number;
  physical: number;
  tactical: number;
  birthDate: Date;
  tags: string | null;
  injuries: string | null;
}

// GET /api/players/[id] - 获取学员详情
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        team: true,
        guardians: true,
        records: {
          include: {
            plan: true,
          },
          orderBy: { recordedAt: 'desc' },
          take: 20,
        },
        assessments: {
          orderBy: { assessedAt: 'desc' },
          take: 10,
        },
        goals: {
          where: { status: 'active' },
          orderBy: { targetDate: 'asc' },
        },
      },
    });

    if (!player) {
      return NextResponse.json({ success: false, error: '学员不存在' }, { status: 404 });
    }

    // 计算年龄
    const age = Math.floor(
      (Date.now() - new Date(player.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    // 计算综合能力
    const playerWithSkills = player as unknown as PlayerWithSkills;
    const avgAbility =
      (playerWithSkills.dribbling +
        playerWithSkills.passing +
        playerWithSkills.shooting +
        playerWithSkills.defending +
        playerWithSkills.physical +
        playerWithSkills.tactical) /
      6;

    // 计算总训练次数
    const totalTrainings = await prisma.trainingRecord.count({
      where: { playerId: id },
    });

    // 计算出勤率
    const attendanceStats = await prisma.trainingRecord.groupBy({
      by: ['attendance'],
      where: { playerId: id },
      _count: true,
    });

    const presentCount = attendanceStats.find(s => s.attendance === 'present')?._count || 0;
    const absentCount = attendanceStats.find(s => s.attendance === 'absent')?._count || 0;
    const lateCount = attendanceStats.find(s => s.attendance === 'late')?._count || 0;
    const attendanceRate =
      totalTrainings > 0 ? Math.round((presentCount / totalTrainings) * 100) : 0;

    return NextResponse.json({
      success: true,
      player: {
        ...player,
        age,
        avgAbility: avgAbility.toFixed(1),
        tags: JSON.parse(player.tags || '[]'),
        injuries: JSON.parse(player.injuries || '[]'),
        totalTrainings,
        attendanceRate,
        presentCount,
        absentCount,
        lateCount,
      },
    });
  } catch (error) {
    console.error('获取学员详情失败:', error);
    return NextResponse.json({ success: false, error: '获取学员详情失败' }, { status: 500 });
  }
}

// PUT /api/players/[id] - 更新学员信息
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      name,
      birthDate,
      gender,
      group,
      height,
      weight,
      status,
      school,
      position,
      parentName,
      parentPhone,
      parentWechat,
      teamId,
      tags,
      injuries,
      dribbling,
      passing,
      shooting,
      defending,
      physical,
      tactical,
      overallAssessment,
    } = body;

    // 检查学员是否存在
    const existing = await prisma.player.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: '学员不存在' }, { status: 404 });
    }

    const updateData: Prisma.PlayerUpdateInput = {};

    if (name !== undefined) updateData.name = name;
    if (birthDate !== undefined) updateData.birthDate = new Date(birthDate);
    if (gender !== undefined) updateData.gender = gender;
    if (group !== undefined) updateData.group = group;
    if (height !== undefined) updateData.height = height ? parseFloat(height) : null;
    if (weight !== undefined) updateData.weight = weight ? parseFloat(weight) : null;
    if (status !== undefined) updateData.status = status;
    if (school !== undefined) updateData.school = school;
    if (position !== undefined) updateData.position = position;
    if (parentName !== undefined) updateData.parentName = parentName;
    if (parentPhone !== undefined) updateData.parentPhone = parentPhone;
    if (parentWechat !== undefined) updateData.parentWechat = parentWechat;
    if (teamId !== undefined)
      updateData.team = teamId ? { connect: { id: teamId } } : { disconnect: true };
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (injuries !== undefined) updateData.injuries = JSON.stringify(injuries);

    // 技术能力更新
    if (dribbling !== undefined) updateData.dribbling = dribbling;
    if (passing !== undefined) updateData.passing = passing;
    if (shooting !== undefined) updateData.shooting = shooting;
    if (defending !== undefined) updateData.defending = defending;
    if (physical !== undefined) updateData.physical = physical;
    if (tactical !== undefined) updateData.tactical = tactical;

    const player = await prisma.player.update({
      where: { id },
      data: updateData,
      include: {
        team: true,
        guardians: true,
      },
    });

    return NextResponse.json({
      success: true,
      player: {
        ...player,
        tags: JSON.parse(player.tags || '[]'),
        injuries: JSON.parse(player.injuries || '[]'),
      },
    });
  } catch (error) {
    console.error('更新学员失败:', error);
    return NextResponse.json({ success: false, error: '更新学员失败' }, { status: 500 });
  }
}

// DELETE /api/players/[id] - 删除学员
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 检查学员是否存在
    const existing = await prisma.player.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: '学员不存在' }, { status: 404 });
    }

    // 删除关联的监护人
    await prisma.guardian.deleteMany({ where: { playerId: id } });

    // 删除关联的目标
    await prisma.playerGoal.deleteMany({ where: { playerId: id } });

    // 删除关联的评估记录
    await prisma.playerAssessment.deleteMany({ where: { playerId: id } });

    // 删除关联的训练记录（软删除会更好，这里先硬删除）
    await prisma.trainingRecord.deleteMany({ where: { playerId: id } });

    // 删除学员
    await prisma.player.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: '学员删除成功',
    });
  } catch (error) {
    console.error('删除学员失败:', error);
    return NextResponse.json({ success: false, error: '删除学员失败' }, { status: 500 });
  }
}
