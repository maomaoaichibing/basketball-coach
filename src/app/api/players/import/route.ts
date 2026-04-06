import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { Prisma } from '@prisma/client';

import prisma from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// 学员数据接口
interface PlayerRow {
  name: string;
  gender: string;
  birthDate: string;
  group: string;
  status: string;
  school?: string;
  parentName?: string;
  parentPhone?: string;
  parentWechat?: string;
  dribbling?: number;
  passing?: number;
  shooting?: number;
  defending?: number;
  physical?: number;
  tactical?: number;
}

// 验证性别
function parseGender(value: string): string {
  if (value === '男' || value === 'male' || value === 'M') return 'male';
  if (value === '女' || value === 'female' || value === 'F') return 'female';
  return 'male'; // 默认男
}

// 验证分组
function parseGroup(value: string): string {
  const groupMap: Record<string, string> = {
    U6: 'U6',
    U8: 'U8',
    U10: 'U10',
    U12: 'U12',
    U14: 'U14',
    u6: 'U6',
    u8: 'U8',
    u10: 'U10',
    u12: 'U12',
    u14: 'U14',
  };
  return groupMap[value] || 'U10'; // 默认U10
}

// 验证状态
function parseStatus(value: string): string {
  const statusMap: Record<string, string> = {
    试听中: 'trial',
    试听: 'trial',
    在训: 'training',
    训练中: 'training',
    请假: 'vacation',
    休假: 'vacation',
    停课: 'suspended',
    暂停: 'suspended',
    结业: 'graduated',
    毕业: 'graduated',
  };
  return statusMap[value] || 'training'; // 默认在训
}

// 解析日期格式
function parseDate(value: string): Date | null {
  if (!value) return null;

  // 支持格式：YYYY-MM-DD, YYYY/MM/DD, YYYYMMDD, MM/DD/YYYY
  const formats = [
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // YYYY/MM/DD
    /^(\d{4})(\d{2})(\d{2})$/, // YYYYMMDD
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
  ];

  for (const format of formats) {
    const match = value.match(format);
    if (match) {
      let year: number, month: number, day: number;

      if (format === formats[3]) {
        // MM/DD/YYYY -> YYYY-MM-DD
        [, month, day, year] = match.map(Number);
      } else {
        [, year, month, day] = match.map(Number);
      }

      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // 尝试直接解析
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date;
  }

  return null;
}

// POST /api/players/import - 批量导入学员（支持 CSV 和 XLSX）
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: '请上传文件' }, { status: 400 });
    }

    // 检测文件类型
    const fileName = file.name.toLowerCase();
    const isXlsx = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    let headers: string[] = [];
    let rows: unknown[][] = [];

    if (isXlsx) {
      // 解析 XLSX 文件
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(firstSheet, {
        header: 1,
        defval: '',
      }) as unknown[][];

      if (data.length < 2) {
        return NextResponse.json(
          { success: false, error: '文件内容为空或格式不正确' },
          { status: 400 }
        );
      }

      headers = data[0].map((h: unknown) => String(h || '').trim());
      rows = data.slice(1).filter(row => row && row.some((cell: unknown) => cell !== ''));
    } else {
      // 解析 CSV 文件
      const text = await file.text();
      const lines = text.trim().split('\n');

      if (lines.length < 2) {
        return NextResponse.json(
          { success: false, error: '文件内容为空或格式不正确' },
          { status: 400 }
        );
      }

      // 解析表头
      headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

      // 解析数据行
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 处理CSV引号
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        rows.push(values);
      }
    }

    // 验证必要字段
    const requiredIndexes: Record<string, number> = {
      name: headers.findIndex(h => ['姓名', 'name', '姓名*'].includes(h)),
      birthDate: headers.findIndex(h => ['出生日期', 'birthDate', '生日', '出生日期*'].includes(h)),
    };

    if (requiredIndexes.name === -1 || requiredIndexes.birthDate === -1) {
      return NextResponse.json(
        { success: false, error: '表头必须包含"姓名"和"出生日期"列' },
        { status: 400 }
      );
    }

    // 找到可选字段索引
    const fieldIndexes: Record<string, number> = {
      gender: headers.findIndex(h => ['性别', 'gender'].includes(h)),
      group: headers.findIndex(h => ['分组', 'group', '组别'].includes(h)),
      status: headers.findIndex(h => ['状态', 'status'].includes(h)),
      school: headers.findIndex(h => ['学校', 'school'].includes(h)),
      parentName: headers.findIndex(h => ['家长姓名', 'parentName', '监护人'].includes(h)),
      parentPhone: headers.findIndex(h => ['联系电话', 'parentPhone', '电话', '手机'].includes(h)),
      parentWechat: headers.findIndex(h => ['微信', 'wechat', 'Wechat'].includes(h)),
      // 技术能力字段
      dribbling: headers.findIndex(h => ['运球', 'dribbling'].includes(h)),
      passing: headers.findIndex(h => ['传球', 'passing'].includes(h)),
      shooting: headers.findIndex(h => ['投篮', 'shooting'].includes(h)),
      defending: headers.findIndex(h => ['防守', 'defending'].includes(h)),
      physical: headers.findIndex(h => ['体能', 'physical'].includes(h)),
      tactical: headers.findIndex(h => ['战术', 'tactical'].includes(h)),
    };

    // 解析数据行
    const players: PlayerRow[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const values = rows[i];
      if (!values || values.every(v => !v)) continue;

      const name = String(values[requiredIndexes.name] || '').trim();
      const birthDateStr = String(values[requiredIndexes.birthDate] || '').trim();

      if (!name) {
        errors.push({ row: i + 2, message: '姓名为空' });
        continue;
      }

      const birthDate = parseDate(birthDateStr);
      if (!birthDate) {
        errors.push({
          row: i + 2,
          message: `出生日期"${birthDateStr}"格式不正确`,
        });
        continue;
      }

      // 解析技术能力字段（1-10分）
      const parseAbility = (value: string): number => {
        const num = parseInt(value);
        if (isNaN(num)) return 5; // 默认5分
        return Math.max(1, Math.min(10, num)); // 限制在1-10之间
      };

      players.push({
        name,
        gender:
          fieldIndexes.gender !== -1
            ? parseGender(String(values[fieldIndexes.gender] || ''))
            : 'male',
        birthDate: birthDate.toISOString().split('T')[0],
        group:
          fieldIndexes.group !== -1 ? parseGroup(String(values[fieldIndexes.group] || '')) : 'U10',
        status:
          fieldIndexes.status !== -1
            ? parseStatus(String(values[fieldIndexes.status] || ''))
            : 'training',
        school:
          fieldIndexes.school !== -1 ? String(values[fieldIndexes.school] || '').trim() : undefined,
        parentName:
          fieldIndexes.parentName !== -1
            ? String(values[fieldIndexes.parentName] || '').trim()
            : undefined,
        parentPhone:
          fieldIndexes.parentPhone !== -1
            ? String(values[fieldIndexes.parentPhone] || '').trim()
            : undefined,
        parentWechat:
          fieldIndexes.parentWechat !== -1
            ? String(values[fieldIndexes.parentWechat] || '').trim()
            : undefined,
        // 技术能力字段
        dribbling:
          fieldIndexes.dribbling !== -1
            ? parseAbility(String(values[fieldIndexes.dribbling] || ''))
            : 5,
        passing:
          fieldIndexes.passing !== -1
            ? parseAbility(String(values[fieldIndexes.passing] || ''))
            : 5,
        shooting:
          fieldIndexes.shooting !== -1
            ? parseAbility(String(values[fieldIndexes.shooting] || ''))
            : 5,
        defending:
          fieldIndexes.defending !== -1
            ? parseAbility(String(values[fieldIndexes.defending] || ''))
            : 5,
        physical:
          fieldIndexes.physical !== -1
            ? parseAbility(String(values[fieldIndexes.physical] || ''))
            : 5,
        tactical:
          fieldIndexes.tactical !== -1
            ? parseAbility(String(values[fieldIndexes.tactical] || ''))
            : 5,
      });
    }

    if (players.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有有效的数据行', errors },
        { status: 400 }
      );
    }

    // 批量创建学员（检查重复）
    const created: string[] = [];
    const skipped: string[] = [];
    const failed: { row: number; name: string; error: string }[] = [];

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      try {
        // 检查是否已存在相同姓名和家长电话的学员
        const existingPlayer = await prisma.player.findFirst({
          where: {
            name: player.name,
            parentPhone: player.parentPhone || '',
          },
        });

        if (existingPlayer) {
          // 如果已存在，跳过（不创建也不更新）
          skipped.push(player.name);
          continue;
        }

        // 创建新学员
        await prisma.player.create({
          data: {
            name: player.name,
            birthDate: new Date(player.birthDate),
            gender: player.gender,
            group: player.group,
            status: player.status,
            school: player.school,
            parentName: player.parentName,
            parentPhone: player.parentPhone,
            parentWechat: player.parentWechat,
            tags: '[]',
            injuries: '[]',
            // 技术能力字段（使用CSV中的值或默认值5）
            dribbling: player.dribbling || 5,
            passing: player.passing || 5,
            shooting: player.shooting || 5,
            defending: player.defending || 5,
            physical: player.physical || 5,
            tactical: player.tactical || 5,
          } as Prisma.PlayerCreateInput,
        });
        created.push(player.name);
      } catch (err: unknown) {
        failed.push({
          row: i + 2, // 加2因为从1开始且有表头
          name: player.name,
          error: err instanceof Error ? err.message : '创建失败',
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: players.length,
      created: created.length,
      skipped: skipped.length,
      failed: failed.length,
      createdNames: created,
      skippedNames: skipped,
      errors: [
        ...errors.map(e => ({ ...e, type: 'parse' })),
        ...failed.map(f => ({ ...f, type: 'create' })),
      ],
      message: `成功导入 ${created.length} 名学员${skipped.length > 0 ? `，跳过 ${skipped.length} 名重复学员` : ''}${failed.length > 0 ? `，${failed.length} 名失败` : ''}`,
    });
  } catch (error) {
    console.error('批量导入学员失败:', error);
    return NextResponse.json({ success: false, error: '批量导入失败' }, { status: 500 });
  }
}

// GET /api/players/import/template - 下载导入模板
export async function GET() {
  const template = `姓名*,出生日期*,性别,分组,状态,学校,家长姓名,联系电话,微信,运球,传球,投篮,防守,体能,战术
张三,2018-05-01,男,U10,在训,第一小学,张爸,13800138001,wx_zhangsan,5,5,5,5,5,5
李四,2017-08-15,女,U12,在训,第二小学,李妈,13900139002,wx_lisi,7,6,8,6,7,5
王五,2019-03-20,男,U8,试听,幼儿园大班,王爸,13700137003,wx_wangwu,3,4,3,4,5,3`;

  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/csv;charset=utf-8',
      'Content-Disposition': 'attachment; filename="player_import_template.csv"',
    },
  });
}
