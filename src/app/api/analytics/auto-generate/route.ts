import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// POST 自动生成智能推荐和分析
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, { roles: ['admin'] });
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { playerId, coachId, coachName } = body;

    if (!playerId) {
      return NextResponse.json({ error: '缺少学员ID' }, { status: 400 });
    }

    // 获取学员信息
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        assessments: { orderBy: { assessedAt: 'desc' }, take: 5 },
        enrollments: { include: { course: true }, where: { status: 'active' } },
      },
    });

    if (!player) {
      return NextResponse.json({ error: '学员不存在' }, { status: 404 });
    }

    const recommendations: string[] = [];
    const trainingSuggestions: string[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // 分析能力数据
    if (player.assessments.length > 0) {
      const latest = player.assessments[0];

      // 分析强项（评分 >= 8）
      if ((latest.dribbling ?? 0) >= 8) strengths.push('运球能力出色');
      if ((latest.shooting ?? 0) >= 8) strengths.push('投篮技术扎实');
      if ((latest.passing ?? 0) >= 8) strengths.push('传球意识强');
      if ((latest.defending ?? 0) >= 8) strengths.push('防守能力突出');
      if ((latest.physical ?? 0) >= 8) strengths.push('身体素质优秀');
      if ((latest.tactical ?? 0) >= 8) strengths.push('战术理解力强');

      // 分析弱项（评分 < 6）
      if ((latest.dribbling ?? 0) < 6) {
        weaknesses.push('运球能力需加强');
        trainingSuggestions.push('加强运球基本功训练');
      }
      if ((latest.shooting ?? 0) < 6) {
        weaknesses.push('投篮稳定性不足');
        trainingSuggestions.push('增加投篮练习次数');
      }
      if ((latest.passing ?? 0) < 6) {
        weaknesses.push('传球技术需提升');
        trainingSuggestions.push('练习传球准确性和时机把握');
      }
      if ((latest.defending ?? 0) < 6) {
        weaknesses.push('防守意识需提高');
        trainingSuggestions.push('加强防守脚步和位置感训练');
      }
      if ((latest.physical ?? 0) < 6) {
        weaknesses.push('体能需要加强');
        trainingSuggestions.push('增加体能训练时间');
      }
      if ((latest.tactical ?? 0) < 6) {
        weaknesses.push('战术理解需深化');
        trainingSuggestions.push('多观看比赛录像学习战术');
      }

      // 生成个性化推荐
      const overallScore = Math.round(
        ((latest.dribbling ?? 0) +
          (latest.shooting ?? 0) +
          (latest.passing ?? 0) +
          (latest.defending ?? 0) +
          (latest.physical ?? 0) +
          (latest.tactical ?? 0)) /
          6
      );

      // 根据薄弱项生成推荐
      if (weaknesses.length > 0) {
        recommendations.push(
          `建议加强${weaknesses[0].replace('需要加强', '').replace('需提高', '').replace('不足', '')}训练`
        );
      }

      // 根据当前能力推荐课程
      if (player.enrollments.length > 0) {
        const currentCourse = player.enrollments[0].course.name;
        if (overallScore >= 7 && currentCourse.includes('基础')) {
          recommendations.push('能力已达到进阶水平，建议考虑升班');
        }
      }
    }

    // 生成智能推荐记录
    const createdRecommendations = await Promise.all(
      recommendations.slice(0, 3).map((content, index) =>
        prisma.trainingRecommend.create({
          data: {
            playerId,
            playerName: player.name,
            recommendType: 'skill',
            title: `个性化训练建议 ${index + 1}`,
            content,
            reason: '基于最新能力评估分析',
            priority: index + 1,
            coachId,
            coachName,
            isAuto: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后过期
          },
        })
      )
    );

    // 生成能力分析记录
    const latestAssessment = player.assessments[0];
    if (latestAssessment) {
      const dimensions = {
        dribbling: latestAssessment.dribbling,
        shooting: latestAssessment.shooting,
        passing: latestAssessment.passing,
        defending: latestAssessment.defending,
        physical: latestAssessment.physical,
        tactical: latestAssessment.tactical,
      };

      // 计算进步情况（如果有历史数据）
      let progress: Record<string, string> = {};
      if (player.assessments.length > 1) {
        const previous = player.assessments[1];
        progress = {
          dribbling: `${(latestAssessment.dribbling ?? 0) - (previous.dribbling ?? 0) >= 0 ? '+' : ''}${(latestAssessment.dribbling ?? 0) - (previous.dribbling ?? 0)}`,
          shooting: `${(latestAssessment.shooting ?? 0) - (previous.shooting ?? 0) >= 0 ? '+' : ''}${(latestAssessment.shooting ?? 0) - (previous.shooting ?? 0)}`,
          passing: `${(latestAssessment.passing ?? 0) - (previous.passing ?? 0) >= 0 ? '+' : ''}${(latestAssessment.passing ?? 0) - (previous.passing ?? 0)}`,
          defending: `${(latestAssessment.defending ?? 0) - (previous.defending ?? 0) >= 0 ? '+' : ''}${(latestAssessment.defending ?? 0) - (previous.defending ?? 0)}`,
          physical: `${(latestAssessment.physical ?? 0) - (previous.physical ?? 0) >= 0 ? '+' : ''}${(latestAssessment.physical ?? 0) - (previous.physical ?? 0)}`,
          tactical: `${(latestAssessment.tactical ?? 0) - (previous.tactical ?? 0) >= 0 ? '+' : ''}${(latestAssessment.tactical ?? 0) - (previous.tactical ?? 0)}`,
        };
      }

      // 计算分析周期
      const periodEnd = new Date();
      const periodStart = new Date();
      periodStart.setMonth(periodStart.getMonth() - 1);

      await prisma.abilityAnalysis.create({
        data: {
          playerId,
          playerName: player.name,
          periodStart,
          periodEnd,
          overallScore: Math.round(
            ((latestAssessment.dribbling ?? 0) +
              (latestAssessment.shooting ?? 0) +
              (latestAssessment.passing ?? 0) +
              (latestAssessment.defending ?? 0) +
              (latestAssessment.physical ?? 0) +
              (latestAssessment.tactical ?? 0)) /
              6
          ),
          dimensions: JSON.stringify(dimensions),
          progress: JSON.stringify(progress),
          strengths: JSON.stringify(strengths),
          weaknesses: JSON.stringify(weaknesses),
          trainingSuggestions: JSON.stringify(trainingSuggestions),
          method: 'auto',
          analystId: coachId,
          analystName: coachName,
        },
      });
    }

    return NextResponse.json({
      success: true,
      recommendations: createdRecommendations,
      analysis: {
        playerId,
        playerName: player.name,
        strengths,
        weaknesses,
        trainingSuggestions,
      },
    });
  } catch (error) {
    console.error('自动生成分析失败:', error);
    return NextResponse.json({ error: '自动生成分析失败' }, { status: 500 });
  }
}
