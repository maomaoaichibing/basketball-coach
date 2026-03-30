import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const skillLabels: Record<string, string> = {
  dribbling: '运球',
  passing: '传球',
  shooting: '投篮',
  defending: '防守',
  physical: '体能',
  tactical: '战术'
}

const skillRecommendations: Record<string, { skills: string[]; theme: string; activities: string[] }> = {
  dribbling: {
    skills: ['dribbling', 'physical'],
    theme: '控球与突破',
    activities: ['原地运球（高低运球切换）', '行进间运球过障碍', '一对一运球突破', '运球接力赛']
  },
  passing: {
    skills: ['passing', 'tactical'],
    theme: '传切配合',
    activities: ['胸前传球练习', '击地传球练习', '传切上篮配合', '3人传切跑位']
  },
  shooting: {
    skills: ['shooting', 'physical'],
    theme: '投篮技术',
    activities: ['定点投篮', '罚球练习', '上篮（左右手）', '接球投篮', '移动投篮']
  },
  defending: {
    skills: ['defending', 'physical', 'tactical'],
    theme: '防守基础',
    activities: ['防守滑步练习', '一对一防守', '协防轮转', '抢断练习']
  },
  physical: {
    skills: ['physical'],
    theme: '体能训练',
    activities: ['折返跑', '跳跃训练', '核心力量', '敏捷梯训练']
  },
  tactical: {
    skills: ['tactical', 'passing'],
    theme: '战术理解',
    activities: ['挡拆配合', '快攻发动', '半场阵地进攻', '2v2对抗']
  }
}

// POST /api/smart-plan - 获取学员技能短板分析 + 推荐教案参数
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { playerIds, teamId, group, duration = 90, location = '室内' } = body

    // 1. 获取学员列表
    let players: any[] = []

    if (playerIds && playerIds.length > 0) {
      players = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        include: {
          records: {
            orderBy: { recordedAt: 'desc' },
            take: 10
          },
          assessments: {
            orderBy: { assessedAt: 'desc' },
            take: 3
          }
        }
      })
    } else if (teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          players: {
            include: {
              records: {
                orderBy: { recordedAt: 'desc' },
                take: 10
              },
              assessments: {
                orderBy: { assessedAt: 'desc' },
                take: 3
              }
            }
          }
        }
      })
      players = team?.players || []
    } else if (group) {
      players = await prisma.player.findMany({
        where: { group, status: 'training' },
        include: {
          records: {
            orderBy: { recordedAt: 'desc' },
            take: 10
          },
          assessments: {
            orderBy: { assessedAt: 'desc' },
            take: 3
          }
        }
      })
    }

    if (players.length === 0) {
      return NextResponse.json({
        success: false,
        message: '未找到学员'
      }, { status: 400 })
    }

    // 2. 分析全班技能短板
    const skillAverages: Record<string, { total: number; count: number }> = {
      dribbling: { total: 0, count: 0 },
      passing: { total: 0, count: 0 },
      shooting: { total: 0, count: 0 },
      defending: { total: 0, count: 0 },
      physical: { total: 0, count: 0 },
      tactical: { total: 0, count: 0 }
    }

    players.forEach(player => {
      const latestAssessment = player.assessments?.[0]
      const skills = latestAssessment ? {
        dribbling: latestAssessment.dribbling,
        passing: latestAssessment.passing,
        shooting: latestAssessment.shooting,
        defending: latestAssessment.defending,
        physical: latestAssessment.physical,
        tactical: latestAssessment.tactical
      } : {
        dribbling: player.dribbling,
        passing: player.passing,
        shooting: player.shooting,
        defending: player.defending,
        physical: player.physical,
        tactical: player.tactical
      }

      Object.entries(skills).forEach(([skill, value]) => {
        if (value && value > 0) {
          skillAverages[skill].total += value
          skillAverages[skill].count += 1
        }
      })
    })

    // 计算平均分并排序（低分优先）
    const skillScores = Object.entries(skillAverages).map(([skill, data]) => ({
      skill,
      label: skillLabels[skill],
      avgScore: data.count > 0 ? Math.round(data.total / data.count * 10) / 10 : 5,
      playerCount: data.count
    })).sort((a, b) => a.avgScore - b.avgScore)

    const weakestSkills = skillScores.filter(s => s.avgScore < 7).slice(0, 3)
    const mainWeakness = weakestSkills[0]?.skill || 'physical'

    // 3. 获取最近训练记录，避免重复
    const recentPlans = await prisma.trainingPlan.findMany({
      where: { group: group || players[0]?.group || 'U10' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { theme: true, focusSkills: true }
    })

    const recentThemes = recentPlans.map(p => p.theme).filter(Boolean)
    const recentFocusSkills = recentPlans.flatMap(p => {
      try { return JSON.parse(p.focusSkills || '[]') } catch { return [] }
    })

    // 4. 生成推荐
    const recommendation = skillRecommendations[mainWeakness] || skillRecommendations.physical
    const focusSkills = recommendation.skills.filter(s => !recentFocusSkills.includes(s))
    const finalFocusSkills = focusSkills.length > 0 ? focusSkills : recommendation.skills

    // 5. 学员个人建议
    const playerInsights = players.map(player => {
      const latestAssessment = player.assessments?.[0]
      const skills = latestAssessment ? {
        dribbling: latestAssessment.dribbling || player.dribbling,
        passing: latestAssessment.passing || player.passing,
        shooting: latestAssessment.shooting || player.shooting,
        defending: latestAssessment.defending || player.defending,
        physical: latestAssessment.physical || player.physical,
        tactical: latestAssessment.tactical || player.tactical,
      } : {
        dribbling: player.dribbling,
        passing: player.passing,
        shooting: player.shooting,
        defending: player.defending,
        physical: player.physical,
        tactical: player.tactical,
      }

      const sortedSkills = Object.entries(skills)
        .sort(([, a], [, b]) => (a as number) - (b as number))

      const weakest = sortedSkills[0]
      const strongest = sortedSkills[sortedSkills.length - 1]

      // 出勤率
      const totalRecords = player.records?.length || 0
      const presentRecords = player.records?.filter((r: any) => r.attendance === 'present').length || 0
      const attendanceRate = totalRecords > 0 ? Math.round(presentRecords / totalRecords * 100) : 100

      return {
        id: player.id,
        name: player.name,
        group: player.group,
        weakestSkill: weakest ? `${skillLabels[weakest[0]]}(${weakest[1]})` : '-',
        strongestSkill: strongest ? `${skillLabels[strongest[0]]}(${strongest[1]})` : '-',
        attendanceRate,
        totalTrainings: totalRecords,
        suggestion: weakest && weakest[1] < 6
          ? `${player.name}的${skillLabels[weakest[0]]}明显偏弱(${weakest[1]}分)，建议加强针对性训练`
          : `${player.name}各项能力均衡，可进行进阶训练`
      }
    })

    // 6. 整合推荐方案
    const planParams = {
      group: group || players[0]?.group || 'U10',
      duration,
      location,
      theme: recommendation.theme,
      focusSkills: finalFocusSkills,
      playerCount: players.length,
      skillLevel: skillScores.reduce((sum, s) => sum + s.avgScore, 0) / skillScores.length >= 7
        ? 'advanced' as const
        : skillScores.reduce((sum, s) => sum + s.avgScore, 0) / skillScores.length >= 5
          ? 'intermediate' as const
          : 'beginner' as const,
      previousTraining: recentThemes
    }

    return NextResponse.json({
      success: true,
      data: {
        // 全班技能分析
        skillAnalysis: {
          scores: skillScores,
          weakestSkills,
          recommendation: `全班${weakestSkills.length > 0 ? weakestSkills.map(s => `${s.label}(${s.avgScore}分)`).join('、') : '各项能力'}需要重点提升`
        },
        // 推荐教案参数（可直接传给 generate-plan）
        planParams,
        // 推荐理由
        reasons: [
          `班级最弱项：${skillLabels[mainWeakness]}（平均${skillScores.find(s => s.skill === mainWeakness)?.avgScore || 0}分）`,
          ...weakestSkills.slice(1).map(s => `${s.label}也需要加强（${s.avgScore}分）`),
          recentThemes.length > 0 ? `已避开最近训练主题：${recentThemes.slice(0, 3).join('、')}` : ''
        ].filter(Boolean),
        // 学员个人分析
        playerInsights,
        // 推荐活动
        suggestedActivities: recommendation.activities
      }
    })
  } catch (error) {
    console.error('智能教案推荐失败:', error)
    return NextResponse.json(
      { success: false, error: '智能推荐失败' },
      { status: 500 }
    )
  }
}
