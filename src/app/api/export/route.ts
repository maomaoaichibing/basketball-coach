import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, TrainingPlan, Player, TrainingRecord } from '@prisma/client';
import * as XLSX from 'xlsx';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

type ExportData = Record<string, string | number>;
type ExportRow = ExportData;

// 扩展类型定义，包含关联数据
interface TrainingPlanWithTeam extends TrainingPlan {
  team?: { name: string } | null;
}

interface PlayerWithTeam extends Player {
  team?: { name: string } | null;
}

interface TrainingRecordWithRelations extends TrainingRecord {
  plan?: { title: string; date: Date; duration: number } | null;
  player?: { name: string; group: string } | null;
}

// GET /api/export - 导出数据
// ?type=plans|players|records&format=excel
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'plans';
    const format = searchParams.get('format') || 'excel';

    if (format !== 'excel') {
      return NextResponse.json({ success: false, error: '仅支持 Excel 格式导出' }, { status: 400 });
    }

    let data: ExportRow[] = [];
    let filename = '';

    switch (type) {
      case 'plans':
        data = await exportPlans();
        filename = '教案列表';
        break;
      case 'players':
        data = await exportPlayers();
        filename = '学员列表';
        break;
      case 'records':
        data = await exportRecords();
        filename = '训练记录';
        break;
      default:
        return NextResponse.json({ success: false, error: '不支持的导出类型' }, { status: 400 });
    }

    // 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // 设置列宽
    worksheet['!cols'] = data.length > 0 ? Object.keys(data[0]).map(() => ({ wch: 15 })) : [];

    // 生成 buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 返回文件
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}_${new Date().toISOString().split('T')[0]}.xlsx")}"`,
      },
    });
  } catch (error) {
    console.error('导出失败:', error);
    return NextResponse.json({ success: false, error: '导出失败' }, { status: 500 });
  }
}

async function exportPlans() {
  const plans = await prisma.trainingPlan.findMany({
    orderBy: { date: 'desc' },
    include: {
      team: { select: { name: true } },
    },
  });

  return plans.map((plan: TrainingPlanWithTeam) => ({
    教案标题: plan.title,
    训练日期: new Date(plan.date).toLocaleDateString('zh-CN'),
    '时长(分钟)': plan.duration,
    年龄段: plan.group,
    场地: plan.location,
    天气: plan.weather || '-',
    主题: plan.theme || '-',
    状态: plan.status === 'draft' ? '草稿' : plan.status === 'published' ? '已发布' : '已完成',
    队伍: plan.team?.name || '-',
    创建时间: new Date(plan.createdAt).toLocaleString('zh-CN'),
  }));
}

async function exportPlayers() {
  const players = await prisma.player.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      team: { select: { name: true } },
    },
  });

  return players.map((player: PlayerWithTeam) => ({
    姓名: player.name,
    性别: player.gender === 'male' ? '男' : '女',
    出生日期: player.birthDate ? new Date(player.birthDate).toLocaleDateString('zh-CN') : '-',
    年龄: player.birthDate
      ? Math.floor(
          (Date.now() - new Date(player.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        )
      : '-',
    年龄段: player.group,
    学校: player.school || '-',
    '身高(cm)': player.height || '-',
    '体重(kg)': player.weight || '-',
    所属队伍: player.team?.name || '未分配',
    状态:
      player.status === 'training'
        ? '训练中'
        : player.status === 'trial'
          ? '试训'
          : player.status === 'vacation'
            ? '休假'
            : player.status,
    家长姓名: player.parentName || '-',
    家长电话: player.parentPhone || '-',
    入学日期: player.enrollDate ? new Date(player.enrollDate).toLocaleDateString('zh-CN') : '-',
  }));
}

async function exportRecords() {
  const records = await prisma.trainingRecord.findMany({
    orderBy: { recordedAt: 'desc' },
    include: {
      player: { select: { name: true, group: true } },
      plan: { select: { title: true, date: true, duration: true } },
    },
  });

  return records.map((record: TrainingRecordWithRelations) => ({
    训练日期: record.plan?.date ? new Date(record.plan.date).toLocaleDateString('zh-CN') : '-',
    教案名称: record.plan?.title || '-',
    学员姓名: record.player?.name || '-',
    年龄段: record.player?.group || '-',
    出勤状态:
      record.attendance === 'present' ? '出勤' : record.attendance === 'late' ? '迟到' : '缺勤',
    训练时长: record.plan?.duration ? `${record.plan.duration}分钟` : '-',
    表现评分: record.performance || '-',
    努力程度: record.effort || '-',
    态度评分: record.attitude || '-',
    教练反馈: record.feedback || '-',
    亮点: record.highlights || '-',
    问题: record.issues || '-',
    改进建议: record.improvements || '-',
    课后作业: record.homework || '-',
    记录时间: new Date(record.recordedAt).toLocaleString('zh-CN'),
  }));
}
