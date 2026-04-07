import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// 批量签到/更新出勤
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { planId, records } = body;

    if (!planId || !records || !Array.isArray(records)) {
      return NextResponse.json({ success: false, error: '参数错误' }, { status: 400 });
    }

    // 使用事务批量签到：先查已有记录，再统一 create/update
    const playerIds = records.map((r) => r.playerId).filter(Boolean);
    const existingRecords =
      playerIds.length > 0
        ? await prisma.trainingRecord.findMany({
            where: { planId, playerId: { in: playerIds } },
            select: { id: true, playerId: true },
          })
        : [];
    const existingMap = new Map(existingRecords.map((r) => [r.playerId, r.id]));

    const results = await prisma.$transaction(
      records.map((record) => {
        const { playerId, attendance, signInTime, notes } = record;
        const existingId = existingMap.get(playerId);

        if (existingId) {
          return prisma.trainingRecord.update({
            where: { id: existingId },
            data: {
              attendance,
              signInTime: signInTime ? new Date(signInTime) : null,
              ...(notes ? { feedback: notes } : {}),
            },
          });
        } else {
          return prisma.trainingRecord.create({
            data: {
              planId,
              playerId,
              attendance,
              signInTime: signInTime ? new Date(signInTime) : null,
              feedback: notes || '',
            },
          });
        }
      })
    );

    return NextResponse.json({ success: true, count: results.length });
  } catch (error) {
    console.error('签到失败:', error);
    return NextResponse.json({ success: false, error: '签到失败' }, { status: 500 });
  }
}

// 获取某课程的签到状态
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    if (!planId) {
      return NextResponse.json({ success: false, error: '缺少planId' }, { status: 400 });
    }

    const records = await prisma.trainingRecord.findMany({
      where: { planId },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            group: true,
            parentPhone: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, records });
  } catch (error) {
    console.error('获取签到记录失败:', error);
    return NextResponse.json({ success: false, error: '获取签到记录失败' }, { status: 500 });
  }
}
