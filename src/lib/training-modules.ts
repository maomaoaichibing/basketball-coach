/**
 * 篮球训练模块知识库 v2
 * 基于2023年暑期专业教案 + 青训行业标准整理
 * 8大模块 × 106+ 子技能 的完整分类体系
 *
 * 使用场景：
 * 1. 前端：层级化的训练主题选择器
 * 2. 后端：AI Prompt 注入的专业技能库
 * 3. RAG：细粒度子技能匹配检索
 */

// ============================================
// 训练模块定义
// ============================================

export interface TrainingSubSkill {
  id: string; // 唯一标识
  name: string; // 技能名称
  description: string; // 简要描述（用于Prompt）
  keywords: string[]; // 检索关键词（RAG用）
  difficulty?: 'beginner' | 'intermediate' | 'advanced'; // 默认难度
}

export interface TrainingModule {
  id: string;
  name: string;
  icon: string;
  description: string;
  categories: TrainingCategory[];
}

export interface TrainingCategory {
  id: string;
  name: string;
  description: string;
  skills: TrainingSubSkill[];
}

// ============================================
// 完整的8大训练模块体系
// ============================================

export const TRAINING_MODULES: TrainingModule[] = [
  // ──── 1. 运球模块 ────
  {
    id: 'dribbling',
    name: '运球',
    icon: '🏀',
    description: '篮球基本功的核心，培养球感和手眼协调能力',
    categories: [
      {
        id: 'dribbling-basic',
        name: '基础运球',
        description: '运球入门动作，建立正确的运球手型和节奏',
        skills: [
          {
            id: 'db-01',
            name: '原地高低运球',
            description: '右手/左手原地高运球(腰以上)和低运球(膝以下)交替练习',
            keywords: ['高低运球', '原地运球', '高运球', '低运球'],
            difficulty: 'beginner',
          },
          {
            id: 'db-02',
            name: '单手左右拉球',
            description: '单手在体前左右横向拉动球，控制球的方向和幅度',
            keywords: ['左右拉球', '拉球', '体前拉球'],
            difficulty: 'beginner',
          },
          {
            id: 'db-03',
            name: '行进间直线运球',
            description: '沿直线慢速到中速行进间运球，保持抬头不看球',
            keywords: ['行进间运球', '直线运球', '走动运球'],
            difficulty: 'beginner',
          },
          {
            id: 'db-04',
            name: '运双球训练',
            description: '双手同时运两个球，提升双手协调性和球感',
            keywords: ['双球', '运双球', '双手运球', '两球'],
            difficulty: 'beginner',
          },
          {
            id: 'db-05',
            name: '体前V字运球',
            description: '双手在体前交替推球呈V字形轨迹，练习换手节奏',
            keywords: ['V字运球', '体前V字'],
            difficulty: 'beginner',
          },
          {
            id: 'db-06',
            name: '护球运球',
            description: '用身体和手臂保护球的行进间运球，模拟实战护球',
            keywords: ['护球', '保护球', '护球运球'],
            difficulty: 'beginner',
          },
        ],
      },
      {
        id: 'dribbling-advanced',
        name: '进阶运球',
        description: '变向、变速、组合运球技术',
        skills: [
          {
            id: 'da-01',
            name: '体前变向运球',
            description: '运球中通过体前变向换手突破防守人，最常用的突破动作',
            keywords: ['体前变向', '变向', 'crossover', '交叉运球'],
            difficulty: 'intermediate',
          },
          {
            id: 'da-02',
            name: '胯下运球',
            description: '球从胯下穿过换手运球，分为原地和行进间两种',
            keywords: ['胯下', '跨下运球', 'between legs'],
            difficulty: 'intermediate',
          },
          {
            id: 'da-03',
            name: '背后运球',
            description: '球从背后绕过换手运球，适合高速行进中的变向',
            keywords: ['背后运球', '背后', 'behind back'],
            difficulty: 'advanced',
          },
          {
            id: 'da-04',
            name: '转身运球（前/后）',
            description: '以前转身或后转身为轴心改变运球方向',
            keywords: ['转身运球', '前转身', '后转身', 'spin'],
            difficulty: 'intermediate',
          },
          {
            id: 'da-05',
            name: '急停急起运球',
            description: '运球中突然停止再突然启动，打乱防守节奏',
            keywords: ['急停急起', 'stop and go', '变速运球'],
            difficulty: 'intermediate',
          },
          {
            id: 'da-06',
            name: '组合运球',
            description: '两种或多种运球动作的组合运用（如体前+胯下+背后）',
            keywords: ['组合运球', '复合运球', 'combo dribble'],
            difficulty: 'advanced',
          },
          {
            id: 'da-07',
            name: 'Z字/之字形运球',
            description: '沿Z字形路线运球推进，练习连续变向能力',
            keywords: ['Z字运球', '之字形', 'zig zag'],
            difficulty: 'intermediate',
          },
          {
            id: 'da-08',
            name: '障碍物运球',
            description: '绕过标志桶/锥桶进行各种运球练习',
            keywords: ['障碍物', '锥桶', '标志桶', '障碍运球'],
            difficulty: 'intermediate',
          },
          {
            id: 'da-09',
            name: '1对1运球突破',
            description: '在防守压力下完成运球突破上篮或投篮',
            keywords: ['1v1', '一对一', '突破', '运球突破'],
            difficulty: 'advanced',
          },
          {
            id: 'da-10',
            name: '欧洲步',
            description: '运球突破时利用步伐节奏变化绕过防守人的高级技巧',
            keywords: ['欧洲步', 'euro step', '脚步'],
            difficulty: 'advanced',
          },
          {
            id: 'da-11',
            name: '节奏变化运球（Rhythm）',
            description: '通过快-慢-快的节奏变化迷惑防守人',
            keywords: ['节奏', 'rhythm', '变化节奏'],
            difficulty: 'advanced',
          },
          {
            id: 'da-12',
            name: '抛接球+衔接运球',
            description: '高空抛接球后立刻衔接运球，练习手眼协调到运球的过渡',
            keywords: ['抛接球', '接球衔接'],
            difficulty: 'intermediate',
          },
        ],
      },
    ],
  },

  // ──── 2. 传球模块 ────
  {
    id: 'passing',
    name: '传球',
    icon: '🤝',
    description: '团队配合的基础，培养传球视野和时机判断',
    categories: [
      {
        id: 'passing-basic',
        name: '基础传球',
        description: '基本传球手法和准确性训练',
        skills: [
          {
            id: 'pb-01',
            name: '双手胸前传球',
            description: '最基本的传球方式，双手持球于胸前发力推出，带旋转',
            keywords: ['胸前传球', 'chest pass', '双手传球'],
            difficulty: 'beginner',
          },
          {
            id: 'pb-02',
            name: '击地传球',
            description: '球击地反弹后到达接球人，适合内线和高大防守人场景',
            keywords: ['击地传球', 'bounce pass', '反弹传球'],
            difficulty: 'beginner',
          },
          {
            id: 'pb-03',
            name: '头上传球',
            description: '双手从头后上方传出，越过防守人头顶',
            keywords: ['头上传球', 'overhead pass', '头顶传球'],
            difficulty: 'intermediate',
          },
          {
            id: 'pb-04',
            name: '单手肩上传球',
            description: '棒球式传球，用于长距离快速转移',
            keywords: ['肩上传球', 'baseball pass', '单手传球'],
            difficulty: 'intermediate',
          },
          {
            id: 'pb-05',
            name: '手递手传球',
            description: '近距离直接交球给队友，常用于掩护后',
            keywords: ['手递手', 'handoff', '交球'],
            difficulty: 'beginner',
          },
          {
            id: 'pb-06',
            name: '原地传接球',
            description: '两人一组原地面对面各种方式的传接球练习',
            keywords: ['传接球', '原地传球', '两人传球'],
            difficulty: 'beginner',
          },
        ],
      },
      {
        id: 'passing-advanced',
        name: '进阶传球',
        description: '行进间、对抗下的传球技术',
        skills: [
          {
            id: 'pa-01',
            name: '行进间传接球',
            description: '边跑动边传球和接球，保持传球准确性',
            keywords: ['行进间传球', '跑动传球', '移动传球'],
            difficulty: 'intermediate',
          },
          {
            id: 'pa-02',
            name: '不停球传球（One-touch）',
            description: '接球后不运球直接传出，强调快速决策',
            keywords: ['不停球', 'one touch', '直接传球'],
            difficulty: 'advanced',
          },
          {
            id: 'pa-03',
            name: '角度/隐蔽传球',
            description: '利用身体假动作隐藏传球意图的技巧传球',
            keywords: ['隐蔽传球', 'no-look', '背后传球', '假动作传球'],
            difficulty: 'advanced',
          },
          {
            id: 'pa-04',
            name: '紧逼下的传球',
            description: '在防守人紧贴压迫下安全出球的能力',
            keywords: ['紧逼传球', '压迫下出球', '包夹出球'],
            difficulty: 'advanced',
          },
          {
            id: 'pa-05',
            name: '快攻传球推进',
            description: '快速由守转攻时的长传或短传推进',
            keywords: ['快攻传球', '推进', '长传', '一传'],
            difficulty: 'intermediate',
          },
          {
            id: 'pa-06',
            name: '内线高吊球（Lob Pass）',
            description: '高弧度吊传给空切篮下的队友',
            keywords: ['高吊球', 'lob', '吊传', '高传'],
            difficulty: 'advanced',
          },
          {
            id: 'pa-07',
            name: '穿越传球（Skip Pass）',
            description: '跨越场地一侧到另一侧的长距离横传',
            keywords: ['穿越传球', 'skip pass', '横传'],
            difficulty: 'intermediate',
          },
          {
            id: 'pa-08',
            name: '策应传球',
            description: '高位或低位持球后观察并传出好球',
            keywords: ['策应', 'post pass', '高低位传球'],
            difficulty: 'intermediate',
          },
          {
            id: 'pa-09',
            name: '传切配合传球',
            description: '传球后切入或为空切队友精准供球',
            keywords: ['传切', 'give and go', '空切传球'],
            difficulty: 'intermediate',
          },
          {
            id: 'pa-10',
            name: '突分传球',
            description: '突破吸引防守后的分球给外线空位',
            keywords: ['突分', 'kick out', '突破分球'],
            difficulty: 'intermediate',
          },
          {
            id: 'pa-11',
            name: '挡拆后传球',
            description: '挡拆执行后的各种传球选择（拆入、外弹、顺下）',
            keywords: ['挡拆传球', 'pick and roll pass'],
            difficulty: 'advanced',
          },
          {
            id: 'pa-12',
            name: '全场长传发动',
            description: '防守篮板后的长传直接发给快下队员',
            keywords: ['长传发动', 'outlet pass', '篮板一传'],
            difficulty: 'intermediate',
          },
        ],
      },
    ],
  },

  // ──── 3. 投篮模块 ────
  {
    id: 'shooting',
    name: '投篮',
    icon: '🎯',
    description: '得分能力的核心，培养稳定的投篮手型和自信心',
    categories: [
      {
        id: 'shooting-basic',
        name: '基础投篮',
        description: '投篮姿势、手型和近距离投篮',
        skills: [
          {
            id: 'sb-01',
            name: '投篮姿势与手型',
            description:
              '无球状态下练习BEEF原则（Balance-Eyes-Elbow-Follow-through）的标准投篮姿势',
            keywords: ['投篮姿势', '手型', 'BEEF', '持球', '投篮准备'],
            difficulty: 'beginner',
          },
          {
            id: 'sb-02',
            name: '原地定点投篮',
            description: '固定位置的原地拔起投篮练习，建立肌肉记忆',
            keywords: ['定点投篮', '原地投篮', 'set shot', 'spot up'],
            difficulty: 'beginner',
          },
          {
            id: 'sb-03',
            name: '罚球线投篮',
            description: '罚球线的标准罚球投篮练习',
            keywords: ['罚球', 'free throw', '罚球线'],
            difficulty: 'beginner',
          },
          {
            id: 'sb-04',
            name: '近距离投篮（0-3米）',
            description: '篮下到罚球线区域内的各种角度投篮',
            keywords: ['近距离', '篮下投篮', '近距离投篮'],
            difficulty: 'beginner',
          },
          {
            id: 'sb-05',
            name: '多点移动投篮',
            description: '在不同点位之间移动接球投篮（底角/45°/弧顶）',
            keywords: ['多点投篮', '移动投篮', 'around the horn'],
            difficulty: 'intermediate',
          },
          {
            id: 'sb-06',
            name: '跟进补篮（Tip-in）',
            description: '投篮不中后起跳补篮得分的意识和技术',
            keywords: ['补篮', 'tip-in', '二次进攻', '跟进'],
            difficulty: 'beginner',
          },
        ],
      },
      {
        id: 'shooting-advanced',
        name: '进阶投篮',
        description: '有对抗、有移动的投篮技术',
        skills: [
          {
            id: 'sa-01',
            name: '接球投篮（Catch & Shoot）',
            description: '接队友传球后迅速调整并投篮',
            keywords: ['接球投篮', 'catch shoot', '接投'],
            difficulty: 'intermediate',
          },
          {
            id: 'sa-02',
            name: '运球急停跳投',
            description: '运球后通过一步或两步急停后起跳投篮',
            keywords: ['急停跳投', 'pull up', '急停投篮', 'dribble stop'],
            difficulty: 'intermediate',
          },
          {
            id: 'sa-03',
            name: '三威胁衔接投篮',
            description: '从三威胁姿势（投/突/传）启动投篮',
            keywords: ['三威胁', 'triple threat'],
            difficulty: 'intermediate',
          },
          {
            id: 'sa-04',
            name: '后撤步投篮',
            description: '向后撤步创造投篮空间后出手',
            keywords: ['后撤步', 'step back', 'fadeaway'],
            difficulty: 'advanced',
          },
          {
            id: 'sa-05',
            name: '跑动接球投篮',
            description: '无球跑动中接球直接投篮（如底线兜出、反跑）',
            keywords: ['跑动投篮', 'coming off screen', '无球投篮'],
            difficulty: 'advanced',
          },
          {
            id: 'sa-06',
            name: '干扰下投篮',
            description: '有防守人举手干扰情况下的强行投篮',
            keywords: ['干扰投篮', 'contested shot', '强投'],
            difficulty: 'advanced',
          },
          {
            id: 'sa-07',
            name: '三分线投篮（U12+）',
            description: '三分线外的远距离投篮（U12及以上年龄段）',
            keywords: ['三分', 'three pointer', '远投', '外线投篮'],
            difficulty: 'advanced',
          },
        ],
      },
      {
        id: 'shooting-layup',
        name: '行进间投篮/上篮',
        description: '上篮和各种 finishes',
        skills: [
          {
            id: 'sl-01',
            name: '三步上篮脚步',
            description: '无球状态下的标准三步上篮脚步练习（一步大二步小三步起跳）',
            keywords: ['三步上篮', '上篮脚步', 'layup footwork', '脚步'],
            difficulty: 'beginner',
          },
          {
            id: 'sl-02',
            name: '右手/左手低手上篮',
            description: '持球后标准的低手上篮（右手侧/左手侧）',
            keywords: ['低手上篮', 'layup', '正手上篮'],
            difficulty: 'beginner',
          },
          {
            id: 'sl-03',
            name: '反手上篮',
            description: '从篮筐另一侧反向完成的挑篮',
            keywords: ['反手上篮', 'reverse layup', '反手'],
            difficulty: 'intermediate',
          },
          {
            id: 'sl-04',
            name: '运球上篮',
            description: '运球后衔接的三步上篮（右手上篮为主）',
            keywords: ['运球上篮', 'dribble layup', '运球衔接上篮'],
            difficulty: 'intermediate',
          },
          {
            id: 'sl-05',
            name: '欧洲步上篮',
            description: '利用欧洲步节奏变化的变向上篮',
            keywords: ['欧洲步上篮', 'euro step layup'],
            difficulty: 'advanced',
          },
          {
            id: 'sl-06',
            name: '抛投（Float Shot）',
            description: '在大个子防守下利用高弧度抛投得分',
            keywords: ['抛投', 'floater', 'finger roll'],
            difficulty: 'advanced',
          },
        ],
      },
    ],
  },

  // ──── 4. 防守模块 ────
  {
    id: 'defense',
    name: '防守',
    icon: '🛡️',
    description: '赢得比赛的基础，培养防守意识和习惯',
    categories: [
      {
        id: 'defense-footwork',
        name: '基础防守姿势与脚步',
        description: '防守的基本站姿和移动方式',
        skills: [
          {
            id: 'df-01',
            name: '防守基本姿势',
            description: '降低重心、双脚分开略宽于肩、双手张开、上身微前倾的标准防守姿态',
            keywords: ['防守姿势', 'defensive stance', '防守站位', '基础姿势'],
            difficulty: 'beginner',
          },
          {
            id: 'df-02',
            name: '滑步（横向/斜向）',
            description: '不交叉双脚的横向/斜向滑步移动，防守基本功',
            keywords: ['滑步', 'slide', ' lateral slide', '横滑步'],
            difficulty: 'beginner',
          },
          {
            id: 'df-03',
            name: '交叉步防守移动',
            description: '需要快速追防时使用的前后交叉步移动',
            keywords: ['交叉步', 'cross step', '追防'],
            difficulty: 'beginner',
          },
          {
            id: 'df-04',
            name: '后撤步防守',
            description: '当进攻人加速突破时快速向后退步保持防守距离',
            keywords: ['后撤步', 'drop step', '退步'],
            difficulty: 'intermediate',
          },
          {
            id: 'df-05',
            name: '防守跑步姿势转换',
            description: '从正常跑到防守姿势的快速转换',
            keywords: ['姿势转换', 'stance transition'],
            difficulty: 'intermediate',
          },
          {
            id: 'df-06',
            name: '绳梯/敏捷梯防守脚步',
            description: '利用绳梯进行的各种防守步法协调性训练',
            keywords: ['绳梯', '敏捷梯', 'ladder', 'agility'],
            difficulty: 'beginner',
          },
          {
            id: 'df-07',
            name: '防守碎步/小碎步',
            description: '近距离防守时的小幅快速调整步法',
            keywords: ['碎步', '小碎步', 'defensive shuffle'],
            difficulty: 'intermediate',
          },
          {
            id: 'df-08',
            name: '前场紧逼站位与移动',
            description: '全场紧逼时的防守站位和人盯人路线',
            keywords: ['紧逼', 'press', 'full court', '全场防守'],
            difficulty: 'intermediate',
          },
          {
            id: 'df-09',
            name: '防守轮转补位',
            description: '队友被突破后的协防、补位、轮转回到自己防守人',
            keywords: ['轮转', '补位', 'rotation', 'help defense'],
            difficulty: 'advanced',
          },
          {
            id: 'df-10',
            name: '防守卡位（Box Out）',
            description: '抢防守篮板时用身体阻挡对手的卡位技术',
            keywords: ['卡位', 'box out', '挡人', '篮板卡位'],
            difficulty: 'intermediate',
          },
          {
            id: 'df-11',
            name: '防守篮板拼抢',
            description: '卡位后积极拼抢防守篮板并发动反击',
            keywords: ['防守篮板', 'defensive rebound', '篮板'],
            difficulty: 'intermediate',
          },
        ],
      },
      {
        id: 'defense-personal',
        name: '个人防守技术',
        description: '针对有球和无球队员的防守技巧',
        skills: [
          {
            id: 'dp-01',
            name: '防有球人（持球防守）',
            description: '面对持球进攻人的完整防守：压迫、干扰、抢断时机',
            keywords: ['防有球', 'on-ball defense', '持球防守', '盯球'],
            difficulty: 'intermediate',
          },
          {
            id: 'dp-02',
            name: '防无球人人球兼顾',
            description: '既能看到自己防守的人又能观察到球的位置',
            keywords: ['人球兼顾', 'ball vision', 'help side', '防无球'],
            difficulty: 'intermediate',
          },
          {
            id: 'dp-03',
            name: '切断传球路线',
            description: '预判并站在传球路线上破坏对方传球',
            keywords: ['断球路线', 'passing lane', ' interception'],
            difficulty: 'intermediate',
          },
          {
            id: 'dp-04',
            name: '正面/侧面/背后抢断',
            description: '不同位置的抢断技术和时机判断',
            keywords: ['抢断', 'steal', '断球', '掏球'],
            difficulty: 'intermediate',
          },
          {
            id: 'dp-05',
            name: '封盖技术（Block）',
            description: '不犯规的前提下垂直起跳封盖对方投篮',
            keywords: ['封盖', 'block', '盖帽', '帽'],
            difficulty: 'advanced',
          },
          {
            id: 'dp-06',
            name: '绕前/侧前防守',
            description: '在内线球员身前防守阻止其接球',
            keywords: ['绕前', 'deny', 'fronting', '侧前'],
            difficulty: 'advanced',
          },
          {
            id: 'dp-07',
            name: '挤过/绕过/穿过掩护',
            description: '对方掩护时的三种防守应对方法',
            keywords: ['挤过', 'go over', '绕过', 'go under', '穿过', 'fight through'],
            difficulty: 'intermediate',
          },
          {
            id: 'dp-08',
            name: '延误/短暂包夹',
            description: '对方挡拆时短暂双人夹击后迅速回位',
            keywords: ['延误', 'hedge', 'show', '短暂夹击', 'blitz'],
            difficulty: 'advanced',
          },
        ],
      },
    ],
  },

  // ──── 5. 突破模块 ────
  {
    id: 'breakthrough',
    name: '突破',
    icon: '⚡',
    description: '个人进攻利器，培养第一步爆发力和变向能力',
    categories: [
      {
        id: 'breakthrough-basic',
        name: '基础突破脚步',
        description: '突破的第一步和基本步伐',
        skills: [
          {
            id: 'bb-01',
            name: '交叉步突破（Crossover Drive）',
            description: '以交叉步向防守人另一侧突破的第一步启动',
            keywords: ['交叉步突破', 'crossover drive', '交叉步'],
            difficulty: 'intermediate',
          },
          {
            id: 'bb-02',
            name: '顺步突破（同侧步突破）',
            description: '向运球手同侧方向的大步幅突破',
            keywords: ['顺步突破', '同侧步', 'drive', 'jab step'],
            difficulty: 'intermediate',
          },
          {
            id: 'bb-03',
            name: '探步/Jab Step试探',
            description: '以小幅探步试探防守人重心后再决定突破方向',
            keywords: ['jab step', '探步', '试探步'],
            difficulty: 'intermediate',
          },
          {
            id: 'bb-04',
            name: '第一步爆发力训练',
            description: '突破第一步的快速启动能力和蹬地发力',
            keywords: ['第一步', 'first step', '爆发力', '起步'],
            difficulty: 'beginner',
          },
          {
            id: 'bb-05',
            name: '转身突破',
            description: '以背身或面框转身摆脱防守人后突破',
            keywords: ['转身突破', 'post turn', 'spin move'],
            difficulty: 'advanced',
          },
          {
            id: 'bb-06',
            name: '三威胁突破启动',
            description: '从三威胁姿态（投/突/传）启动突破的动作',
            keywords: ['三威胁突破', 'triple threat attack'],
            difficulty: 'intermediate',
          },
          {
            id: 'bb-07',
            name: '减速-加速节奏突破',
            description: '通过速度变化让防守人失去平衡后突破',
            keywords: ['节奏突破', 'speed change', 'hesitation'],
            difficulty: 'advanced',
          },
          {
            id: 'bb-08',
            name: '假动作+真突破',
            description: '结合投篮/传球假动作后真正突破',
            keywords: ['假动作', 'fake', 'pump fake', 'shot fake'],
            difficulty: 'intermediate',
          },
        ],
      },
      {
        id: 'breakthrough-advanced',
        name: '进阶突破技术',
        description: '复合突破和实战应用',
        skills: [
          {
            id: 'ba-01',
            name: '体前变向+突破上篮',
            description: '体前变向换手后立刻衔接突破上篮',
            keywords: ['变向突破', 'crossover layup'],
            difficulty: 'intermediate',
          },
          {
            id: 'ba-02',
            name: '胯下+背后组合突破',
            description: '连续使用胯下和背后的复合运球后突破',
            keywords: ['组合突破', 'combo move'],
            difficulty: 'advanced',
          },
          {
            id: 'ba-03',
            name: '1对1单打破防',
            description: '在真实防守压力下完成完整的突破得分',
            keywords: ['1v1', 'iso', '单打', '一对一'],
            difficulty: 'advanced',
          },
          {
            id: 'ba-04',
            name: '挡拆后的突破路径选择',
            description: '挡拆后根据防守策略选择不同突破路线',
            keywords: ['挡拆突破', 'PnR attack'],
            difficulty: 'advanced',
          },
          {
            id: 'ba-05',
            name: '快攻中的运球突破',
            description: '快攻推进过程中利用运球突破最后一道防线',
            keywords: ['快攻突破', 'fast break finish'],
            difficulty: 'advanced',
          },
          {
            id: 'ba-06',
            name: '弱侧手突破强化',
            description: '非惯用手（通常是左手）的突破能力专项强化',
            keywords: ['弱侧手', 'non-dominant', '左手突破'],
            difficulty: 'advanced',
          },
          {
            id: 'ba-07',
            name: '对抗后的终结能力（And-One）',
            description: '被撞后保持平衡完成上篮/投篮的能力',
            keywords: ['and-one', '接触后完成', '对抗上篮', 'finish through contact'],
            difficulty: 'advanced',
          },
          {
            id: 'ba-08',
            name: '半场阵地单打突破',
            description: '半场阵地战中利用个人能力创造空间突破',
            keywords: ['阵地单打', 'isolation', 'post iso'],
            difficulty: 'advanced',
          },
        ],
      },
    ],
  },

  // ──── 6. 进攻战术模块 ────
  {
    id: 'offensive-tactics',
    name: '进攻战术',
    icon: '⚔️',
    description: '团队协作的艺术，培养战术素养和配合意识',
    categories: [
      {
        id: 'offense-individual',
        name: '个人进攻',
        description: '无球跑位和个人攻击选择',
        skills: [
          {
            id: 'oi-01',
            name: '空切（Cut）',
            description: '无球队员突然跑向篮下接球得分',
            keywords: ['空切', 'cut', 'basket cut', '切入'],
            difficulty: 'beginner',
          },
          {
            id: 'oi-02',
            name: '反跑（Backdoor Cut）',
            description: '假装外切后突然反向跑向篮下',
            keywords: ['反跑', 'backdoor', 'back door cut'],
            difficulty: 'intermediate',
          },
          {
            id: 'oi-03',
            name: '溜底线（Baseline）',
            description: '沿底线从一侧移动到另一侧寻找机会',
            keywords: ['溜底', 'baseline', '溜底线'],
            difficulty: 'beginner',
          },
          {
            id: 'oi-04',
            name: 'V形切/ L形切',
            description: '呈V形或L形路线向外弹出接球',
            keywords: ['V切', 'L切', 'V-cut', 'L-cut', '弹出'],
            difficulty: 'intermediate',
          },
          {
            id: 'oi-05',
            name: '绕掩护接球（Come off screen）',
            description: '利用队友的无球掩护后接球',
            keywords: ['绕掩护', 'screen', 'off ball screen'],
            difficulty: 'intermediate',
          },
          {
            id: 'oi-06',
            name: '低位背身单打',
            description: '在低位用背身技术单打防守人',
            keywords: ['背身单打', 'post up', 'low post'],
            difficulty: 'advanced',
          },
          {
            id: 'oi-07',
            name: '跟进补篮（Offensive Rebound）',
            description: '投篮后跟进冲抢进攻篮板二次得分',
            keywords: ['进攻篮板', 'O-reb', '跟进'],
            difficulty: 'beginner',
          },
        ],
      },
      {
        id: 'offense-team-basic',
        name: '基础团队配合',
        description: '2-3人的基础战术配合',
        skills: [
          {
            id: 'ot-01',
            name: '传切配合（Give & Go）',
            description: '传球后立刻空切篮下接回传上篮',
            keywords: ['传切', 'give and go', '一传一切'],
            difficulty: 'beginner',
          },
          {
            id: 'ot-02',
            name: '突分配合（Drive & Kick）',
            description: '持球突破后分球给外线空位队友',
            keywords: ['突分', 'drive and kick', '突破分球'],
            difficulty: 'intermediate',
          },
          {
            id: 'ot-03',
            name: '挡拆配合（Pick & Roll）',
            description: '队友做墙掩护后持球人突破或投篮，掩护人拆入',
            keywords: ['挡拆', 'pick and roll', 'PnR', '掩护'],
            difficulty: 'intermediate',
          },
          {
            id: 'ot-04',
            name: '无球掩护配合',
            description: '无球队员为另一无球队员做掩护创造接球机会',
            keywords: ['无球掩护', 'off-ball screen', 'pin down'],
            difficulty: 'intermediate',
          },
          {
            id: 'ot-05',
            name: '反跑配合',
            description: '结合假动作和反跑的多人间配合',
            keywords: ['反跑配合', 'backdoor play'],
            difficulty: 'intermediate',
          },
          {
            id: 'ot-06',
            name: '高低位策应',
            description: '高位持球策应者与低位空切者的配合',
            keywords: ['高低位', 'high-low', '策应'],
            difficulty: 'advanced',
          },
          {
            id: 'ot-07',
            name: '手递手配合（Handoff）',
            description: '近距离手递手交球后利用掩护切入或投篮',
            keywords: ['手递手', 'handoff'],
            difficulty: 'intermediate',
          },
        ],
      },
      {
        id: 'offense-team-advanced',
        name: '进阶团队战术',
        description: '多人和整体进攻体系',
        skills: [
          {
            id: 'oa-01',
            name: '快攻（Fast Break）',
            description: '由守转攻后的快速推进得分（长传/短传/三线快攻）',
            keywords: ['快攻', 'fast break', 'transition', '反击'],
            difficulty: 'intermediate',
          },
          {
            id: 'oa-02',
            name: '二打一/三打二快攻',
            description: '人数优势下的快攻处理',
            keywords: ['二打一', '2 on 1', '三打二', '3 on 2'],
            difficulty: 'intermediate',
          },
          {
            id: 'oa-03',
            name: '动态进攻（Motion Offense）',
            description: '通过持续传球和移动寻找机会的无固定位置进攻',
            keywords: ['动态进攻', 'motion offense'],
            difficulty: 'advanced',
          },
          {
            id: 'oa-04',
            name: '传切循环进攻',
            description: '全队不断传切的循环进攻体系',
            keywords: ['传切循环', 'passing game'],
            difficulty: 'advanced',
          },
          {
            id: 'oa-05',
            name: '破人盯人进攻',
            description: '针对人盯人防守的进攻策略（频繁挡拆/掩护/空切）',
            keywords: ['破盯人', 'beat man to man'],
            difficulty: 'advanced',
          },
          {
            id: 'oa-06',
            name: '破区域联防进攻',
            description: '针对联防的进攻策略（溜底/中路突破/外线投射）',
            keywords: ['破联防', 'beat zone'],
            difficulty: 'advanced',
          },
          {
            id: 'oa-07',
            name: '底线/边线发球战术',
            description: '死球后的界外发球战术配合',
            keywords: ['发球战术', 'inbounds play', 'baseline', 'sideline'],
            difficulty: 'intermediate',
          },
          {
            id: 'oa-08',
            name: '最后时刻战术（BLOB/SLOB）',
            description: '比赛末段的特定时间战术',
            keywords: ['关键时刻', 'last possession', '绝杀'],
            difficulty: 'advanced',
          },
        ],
      },
    ],
  },

  // ──── 7. 防守战术模块 ────
  {
    id: 'defensive-tactics',
    name: '防守战术',
    icon: '🔒',
    description: '团队防守体系，培养协同防守和沟通习惯',
    categories: [
      {
        id: 'dt-personal',
        name: '个人防守战术',
        description: '个人在防守体系中的职责',
        skills: [
          {
            id: 'dtp-01',
            name: '半场人盯人防守',
            description: '半场范围内每人盯防一个对手',
            keywords: ['半场盯人', 'half court man', 'man to man'],
            difficulty: 'intermediate',
          },
          {
            id: 'dtp-02',
            name: '全场人盯人防守',
            description: '从后场开始的全场紧逼人盯人',
            keywords: ['全场盯人', 'full court press', '全场紧逼'],
            difficulty: 'advanced',
          },
          {
            id: 'dtp-03',
            name: '重点人盯防',
            description: '对对方核心球员的重点看防',
            keywords: ['重点盯防', 'star guard', 'box-and-one'],
            difficulty: 'advanced',
          },
        ],
      },
      {
        id: 'dt-team-basic',
        name: '基础团队防守',
        description: '基础的团队防守阵型和配合',
        skills: [
          {
            id: 'dtb-01',
            name: '2-3区域联防',
            description: '上线2人下线3人的联防阵型，侧重保护内线',
            keywords: ['2-3联防', '2-3 zone', 'zone defense'],
            difficulty: 'advanced',
          },
          {
            id: 'dtb-02',
            name: '3-2区域联防',
            description: '上线3人下线2人的联防阵型，侧重防守外线',
            keywords: ['3-2联防', '3-2 zone'],
            difficulty: 'advanced',
          },
          {
            id: 'dtb-03',
            name: '1-3-1区域联防',
            description: '压迫弧顶的均衡联防阵型',
            keywords: ['1-3-1联防', '1-3-1 zone'],
            difficulty: 'advanced',
          },
          {
            id: 'dtb-04',
            name: '半场协防轮转',
            description: '强侧施压、弱侧回收、被突破后的轮转',
            keywords: ['协防', 'help', 'rotation'],
            difficulty: 'intermediate',
          },
          {
            id: 'dtb-05',
            name: '夹击配合（Trap）',
            description: '在边角或底线对持球人进行双人夹击',
            keywords: ['夹击', 'trap', 'double team', 'blitz'],
            difficulty: 'intermediate',
          },
          {
            id: 'dtb-06',
            name: '换防配合',
            description: '对方掩护时防守人互换防守对象',
            keywords: ['换防', 'switch'],
            difficulty: 'intermediate',
          },
          {
            id: 'dtb-07',
            name: '防守篮板卡位保护',
            description: '全队统一的防守篮板卡位和争抢体系',
            keywords: ['防守篮板', 'block out', 'team rebounding'],
            difficulty: 'intermediate',
          },
          {
            id: 'dtb-08',
            name: '防守沟通与呼应',
            description: '防守时的口头交流（"我来看！""挡住了！"）',
            keywords: ['防守沟通', 'communication', '呼应'],
            difficulty: 'beginner',
          },
        ],
      },
      {
        id: 'dt-specific',
        name: '针对性防守',
        description: '特殊场景下的防守策略',
        skills: [
          {
            id: 'dts-01',
            name: '全场1-2-1-1紧逼',
            description: '一人盯发球人、两人中场拦截的紧逼阵型',
            keywords: ['1-2-1-1', 'full court press', 'diamond press'],
            difficulty: 'advanced',
          },
          {
            id: 'dts-02',
            name: '全场2-2-1紧逼',
            description: '两人前场压迫、两人中场拦截的紧逼',
            keywords: ['2-2-1紧逼', '2-2-1 press'],
            difficulty: 'advanced',
          },
          {
            id: 'dts-03',
            name: '半场区域夹击',
            description: '半场内对持球人在指定区域的夹击策略',
            keywords: ['半场夹击', 'half court trap'],
            difficulty: 'advanced',
          },
          {
            id: 'dts-04',
            name: '混合防守（Box-1 / Triangle-2）',
            description: '部分盯人部分联防的特殊防守',
            keywords: ['混合防守', 'box one', 'triangle two'],
            difficulty: 'advanced',
          },
          {
            id: 'dts-05',
            name: '犯规战术（故意犯规拖延）',
            description: '比赛末端对罚球差球员犯规的策略',
            keywords: ['犯规战术', 'foul strategy', 'hack-a-shaq'],
            difficulty: 'advanced',
          },
          {
            id: 'dts-06',
            name: '关键回合防守部署',
            description: '比赛最后时刻的特殊防守安排',
            keywords: ['关键防守', 'crunch time', 'end game'],
            difficulty: 'advanced',
          },
          {
            id: 'dts-07',
            name: '防快攻落位',
            description: '由攻转守时快速落位建立防守阵型的第一反应',
            keywords: ['防快攻', 'transition defense', 'retreat'],
            difficulty: 'intermediate',
          },
          {
            id: 'dts-08',
            name: '防挡拆策略选择',
            description: '面对挡拆时选择挤过/绕过/夹击/交换/延误的决策',
            keywords: ['防挡拆', 'PnR defense', 'pick coverage'],
            difficulty: 'intermediate',
          },
          {
            id: 'dts-09',
            name: '防掩护的整体策略',
            description: '全场统一的无球掩护防守策略',
            keywords: ['防掩护', 'screen defense'],
            difficulty: 'advanced',
          },
          {
            id: 'dts-10',
            name: '内线协防与护筐',
            description: '内线球员对突破的协防和保护篮筐',
            keywords: ['协防', 'rim protection', 'help side'],
            difficulty: 'intermediate',
          },
          {
            id: 'dts-11',
            name: '外线轮转防守（X-Out）',
            description: '球转移到弱侧时外线防守人的轮转路线',
            keywords: ['轮转', 'x-out', 'weakside rotation'],
            difficulty: 'intermediate',
          },
          {
            id: 'dts-12',
            name: '底线/边线球防守',
            description: '对方界外发球时的防守布置（防止轻松得分）',
            keywords: ['防发球', 'defend inbounds'],
            difficulty: 'intermediate',
          },
          {
            id: 'dts-13',
            name: '全场紧逼落位与分工',
            description: '紧逼时每个人的具体职责和落位',
            keywords: ['紧逼分工', 'press assignment'],
            difficulty: 'advanced',
          },
          {
            id: 'dts-14',
            name: '防转换进攻（Transition D）',
            description: '对方抢到篮板或得分后快速转为防守的反应',
            keywords: ['转换防守', 'conversion defense'],
            difficulty: 'advanced',
          },
          {
            id: 'dts-15',
            name: '防无球掩护策略',
            description: '无球掩护发生时追踪者和弱侧防守人的配合',
            keywords: ['防无球掩护', 'off-ball screen D'],
            difficulty: 'intermediate',
          },
          {
            id: 'dts-16',
            name: '防低位背身单打',
            description: '对内线球员低位背身要球后的防守策略',
            keywords: ['防低位', 'post defense', 'post up D'],
            difficulty: 'intermediate',
          },
          {
            id: 'dts-17',
            name: '防三分线外投射',
            description: '对外线射手的贴防和不给空位的纪律性',
            keywords: ['防三分', 'closeout', 'run off shooter'],
            difficulty: 'intermediate',
          },
          {
            id: 'dts-18',
            name: '比赛末段针对性防守（领先/落后）',
            description: '根据比分和时间选择的不同防守策略',
            keywords: ['比分防守', 'situational defense', 'clock management'],
            difficulty: 'advanced',
          },
        ],
      },
    ],
  },

  // ──── 8. 对抗比赛形式 ────
  {
    id: 'competition',
    name: '对抗比赛',
    icon: '🏆',
    description: '将所有技术在实战中检验和提升',
    categories: [
      {
        id: 'comp-individual-dual',
        name: '小范围个人/双人对抗',
        description: '1v1到2v2的小规模对抗',
        skills: [
          {
            id: 'ci-01',
            name: '1对1单打对抗',
            description: '半场范围内的1v1单打，限制运球次数或不限制',
            keywords: ['1v1', 'one on one', '单打'],
            difficulty: 'intermediate',
          },
          {
            id: 'ci-02',
            name: '1对1限定条件单打',
            description: '限制只能使用特定技术（如只能运3次球/只能投篮）',
            keywords: ['限制1v1', 'constraint drill'],
            difficulty: 'intermediate',
          },
          {
            id: 'ci-03',
            name: '2对2半场对抗',
            description: '半场2v2对抗，强调配合和空间感',
            keywords: ['2v2', 'two on two', '半场对抗'],
            difficulty: 'intermediate',
          },
          {
            id: 'ci-04',
            name: '2v2/3v3限定规则对抗',
            description: '增加特殊规则的对抗（如必须传球3次才能投篮）',
            keywords: ['限定规则', 'rule-based scrimmage'],
            difficulty: 'intermediate',
          },
        ],
      },
      {
        id: 'comp-team-small',
        name: '多人团队小场地对抗',
        description: '3v3到4v4的小场地对抗',
        skills: [
          {
            id: 'cs-01',
            name: '3对3半场对抗',
            description: '半场3v3对抗，最流行的街头篮球赛制',
            keywords: ['3v3', 'three on three', '半场比赛', '街球'],
            difficulty: 'intermediate',
          },
          {
            id: 'cs-02',
            name: '3v3限定战术对抗',
            description: '要求必须执行某种战术（如至少一次挡拆/一次传切）',
            keywords: ['限定3v3', 'tactical 3v3'],
            difficulty: 'intermediate',
          },
          {
            id: 'cs-03',
            name: '4对4半场/四分之三场对抗',
            description: '4v4接近全场但空间更大，适合练习阵地进攻',
            keywords: ['4v4', 'four on four'],
            difficulty: 'intermediate',
          },
          {
            id: 'cs-04',
            name: '小场地快攻演练',
            description: '3v3或4v4中强调快速由守转攻的对抗',
            keywords: ['小场地快攻', 'transition scrimmage'],
            difficulty: 'advanced',
          },
          {
            id: 'cs-05',
            name: '特殊规则小场地对抗',
            description: '加特殊计分规则（如3分线外算4分/助攻得1分等）',
            keywords: ['特殊规则', 'special rules', 'point system'],
            difficulty: 'intermediate',
          },
          {
            id: 'cs-06',
            name: '节选时段对抗',
            description: '只打特定时间的对抗（如8分钟4节×2分钟）',
            keywords: ['节选时段', 'quarter play', 'short game'],
            difficulty: 'beginner',
          },
          {
            id: 'cs-07',
            name: '以多打少/以少打多对抗',
            description: '人数不等的对抗训练劣势/优势下的决策',
            keywords: [' uneven', 'advantage/disadvantage'],
            difficulty: 'advanced',
          },
          {
            id: 'cs-08',
            name: '得分后特殊奖励对抗',
            description: '得分方获得额外球权或额外分数的比赛变体',
            keywords: ['make it take it', 'bonus scoring'],
            difficulty: 'intermediate',
          },
          {
            id: 'cs-09',
            name: '限时进攻对抗',
            description: '规定时间内必须出手的进攻训练',
            keywords: ['shot clock', '限时进攻'],
            difficulty: 'intermediate',
          },
        ],
      },
      {
        id: 'comp-full-court',
        name: 'Full-Court Team Competition & Specialized Drills',
        description: '5v5全场对抗和专项训练场景',
        skills: [
          {
            id: 'cf-01',
            name: '5对5全场对抗',
            description: '标准全场5v5对抗比赛，完整规则',
            keywords: ['5v5', 'five on five', '全场', '正式比赛', 'full court'],
            difficulty: 'intermediate',
          },
          {
            id: 'cf-02',
            name: '5v5阵地进攻演练',
            description: '全场5v3但只练阵地进攻阶段',
            keywords: ['阵地进攻', 'half court offense', 'set play'],
            difficulty: 'advanced',
          },
          {
            id: 'cf-03',
            name: '全场快攻演练',
            description: '强调由守转攻和快攻得分的5v5对抗',
            keywords: ['全场快攻', 'fast break 5v5', 'transition'],
            difficulty: 'advanced',
          },
          {
            id: 'cf-04',
            name: '全场紧逼对抗',
            description: '一方使用全场紧逼另一方破解的5v5',
            keywords: ['全场紧逼对抗', 'press break', 'press vs press break'],
            difficulty: 'advanced',
          },
          {
            id: 'cf-05',
            name: '特定战术执行对抗',
            description: '要求双方必须执行特定战术体系的对抗',
            keywords: ['战术对抗', 'system scrimmage', 'structured play'],
            difficulty: 'advanced',
          },
          {
            id: 'cf-06',
            name: '节次对抗（按节比赛）',
            description: '按正式比赛节次进行的5v5（每节5-8分钟）',
            keywords: ['按节比赛', 'quarters', 'period play'],
            difficulty: 'intermediate',
          },
          {
            id: 'cf-07',
            name: '关键场景模拟',
            description: '模拟最后2分钟/最后1回合的关键比赛情境',
            keywords: ['关键时刻', 'clutch', 'last minutes', 'scenario'],
            difficulty: 'advanced',
          },
          {
            id: 'cf-08',
            name: '锦标赛/淘汰赛制对抗',
            description: '小组赛→淘汰赛的正式比赛流程',
            keywords: ['锦标赛', 'tournament', '淘汰赛'],
            difficulty: 'intermediate',
          },
          {
            id: 'cf-09',
            name: '趣味游戏化对抗',
            description: '用游戏形式进行的对抗（如投篮接力、抢球大战、定点射击赛等）',
            keywords: ['趣味游戏', 'game-based', 'fun competition', 'relay'],
            difficulty: 'beginner',
          },
        ],
      },
    ],
  },
];

// ============================================
// 工具函数
// ============================================

/** 获取所有模块的所有子技能（扁平化列表） */
export function getAllSkills(): TrainingSubSkill[] {
  const skills: TrainingSubSkill[] = [];
  for (const mod of TRAINING_MODULES) {
    for (const cat of mod.categories) {
      skills.push(...cat.skills);
    }
  }
  return skills;
}

/** 根据ID获取子技能 */
export function getSkillById(id: string): TrainingSubSkill | undefined {
  return getAllSkills().find((s) => s.id === id);
}

/** 根据模块ID获取模块 */
export function getModuleById(id: string): TrainingModule | undefined {
  return TRAINING_MODULES.find((m) => m.id === id);
}

/** 根据关键词模糊匹配子技能 */
export function searchSkills(query: string): TrainingSubSkill[] {
  const q = query.toLowerCase();
  return getAllSkills().filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.keywords.some((k) => k.toLowerCase().includes(q))
  );
}

/** 根据模块ID获取该模块的所有技能名称列表（用于Prompt注入） */
export function getModuleSkillNamesForPrompt(moduleId: string): string {
  const mod = getModuleById(moduleId);
  if (!mod) return '';
  return mod.categories
    .map(
      (cat) =>
        `### ${mod.name} - ${cat.name}\n` +
        cat.skills.map((s) => `- ${s.name}：${s.description}`).join('\n')
    )
    .join('\n');
}

/** 将完整的模块体系格式化为 Prompt 文本 */
export function formatAllModulesForPrompt(): string {
  return TRAINING_MODULES.map((mod) => {
    const skillText = mod.categories
      .map(
        (cat) =>
          `#### ${cat.name}\n` +
          cat.skills.map((s) => `- **${s.name}**：${s.description}`).join('\n')
      )
      .join('\n\n');
    return `## ${mod.icon} ${mod.name}模块（${mod.description}）\n${skillText}`;
  }).join('\n\n');
}

/** 获取前端主题选项（兼容旧的简单字符串数组模式） */
export function getThemeOptions(): Array<{ value: string; label: string; module: string }> {
  const options: Array<{ value: string; label: string; module: string }> = [];
  for (const mod of TRAINING_MODULES) {
    for (const cat of mod.categories) {
      for (const skill of cat.skills) {
        options.push({
          value: `${mod.id}:${skill.id}`,
          label: skill.name,
          module: mod.id,
        });
      }
    }
  }
  return options;
}
