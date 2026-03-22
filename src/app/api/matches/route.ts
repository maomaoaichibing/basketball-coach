import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/matches - 获取比赛列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const group = searchParams.get('group')
    const result = searchParams.get('result')
    const teamId = searchParams.get('teamId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (group) where.group = group
    if (result && result !== 'all') where.result = result
    if (teamId) where.teamId = teamId

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        orderBy: { matchDate: 'desc' },
        take: limit,
        skip: offset,
        include: {
          events: {
            orderBy: { eventTime: 'asc' }
          }
        }
      }),
      prisma.match.count({ where })
    ])

    return NextResponse.json({
      success: true,
      matches,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('获取比赛列表失败:', error)
    return NextResponse.json({ success: false, error: '获取比赛列表失败' }, { status: 500 })
  }
}

// POST /api/matches - 创建比赛
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      title,
      matchType = 'league',
      group,
      matchDate,
      location,
      teamId,
      teamName,
      opponent,
      isHome = true,
      weather,
      players = '[]',
      playerStats = '[]',
      coachId,
      coachName,
      notes,
      status = 'scheduled'
    } = body

    if (!title || !matchDate || !group) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      )
    }

    const match = await prisma.match.create({
      data: {
        title,
        matchType,
        group,
        matchDate: new Date(matchDate),
        location: location || '',
        teamId,
        teamName,
        opponent,
        isHome,
        weather,
        players: typeof players === 'string' ? players : JSON.stringify(players),
        playerStats: typeof playerStats === 'string' ? playerStats : JSON.stringify(playerStats),
        coachId,
        coachName,
        notes,
        status,
        homeScore: 0,
        opponentScore: 0,
        quarterScores: '[]',
        result: 'pending'
      }
    })

    return NextResponse.json({ success: true, match })
  } catch (error) {
    console.error('创建比赛失败:', error)
    return NextResponse.json({ success: false, error: '创建比赛失败' }, { status: 500 })
  }
}