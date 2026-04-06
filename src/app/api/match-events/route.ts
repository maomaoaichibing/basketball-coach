import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/match-events - 获取比赛事件列表
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('matchId');
    const playerId = searchParams.get('playerId');
    const eventType = searchParams.get('eventType');
    const limit = parseInt(searchParams.get('limit') || '100');

    const where: Prisma.MatchEventWhereInput = {};
    if (matchId) where.matchId = matchId;
    if (playerId) where.playerId = playerId;
    if (eventType) where.eventType = eventType;

    const events = await prisma.matchEvent.findMany({
      where,
      orderBy: [{ matchId: 'desc' }, { quarter: 'asc' }, { eventTime: 'asc' }],
      take: limit,
      include: {
        match: {
          select: {
            id: true,
            title: true,
            matchDate: true,
            homeScore: true,
            opponentScore: true,
            opponent: true,
            result: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error('获取比赛事件失败:', error);
    return NextResponse.json({ success: false, error: '获取比赛事件失败' }, { status: 500 });
  }
}

// POST /api/match-events - 添加比赛事件
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();

    const {
      matchId,
      eventTime,
      quarter,
      playerId,
      playerName,
      eventType,
      description,
      points,
      relatedPlayerId,
      relatedPlayerName,
      courtZone,
    } = body;

    if (!matchId || !eventType) {
      return NextResponse.json({ success: false, error: '缺少必填字段' }, { status: 400 });
    }

    // 如果是得分事件，更新比赛得分
    if (eventType === 'score' && points && points > 0) {
      const match = await prisma.match.findUnique({ where: { id: matchId } });
      if (match) {
        const isHome = match.isHome;
        const currentScore = isHome ? match.homeScore : match.opponentScore;
        const newScore = currentScore + points;

        await prisma.match.update({
          where: { id: matchId },
          data: {
            homeScore: isHome ? newScore : match.homeScore,
            opponentScore: isHome ? match.opponentScore : newScore,
            result:
              newScore > match.opponentScore
                ? 'win'
                : newScore < match.opponentScore
                  ? 'lose'
                  : 'draw',
          },
        });
      }
    }

    const event = await prisma.matchEvent.create({
      data: {
        matchId,
        eventTime: eventTime || '',
        quarter,
        playerId,
        playerName,
        eventType,
        description,
        points,
        relatedPlayerId,
        relatedPlayerName,
        courtZone,
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('添加比赛事件失败:', error);
    return NextResponse.json({ success: false, error: '添加比赛事件失败' }, { status: 500 });
  }
}

// DELETE /api/match-events - 删除比赛事件
export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少事件ID' }, { status: 400 });
    }

    await prisma.matchEvent.delete({ where: { id } });

    return NextResponse.json({ success: true, message: '事件已删除' });
  } catch (error) {
    console.error('删除比赛事件失败:', error);
    return NextResponse.json({ success: false, error: '删除比赛事件失败' }, { status: 500 });
  }
}
