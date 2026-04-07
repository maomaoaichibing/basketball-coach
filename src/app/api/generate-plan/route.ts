import https from 'https';

import { NextRequest, NextResponse } from 'next/server';

import { TrainingPlanOutput, PlanSection } from '@/lib/plan-generator';
import { retrieveSimilarCases, allPlans, LessonPlan } from '@/lib/cases';
import { verifyAuth } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// AI生成参数
interface AIPlanParams {
  group: string;
  duration: number;
  location: string;
  weather?: string;
  theme?: string;
  focusSkills?: string[];
  additionalNotes?: string;
  playerCount?: number;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  previousTraining?: string[];
  // 学员ID列表（用于智能短板分析）
  playerIds?: string[];
  // 调试参数：设为 true 时返回检索到的 RAG 案例
  debug?: boolean;
}

// 技能维度中文映射
const SKILL_LABELS: Record<string, string> = {
  dribbling: '运球',
  passing: '传球',
  shooting: '投篮',
  defending: '防守',
  physical: '体能',
  tactical: '战术',
};

// 分析学员技能短板，返回需要重点训练的技能
async function analyzePlayerWeaknesses(playerIds: string[]): Promise<{
  weaknessText: string;
  avgScores: Record<string, number>;
  playerCount: number;
}> {
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: {
      name: true,
      dribbling: true,
      passing: true,
      shooting: true,
      defending: true,
      physical: true,
      tactical: true,
    },
  });

  if (players.length === 0) {
    return { weaknessText: '', avgScores: {}, playerCount: 0 };
  }

  const skills = ['dribbling', 'passing', 'shooting', 'defending', 'physical', 'tactical'];
  const avgScores: Record<string, number> = {};

  for (const skill of skills) {
    const sum = players.reduce((acc, p) => acc + ((p[skill as keyof typeof p] as number) || 5), 0);
    avgScores[skill] = Math.round((sum / players.length) * 10) / 10;
  }

  // 找出短板（低于平均值或低于6分的技能）
  const allAvg = Object.values(avgScores).reduce((a, b) => a + b, 0) / skills.length;
  const weaknesses: string[] = [];
  const strongPoints: string[] = [];

  for (const [skill, avg] of Object.entries(avgScores)) {
    const label = SKILL_LABELS[skill] || skill;
    if (avg < 6 || avg < allAvg - 0.5) {
      weaknesses.push(`${label}(${avg}分)`);
    } else if (avg >= allAvg + 0.5) {
      strongPoints.push(`${label}(${avg}分)`);
    }
  }

  // 构建分析文本
  let weaknessText = `共${players.length}名学员的技能评估分析：\n`;
  weaknessText += `整体平均分：${skills.map(s => `${SKILL_LABELS[s]}=${avgScores[s]}`).join('、')}\n`;

  if (weaknesses.length > 0) {
    weaknessText += `薄弱技能（建议重点训练）：${weaknesses.join('、')}\n`;
  }
  if (strongPoints.length > 0) {
    weaknessText += `优势技能：${strongPoints.join('、')}\n`;
  }

  // 按短板排序生成训练建议
  if (weaknesses.length > 0) {
    weaknessText += `请根据以上薄弱技能，在教案中有针对性地加强训练。如果是多个薄弱技能，可以在不同训练阶段分别侧重。\n`;
  }

  return { weaknessText, avgScores, playerCount: players.length };
}

// AI返回结果接口
interface AIResult {
  title: string;
  theme: string;
  intensity: string;
  segments?: unknown[];
  sections?: unknown[];
  notes: string;
  trainingProgression?: string;
}

// API响应接口
interface APIResponse {
  success: boolean;
  plan: TrainingPlanOutput;
  debug?: {
    totalPlansInDb: number;
    keyword: string;
    matched: LessonPlan[];
  };
}

// AI生成活动接口
interface AIActivity {
  name: string;
  duration: number;
  form?: string;
  description?: string;
  sets?: string;
  repetitions?: string;
  progression?: string;
  keyPoints?: string[];
  coachingPoints?: string;
  equipment?: string[];
  drillDiagram?: string;
  relatedTo?: string;
  // 兼容 SectionActivity 的字段
  activity?: string;
  points?: string[];
  [key: string]: unknown;
}

// AI生成段落接口
interface AISection {
  title?: string;
  duration?: number;
  activities?: AIActivity[];
  [key: string]: unknown;
}

// 验证和修正AI生成的活动数据
function validateAndFixActivity(
  activity: AIActivity,
  category: string,
  sectionIndex: number = 0,
  allSections: AISection[] = []
): AIActivity {
  const fixed = { ...activity };

  // 确保所有必需字段存在
  if (!fixed.sets) {
    fixed.sets = '2-3组';
  }
  if (!fixed.repetitions) {
    // 根据活动类型设置默认次数
    if (fixed.name.includes('运球') || fixed.name.includes('传球')) {
      fixed.repetitions = '每组30秒或20次';
    } else if (fixed.name.includes('拉伸') || fixed.name.includes('伸展')) {
      fixed.repetitions = '每组8-10次或20秒';
    } else if (fixed.name.includes('慢跑') || fixed.name.includes('跑')) {
      fixed.repetitions = '1-2圈或3分钟';
    } else {
      fixed.repetitions = '每组8-10次';
    }
  }

  // 增强递进式设计 - 根据活动名称智能生成
  if (!fixed.progression || fixed.progression.includes('标准动作练习')) {
    fixed.progression = generateProgressionByActivity(fixed.name, category);
  }

  // 确保SVG图解存在、格式正确且是篮球场地图
  const isCourtSVG =
    fixed.drillDiagram &&
    fixed.drillDiagram.includes('#f5f0e6') && // 篮球场木地板底色
    fixed.drillDiagram.includes('#5c4033'); // 篮球场线颜色
  if (
    !fixed.drillDiagram ||
    fixed.drillDiagram === '<svg>...</svg>' ||
    !fixed.drillDiagram.includes('<svg') ||
    !fixed.drillDiagram.includes('xmlns="http://www.w3.org/2000/svg"') ||
    !isCourtSVG // AI返回的不是篮球场地图，强制替换
  ) {
    // 生成默认SVG图解（篮球场地图）
    fixed.drillDiagram = generateDefaultDrillDiagram(
      category,
      fixed.form || '集体',
      fixed.name || ''
    );
  }

  return fixed;
}

// 根据活动名称智能生成递进式设计
function generateProgressionByActivity(activityName: string, category: string): string {
  // 运球类
  if (activityName.includes('运球')) {
    if (activityName.includes('变向')) {
      return '基础：原地体前变向运球（熟悉换手动作）→ 进阶：行进间体前变向运球（结合脚步）→ 挑战：障碍间快速变向运球（实战模拟）';
    } else if (activityName.includes('胯下')) {
      return '基础：原地胯下运球（熟悉动作）→ 进阶：行进间胯下运球（结合移动）→ 挑战：连续胯下变向运球（增加难度）';
    } else if (activityName.includes('高低')) {
      return '基础：原地高低运球（控制力度）→ 进阶：行进间高低运球（结合移动）→ 挑战：高低运球变速突破（实战应用）';
    } else {
      return '基础：原地运球（熟悉球性）→ 进阶：行进间直线运球（结合脚步）→ 挑战：变向运球突破（增加难度）';
    }
  }

  // 传球类
  if (activityName.includes('传球')) {
    if (activityName.includes('胸前')) {
      return '基础：原地双手胸前传球（掌握手型）→ 进阶：移动中胸前传球（结合脚步）→ 挑战：对抗中传球（实战应用）';
    } else if (activityName.includes('击地')) {
      return '基础：原地击地传球（掌握击地点）→ 进阶：移动中击地传球（控制力度）→ 挑战：隔人击地传球（增加难度）';
    } else {
      return '基础：原地传球（掌握动作）→ 进阶：移动中传球（结合脚步）→ 挑战：对抗中传球（实战应用）';
    }
  }

  // 投篮类
  if (activityName.includes('投篮') || activityName.includes('上篮')) {
    if (activityName.includes('三步')) {
      return '基础：原地三步上篮脚步（无球练习）→ 进阶：持球三步上篮（慢速）→ 挑战：运球三步上篮（实战速度）';
    } else {
      return '基础：近距离投篮（掌握手型）→ 进阶：中距离投篮（增加距离）→ 挑战：移动中投篮（实战应用）';
    }
  }

  // 防守类
  if (activityName.includes('防守')) {
    if (activityName.includes('滑步')) {
      return '基础：原地防守姿势（掌握姿势）→ 进阶：慢速滑步（控制重心）→ 挑战：快速滑步跟随（实战应用）';
    } else {
      return '基础：原地防守姿势（掌握姿势）→ 进阶：一对一防守（跟随移动）→ 挑战：实战防守（判断时机）';
    }
  }

  // 拉伸类
  if (activityName.includes('拉伸') || activityName.includes('伸展')) {
    return '基础：小幅度拉伸（适应动作）→ 进阶：标准幅度拉伸（充分伸展）→ 挑战：动态拉伸（结合移动）';
  }

  // 默认
  return '基础：标准动作练习（掌握基本要领）→ 进阶：增加速度/难度（提升强度）→ 挑战：结合其他动作组合练习（综合应用）';
}

// 生成篮球场SVG背景（标准半场/全场）
// 坐标系：400x300，半场视图，篮筐在底部中央（y=285附近），底线在底部
function generateBasketballCourtSVG(isHalfCourt: boolean = true): string {
  let svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg" style="background-color: #f5f0e6;">`;

  if (isHalfCourt) {
    // ===== 标准篮球半场图（俯视图，篮筐在底部中央） =====
    // 场地比例：宽度28m → 380px，高度15m（半场）→ 280px
    // 场地边框：左上角(10,10) 右下角(390,290)
    const W = 390,
      H = 290; // 场地右下角
    const cx = 200; // 场地横向中心线
    const baseline = H; // 底线 y=290
    const sideline_l = 10; // 左边线 x=10
    const sideline_r = W; // 右边线 x=390
    const halfcourt = 10; // 中线 y=10（半场顶部）

    svg += `
    <!-- 场地地面 -->
    <rect x="${sideline_l}" y="${halfcourt}" width="${W - sideline_l - sideline_l + (sideline_l - 10)}" height="${baseline - halfcourt}" fill="#f5f0e6" stroke="#5c4033" stroke-width="2.5"/>
    
    <!-- 木地板纹理线 -->
    <line x1="${sideline_l}" y1="75" x2="${sideline_r}" y2="75" stroke="#e8dcc8" stroke-width="0.5"/>
    <line x1="${sideline_l}" y1="150" x2="${sideline_r}" y2="150" stroke="#e8dcc8" stroke-width="0.5"/>
    <line x1="${sideline_l}" y1="225" x2="${sideline_r}" y2="225" stroke="#e8dcc8" stroke-width="0.5"/>
    
    <!-- 中线（半场边界，虚线表示延伸） -->
    <line x1="${sideline_l}" y1="${halfcourt}" x2="${sideline_r}" y2="${halfcourt}" stroke="#5c4033" stroke-width="2"/>
    
    <!-- 中圈（半圆，朝中线方向） -->
    <path d="M ${cx - 45} ${halfcourt} A 45 45 0 0 1 ${cx + 45} ${halfcourt}" fill="none" stroke="#5c4033" stroke-width="2"/>
    
    <!-- 罚球区（油漆区）：宽5.8m≈78px，高5.8m≈108px -->
    <!-- 罚球区左边界 x=161, 右边界 x=239 -->
    <!-- 罚球线 y=182（距底线108px） -->
    <rect x="161" y="182" width="78" height="108" fill="#c9463e" fill-opacity="0.15" stroke="#5c4033" stroke-width="2"/>
    
    <!-- 罚球圈：圆心(cx, 182)，半径45px -->
    <circle cx="${cx}" cy="182" r="45" fill="none" stroke="#5c4033" stroke-width="2"/>
    <!-- 罚球圈虚线半圆（远离篮筐方向） -->
    <path d="M ${cx - 45} 182 A 45 45 0 0 0 ${cx + 45} 182" fill="none" stroke="#5c4033" stroke-width="1.5" stroke-dasharray="6,4"/>
    
    <!-- 三分线：弧线圆心在篮筐位置，半径约6.75m≈91px -->
    <!-- 篮筐位于 (cx, 272)，三分线从底角(x≈52和x≈348)画弧 -->
    <!-- 左侧底角三分线 -->
    <line x1="${sideline_l}" y1="228" x2="52" y2="${baseline}" stroke="#5c4033" stroke-width="2"/>
    <!-- 右侧底角三分线 -->
    <line x1="${sideline_r}" y1="228" x2="348" y2="${baseline}" stroke="#5c4033" stroke-width="2"/>
    <!-- 三分线弧线 -->
    <path d="M 52 ${baseline} A 91 91 0 0 1 348 ${baseline}" fill="none" stroke="#5c4033" stroke-width="2"/>
    
    <!-- 篮板 -->
    <rect x="${cx - 18}" y="${baseline - 18}" width="36" height="4" fill="#5c4033"/>
    
    <!-- 篮筐 -->
    <circle cx="${cx}" cy="${baseline - 30}" r="9" fill="none" stroke="#ff6600" stroke-width="2.5"/>
    <!-- 篮网（简化表示） -->
    <line x1="${cx - 6}" y1="${baseline - 22}" x2="${cx - 3}" y2="${baseline - 12}" stroke="#999" stroke-width="0.8"/>
    <line x1="${cx}" y1="${baseline - 21}" x2="${cx}" y2="${baseline - 10}" stroke="#999" stroke-width="0.8"/>
    <line x1="${cx + 6}" y1="${baseline - 22}" x2="${cx + 3}" y2="${baseline - 12}" stroke="#999" stroke-width="0.8"/>
    
    <!-- 合理冲撞区：篮筐下方小半圆，半径约30px -->
    <path d="M ${cx - 30} ${baseline - 30} A 30 30 0 0 0 ${cx + 30} ${baseline - 30}" fill="none" stroke="#5c4033" stroke-width="1.5"/>
    
    <!-- 限制区标记角 -->
    <!-- 左上角 -->
    <line x1="${sideline_l}" y1="182" x2="${sideline_l}" y2="168" stroke="#5c4033" stroke-width="1.5"/>
    <line x1="${sideline_l}" y1="168" x2="${sideline_l + 15}" y2="182" stroke="#5c4033" stroke-width="1.5"/>
    <!-- 右上角 -->
    <line x1="${sideline_r}" y1="182" x2="${sideline_r}" y2="168" stroke="#5c4033" stroke-width="1.5"/>
    <line x1="${sideline_r}" y1="168" x2="${sideline_r - 15}" y2="182" stroke="#5c4033" stroke-width="1.5"/>
    `;
  } else {
    // ===== 全场标准图 =====
    const W = 780,
      H = 380;
    const cx = W / 2; // 中场线
    const cy = H / 2; // 场地横向中心
    svg += `
    <!-- 场地地面 -->
    <rect x="10" y="10" width="${W}" height="${H}" fill="#f5f0e6" stroke="#5c4033" stroke-width="2.5"/>
    
    <!-- 木地板纹理线 -->
    <line x1="10" y1="${cy - 70}" x2="${W + 10}" y2="${cy - 70}" stroke="#e8dcc8" stroke-width="0.5"/>
    <line x1="10" y1="${cy}" x2="${W + 10}" y2="${cy}" stroke="#e8dcc8" stroke-width="0.5"/>
    <line x1="10" y1="${cy + 70}" x2="${W + 10}" y2="${cy + 70}" stroke="#e8dcc8" stroke-width="0.5"/>
    
    <!-- 中线 -->
    <line x1="${cx + 10}" y1="10" x2="${cx + 10}" y2="${H + 10}" stroke="#5c4033" stroke-width="2"/>
    
    <!-- 中圈 -->
    <circle cx="${cx + 10}" cy="${cy + 10}" r="45" fill="none" stroke="#5c4033" stroke-width="2"/>
    
    <!-- 左侧油漆区 -->
    <rect x="61" y="162" width="78" height="108" fill="#c9463e" fill-opacity="0.12" stroke="#5c4033" stroke-width="2"/>
    <circle cx="100" cy="162" r="45" fill="none" stroke="#5c4033" stroke-width="2"/>
    
    <!-- 左侧三分线 -->
    <line x1="10" y1="208" x2="38" y2="270" stroke="#5c4033" stroke-width="2"/>
    <line x1="10" y1="208" x2="162" y2="270" stroke="#5c4033" stroke-width="2"/>
    <path d="M 38 270 A 62 62 0 0 1 162 270" fill="none" stroke="#5c4033" stroke-width="2"/>
    
    <!-- 右侧油漆区 -->
    <rect x="651" y="162" width="78" height="108" fill="#c9463e" fill-opacity="0.12" stroke="#5c4033" stroke-width="2"/>
    <circle cx="690" cy="162" r="45" fill="none" stroke="#5c4033" stroke-width="2"/>
    
    <!-- 右侧三分线 -->
    <line x1="790" y1="208" x2="762" y2="270" stroke="#5c4033" stroke-width="2"/>
    <line x1="790" y1="208" x2="638" y2="270" stroke="#5c4033" stroke-width="2"/>
    <path d="M 762 270 A 62 62 0 0 0 638 270" fill="none" stroke="#5c4033" stroke-width="2"/>
    
    <!-- 左侧篮筐 -->
    <rect x="92" y="262" width="16" height="4" fill="#5c4033"/>
    <circle cx="100" cy="250" r="9" fill="none" stroke="#ff6600" stroke-width="2.5"/>
    
    <!-- 右侧篮筐 -->
    <rect x="682" y="262" width="16" height="4" fill="#5c4033"/>
    <circle cx="690" cy="250" r="9" fill="none" stroke="#ff6600" stroke-width="2.5"/>
    `;
  }

  return svg;
}

// 生成默认的SVG图解（战术图解标准版）
function generateDefaultDrillDiagram(
  category: string,
  form: string,
  activityName: string = ''
): string {
  const formType = form || '集体';
  const activityType = category || 'technical';

  // 所有活动统一使用篮球场半场图
  let svg = generateBasketballCourtSVG(true);

  // 箭头标记定义
  svg += `<defs>
    <marker id="arrow-red" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <polygon points="0 0, 10 3, 0 6" fill="#dc2626" />
    </marker>
    <marker id="arrow-blue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <polygon points="0 0, 10 3, 0 6" fill="#2563eb" />
    </marker>
    <marker id="arrow-orange" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <polygon points="0 0, 10 3, 0 6" fill="#ea580c" />
    </marker>
  </defs>`;

  // 根据活动类型和形式生成不同的站位图
  // 注意：篮筐现在在底部中央 (cx=200, y≈262)
  if (
    activityName.includes('投篮') ||
    activityName.includes('上篮') ||
    activityName.includes('三步')
  ) {
    // 投篮/上篮训练 - 学员在罚球线位置排成一列
    // 罚球线位置约 y=182，学员间隔排列
    svg += `<circle cx="200" cy="165" r="14" fill="#2563eb" stroke="white" stroke-width="2.5"/>`;
    svg += `<text x="200" y="170" text-anchor="middle" font-size="12" fill="white" font-weight="bold">1</text>`;
    svg += `<circle cx="200" cy="130" r="14" fill="#2563eb" stroke="white" stroke-width="2.5"/>`;
    svg += `<text x="200" y="135" text-anchor="middle" font-size="12" fill="white" font-weight="bold">2</text>`;
    svg += `<circle cx="200" cy="95" r="14" fill="#2563eb" stroke="white" stroke-width="2.5"/>`;
    svg += `<text x="200" y="100" text-anchor="middle" font-size="12" fill="white" font-weight="bold">3</text>`;
    // 球在第一个学员手中
    svg += `<circle cx="215" cy="155" r="5" fill="#ea580c"/>`;
    // 投篮路线（从罚球线到篮筐）
    svg += `<path d="M 200 152 Q 200 200, 200 242" fill="none" stroke="#dc2626" stroke-width="2" marker-end="url(#arrow-red)" stroke-dasharray="5,3"/>`;
    // 上篮路线（从右侧45度角突破到篮筐）
    svg += `<path d="M 260 140 Q 250 200, 210 255" fill="none" stroke="#2563eb" stroke-width="2" marker-end="url(#arrow-blue)" stroke-dasharray="5,3"/>`;
    svg += `<text x="275" y="135" font-size="9" fill="#2563eb">上篮路线</text>`;
    // 教练在侧翼观察指导
    svg += `<rect x="95" y="140" width="20" height="20" fill="#dc2626" stroke="white" stroke-width="2" rx="3"/>`;
    svg += `<text x="105" y="154" text-anchor="middle" font-size="10" fill="white" font-weight="bold">教</text>`;
  } else if (
    activityName.includes('对抗') ||
    activityName.includes('比赛') ||
    activityName.includes('3v3') ||
    activityName.includes('4v4')
  ) {
    // 对抗比赛 - 显示半场攻防站位
    // 进攻方（蓝色，3人：PG/SF/PF站位）
    const attackPos = [
      { x: 200, y: 120, label: 'PG' }, // 控球后卫弧顶
      { x: 120, y: 180, label: 'SF' }, // 小前锋侧翼
      { x: 280, y: 180, label: 'PF' }, // 大前锋侧翼
    ];
    for (let i = 0; i < 3; i++) {
      const p = attackPos[i];
      svg += `<circle cx="${p.x}" cy="${p.y}" r="14" fill="#2563eb" stroke="white" stroke-width="2.5"/>`;
      svg += `<text x="${p.x}" y="${p.y + 4}" text-anchor="middle" font-size="10" fill="white" font-weight="bold">${p.label}</text>`;
    }
    // 防守方（红色，2-3人：防守进攻队员）
    const defendPos = [
      { x: 200, y: 145, label: 'D1' },
      { x: 140, y: 175, label: 'D2' },
      { x: 260, y: 175, label: 'D3' },
    ];
    for (let i = 0; i < 3; i++) {
      const p = defendPos[i];
      svg += `<circle cx="${p.x}" cy="${p.y}" r="12" fill="#dc2626" stroke="white" stroke-width="2"/>`;
      svg += `<text x="${p.x}" y="${p.y + 4}" text-anchor="middle" font-size="8" fill="white" font-weight="bold">${p.label}</text>`;
    }
    // 进攻传球路线
    svg += `<line x1="200" y1="135" x2="135" y2="172" stroke="#2563eb" stroke-width="1.5" marker-end="url(#arrow-blue)" stroke-dasharray="4,3" opacity="0.6"/>`;
    svg += `<line x1="200" y1="135" x2="265" y2="172" stroke="#2563eb" stroke-width="1.5" marker-end="url(#arrow-blue)" stroke-dasharray="4,3" opacity="0.6"/>`;
    // 球在PG手中
    svg += `<circle cx="215" cy="112" r="5" fill="#ea580c"/>`;
    // 教练在边线
    svg += `<rect x="340" y="180" width="20" height="20" fill="#dc2626" stroke="white" stroke-width="2" rx="3"/>`;
    svg += `<text x="350" y="194" text-anchor="middle" font-size="10" fill="white" font-weight="bold">教</text>`;
  } else if (
    formType.includes('2人一组') ||
    formType.includes('双人') ||
    activityName.includes('传球')
  ) {
    // 双人训练/传球训练 - 两人面对面站位
    // 学员1
    svg += `<circle cx="120" cy="140" r="14" fill="#2563eb" stroke="white" stroke-width="2.5"/>`;
    svg += `<text x="120" y="145" text-anchor="middle" font-size="12" fill="white" font-weight="bold">1</text>`;
    // 学员2
    svg += `<circle cx="280" cy="140" r="14" fill="#2563eb" stroke="white" stroke-width="2.5"/>`;
    svg += `<text x="280" y="145" text-anchor="middle" font-size="12" fill="white" font-weight="bold">2</text>`;
    // 球在学员1手中
    svg += `<circle cx="135" cy="132" r="5" fill="#ea580c"/>`;
    // 传球路线
    svg += `<line x1="135" y1="135" x2="265" y2="135" stroke="#dc2626" stroke-width="2" marker-end="url(#arrow-red)" stroke-dasharray="5,3"/>`;
    // 传回路线（虚线）
    svg += `<line x1="265" y1="148" x2="135" y2="148" stroke="#2563eb" stroke-width="1.5" marker-end="url(#arrow-blue)" stroke-dasharray="4,3" opacity="0.5"/>
    <text x="200" y="125" text-anchor="middle" font-size="9" fill="#6b7280">传球 →</text>
    <text x="200" y="162" text-anchor="middle" font-size="9" fill="#6b7280">← 回传</text>`;
    // 教练在侧面指导
    svg += `<rect x="340" y="120" width="20" height="20" fill="#dc2626" stroke="white" stroke-width="2" rx="3"/>`;
    svg += `<text x="350" y="134" text-anchor="middle" font-size="10" fill="white" font-weight="bold">教</text>`;
  } else if (formType.includes('分组') && formType.includes('3人')) {
    // 3人一组训练
    const groups = 3;
    for (let i = 0; i < groups; i++) {
      const baseX = 80 + i * 100;
      // 学员1 (持球者)
      svg += `<circle cx="${baseX}" cy="120" r="12" fill="#2563eb" stroke="white" stroke-width="2"/>`;
      svg += `<text x="${baseX}" y="125" text-anchor="middle" font-size="11" fill="white" font-weight="bold">${i * 3 + 1}</text>`;
      // 球在持球者位置
      svg += `<circle cx="${baseX}" cy="120" r="4" fill="#ea580c"/>`;
      // 学员2和3
      svg += `<circle cx="${baseX - 25}" cy="160" r="12" fill="#2563eb" stroke="white" stroke-width="2"/>`;
      svg += `<text x="${baseX - 25}" y="165" text-anchor="middle" font-size="11" fill="white" font-weight="bold">${i * 3 + 2}</text>`;
      svg += `<circle cx="${baseX + 25}" cy="160" r="12" fill="#2563eb" stroke="white" stroke-width="2"/>`;
      svg += `<text x="${baseX + 25}" y="165" text-anchor="middle" font-size="11" fill="white" font-weight="bold">${i * 3 + 3}</text>`;
      // 传球路线
      svg += `<line x1="${baseX + 12}" y1="130" x2="${baseX - 25}" y2="150" stroke="#dc2626" stroke-width="2" marker-end="url(#arrow-red)" opacity="0.7"/>`;
    }
  } else if (activityName.includes('运球') && !activityName.includes('投篮')) {
    // 运球训练 - 学员纵队依次出发，教练在终点
    // 纵队起点（左侧底线附近）
    for (let i = 0; i < 4; i++) {
      const x = 60;
      const y = 120 + i * 35;
      svg += `<circle cx="${x}" cy="${y}" r="12" fill="#2563eb" stroke="white" stroke-width="2"/>`;
      svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10" fill="white" font-weight="bold">${i + 1}</text>`;
    }
    // 第一个学员的球
    svg += `<circle cx="60" cy="120" r="4" fill="#ea580c"/>`;
    // 运球路线（Z字形或直线）
    if (activityName.includes('变向') || activityName.includes('Z字')) {
      // Z字变向运球路线
      svg += `<path d="M 72 120 L 150 80 L 250 150 L 350 80" fill="none" stroke="#dc2626" stroke-width="2" marker-end="url(#arrow-red)" stroke-dasharray="5,3"/>`;
      // 障碍物（雪糕桶）
      svg += `<polygon points="150,75 155,85 145,85" fill="#f59e0b"/>`;
      svg += `<polygon points="250,145 255,155 245,155" fill="#f59e0b"/>`;
      svg += `<text x="200" y="70" text-anchor="middle" font-size="9" fill="#6b7280">Z字变向路线</text>`;
    } else {
      // 直线运球路线
      svg += `<line x1="72" y1="120" x2="340" y2="120" stroke="#dc2626" stroke-width="2" marker-end="url(#arrow-red)" stroke-dasharray="5,3"/>`;
      svg += `<text x="200" y="110" text-anchor="middle" font-size="9" fill="#6b7280">直线运球路线</text>`;
    }
    // 教练在终点
    svg += `<rect x="340" y="108" width="20" height="20" fill="#dc2626" stroke="white" stroke-width="2" rx="3"/>`;
    svg += `<text x="350" y="122" text-anchor="middle" font-size="10" fill="white" font-weight="bold">教</text>`;
    // 排面训练示意图
    const rows = 3;
    const cols = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = 70 + c * 70;
        const y = 80 + r * 50;
        const num = r * cols + c + 1;
        svg += `<circle cx="${x}" cy="${y}" r="12" fill="#2563eb" stroke="white" stroke-width="2"/>`;
        svg += `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="11" fill="white" font-weight="bold">${num}</text>`;
      }
    }
    // 教练在前方
    svg += `<rect x="185" y="30" width="20" height="20" fill="#dc2626" stroke="white" stroke-width="2"/>`;
    svg += `<text x="195" y="43" text-anchor="middle" font-size="10" fill="white" font-weight="bold">教</text>`;
  } else if (formType.includes('依次')) {
    // 依次训练（纵队）
    // 教练位置
    svg += `<rect x="190" y="40" width="20" height="20" fill="#dc2626" stroke="white" stroke-width="2"/>`;
    svg += `<text x="200" y="53" text-anchor="middle" font-size="10" fill="white" font-weight="bold">教</text>`;
    // 学员纵队
    for (let i = 0; i < 6; i++) {
      const y = 100 + i * 30;
      svg += `<circle cx="200" cy="${y}" r="12" fill="#2563eb" stroke="white" stroke-width="2"/>`;
      svg += `<text x="200" y="${y + 5}" text-anchor="middle" font-size="11" fill="white" font-weight="bold">${i + 1}</text>`;
      if (i > 0) {
        svg += `<line x1="200" y1="${y - 18}" x2="200" y2="${y - 12}" stroke="#6b7280" stroke-width="1" marker-end="url(#arrow-blue)"/>`;
      }
    }
  } else {
    // 集体训练示意图 - 教练在前，学员在后成半圆
    // 教练位置
    svg += `<rect x="190" y="80" width="20" height="20" fill="#dc2626" stroke="white" stroke-width="2"/>`;
    svg += `<text x="200" y="93" text-anchor="middle" font-size="10" fill="white" font-weight="bold">教</text>`;
    // 学员半圆形排列
    for (let i = 0; i < 8; i++) {
      const angle = (i / 7) * Math.PI - Math.PI / 2; // -90度到+90度的半圆
      const x = 200 + Math.cos(angle) * 100;
      const y = 180 + Math.sin(angle) * 60;
      svg += `<circle cx="${x}" cy="${y}" r="12" fill="#2563eb" stroke="white" stroke-width="2"/>`;
      svg += `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="11" fill="white" font-weight="bold">${i + 1}</text>`;
    }
  }

  // 添加图例
  svg += `<g transform="translate(280, 250)">
    <text x="0" y="0" font-size="10" fill="#374151" font-weight="bold">图例：</text>
    <circle cx="25" cy="-3" r="4" fill="#2563eb"/><text x="32" y="0" font-size="9" fill="#374151">学员</text>
    <rect x="55" y="-7" width="8" height="8" fill="#dc2626"/><text x="66" y="0" font-size="9" fill="#374151">教练</text>
    <circle cx="90" cy="-3" r="2" fill="#ea580c"/><text x="95" y="0" font-size="9" fill="#374151">球</text>
  </g>`;

  // 组织形式标签
  svg += `<text x="200" y="288" text-anchor="middle" font-size="11" fill="#6b7280" font-weight="500">${formType}</text>`;

  svg += `</svg>`;

  return svg;
}

// 修复常见JSON格式问题
function fixJsonString(jsonStr: string): string {
  let fixed = jsonStr;

  // 1. 处理未转义的换行符在字符串值内
  fixed = fixed.replace(/:\s*"([^"]*?)"/g, (match, content) => {
    // 如果内容包含未转义的换行，替换它们
    if (content.includes('\n') && !content.includes('\\n')) {
      return ': "' + content.replace(/\n/g, '\\n') + '"';
    }
    return match;
  });

  // 2. 处理SVG内容中可能的问题字符（但保留完整SVG）
  // 找到SVG标签并保护它们不被修改
  const svgMatches = fixed.match(/<svg[\s\S]*?<\/svg>/g) || [];
  const svgPlaceholders = svgMatches.map((svg, i) => `__SVG_PLACEHOLDER_${i}__`);

  svgMatches.forEach((svg, i) => {
    fixed = fixed.replace(svg, svgPlaceholders[i]);
  });

  // 3. 移除可能的尾随逗号
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

  // 4. 恢复SVG内容
  svgPlaceholders.forEach((placeholder, i) => {
    fixed = fixed.replace(placeholder, svgMatches[i]);
  });

  return fixed;
}

// 验证和修正整个教案
function validateAndFixPlan(plan: AIResult, duration: number): AIResult {
  const fixed = { ...plan };
  const sections = (fixed.segments || fixed.sections || []) as unknown as AISection[];

  // 验证所有节次的活动
  sections.forEach((section: AISection, sectionIndex: number) => {
    const activities = section.activities || [];

    // ===== 全局强制规则 =====

    // 规则1：慢跑时间强制≤3分钟（适用于所有节次）
    activities.forEach((a: AIActivity) => {
      if (a.name && (a.name.includes('慢跑') || a.name.includes('跑步'))) {
        if (a.duration > 3) {
          console.warn(
            `⚠️ [第${sectionIndex + 1}节] 慢跑"${a.name}"时间${a.duration}分钟，强制调整为3分钟`
          );
          a.duration = 3;
        }
      }
    });

    // 规则2：第一节活动顺序强制检查
    if (sectionIndex === 0) {
      const firstSectionTotal = activities.reduce(
        (sum: number, a: AIActivity) => sum + (a.duration || 0),
        0
      );
      if (firstSectionTotal > 30) {
        console.warn(`⚠️ 第一节总时长${firstSectionTotal}分钟，超过30分钟限制，按比例压缩`);
        const ratio = 30 / firstSectionTotal;
        activities.forEach((a: AIActivity) => {
          a.duration = Math.max(1, Math.round(a.duration * ratio));
        });
      }
    }

    // 规则3：修正所有活动的缺失字段
    section.activities = activities.map((activity: AIActivity, activityIndex: number) => {
      let category = 'general';
      if (activity.name) {
        if (activity.name.includes('礼仪')) category = 'etiquette';
        else if (activity.name.includes('慢跑')) category = 'warmup_jog';
        else if (activity.name.includes('拉伸') || activity.name.includes('伸展'))
          category = 'dynamic_stretch';
        else if (activity.name.includes('协调')) category = 'coordination';
        else if (activity.name.includes('球性')) category = 'ball_familiarity';
        else if (
          activity.name.includes('运球') ||
          activity.name.includes('传球') ||
          activity.name.includes('投篮')
        )
          category = 'technical';
        else if (activity.name.includes('比赛') || activity.name.includes('对抗'))
          category = 'game';
        else if (activity.name.includes('放松') || activity.name.includes('拉伸'))
          category = 'cooldown';
      }

      return validateAndFixActivity(activity, category, sectionIndex, sections);
    });
  });

  // 确保trainingProgression字段存在且包含完整的前后关联说明
  const progression = fixed.trainingProgression as string | undefined;
  if (!progression || progression.length < 50) {
    fixed.trainingProgression = generateTrainingProgression(sections);
  }

  return fixed;
}

// 生成完整的trainingProgression说明（前后关联）
function generateTrainingProgression(sections: AISection[]): string {
  // 分析各节内容，找出重点训练技能
  const warmupActivities = sections[0]?.activities || [];
  const technicalActivities =
    sections.find(s => s.name === '第二节')?.activities ||
    sections.find(s => s.category === 'technical')?.activities ||
    [];
  const gameActivities =
    sections.find(s => s.name === '第三节')?.activities ||
    sections.find(s => s.category === 'game')?.activities ||
    [];

  // 从活动名称中提取重点技能
  const getSkillFromActivity = (name: string): string => {
    if (name.includes('运球')) {
      if (name.includes('变向')) return '体前变向运球';
      if (name.includes('胯下')) return '胯下运球';
      if (name.includes('转身')) return '转身运球';
      return '运球';
    }
    if (name.includes('传球')) {
      if (name.includes('胸前')) return '双手胸前传球';
      if (name.includes('击地')) return '击地传球';
      return '传球';
    }
    if (name.includes('投篮') || name.includes('上篮')) {
      if (name.includes('三步')) return '三步上篮';
      return '投篮';
    }
    if (name.includes('防守')) return '防守';
    return '篮球技能';
  };

  // 找出重点技能（从技术训练或对抗比赛中找）
  let mainSkill = '篮球技能';
  if (technicalActivities.length > 0) {
    mainSkill = getSkillFromActivity(technicalActivities[0].name);
  } else if (gameActivities.length > 0) {
    mainSkill = getSkillFromActivity(gameActivities[0].name);
  }

  // 找出热身中的相关动作
  const warmupSkillActions = warmupActivities
    .filter(
      (a: AIActivity) => a.name.includes('运球') || a.name.includes('传球') || a.name.includes('球性')
    )
    .map((a: AIActivity) => a.name)
    .slice(0, 2);

  // 生成递进式说明
  let progression = `本节课重点训练${mainSkill}，递进式设计为：`;

  // 热身环节
  if (warmupSkillActions.length > 0) {
    progression += `\n1. 热身环节：通过${warmupSkillActions.join('、')}（基础动作），让学员熟悉球性和基本动作要领，为正式训练做准备；`;
  } else {
    progression += `\n1. 热身环节：通过动态伸展和球性练习（基础动作），活动身体关节，熟悉球性；`;
  }

  // 正式训练
  if (technicalActivities.length > 0) {
    const techActions = technicalActivities
      .slice(0, 2)
      .map((a: AIActivity) => a.name)
      .join('、');
    progression += `\n2. 正式训练：进行${techActions}（标准技术动作），掌握正确的技术规范和动作要领；`;
  } else {
    progression += `\n2. 正式训练：进行${mainSkill}的标准动作练习，掌握技术规范；`;
  }

  // 对抗比赛
  if (gameActivities.length > 0) {
    const gameDesc =
      gameActivities[0].name.includes('3v3') || gameActivities[0].name.includes('4v4')
        ? '小场地对抗比赛'
        : '实战对抗';
    progression += `\n3. 对抗比赛：在${gameDesc}中实战应用${mainSkill}，提升在比赛情境下的运用能力和实战技巧。`;
  } else {
    progression += `\n3. 对抗比赛：在实战对抗中运用${mainSkill}，提升实战应用能力。`;
  }

  progression += `\n实现从基础熟悉→标准掌握→实战应用的完整递进链条，帮助学员循序渐进地掌握技能。`;

  return progression;
}

// ============================================================
// 三段式教案结构（优化版：每30分钟一节）
// 第一节（30分钟）：准备热身部分（礼仪→慢跑≤3分钟→动态伸展→协调性→球性）
// 第二节（duration-60分钟）：正式训练部分
// 第三节（30分钟）：对抗比赛 + 放松
// ============================================================

function generateSegmentStructure(duration: number): Array<{
  name: string;
  minutes: number;
  categories: string[];
  description: string;
}> {
  const first = 30;
  const last = 30;
  const middle = Math.max(30, duration - first - last);

  return [
    {
      name: '第一节',
      minutes: first,
      categories: [
        'etiquette',
        'warmup_jog',
        'dynamic_stretch',
        'coordination',
        'ball_familiarity',
      ],
      description: '准备热身：课前礼仪 → 慢跑热身（≤3分钟） → 动态伸展 → 身体协调性 → 球性熟悉',
    },
    {
      name: '第二节',
      minutes: middle,
      categories: ['technical', 'physical', 'tactical'],
      description: '正式训练：技术训练 → 体能训练 → 战术训练（根据skillLevel调整难度，递进式设计）',
    },
    {
      name: '第三节',
      minutes: last,
      categories: ['game', 'cooldown'],
      description: '对抗比赛 + 放松总结',
    },
  ];
}

// U10三级版说明（大幅细化，参考2023暑期教案真实标准）
const u10LevelGuide: Record<string, string> = {
  基础: '初次接触篮球，以模仿、游戏为主。运球：原地高/低运球、单手左右拉球。传球：双手胸前传接球（近距离）。投篮：无球投篮脚步模仿、近筐投篮。体能：模仿秀游戏、基础跳跃。无对抗比赛，以趣味游戏代替。',
  进阶: '有一定篮球基础。运球：行进间运球、体前变向运球、运双球训练。传球：行进间传接球、击地传球。投篮：三步上篮脚步+持球上篮、基础投篮训练。体能：绳梯训练、行进间协调。有小规模分组对抗（2v2/3v3）。',
  精英: '技术较成熟，接近比赛水平。运球：组合运球（体前变向+胯下+背后）、运球突破衔接上篮。传球：快攻传接球、行进间不停球传球。投篮：接球投篮、运球急停跳投、三威胁衔接投篮。防守：人球兼顾选位、防有球/无球。正式全场对抗（3v3/4v4/5v5），强调比赛规则和战术配合。',
};

// 生成Prompt
function generatePrompt(
  params: AIPlanParams,
  cases: LessonPlan[],
  playerAnalysis?: string
): string {
  const ageGroupInfo: Record<string, string> = {
    U6: '4-6岁幼儿班，注意力短暂，以游戏为主培养球性和兴趣。每个动作不超过3分钟，多重复少讲解。热身用模仿秀（木头人、动物爬行），运球只做原地高低运球和拉球，投篮只做无球脚步模仿。对抗用投篮小游戏、接力赛代替。教练多鼓励、多击掌。',
    U8: '7-8岁小学低年级，可进行基础技术训练。运球：行进间运球、基础体前变向、运双球。传球：双手胸前传球、击地传球。投篮：三步上篮脚步+持球上篮。体能：绳梯、侧滑步。有少量对抗（2v2），重点培养基本功和比赛兴趣。',
    U10: '9-10岁小学中年级，技术规范化，开始体能训练。运球：体前变向、胯下运球、运双球。传球：行进间传接球、移动传球。投篮：接球上篮、基础投篮训练。体能：绳梯进阶、敏捷梯。有正式对抗（3v3），强调规则和基础战术配合。',
    U12: '11-12岁小学高年级，接近比赛水平。运球：组合运球（体前+胯下+背后）、运球突破。传球：快攻传球、行进间不停球传球。投篮：急停投篮、接球投篮、三威胁衔接。防守：防有球/无球、人球兼顾。正式全场对抗（4v4/5v5），有战术配合和位置训练。',
    U14: '13-14岁初中，接近成人比赛。全面技术：四项组合运球、运球衔接突破上篮/急停投篮、全场快攻、半场阵地战术、1v1-5v5对抗。体能：自重力量训练+专项体能。防守：全场紧逼、半场联防/人盯人。强度高、时间长的正式比赛。',
  };

  const segments = generateSegmentStructure(params.duration);
  const isU10 = params.group === 'U10';
  const levelLabel =
    isU10 && params.skillLevel
      ? params.skillLevel === 'beginner'
        ? '基础'
        : params.skillLevel === 'intermediate'
          ? '进阶'
          : '精英'
      : '';

  // RAG 案例整理
  const casesText =
    cases.length > 0
      ? cases
          .map(
            (c, i) =>
              `案例${i + 1} [${c.age_group} ${c.class_level} ${c.month}] ${c.section}-${c.part}: ${c.method}（要点：${c.key_points}）`
          )
          .join('\n')
      : '';

  // 难度级别描述（U10三级版）
  const levelDesc = isU10
    ? `\n## U10级别说明（${levelLabel}）\n${u10LevelGuide[levelLabel] || ''}\n`
    : '';

  // 训练节次结构
  const segmentDesc = segments
    .map(s => `- ${s.name}（${s.minutes}分钟）：${s.description}`)
    .join('\n');

  return `你是一位专业的篮球青训教练，请根据以下要求生成篮球训练教案。

## 学员信息
- 年龄段：${params.group}（${ageGroupInfo[params.group] || ''}）
- 训练时长：${params.duration}分钟（分为三节：前30分钟准备热身，中间正式训练，后30分钟对抗比赛）
- 训练场地：${params.location}
- 天气：${params.weather || '未指定'}
- 学员人数：${params.playerCount || '8-12'}人${levelDesc}
${playerAnalysis ? `\n## 参训学员技能分析（重要 - 根据此分析调整训练重点）\n${playerAnalysis}` : ''}

## 训练节次结构
${segmentDesc}

## 训练要求
- 训练主题：${params.theme || '根据年龄段特点自动确定'}${params.theme && params.theme.includes('+') ? '\n（教练选择了多个主题，教案中需要同时覆盖这些主题的训练内容，可以将不同主题分配到不同时间段或进行组合训练）' : ''}
- 重点训练技能：${params.focusSkills?.join('、') || '根据年龄段特点自动确定'}
- 技能水平：${isU10 ? levelLabel + '（' + u10LevelGuide[levelLabel] + '）' : params.skillLevel || 'intermediate'}
${params.previousTraining?.length ? `- 最近训练内容：${params.previousTraining.join('、')}（避免重复或进阶）` : ''}
${params.additionalNotes ? `- 教练特别要求（必须严格执行）：${params.additionalNotes}\n（以上要求是教练明确的训练需求，必须在教案中完整体现，不能忽略！\n如果教练要求"运球和传球结合"，则教案中必须有运球传球结合的练习！）` : ''}

${casesText ? `## 参考案例（来自真实教学数据）\n${casesText}\n` : ''}

## 输出格式（严格JSON）
{
  "title": "教案标题（包含年龄段、主题、级别）",
  "theme": "训练主题",
  "objective": "训练目标（1-2句话）",
  "level": "${isU10 ? levelLabel : 'N/A'}",
  "intensity": "low/medium/high",
  "segments": [
    {
      "name": "第一节",
      "duration": 30,
      "activities": [
        {
          "name": "活动名称（必须精确，如'右手原地高低运球'）",
          "duration": 5,
          "form": "组织形式（必须具体：集体/分组（几人一组）/排面（几排）/依次（轮流））",
          "description": "【列队】【位置】【动作】用简洁专业的中文描述。例如："【列队】所有学员排成一路纵队。【位置】围绕篮球场慢跑。【动作】保持均匀速度，绕场慢跑1-2圈。"",
          "keyPoints": ["要点1", "要点2"],
          "sets": "2-3组（必须填写具体组数）",
          "repetitions": "每组8-10次或30秒（必须填写具体次数或时间）",
          "progression": "从易到难的3个层次：1.基础动作（简单模仿）→ 2.进阶动作（增加难度）→ 3.挑战动作（组合运用）（必须明确写出3个层次）",
          "equipment": ["器材（如有）"],
          "drillDiagram": "<svg>...</svg> 动作路线示意图（必须包含：学员圆圈+编号蓝色、教练方块红色、球橙色圆点、箭头路线）",
          "relatedTo": "关联说明（可选）：如果是热身环节的基础动作，说明为后面的哪个技术训练做准备。例如："为后面的行进间体前变向运球做准备""
}
      ],
      "points": ["本节要点1", "本节要点2"]
    },
    {
      "name": "第二节",
      "duration": segments[1].minutes,
      "activities": [...],
      "points": [...]
    },
    {
      "name": "第三节",
      "duration": 30,
      "activities": [...],
      "points": [...]
    }
  ],
  "notes": "安全注意事项",
  "trainingProgression": "整体递进关系说明：热身中的基础动作在正式训练中如何进阶（必须明确写出前后关联）"
}

## 关键要求（严格按照以下5点执行）

### 1. 第一节顺序要求（重点⚠️）
**必须按此顺序生成4-5个活动，严格按照标注的时间：**
1. **课前礼仪**（2分钟）：集合、点名、讲解本节课内容
2. **慢跑热身**（严格≤3分钟，duration必须设为2或3）：绕场慢跑1-2圈，最多3分钟，绝对不能超过3分钟。此条为硬性规则，违反将导致教案作废。
3. **动态伸展**（5-8分钟）：**必须将每个拉伸动作单独列为一个活动！** 不要笼统写"依次进行肩关节、髋关节拉伸"。
   每个拉伸动作必须包含：具体动作名称（如"直腿摸脚尖""前抱腿""后提拉腿""提膝外展"等）、详细的姿势描述、行进间还是原地。
   示例（参考真实教案格式）：
   - 活动1（2分钟）：直腿摸脚尖 — 行进间 — 【姿势】跨出一步脚跟落地脚尖翘起 — 【动作】双手碰触前脚尖交替进行 — 【次数】底线至中线2趟 — 【要点】增强协调能力、拉伸大腿后侧
   - 活动2（2分钟）：前抱腿 — 行进间 — 【姿势】十指交叉抱膝盖 — 【动作】向上提拉交替进行 — 【次数】每条腿10次 — 【要点】增强单腿稳定性、拉伸大腿肌肉
   - 活动3（2分钟）：后提拉腿 — 行进间 — 【姿势】身体直立 — 【动作】身后抓住脚踝向上提拉 — 【次数】每条腿10次 — 【要点】拉伸大腿前侧
   - 活动4（2分钟）：提膝外展 — 原地 — 【姿势】单脚站立 — 【动作】提膝外展小跳交换进行 — 【次数】每侧8次×2组 — 【要点】增强髋关节稳定性
4. **身体协调性**（5-8分钟）：每个协调训练动作也要单独列出（如"双脚脚尖前后跳""小碎步变向""侧滑步"等），包含具体姿势、动作、次数
5. **球性熟悉**（8-10分钟）：原地运球、移动运球、球绕环等

### 2. 具体动作描述规范（核心改进⭐）
**每个动作必须包含以下6个要素，缺一不可：**

**⚠️ 重要：每个动作必须单独列为一个活动（activity），不能把多个动作合并成一条描述！**
- ❌ 错误："依次进行肩关节、髋关节、膝关节、踝关节的动态拉伸"
- ❌ 错误："球性熟悉：进行原地运球、行进间运球、球绕环等练习"
- ✅ 正确：每个拉伸动作单独一个activity（如"直腿摸脚尖""前抱腿""后提拉腿"）
- ✅ 正确：每个球性动作单独一个activity（如"右手原地高低运球""三绕环""单手左右地滚球"）

**【姿势】** - 身体各部位的具体位置和状态
- 示例1："膝盖微屈，重心降低，略微前倾，眼睛看前方"
- 示例2："双脚与肩同宽站立，左脚在前右脚在后"
- 示例3："右手持球于胸前，手腕放松，手肘自然下垂"

**【动作】** - 具体的操作细节
- 示例1："右手在体侧运球，高度在膝盖到腰部之间"
- 示例2："迈左脚向前跨出，同时右手放球，蹬地起跳"
- 示例3："左手接球后，向左跨步，身体半转身"

**【发力】** - 哪个手/脚/身体部位发力
- 示例1："右手发力按拍球，左手辅助控制方向"
- 示例2："右脚蹬地发力，左脚向前跨步"
- 示例3："手腕下压，手指拨球"

**【时间/次数】** - 明确的组数、次数、时间
- 示例："每组30秒×2组，组间休息15秒"
- 示例："每组10次×3组"

**【形式】** - 原地/行进间/队列/分组
- 示例："原地进行"
- 示例："排面（3排，每排4人）"
- 示例："分组（2人一组，依次进行）"

**【要点目的】** - 这个动作要训练什么、培养什么能力
- 示例1："强化手腕力量和球性熟悉度"
- 示例2："培养手脚协调性和节奏感"
- 示例3："建立正确的投篮手型"

**❌ 错误示例（太笼统）：**
"球性熟悉：进行原地运球、行进间运球、球绕环等练习"

**✅ 正确示例（详细具体）：**
"右手原地高低运球：
【姿势】双脚与肩同宽，膝盖微屈，重心降低，右手持球于体侧
【动作】右手在体侧运球，球高过膝盖但不高于腰部，眼睛看前方
【发力】右手手腕下压，手指控制球的方向和力度
【次数】每组30秒×3组，组间休息15秒
【形式】原地进行
【要点目的】强化手腕力量，建立正确的运球手型，熟悉球性"

### 3. 组数、次数、递进式要求
**每个练习必须包含：**
- **组数**："2-3组"
- **次数/时间**："每组30秒"或"每组8-10次"
- **递进式设计**：明确写出从易到难的3个层次
  - 示例：
    - 基础：原地高低运球（熟悉球性）
    - 进阶：行进间直线运球（结合脚步）
    - 挑战：行进间变向运球（增加难度）

### 4. 场地图生成要求（核心改进⭐）
**如果是半场/全场训练，必须生成标准篮球场地图！**

**标准篮球半场SVG结构（必须包含的元素）：**
- 场地边界：矩形边框
- 三分线：弧线
- 罚球线：短线
- 罚球圈：圆弧
- 篮筐：圆圈+支架
- 合理冲撞区：小的弧线
- 中线（全场）：中间直线
- 颜色：灰色线条，浅色填充

**标准篮球场图将自动生成，无需手动绘制**

**根据训练类型选择场地图：**
- 运球训练：不需要完整场地，用简化图
- 传球训练：需要2人站位图
- 投篮训练：需要带篮筐的半场图
- 对抗比赛：必须用标准半场/全场图

**半场训练场地标注要求：**
- 标注站位点（用数字圆圈）
- 标注投篮位置
- 标注移动路线（箭头）
- 标注防守位置（可选）


### 5. 前后关联要求（重点 - 必须严格执行）
**递进式设计：从热身到训练的完整关联链条**

**基本原则：今天的重点训练内容，必须在热身环节有体现**

**递进式结构（必须包含3个层次）：**
1. **热身环节（基础动作）**：在球性熟悉或动态伸展中，加入当天重点训练的基础版本
   - 示例：如果重点是"体前变向运球"
   - 热身球性：原地体前左右手交替运球（熟悉球性，基础变向）
   - 热身动态伸展：持球体前绕环（活动肩关节，为变向做准备）

2. **正式训练（标准动作）**：技术训练环节的标准练习
   - 示例：行进间体前变向运球（标准变向动作）
   - 增加难度：Z字形体前变向（增加移动和障碍）

3. **对抗比赛（实战应用）**：在实战情境中运用该技能
   - 示例：3v3对抗中的体前变向突破（实战应用）
   - 综合运用：结合其他技能的完整进攻

**具体关联示例：**

**示例1：重点训练 = 体前变向运球**
- 热身-球性熟悉：原地体前左右手交替运球（2组×30秒）→ **relatedTo字段填写："为后面的行进间体前变向运球做准备"**
- 热身-动态伸展：持球体前绕环（1组×10次）
- 技术训练：行进间体前变向运球（3组×20米）
- 技术训练：Z字形体前变向过障碍（3组）
- 对抗比赛：3v3实战，强调体前变向突破（10分钟）

**示例2：重点训练 = 双手胸前传球**
- 热身-球性熟悉：原地抛接球（2组×10次）→ **relatedTo字段填写："为后面的两人一组双手胸前传球做准备"**
- 技术训练：两人一组双手胸前传球（3组×20次）
- 技术训练：移动中双手胸前传球（3组×5分钟）
- 战术训练：二打一配合，重点传球时机（10分钟）
- 对抗比赛：4v4比赛，统计成功传球次数（15分钟）

**示例3：重点训练 = 三步上篮**
- 热身-动态伸展：弓步半转体（活动髋关节，模拟上篮脚步）→ **relatedTo字段填写："为后面的三步上篮脚步练习做准备"**
- 技术训练：原地三步上篮脚步练习（无球，3组×10次）
- 技术训练：持球三步上篮（3组×5次）
- 技术训练：运球三步上篮（3组×5次）
- 对抗比赛：快攻三步上篮实战（10分钟）

**relatedTo字段使用规则（重要）：**
- **仅在热身环节的基础动作中使用**
- **格式**："为后面的【具体技术训练名称】做准备"
- **示例**：如果热身是"原地体前左右手交替运球"，后面技术训练有"行进间体前变向运球"，则填写："为后面的行进间体前变向运球做准备"
- **作用**：让教练和学员清楚理解热身动作的目的，建立完整关联链条

**trainingProgression字段必须包含（严格格式）：**
本节课重点训练【技能名称】，递进式设计为：
1. 热身环节：通过【具体热身动作】（基础版本），让学员熟悉动作要领和球性；
2. 正式训练：进行【具体技术训练】（标准动作），掌握正确技术规范；
3. 对抗比赛：在【具体对抗形式】中实战应用，提升比赛中的运用能力。
实现从基础熟悉→标准掌握→实战应用的完整递进链条。

### 其他要求
1. 活动描述只写【队形】【位置】【具体动作】，不要教练引导语
2. 每节包含2-4个活动，总时长严格=${params.duration}分钟
3. 队形描述使用：排面/列队/分组/圆形/菱形/方形等
4. ${params.location === '室外' && params.weather === '雨天' ? '雨天室外注意安全，可改为室内或减少对抗环节' : ''}
${casesText ? '5. 参考案例库的训练方法格式' : ''}
6. **年龄段差异化（必须严格执行）**：
   - U6：动作数量少（每节2-3个）、时间短（每个2-3分钟）、游戏化（加游戏名称如"木头人""模仿秀"）、无对抗、以模仿和趣味为主
   - U8：动作数量适中（每节3-4个）、基础技术为主（行进间运球、体前变向、胸前传球、三步上篮）、少量2v2对抗
   - U10/U12：动作数量多（每节4-5个）、技术难度高（胯下/背后运球、接球投篮、急停跳投）、正式3v3/4v4对抗、有战术配合
   - U14：高强度、长时间、成人化训练（全场快攻、联防/盯人、体能力量训练、5v5全场对抗）
   **不同年龄段不能生成相同或相似的动作和强度！**
${params.additionalNotes ? `\n7. **教练特别要求必须完全遵守**：${params.additionalNotes}。这是教练明确的训练需求，必须在教案中完整体现！\n   - 如果要求"A和B结合"，则必须有A和B结合的练习\n   - 如果要求"增加某项内容"，则必须加入该内容\n   - 如果要求"减少某项内容"，则必须减少或取消\n   - 违反教练要求=教案不合格` : ''}
`.trim();
}

// 调用 AI API（通用函数，支持 Kimi 和 MiniMax）
async function callAIAPI(
  apiKey: string,
  apiUrl: string,
  model: string,
  prompt: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  const systemPrompt =
    '你是一位专业的篮球青训教练，擅长根据不同年龄段学员的特点设计科学、有趣、有效的训练教案。请严格按照要求的JSON格式输出教案内容。';

  const postData = JSON.stringify({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 8000,
  });

  return new Promise(resolve => {
    const url = new URL(apiUrl);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData),
      },
      agent: new https.Agent({ rejectUnauthorized: false }),
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            const content = jsonData.choices?.[0]?.message?.content;
            if (content) {
              resolve({ success: true, content });
            } else {
              resolve({ success: false, error: 'AI返回内容为空' });
            }
          } catch (e) {
            resolve({ success: false, error: '解析AI响应失败' });
          }
        } else {
          try {
            const errData = JSON.parse(data);
            resolve({
              success: false,
              error: errData.error?.message || `HTTP ${res.statusCode}`,
            });
          } catch {
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
          }
        }
      });
    });

    req.on('error', e => {
      resolve({ success: false, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const params: AIPlanParams = await request.json();

    // 获取 API 配置
    // 主要: Kimi (Moonshot)
    const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
    // 备用: MiniMax
    const MINIMAX_API_KEY =
      process.env.MINIMAX_API_KEY || process.env.NEXT_PUBLIC_MINIMAX_API_KEY || '';

    // RAG: 检索相似案例
    // keyword 合并 theme 和 focusSkills，category 留空让 keyword 全局搜索
    const searchKeyword = [params.theme, ...(params.focusSkills || [])].filter(Boolean).join(' ');
    const similarCases = retrieveSimilarCases({
      ageGroup: params.group,
      keyword: searchKeyword || undefined,
      limit: 5,
    });

    // 调试日志：输出检索到的案例
    console.log('=== RAG 案例检索 ===');
    console.log('检索参数:', {
      ageGroup: params.group,
      keyword: params.theme,
      category: params.focusSkills?.[0],
    });
    console.log('检索到案例数:', similarCases.length);
    similarCases.forEach((c, i) => {
      console.log(`案例${i + 1}: [${c.age_group} ${c.tech_type}] ${c.method?.substring(0, 80)}...`);
    });
    console.log('====================');

    // 智能短板分析：如果有选中学员，分析其技能数据
    let playerAnalysisText: string | undefined;
    if (params.playerIds && params.playerIds.length > 0) {
      const analysis = await analyzePlayerWeaknesses(params.playerIds);
      if (analysis.playerCount > 0) {
        playerAnalysisText = analysis.weaknessText;
        console.log('=== 学员技能分析 ===');
        console.log(playerAnalysisText);
        console.log('====================');

        // 如果教练没指定 focusSkills，自动从短板中提取
        if (!params.focusSkills || params.focusSkills.length === 0) {
          const weaknessSkills = Object.entries(analysis.avgScores)
            .filter(([, score]) => score < 6)
            .sort(([, a], [, b]) => a - b)
            .slice(0, 3)
            .map(([skill]) => SKILL_LABELS[skill])
            .filter(Boolean);
          if (weaknessSkills.length > 0) {
            params.focusSkills = weaknessSkills;
            console.log('自动提取短板作为重点训练技能:', weaknessSkills);
          }
        }
      }
    }

    const prompt = generatePrompt(params, similarCases, playerAnalysisText);

    // 优先使用 Kimi
    if (KIMI_API_KEY) {
      const kimiResult = await callAIAPI(
        KIMI_API_KEY,
        'https://api.moonshot.cn/v1/chat/completions',
        'moonshot-v1-8k',
        prompt
      );

      if (kimiResult.success && kimiResult.content) {
        // 解析并返回
        const jsonContent = kimiResult.content
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();

        let aiResult: AIResult;
        try {
          aiResult = JSON.parse(jsonContent);
        } catch (parseError) {
          console.error('JSON解析失败，尝试修复:', parseError);
          // 尝试修复常见的JSON问题
          const fixedJson = fixJsonString(jsonContent);
          try {
            aiResult = JSON.parse(fixedJson);
          } catch (二次ParseError) {
            console.error('二次JSON解析失败:', 二次ParseError);
            console.error('原始内容前200字符:', jsonContent.substring(0, 200));
            console.error('原始内容最后200字符:', jsonContent.substring(jsonContent.length - 200));
            return NextResponse.json(
              {
                success: false,
                error: 'AI返回内容解析失败，请重试。错误: ' + (二次ParseError as Error).message,
              },
              { status: 500 }
            );
          }
        }

        // 验证并修正AI生成的数据
        const validatedResult = validateAndFixPlan(aiResult, params.duration);

        const planOutput: TrainingPlanOutput = {
          title: validatedResult.title,
          date: new Date().toISOString().split('T')[0],
          duration: params.duration,
          group: params.group as 'U6' | 'U8' | 'U10' | 'U12' | 'U14',
          location: params.location as '室内' | '室外',
          weather: params.weather,
          theme: validatedResult.theme,
          focusSkills: params.focusSkills || [],
          intensity: validatedResult.intensity as 'low' | 'medium' | 'high',
          skillLevel: params.skillLevel || 'intermediate',
          // 兼容 segments（新三段式）和 sections（旧格式）
          sections: (validatedResult.segments || validatedResult.sections || []).map(
            (seg: unknown) => {
              const s = seg as Record<string, unknown>;
              return {
                ...s,
                // 移除 coachGuide 字段（不再展示）
                activities: (s.activities as unknown[] | undefined)?.map((act: unknown) => {
                  const { coachGuide, ...rest } = act as Record<string, unknown>;
                  return rest;
                }),
              };
            }
          ) as unknown as PlanSection[],
          notes: validatedResult.notes,
          trainingProgression: validatedResult.trainingProgression,
        };

        // 返回结果（支持调试模式）
        const response: APIResponse = { success: true, plan: planOutput };

        // 如果是调试模式，返回检索到的案例
        if (params.debug) {
          response.debug = {
            totalPlansInDb: allPlans.length,
            keyword: searchKeyword,
            matched: similarCases,
          };
        }

        return NextResponse.json(response);
      }

      console.log('Kimi API 失败，尝试 MiniMax:', kimiResult.error);
    }

    // 备用: 使用 MiniMax
    if (MINIMAX_API_KEY) {
      const miniMaxResult = await callAIAPI(
        MINIMAX_API_KEY,
        'https://api.minimax.chat/v1/text/chatcompletion_v2',
        'MiniMax-Text-01',
        prompt
      );

      if (miniMaxResult.success && miniMaxResult.content) {
        const jsonContent = miniMaxResult.content
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        const aiResult = JSON.parse(jsonContent);

        // 验证并修正AI生成的数据
        const validatedResult = validateAndFixPlan(aiResult, params.duration);

        const planOutput: TrainingPlanOutput = {
          title: validatedResult.title,
          date: new Date().toISOString().split('T')[0],
          duration: params.duration,
          group: params.group as 'U6' | 'U8' | 'U10' | 'U12' | 'U14',
          location: params.location as '室内' | '室外',
          weather: params.weather,
          theme: validatedResult.theme,
          focusSkills: params.focusSkills || [],
          intensity: validatedResult.intensity as 'low' | 'medium' | 'high',
          skillLevel: params.skillLevel || 'intermediate',
          // 兼容 segments（新三段式）和 sections（旧格式）
          sections: (validatedResult.segments || validatedResult.sections || []).map(
            (seg: unknown) => {
              const s = seg as Record<string, unknown>;
              return {
                ...s,
                // 移除 coachGuide 字段（不再展示）
                activities: (s.activities as unknown[] | undefined)?.map((act: unknown) => {
                  const { coachGuide, ...rest } = act as Record<string, unknown>;
                  return rest;
                }),
              };
            }
          ) as unknown as PlanSection[],
          notes: validatedResult.notes,
          trainingProgression: validatedResult.trainingProgression,
        };

        // 返回结果（支持调试模式）
        const response: APIResponse = { success: true, plan: planOutput };

        // 如果是调试模式，返回检索到的案例
        if (params.debug) {
          response.debug = {
            totalPlansInDb: allPlans.length,
            keyword: searchKeyword,
            matched: similarCases,
          };
        }

        return NextResponse.json(response);
      }

      return NextResponse.json(
        { success: false, error: `AI生成失败: ${miniMaxResult.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: '未配置 AI API 密钥，请联系管理员' },
      { status: 500 }
    );
  } catch (error) {
    console.error('AI生成教案失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: `AI生成教案失败: ${error instanceof Error ? error.message : '未知错误'}`,
      },
      { status: 500 }
    );
  }
}
