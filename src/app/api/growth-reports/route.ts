import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/growth-reports - 获取成长报告列表
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const playerId = searchParams.get('playerId');
    const reportType = searchParams.get('reportType');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Prisma.GrowthReportWhereInput = {};
    if (playerId) where.playerId = playerId;
    if (reportType) where.reportType = reportType;
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      prisma.growthReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.growthReport.count({ where }),
    ]);

    // 解析JSON字段
    const parsedReports = reports.map((report) => ({
      ...report,
      abilities: JSON.parse(report.abilities || '{}'),
      trainingStats: JSON.parse(report.trainingStats || '{}'),
      matchStats: JSON.parse(report.matchStats || '{}'),
      strengths: JSON.parse(report.strengths || '[]'),
      improvements: JSON.parse(report.improvements || '[]'),
      goals: JSON.parse(report.goals || '[]'),
    }));

    return NextResponse.json({
      success: true,
      reports: parsedReports,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('获取成长报告列表失败:', error);
    return NextResponse.json({ success: false, error: '获取成长报告列表失败' }, { status: 500 });
  }
}

// POST /api/growth-reports - 创建成长报告
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();

    const {
      playerId,
      playerName,
      title,
      periodStart,
      periodEnd,
      reportType = 'quarterly',
      abilities,
      trainingStats,
      matchStats,
      strengths,
      improvements,
      goals,
      overallRating,
      summary,
      coachId,
      coachName,
    } = body;

    if (!playerId || !playerName || !title || !periodStart || !periodEnd) {
      return NextResponse.json({ success: false, error: '缺少必填字段' }, { status: 400 });
    }

    const report = await prisma.growthReport.create({
      data: {
        playerId,
        playerName,
        title,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        reportType,
        abilities: typeof abilities === 'string' ? abilities : JSON.stringify(abilities || {}),
        trainingStats:
          typeof trainingStats === 'string' ? trainingStats : JSON.stringify(trainingStats || {}),
        matchStats: typeof matchStats === 'string' ? matchStats : JSON.stringify(matchStats || {}),
        strengths: typeof strengths === 'string' ? strengths : JSON.stringify(strengths || []),
        improvements:
          typeof improvements === 'string' ? improvements : JSON.stringify(improvements || []),
        goals: typeof goals === 'string' ? goals : JSON.stringify(goals || []),
        overallRating,
        summary,
        coachId,
        coachName,
        status: 'draft',
      },
    });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('创建成长报告失败:', error);
    return NextResponse.json({ success: false, error: '创建成长报告失败' }, { status: 500 });
  }
}
