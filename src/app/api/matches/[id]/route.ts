import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/matches/[id] - 获取比赛详情
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: [{ quarter: 'asc' }, { eventTime: 'asc' }],
        },
      },
    });

    if (!match) {
      return NextResponse.json({ success: false, error: '比赛不存在' }, { status: 404 });
    }

    // 解析JSON字段
    const parsedMatch = {
      ...match,
      quarterScores: JSON.parse(match.quarterScores || '[]'),
      players: JSON.parse(match.players || '[]'),
      playerStats: JSON.parse(match.playerStats || '[]'),
      events: match.events.map(event => ({
        ...event,
      })),
    };

    return NextResponse.json({ success: true, match: parsedMatch });
  } catch (error) {
    console.error('获取比赛详情失败:', error);
    return NextResponse.json({ success: false, error: '获取比赛详情失败' }, { status: 500 });
  }
}

// PUT /api/matches/[id] - 更新比赛
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingMatch = await prisma.match.findUnique({ where: { id } });
    if (!existingMatch) {
      return NextResponse.json({ success: false, error: '比赛不存在' }, { status: 404 });
    }

    const {
      title,
      matchType,
      group,
      matchDate,
      location,
      teamId,
      teamName,
      homeScore,
      opponentScore,
      quarterScores,
      result,
      isHome,
      weather,
      players,
      playerStats,
      coachId,
      coachName,
      notes,
      status,
    } = body;

    // 计算比赛结果
    let matchResult = result;
    if (homeScore !== undefined && opponentScore !== undefined && !result) {
      if (homeScore > opponentScore) matchResult = 'win';
      else if (homeScore < opponentScore) matchResult = 'lose';
      else matchResult = 'draw';
    }

    const match = await prisma.match.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(matchType && { matchType }),
        ...(group && { group }),
        ...(matchDate && { matchDate: new Date(matchDate) }),
        ...(location !== undefined && { location }),
        ...(teamId !== undefined && { teamId }),
        ...(teamName !== undefined && { teamName }),
        ...(homeScore !== undefined && { homeScore }),
        ...(opponentScore !== undefined && { opponentScore }),
        ...(quarterScores && {
          quarterScores:
            typeof quarterScores === 'string' ? quarterScores : JSON.stringify(quarterScores),
        }),
        ...(matchResult && { result: matchResult }),
        ...(isHome !== undefined && { isHome }),
        ...(weather !== undefined && { weather }),
        ...(players && {
          players: typeof players === 'string' ? players : JSON.stringify(players),
        }),
        ...(playerStats && {
          playerStats: typeof playerStats === 'string' ? playerStats : JSON.stringify(playerStats),
        }),
        ...(coachId !== undefined && { coachId }),
        ...(coachName !== undefined && { coachName }),
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({ success: true, match });
  } catch (error) {
    console.error('更新比赛失败:', error);
    return NextResponse.json({ success: false, error: '更新比赛失败' }, { status: 500 });
  }
}

// DELETE /api/matches/[id] - 删除比赛
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 先删除关联的事件
    await prisma.matchEvent.deleteMany({ where: { matchId: id } });

    // 再删除比赛
    await prisma.match.delete({ where: { id } });

    return NextResponse.json({ success: true, message: '比赛已删除' });
  } catch (error) {
    console.error('删除比赛失败:', error);
    return NextResponse.json({ success: false, error: '删除比赛失败' }, { status: 500 });
  }
}
