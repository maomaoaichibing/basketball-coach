import https from 'https';

import { NextRequest, NextResponse } from 'next/server';

import { TrainingPlanOutput, PlanSection } from '@/lib/plan-generator';
import { retrieveSimilarCases, allPlans, LessonPlan } from '@/lib/cases';

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
  // 调试参数：设为 true 时返回检索到的 RAG 案例
  debug?: boolean;
}

// AI返回结果接口
interface AIResult {
  title: string;
  theme: string;
  intensity: string;
  segments?: PlanSection[];
  sections?: PlanSection[];
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

  // 确保SVG图解存在且格式正确
  if (
    !fixed.drillDiagram ||
    fixed.drillDiagram === '<svg>...</svg>' ||
    !fixed.drillDiagram.includes('<svg') ||
    !fixed.drillDiagram.includes('xmlns="http://www.w3.org/2000/svg"')
  ) {
    // 生成默认SVG图解
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
function generateBasketballCourtSVG(isHalfCourt: boolean = true): string {
  let svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg" style="background-color: #f5f5f5;">`;

  if (isHalfCourt) {
    // 半场标准图
    svg += `
    <!-- 场地边框 -->
    <rect x="10" y="10" width="380" height="280" fill="#e8e8e8" stroke="#333" stroke-width="2"/>
    
    <!-- 三分线 -->
    <path d="M 10 40 Q 10 150, 70 150 L 10 150" fill="none" stroke="#333" stroke-width="2"/>
    <path d="M 390 40 Q 390 150, 330 150 L 390 150" fill="none" stroke="#333" stroke-width="2"/>
    
    <!-- 罚球圈 -->
    <circle cx="70" cy="150" r="35" fill="none" stroke="#333" stroke-width="2"/>
    <circle cx="330" cy="150" r="35" fill="none" stroke="#333" stroke-width="2"/>
    
    <!-- 罚球线 -->
    <line x1="35" y1="150" x2="105" y2="150" stroke="#333" stroke-width="2"/>
    <line x1="295" y1="150" x2="365" y2="150" stroke="#333" stroke-width="2"/>
    
    <!-- 篮板 -->
    <rect x="193" y="25" width="14" height="25" fill="#666"/>
    
    <!-- 篮筐 -->
    <circle cx="200" cy="55" r="18" fill="none" stroke="#ff6600" stroke-width="3"/>
    
    <!-- 合理冲撞区 -->
    <circle cx="200" cy="80" r="25" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="4,4"/>
    
    <!-- 中场线标记（用于全场提示） -->
    <line x1="10" y1="150" x2="30" y2="150" stroke="#999" stroke-width="1" stroke-dasharray="2,2"/>
    <line x1="370" y1="150" x2="390" y2="150" stroke="#999" stroke-width="1" stroke-dasharray="2,2"/>
    `;
  } else {
    // 全场标准图
    svg += `
    <!-- 场地边框 -->
    <rect x="10" y="10" width="780" height="380" fill="#e8e8e8" stroke="#333" stroke-width="2"/>
    
    <!-- 中线 -->
    <line x1="400" y1="10" x2="400" y2="390" stroke="#333" stroke-width="2"/>
    
    <!-- 中圈 -->
    <circle cx="400" cy="200" r="50" fill="none" stroke="#333" stroke-width="2"/>
    
    <!-- 左侧三分线 -->
    <path d="M 10 60 Q 10 200, 90 200 L 10 200" fill="none" stroke="#333" stroke-width="2"/>
    <path d="M 10 340 Q 10 200, 90 200 L 10 200" fill="none" stroke="#333" stroke-width="2"/>
    
    <!-- 右侧三分线 -->
    <path d="M 790 60 Q 790 200, 710 200 L 790 200" fill="none" stroke="#333" stroke-width="2"/>
    <path d="M 790 340 Q 790 200, 710 200 L 790 200" fill="none" stroke="#333" stroke-width="2"/>
    
    <!-- 左侧罚球区 -->
    <circle cx="90" cy="200" r="45" fill="none" stroke="#333" stroke-width="2"/>
    <line x1="45" y1="200" x2="135" y2="200" stroke="#333" stroke-width="2"/>
    
    <!-- 右侧罚球区 -->
    <circle cx="710" cy="200" r="45" fill="none" stroke="#333" stroke-width="2"/>
    <line x1="665" y1="200" x2="755" y2="200" stroke="#333" stroke-width="2"/>
    
    <!-- 左侧篮板篮筐 -->
    <rect x="43" y="175" width="10" height="20" fill="#666"/>
    <circle cx="50" cy="185" r="12" fill="none" stroke="#ff6600" stroke-width="2"/>
    
    <!-- 右侧篮板篮筐 -->
    <rect x="747" y="175" width="10" height="20" fill="#666"/>
    <circle cx="750" cy="185" r="12" fill="none" stroke="#ff6600" stroke-width="2"/>
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

  // 判断是否需要篮球场图
  const needsCourt =
    activityName.includes('投篮') ||
    activityName.includes('上篮') ||
    activityName.includes('三步') ||
    activityName.includes('对抗') ||
    activityName.includes('比赛') ||
    activityName.includes('进攻') ||
    activityName.includes('防守') ||
    activityName.includes('突破') ||
    activityName.includes('快攻');

  // 基础模板 - 包含箭头标记定义
  let svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg" style="background-color: white;">`;

  // 如果需要篮球场，先画场地
  if (needsCourt) {
    svg += generateBasketballCourtSVG(true);
  } else {
    // 简化的场地边框
    svg += `<rect x="10" y="10" width="380" height="280" stroke="#374151" fill="none" stroke-width="2" stroke-dasharray="5,5"/>`;
  }

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
  if (
    activityName.includes('投篮') ||
    activityName.includes('上篮') ||
    activityName.includes('三步')
  ) {
    // 投篮/上篮训练 - 在半场场地中显示投篮位置和路线
    // 投篮学员位置（罚球线附近）
    svg += `<circle cx="200" cy="150" r="12" fill="#2563eb" stroke="white" stroke-width="2"/>`;
    svg += `<text x="200" y="155" text-anchor="middle" font-size="11" fill="white" font-weight="bold">投</text>`;
    // 球在投篮位置
    svg += `<circle cx="200" cy="150" r="4" fill="#ea580c"/>`;
    // 投篮路线（向上到篮筐）
    svg += `<line x1="200" y1="145" x2="200" y2="70" stroke="#dc2626" stroke-width="2" marker-end="url(#arrow-red)" stroke-dasharray="5,3"/>`;
    // 篮筐
    svg += `<circle cx="200" cy="55" r="15" fill="none" stroke="#ff6600" stroke-width="2"/>`;
    // 辅助学员（捡球）
    svg += `<circle cx="260" cy="200" r="10" fill="#2563eb" stroke="white" stroke-width="2"/>`;
    svg += `<text x="260" y="204" text-anchor="middle" font-size="9" fill="white" font-weight="bold">捡</text>`;
    // 教练位置
    svg += `<rect x="100" y="100" width="18" height="18" fill="#dc2626" stroke="white" stroke-width="2"/>`;
    svg += `<text x="109" y="112" text-anchor="middle" font-size="9" fill="white" font-weight="bold">教</text>`;
  } else if (
    activityName.includes('对抗') ||
    activityName.includes('比赛') ||
    activityName.includes('3v3') ||
    activityName.includes('4v4')
  ) {
    // 对抗比赛 - 显示双方站位
    // 进攻方（3人）
    const attackX = [150, 200, 250];
    const attackY = [200, 150, 200];
    for (let i = 0; i < 3; i++) {
      svg += `<circle cx="${attackX[i]}" cy="${attackY[i]}" r="12" fill="#2563eb" stroke="white" stroke-width="2"/>`;
      svg += `<text x="${attackX[i]}" y="${attackY[i] + 5}" text-anchor="middle" font-size="11" fill="white" font-weight="bold">${i + 1}</text>`;
    }
    // 防守方（2人）
    const defendX = [175, 225];
    const defendY = [180, 180];
    for (let i = 0; i < 2; i++) {
      svg += `<circle cx="${defendX[i]}" cy="${defendY[i]}" r="12" fill="#dc2626" stroke="white" stroke-width="2"/>`;
      svg += `<text x="${defendX[i]}" y="${defendY[i] + 5}" text-anchor="middle" font-size="11" fill="white" font-weight="bold">防${i + 1}</text>`;
    }
    // 进攻路线
    svg += `<line x1="175" y1="195" x2="200" y2="100" stroke="#2563eb" stroke-width="2" marker-end="url(#arrow-blue)" stroke-dasharray="5,3"/>`;
    // 篮筐
    svg += `<circle cx="200" cy="55" r="15" fill="none" stroke="#ff6600" stroke-width="2"/>`;
  } else if (formType.includes('2人一组') || formType.includes('双人')) {
    // 双人训练示意图（如传球练习）
    // 学员1
    svg += `<circle cx="120" cy="150" r="12" fill="#2563eb" stroke="white" stroke-width="2"/>`;
    svg += `<text x="120" y="155" text-anchor="middle" font-size="11" fill="white" font-weight="bold">1</text>`;
    // 学员2
    svg += `<circle cx="280" cy="150" r="12" fill="#2563eb" stroke="white" stroke-width="2"/>`;
    svg += `<text x="280" y="155" text-anchor="middle" font-size="11" fill="white" font-weight="bold">2</text>`;
    // 传球路线
    svg += `<line x1="135" y1="150" x2="265" y2="150" stroke="#dc2626" stroke-width="2" marker-end="url(#arrow-red)" stroke-dasharray="5,3"/>`;
    // 球在中间
    svg += `<circle cx="200" cy="150" r="4" fill="#ea580c"/>`;
    // 教练指导位置
    svg += `<rect x="190" y="100" width="20" height="20" fill="#dc2626" stroke="white" stroke-width="2"/>`;
    svg += `<text x="200" y="113" text-anchor="middle" font-size="10" fill="white" font-weight="bold">教</text>`;
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
  } else if (formType.includes('排面')) {
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
  svg += `<text x="200" y="290" text-anchor="middle" font-size="11" fill="#6b7280" font-weight="500">${formType}</text>`;

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
function validateAndFixPlan(plan: any, duration: number): any {
  const fixed = { ...plan };
  const sections = fixed.segments || fixed.sections || [];

  // 验证所有节次的活动
  sections.forEach((section: any, sectionIndex: number) => {
    const activities = section.activities || [];

    // ===== 全局强制规则 =====

    // 规则1：慢跑时间强制≤3分钟（适用于所有节次）
    activities.forEach((a: any) => {
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
function generateTrainingProgression(sections: any[]): string {
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
      (a: any) => a.name.includes('运球') || a.name.includes('传球') || a.name.includes('球性')
    )
    .map((a: any) => a.name)
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
      .map((a: any) => a.name)
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

// U10三级版说明
const u10LevelGuide: Record<string, string> = {
  基础: '初次接触篮球，动作以模仿为主，难度最低，对抗少',
  进阶: '有一定篮球基础，可进行标准动作训练，有少量对抗',
  精英: '技术较成熟，可进行组合动作训练，有正式对抗比赛',
};

// 生成Prompt
function generatePrompt(params: AIPlanParams, cases: LessonPlan[]): string {
  const ageGroupInfo: Record<string, string> = {
    U6: '4-6岁幼儿班，以游戏为主，培养球性和兴趣',
    U8: '7-8岁小学低年级，基础运球、传球入门',
    U10: '9-10岁小学中年级，技术规范化，开始体能训练',
    U12: '11-12岁小学高年级，战术训练，加强对抗',
    U14: '13-14岁初中，综合提升，中考体育',
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

## 训练节次结构
${segmentDesc}

## 训练要求
- 训练主题：${params.theme || '根据年龄段特点自动确定'}
- 重点训练技能：${params.focusSkills?.join('、') || '根据年龄段特点自动确定'}
- 技能水平：${isU10 ? levelLabel + '（' + u10LevelGuide[levelLabel] + '）' : params.skillLevel || 'intermediate'}
${params.previousTraining?.length ? `- 最近训练内容：${params.previousTraining.join('、')}（避免重复或进阶）` : ''}

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
          "name": "活动名称（必须精确，如\"右手原地高低运球\"）",
          "duration": 5,
          "form": "组织形式（必须具体：集体/分组（几人一组）/排面（几排）/依次（轮流））",
          "description": "【列队】【位置】【动作】用简洁专业的中文描述。例如：\"【列队】所有学员排成一路纵队。【位置】围绕篮球场慢跑。【动作】保持均匀速度，绕场慢跑1-2圈。\"",
          "keyPoints": ["要点1", "要点2"],
          "sets": "2-3组（必须填写具体组数）",
          "repetitions": "每组8-10次或30秒（必须填写具体次数或时间）",
          "progression": "从易到难的3个层次：1.基础动作（简单模仿）→ 2.进阶动作（增加难度）→ 3.挑战动作（组合运用）（必须明确写出3个层次）",
          "equipment": ["器材（如有）"],
          "drillDiagram": "<svg>...</svg> 动作路线示意图（必须包含：学员圆圈+编号蓝色、教练方块红色、球橙色圆点、箭头路线）",
          "relatedTo": "关联说明（可选）：如果是热身环节的基础动作，说明为后面的哪个技术训练做准备。例如：\"为后面的行进间体前变向运球做准备\""
}
      ],
      "points": ["本节要点1", "本节要点2"]
    },
    {
      "name": "第二节",
      "duration": ${segments[1].minutes},
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
3. **动态伸展**（5-8分钟）：肩关节、髋关节、膝关节、踝关节动态拉伸
4. **身体协调性**（5-8分钟）：绳梯、侧滑步、交叉步、小碎步等
5. **球性熟悉**（8-10分钟）：原地运球、移动运球、球绕环等

### 2. 具体动作描述规范（核心改进⭐）
**每个动作必须包含以下6个要素，缺一不可：**

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

    const prompt = generatePrompt(params, similarCases);

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
          // 兼容 segments（新三段式）和 sections（旧格式）
          sections: (validatedResult.segments || validatedResult.sections || []).map(
            (seg: any) => ({
              ...seg,
              // 移除 coachGuide 字段（不再展示）
              activities: seg.activities?.map((act: any) => {
                const { coachGuide, ...rest } = act;
                return rest;
              }),
            })
          ),
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
          // 兼容 segments（新三段式）和 sections（旧格式）
          sections: (validatedResult.segments || validatedResult.sections || []).map(
            (seg: any) => ({
              ...seg,
              // 移除 coachGuide 字段（不再展示）
              activities: seg.activities?.map((act: any) => {
                const { coachGuide, ...rest } = act;
                return rest;
              }),
            })
          ),
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
