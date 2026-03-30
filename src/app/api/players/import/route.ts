import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// 学员数据接口
interface PlayerRow {
  name: string
  gender: string
  birthDate: string
  group: string
  status: string
  school?: string
  parentName?: string
  parentPhone?: string
  parentWechat?: string
}

// 验证性别
function parseGender(value: string): string {
  if (value === '男' || value === 'male' || value === 'M') return 'male'
  if (value === '女' || value === 'female' || value === 'F') return 'female'
  return 'male' // 默认男
}

// 验证分组
function parseGroup(value: string): string {
  const groupMap: Record<string, string> = {
    'U6': 'U6', 'U8': 'U8', 'U10': 'U10', 'U12': 'U12', 'U14': 'U14',
    'u6': 'U6', 'u8': 'U8', 'u10': 'U10', 'u12': 'U12', 'u14': 'U14',
  }
  return groupMap[value] || 'U10' // 默认U10
}

// 验证状态
function parseStatus(value: string): string {
  const statusMap: Record<string, string> = {
    '试听中': 'trial', '试听': 'trial',
    '在训': 'training', '训练中': 'training',
    '请假': 'vacation', '休假': 'vacation',
    '停课': 'suspended', '暂停': 'suspended',
    '结业': 'graduated', '毕业': 'graduated',
  }
  return statusMap[value] || 'training' // 默认在训
}

// 解析日期格式
function parseDate(value: string): Date | null {
  if (!value) return null

  // 支持格式：YYYY-MM-DD, YYYY/MM/DD, YYYYMMDD, MM/DD/YYYY
  const formats = [
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,           // YYYY-MM-DD
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,         // YYYY/MM/DD
    /^(\d{4})(\d{2})(\d{2})$/,                 // YYYYMMDD
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,         // MM/DD/YYYY
  ]

  for (const format of formats) {
    const match = value.match(format)
    if (match) {
      let year: number, month: number, day: number

      if (format === formats[3]) {
        // MM/DD/YYYY -> YYYY-MM-DD
        [, month, day, year] = match.map(Number) as any
      } else {
        [, year, month, day] = match.map(Number) as any
      }

      const date = new Date(year, month - 1, day)
      if (!isNaN(date.getTime())) {
        return date
      }
    }
  }

  // 尝试直接解析
  const date = new Date(value)
  if (!isNaN(date.getTime())) {
    return date
  }

  return null
}

// POST /api/players/import - 批量导入学员
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: '请上传文件' },
        { status: 400 }
      )
    }

    // 读取文件内容
    const text = await file.text()
    const lines = text.trim().split('\n')

    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, error: '文件内容为空或格式不正确' },
        { status: 400 }
      )
    }

    // 解析表头
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))

    // 验证必要字段
    const requiredIndexes: Record<string, number> = {
      name: headers.findIndex(h => ['姓名', 'name', '姓名*'].includes(h)),
      birthDate: headers.findIndex(h => ['出生日期', 'birthDate', '生日', '出生日期*'].includes(h)),
    }

    if (requiredIndexes.name === -1 || requiredIndexes.birthDate === -1) {
      return NextResponse.json(
        { success: false, error: '表头必须包含"姓名"和"出生日期"列' },
        { status: 400 }
      )
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
    }

    // 解析数据行
    const players: PlayerRow[] = []
    const errors: { row: number; message: string }[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // 处理CSV引号
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))

      const name = values[requiredIndexes.name]?.trim()
      const birthDateStr = values[requiredIndexes.birthDate]?.trim()

      if (!name) {
        errors.push({ row: i + 1, message: '姓名为空' })
        continue
      }

      const birthDate = parseDate(birthDateStr)
      if (!birthDate) {
        errors.push({ row: i + 1, message: `出生日期"${birthDateStr}"格式不正确` })
        continue
      }

      players.push({
        name,
        gender: fieldIndexes.gender !== -1 ? parseGender(values[fieldIndexes.gender]) : 'male',
        birthDate: birthDate.toISOString().split('T')[0],
        group: fieldIndexes.group !== -1 ? parseGroup(values[fieldIndexes.group]) : 'U10',
        status: fieldIndexes.status !== -1 ? parseStatus(values[fieldIndexes.status]) : 'training',
        school: fieldIndexes.school !== -1 ? values[fieldIndexes.school]?.trim() : undefined,
        parentName: fieldIndexes.parentName !== -1 ? values[fieldIndexes.parentName]?.trim() : undefined,
        parentPhone: fieldIndexes.parentPhone !== -1 ? values[fieldIndexes.parentPhone]?.trim() : undefined,
        parentWechat: fieldIndexes.parentWechat !== -1 ? values[fieldIndexes.parentWechat]?.trim() : undefined,
      })
    }

    if (players.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有有效的数据行', errors },
        { status: 400 }
      )
    }

    // 批量创建学员
    const created: string[] = []
    const failed: { row: number; name: string; error: string }[] = []

    for (let i = 0; i < players.length; i++) {
      const player = players[i]
      try {
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
            dribbling: 5,
            passing: 5,
            shooting: 5,
            defending: 5,
            physical: 5,
            tactical: 5
          } as any
        })
        created.push(player.name)
      } catch (err: any) {
        failed.push({
          row: i + 2, // 加2因为从1开始且有表头
          name: player.name,
          error: err.message || '创建失败'
        })
      }
    }

    return NextResponse.json({
      success: true,
      total: players.length,
      created: created.length,
      failed: failed.length,
      createdNames: created,
      errors: [...errors.map(e => ({ ...e, type: 'parse' })), ...failed.map(f => ({ ...f, type: 'create' }))],
      message: `成功导入 ${created.length} 名学员${failed.length > 0 ? `，${failed.length} 名失败` : ''}`
    })
  } catch (error) {
    console.error('批量导入学员失败:', error)
    return NextResponse.json(
      { success: false, error: '批量导入失败' },
      { status: 500 }
    )
  }
}

// GET /api/players/import/template - 下载导入模板
export async function GET() {
  const template = `姓名*,出生日期*,性别,分组,状态,学校,家长姓名,联系电话,微信
张三,2018-05-01,男,U10,在训,第一小学,张爸,13800138001,wx_zhangsan
李四,2017-08-15,女,U12,在训,第二小学,李妈,13900139002,wx_lisi
王五,2019-03-20,男,U8,试听,幼儿园大班,王爸,13700137003,wx_wangwu`

  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/csv;charset=utf-8',
      'Content-Disposition': 'attachment; filename="学员导入模板.csv"'
    }
  })
}
