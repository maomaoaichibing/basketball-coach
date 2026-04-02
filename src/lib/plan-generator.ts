// ============================================
// 篮球训练教案生成引擎 - 详细版（与AI生成格式一致）
// ============================================

export type AgeGroup = 'U6' | 'U8' | 'U10' | 'U12' | 'U14';
export type Intensity = 'low' | 'medium' | 'high';
export type Location = '室内' | '室外';

// 训练活动
export interface TrainingActivity {
  id: string;
  name: string;
  description: string; // 详细训练步骤，格式：【队形】+【学员位置】+【具体动作】
  duration: number; // 分钟
  category:
    | 'warmup'
    | 'ball_familiarity'
    | 'technical'
    | 'physical'
    | 'tactical'
    | 'game'
    | 'cooldown'
    | 'etiquette';
  skills: string[];
  difficulty: number; // 1-5
  equipment: string[];
  keyPoints?: string[];
  form?: string; // 建议形式：集体/排面/分组等
  coachGuide?: string; // 教练引导语
  sets?: string; // 组数（如：2-3组）
  repetitions?: string; // 次数/时间（如：每组8-10次）
  progression?: string; // 递进式说明（从易到难）
  drillDiagram?: string; // 动作路线示意图（SVG格式）
}

// 教案输出
export interface TrainingPlanOutput {
  title: string;
  date: string;
  duration: number;
  group: AgeGroup;
  location: Location;
  weather?: string;
  theme: string;
  focusSkills: string[];
  intensity: Intensity;
  sections: PlanSection[];
  notes: string;
  trainingProgression?: string; // 整体递进关系说明
}

export interface PlanSection {
  name: string;
  category:
    | 'warmup'
    | 'ball_familiarity'
    | 'technical'
    | 'physical'
    | 'tactical'
    | 'game'
    | 'cooldown'
    | 'etiquette';
  duration: number;
  activities: SectionActivity[];
  points?: string[];
}

export interface SectionActivity {
  name: string;
  duration: number;
  description: string; // 详细训练步骤
  keyPoints: string[];
  equipment?: string[];
  form?: string;
  coachGuide?: string; // 教练引导语
  sets?: string; // 组数（如：2-3组）
  repetitions?: string; // 次数/时间（如：每组8-10次）
  progression?: string; // 递进式说明（从易到难）
  drillDiagram?: string; // 动作路线示意图（SVG格式）
}

// ============================================
// 训练模块库 - 详细版（包含教练引导语）
// ============================================

// 课前准备/热身活动
const WARMUP_ACTIVITIES: Omit<TrainingActivity, 'id'>[] = [
  {
    name: '集合站队',
    description:
      '【排面】所有学员在中场线站好，教练与学员相对而站。【动作】教练点名确认学员到齐，引导学员调整站姿，保持安静。',
    duration: 2,
    category: 'warmup',
    skills: [],
    difficulty: 1,
    equipment: [],
    form: '集体',
    coachGuide:
      '小朋友们好！今天我们开始训练，先来站队。抬头挺胸，双手放在两侧，像小士兵一样站好！数数看，我们今天来了几位小球员？',
    keyPoints: ['抬头挺胸', '双手放两侧', '保持安静'],
  },
  {
    name: '慢跑热身',
    description:
      '【队形】所有学员在底线排成一排。【动作】绕场慢跑2圈，保持中等速度，注意呼吸节奏，不要说话，集中注意力。',
    duration: 5,
    category: 'warmup',
    skills: ['physical'],
    difficulty: 1,
    equipment: [],
    form: '集体',
    coachGuide: '现在我们开始慢跑，像小马一样跑起来！注意用鼻子呼吸，跑的过程中不要停下来，加油！',
    keyPoints: ['保持中等速度', '用鼻子呼吸', '不停止'],
  },
  {
    name: '肩部活动',
    description:
      '【排面】所有学员底线站好，双手放在肩膀上。【动作】向前绕环走到另一侧底线，然后向后绕环回到起点。',
    duration: 3,
    category: 'warmup',
    skills: ['physical'],
    difficulty: 1,
    equipment: ['标志桶'],
    form: '集体',
    coachGuide: '把手放在肩膀上，像小鸟挥翅膀一样转圈。前绕环...很好！后绕环...太棒了！',
    keyPoints: ['充分活动肩关节', '动作幅度大', '注意节奏'],
  },
  {
    name: '扩胸运动',
    description:
      '【排面】所有学员底线站好，双臂曲臂端平至胸前位置。【动作】用力后振，伸展至另一侧底线后返回。',
    duration: 3,
    category: 'warmup',
    skills: ['physical'],
    difficulty: 1,
    equipment: ['标志桶'],
    form: '集体',
    coachGuide: '双臂弯曲端平，用力向后展开！像小鸟展翅一样，打开胸腔。加油！',
    keyPoints: ['打开胸腔', '动作幅度大', '用力后振'],
  },
  {
    name: '弓步半转体',
    description:
      '【队形】所有学员底线站好。【动作】向前跨出一大步，前腿弯曲，后腿伸直，双臂曲臂端平至胸前，腰部发力左右旋转。',
    duration: 3,
    category: 'warmup',
    skills: ['physical'],
    difficulty: 1,
    equipment: ['标志桶'],
    form: '集体',
    coachGuide: '大步迈出去，像小武士一样！腰用力转一转，转过去的时候要站稳！',
    keyPoints: ['前腿弯曲90度', '后腿伸直', '腰部发力'],
  },
  {
    name: '蟹式移动',
    description:
      '【队形】所有学员在底线站好。【动作】身体朝上手脚都撑在地上，移动时左脚跟右手同时移动，右脚跟左手同时移动。',
    duration: 2,
    category: 'warmup',
    skills: ['physical'],
    difficulty: 1,
    equipment: [],
    form: '集体',
    coachGuide: '像小螃蟹一样横着走！手脚撑地，肚子朝天。左脚右手，右脚左手，加油！',
    keyPoints: ['身体朝上', '核心发力', '异侧移动'],
  },
  {
    name: '关节活动',
    description:
      '【排面】所有学员原地站好。【动作】依次活动手腕、脚踝、膝关节，每个关节顺时针和逆时针各转动一圈。',
    duration: 5,
    category: 'warmup',
    skills: ['physical'],
    difficulty: 1,
    equipment: [],
    form: '集体',
    coachGuide: '现在活动关节啦！手腕转一转，脚踝转一转，膝盖弯一弯。准备好了吗？',
    keyPoints: ['活动充分', '动作缓慢', '注意安全'],
  },
  {
    name: '有球动态拉伸',
    description:
      '【队形】所有学员底线站好，持球。【动作】持球在头部后进行绕环，走到另一侧底线后返回。',
    duration: 4,
    category: 'warmup',
    skills: ['physical', 'dribbling'],
    difficulty: 1,
    equipment: ['球'],
    form: '集体',
    coachGuide: '手里拿着球，像小陀螺一样转起来！球要拿稳，头抬起来看前方！',
    keyPoints: ['单手持球', '球绕头部', '保持平衡'],
  },
];

// 球性熟悉（幼儿班特色）
const BALL_FAMILIARITY_ACTIVITIES: Omit<TrainingActivity, 'id'>[] = [
  {
    name: '原地拍球',
    description:
      '【队形】所有学员在标志桶后站好，保持一定间距。【动作】双手自然下垂，用手指触球，掌心空出，进行原地拍球练习。',
    duration: 5,
    category: 'ball_familiarity',
    skills: ['dribbling'],
    difficulty: 1,
    equipment: ['球', '标志桶'],
    form: '集体',
    coachGuide: '小朋友们，把球放在地上，用手指用力拍下去！手指张开，掌心空空的，像拍蚊子一样！',
    keyPoints: ['手指触球', '掌心空出', '低头看球'],
  },
  {
    name: '左右手交替',
    description:
      '【队形】所有学员在标志桶后站好。【动作】先用右手拍球10次，再换左手拍球10次，双手交替进行。',
    duration: 5,
    category: 'ball_familiarity',
    skills: ['dribbling'],
    difficulty: 1,
    equipment: ['球', '标志桶'],
    form: '集体',
    coachGuide: '现在右手拍球！1、2、3...很好！换左手！加油！两只手都要练习，这样才能变得厉害！',
    keyPoints: ['左右手均衡', '控制力度', '球的高度'],
  },
  {
    name: '高低运球',
    description:
      '【队形】所有学员在标志桶后站好。【动作】高运球时大力拍球，球弹起高度超过腰部；低运球时手指控制，球弹起高度不超过膝盖。',
    duration: 5,
    category: 'ball_familiarity',
    skills: ['dribbling'],
    difficulty: 1,
    equipment: ['球', '标志桶'],
    form: '集体',
    coachGuide: '看我的！高运球时用力拍，球跳得高高的！低运球时轻轻拍，球贴在地上跳！',
    keyPoints: ['高运球大力', '低运球轻力', '眼睛看前方'],
  },
  {
    name: '体前变向',
    description:
      '【队形】所有学员在标志桶后站好。【动作】体前换手运球，左手运到右手，右手运到左手，注意压球和加速。',
    duration: 5,
    category: 'ball_familiarity',
    skills: ['dribbling'],
    difficulty: 1,
    equipment: ['球', '标志桶'],
    form: '集体',
    coachGuide: '球在身体前面，换手！左手右手配合，像小魔术师一样！压球！加速！',
    keyPoints: ['压球有力', '换手迅速', '身体协调'],
  },
  {
    name: '胯下绕球',
    description:
      '【队形】所有学员在标志桶后站好。【动作】持球在腰部后进行绕环，球由内至外从胯下穿过，走到另一侧底线后返回。',
    duration: 5,
    category: 'ball_familiarity',
    skills: ['dribbling'],
    difficulty: 1,
    equipment: ['球', '标志桶'],
    form: '集体',
    coachGuide: '球放在腰后面，慢慢送到胯下，像传球一样让它穿过！不要低头看球，抬着头走！',
    keyPoints: ['单手持球', '球不过腰', '抬头行进'],
  },
  {
    name: '原地抛接球',
    description:
      '【队形】所有学员在标志桶后站好，保持间距。【动作】双手抛球至空中，高度约2米，双手接球。熟练后可单手接球。',
    duration: 5,
    category: 'ball_familiarity',
    skills: ['passing'],
    difficulty: 1,
    equipment: ['球'],
    form: '集体',
    coachGuide:
      '把球轻轻抛到天上，像抛向太阳一样！然后张开双手接住它！单手接球时，手掌张开，像抓蝴蝶一样！',
    keyPoints: ['抛球高度适中', '双手张开', '眼手协调'],
  },
  {
    name: '腰部绕球',
    description:
      '【队形】所有学员在标志桶后站好。【动作】球放在腰部位置，双手环绕腰部，球在手上绕圈，顺时针绕3圈再逆时针绕3圈。',
    duration: 4,
    category: 'ball_familiarity',
    skills: ['dribbling'],
    difficulty: 1,
    equipment: ['球', '标志桶'],
    form: '集体',
    coachGuide: '把球放在腰上，双手抱住它！顺时针转...逆时针转...球不要掉下来哦！',
    keyPoints: ['球贴腰部', '双手固定球', '节奏稳定'],
  },
  {
    name: '腿部绕球',
    description:
      '【队形】所有学员在标志桶后站好。【动作】一条腿抬起，球在腿部下方绕环，由内向外穿过，到另一侧后换腿返回。',
    duration: 4,
    category: 'ball_familiarity',
    skills: ['dribbling'],
    difficulty: 1,
    equipment: ['球', '标志桶'],
    form: '集体',
    coachGuide: '抬起一条腿，把球从腿下面穿过去！像小蛇钻洞一样！换另一条腿，再钻回来！',
    keyPoints: ['抬腿稳定', '球贴腿下', '节奏均匀'],
  },
];

// 技术训练
const TECHNICAL_ACTIVITIES: Omit<TrainingActivity, 'id'>[] = [
  // 运球
  {
    name: '原地高低运球',
    description:
      '【队形】所有学员在标志桶后站好，保持间距。【动作】高运球时大力拍球，球弹起高度超过腰部；低运球时手指控制，球弹起高度不超过膝盖。左右手交替练习。',
    duration: 8,
    category: 'technical',
    skills: ['dribbling'],
    difficulty: 1,
    equipment: ['球', '标志桶'],
    form: '集体',
    coachGuide:
      '高运球时用力拍！球跳得高高的，像在和球玩耍！低运球时轻轻拍，手指摸球，球乖乖听话！换手！',
    keyPoints: ['手指触球', '掌心空出', '高低变化'],
  },
  {
    name: '行进间直线运球',
    description:
      '【队形】学员排成一路纵队，站在底线。【动作】从底线运球到另一侧底线，保持直线，眼睛看前方，不要低头看球。运到终点后返回。',
    duration: 8,
    category: 'technical',
    skills: ['dribbling'],
    difficulty: 2,
    equipment: ['球'],
    form: '依次',
    coachGuide: '看前面的目标！眼睛看着前方，不要低头找球。球会跟着你走，像小狗跟着主人一样！跑！',
    keyPoints: ['眼睛看前方', '保持直线', '控制速度'],
  },
  {
    name: 'Z字形运球',
    description:
      '【队形】标志桶摆成Z字型，学员在起点站好。【动作】运球绕过每个标志桶，到达终点后返回。注意变向时压球和加速。',
    duration: 10,
    category: 'technical',
    skills: ['dribbling'],
    difficulty: 2,
    equipment: ['球', '标志桶'],
    form: '依次',
    coachGuide: '绕标志桶时记得压球！像蛇一样灵活地转弯。看好位置，提前变向！加速通过！',
    keyPoints: ['压球变向', '绕桶流畅', '身体协调'],
  },
  {
    name: '胯下运球',
    description:
      '【队形】学员在标志桶后站好。【动作】运球行进中，将球从胯下穿过换手，注意抬头，不要看球。',
    duration: 8,
    category: 'technical',
    skills: ['dribbling'],
    difficulty: 2,
    equipment: ['球', '标志桶'],
    form: '依次',
    coachGuide: '球从胯下穿过去！像传球一样送过去，不要低头看。抬起头，看着前面走！',
    keyPoints: ['单手送球', '抬头行进', '节奏稳定'],
  },
  {
    name: '背后运球',
    description:
      '【队形】学员在标志桶后站好。【动作】运球行进中，将球拉到身后从另一只手接住，完成背后换手。',
    duration: 8,
    category: 'technical',
    skills: ['dribbling'],
    difficulty: 2,
    equipment: ['球', '标志桶'],
    form: '依次',
    coachGuide: '球拉到身后去！像变魔术一样，手到后面接住它。不要回头看，用手感球！',
    keyPoints: ['拉球有力', '转身压肩', '手眼协调'],
  },
  {
    name: '体前变向运球',
    description:
      '【队形】学员在标志桶后站好。【动作】体前换手运球，左手运到右手，右手运到左手，注意压球和加速。',
    duration: 6,
    category: 'technical',
    skills: ['dribbling'],
    difficulty: 2,
    equipment: ['球', '标志桶'],
    form: '依次',
    coachGuide: '球在身体前面，换手！用力压球！加速通过！像闪电一样快！',
    keyPoints: ['压球有力', '换手迅速', '加速通过'],
  },
  {
    name: '转身运球',
    description:
      '【队形】学员在标志桶后站好。【动作】运球中急停，先转头看后方，然后压肩转身，换手继续运球。',
    duration: 8,
    category: 'technical',
    skills: ['dribbling'],
    difficulty: 3,
    equipment: ['球', '标志桶'],
    form: '依次',
    coachGuide: '急停！先转头看后面，像回头看妈妈一样！然后压肩转身，球跟着你转！',
    keyPoints: ['先转头', '压肩转身', '换手流畅'],
  },
  {
    name: '障碍换手运球',
    description:
      '【队形】标志桶摆成一排，学员在起点。【动作】运球绕过障碍，到达障碍前换手，从另一侧绕过下一个障碍。',
    duration: 8,
    category: 'technical',
    skills: ['dribbling'],
    difficulty: 2,
    equipment: ['球', '标志桶'],
    form: '依次',
    coachGuide: '绕过障碍时要压球！换手！从另一边绕过去！像小兔子跳一样灵活！',
    keyPoints: ['压球变向', '左右手均衡', '节奏稳定'],
  },
  {
    name: '交叉步突破',
    description:
      '【队形】学员在半场站好，面对假想防守。【动作】蹬地发力，交叉步变向突破，注意第一步要快。',
    duration: 8,
    category: 'technical',
    skills: ['dribbling'],
    difficulty: 2,
    equipment: ['球'],
    form: '依次',
    coachGuide: '像弹簧一样弹出去！蹬地有力！第一步要快，像闪电一样突破！',
    keyPoints: ['蹬地发力', '交叉步变向', '第一步加速'],
  },

  // 传球
  {
    name: '双手胸前传球',
    description:
      '【队形】两人一组，面对面站好，间距约3米。【动作】双手持球于胸前，手指发力将球传出，球飞行轨迹要平，接球时双手接球。',
    duration: 8,
    category: 'technical',
    skills: ['passing'],
    difficulty: 1,
    equipment: ['球'],
    form: '双人',
    coachGuide:
      '双手抱球在胸前，像抱小宝贝一样！手指用力弹出去，球飞出去要平！接球时双手张开，像小碗一样接住！',
    keyPoints: ['手指拨球', '出手要平', '接球缓冲'],
  },
  {
    name: '击地传球',
    description:
      '【队形】两人一组，面对面站好。【动作】传球时球击地一次后弹起，落在接球者胸前位置。',
    duration: 6,
    category: 'technical',
    skills: ['passing'],
    difficulty: 2,
    equipment: ['球'],
    form: '双人',
    coachGuide: '球打在地上弹起来！像传球一样用力，让球跳到对方胸前！注意击地点在中间！',
    keyPoints: ['击地点准确', '力度适中', '弧度要平'],
  },
  {
    name: '单手肩上传球',
    description:
      '【队形】两人一组，面对面站好，间距约5米。【动作】单手持球于肩上，快速挥臂将球传出，注意传球目标。',
    duration: 6,
    category: 'technical',
    skills: ['passing'],
    difficulty: 2,
    equipment: ['球'],
    form: '双人',
    coachGuide: '球放在肩上，手臂像弹弓一样弹出去！看着目标传！用力但不要甩手腕！',
    keyPoints: ['手臂发力', '目标明确', '出手要稳'],
  },
  {
    name: '反弹传球',
    description:
      '【队形】两人一组，面对面站好。【动作】双手持球，从下方将球击地传出，球经地面反弹到接球者手中。',
    duration: 8,
    category: 'technical',
    skills: ['passing'],
    difficulty: 2,
    equipment: ['球'],
    form: '双人',
    coachGuide: '从下面把球推出去！球打在地面上弹起来，像传球一样传给你的队友！',
    keyPoints: ['击地点准确', '弧度适中', '双手接球'],
  },
  {
    name: '传球接球上篮',
    description:
      '【队形】三人一组，站成三角。【动作】A传球给B，B接球后传给C，C接球上篮。然后轮换位置。',
    duration: 10,
    category: 'technical',
    skills: ['passing', 'shooting'],
    difficulty: 3,
    equipment: ['球', '篮筐'],
    form: '分组',
    coachGuide: '传球要提前！看到队友有空位就传！接球后不要停，马上传给下一个人！上篮要瞄准！',
    keyPoints: ['传球提前量', '接球不停', '脚步正确'],
  },

  // 投篮
  {
    name: '原地投篮',
    description:
      '【队形】学员站在罚球线后，排成一排。【动作】双手持球于胸前或肩上，屈膝蹬地发力，手腕下压将球投出，球飞行轨迹成抛物线。',
    duration: 10,
    category: 'technical',
    skills: ['shooting'],
    difficulty: 1,
    equipment: ['球', '篮筐'],
    form: '依次',
    coachGuide: '投篮前屈膝，像弹簧一样压下去！然后蹬地起来，手腕向下压，像把球推进篮筐一样！',
    keyPoints: ['屈膝发力', '手型正确', '压腕出手'],
  },
  {
    name: '行进间投篮',
    description: '【队形】学员在底线排好。【动作】运球行进中，在规定位置急停，然后起跳投篮。',
    duration: 10,
    category: 'technical',
    skills: ['shooting'],
    difficulty: 2,
    equipment: ['球', '篮筐'],
    form: '依次',
    coachGuide: '运球！急停！屈膝！投篮！一气呵成！急停要稳，投篮要准！',
    keyPoints: ['急停稳定', '脚步正确', '投篮手型'],
  },
  {
    name: '左右手上篮',
    description: '【队形】学员在底线排好。【动作】运球上篮时，使用右手或左手完成上篮，注意打板点。',
    duration: 8,
    category: 'technical',
    skills: ['shooting'],
    difficulty: 3,
    equipment: ['球', '篮筐'],
    form: '依次',
    coachGuide: '右手上篮时，球打在篮板上白色方框的右上角！左手上篮时，打在左上角！',
    keyPoints: ['打板点准确', '左右手均衡', '脚步稳定'],
  },
  {
    name: '罚球线投篮',
    description:
      '【队形】学员站在罚球线后。【动作】按照正确投篮姿势，从罚球线投篮，目标是提高命中率。',
    duration: 8,
    category: 'technical',
    skills: ['shooting'],
    difficulty: 2,
    equipment: ['球', '篮筐'],
    form: '依次',
    coachGuide: '罚球线是最准的距离！深呼吸，看准篮筐，屈膝蹬地，手腕下压，进了！',
    keyPoints: ['姿势标准', '节奏稳定', '心态平和'],
  },

  // 防守
  {
    name: '防守姿势',
    description:
      '【队形】所有学员分散站好。【动作】屈膝降低重心，双手张开放在身体两侧，眼睛注视前方。',
    duration: 8,
    category: 'technical',
    skills: ['defending'],
    difficulty: 1,
    equipment: [],
    form: '集体',
    coachGuide: '降低重心，像坐在椅子上！双手张开，像老鹰张开翅膀！眼睛看着前面，准备好！',
    keyPoints: ['屈膝降低重心', '重心在前脚掌', '双手张开'],
  },
  {
    name: '滑步练习',
    description:
      '【队形】两人一组，一人进攻一人防守。【动作】防守者滑步移动，保持低重心，进攻者慢速移动，防守者跟随。',
    duration: 6,
    category: 'technical',
    skills: ['defending'],
    difficulty: 1,
    equipment: [],
    form: '双人',
    coachGuide: '滑步！像在冰上滑行一样！一只脚滑动，另一只脚跟上，保持低重心！跟紧他！',
    keyPoints: ['滑步流畅', '重心低', '不 crossed feet'],
  },
  {
    name: '防突破练习',
    description:
      '【队形】两人一组，进攻者持球。【动作】防守者保持防守姿势，伸手干扰，进攻者尝试突破，防守者练习堵截。',
    duration: 8,
    category: 'technical',
    skills: ['defending'],
    difficulty: 2,
    equipment: ['球'],
    form: '分组',
    coachGuide: '伸手干扰！让他走右边！堵住他！重心跟上！不要伸手偷球，保持姿势！',
    keyPoints: ['伸手干扰', '重心跟随', '堵截路线'],
  },
  {
    name: '抢球练习',
    description:
      '【队形】两人一组，一人持球。【动作】防守者尝试在不犯规的情况下抢断球，进攻者保护球。',
    duration: 6,
    category: 'technical',
    skills: ['defending'],
    difficulty: 2,
    equipment: ['球'],
    form: '分组',
    coachGuide: '看准时机！一只手拍球，另一只手护球！快！准！狠！但不要犯规！',
    keyPoints: ['时机把握', '手眼协调', '不犯规'],
  },

  // 上篮
  {
    name: '三步上篮',
    description:
      '【队形】学员在底线排好。【动作】运球行进中，采用右左跳步（或左右手不同）的脚步完成上篮。',
    duration: 8,
    category: 'technical',
    skills: ['shooting'],
    difficulty: 2,
    equipment: ['球', '篮筐'],
    form: '依次',
    coachGuide: '右左跳！一大二小三高！球要打板！轻轻推进去！像小兔子跳一样轻快！',
    keyPoints: ['脚步正确', '打板点准', '手腕柔和'],
  },
  {
    name: '左右手上篮',
    description: '【队形】学员在底线排好。【动作】分别用左手和右手完成上篮，注意左右手均衡练习。',
    duration: 8,
    category: 'technical',
    skills: ['shooting'],
    difficulty: 3,
    equipment: ['球', '篮筐'],
    form: '依次',
    coachGuide: '右手上篮！太棒了！换左手！加油！两只手都要会，这样才能更厉害！',
    keyPoints: ['左右手均衡', '脚步稳定', '打板准确'],
  },
];

// 体能训练
const PHYSICAL_ACTIVITIES: Omit<TrainingActivity, 'id'>[] = [
  {
    name: '跳绳',
    description:
      '【队形】所有学员分散站好，每人一根跳绳。【动作】双脚并拢，原地跳绳，双手摇绳配合脚步。计时1分钟，记录完成次数。',
    duration: 10,
    category: 'physical',
    skills: ['physical'],
    difficulty: 1,
    equipment: ['跳绳'],
    form: '集体',
    coachGuide: '跳绳开始了！双手摇绳，绳子转圈，脚尖轻轻跳！不要跳太高，绳子能过去就行！坚持住！',
    keyPoints: ['摇绳自然', '脚尖轻跳', '节奏稳定'],
  },
  {
    name: '敏捷梯',
    description:
      '【队形】敏捷梯铺在地上，学员排成一列。【动作】按照规定脚步通过敏捷梯，如小步跑、横向滑步等，到达终点后返回。',
    duration: 8,
    category: 'physical',
    skills: ['physical'],
    difficulty: 2,
    equipment: ['敏捷梯'],
    form: '依次',
    coachGuide: '看脚！快速通过敏捷梯！脚尖轻轻点地，像小猫一样灵活！不要踩到梯子！',
    keyPoints: ['脚步快速', '节奏稳定', '不踩梯子'],
  },
  {
    name: '折返跑',
    description:
      '【队形】学员在底线站好。【动作】从底线出发，快速跑到中线，触摸中线后返回底线，再跑到对侧底线，触摸后返回起点。',
    duration: 8,
    category: 'physical',
    skills: ['physical'],
    difficulty: 2,
    equipment: [],
    form: '依次',
    coachGuide: '冲刺！快速跑到中线！摸地！转身！冲刺回来！再跑！坚持住！你是最快的！',
    keyPoints: ['快速冲刺', '触线折返', '全力完成'],
  },
  {
    name: '鸭子步',
    description:
      '【队形】所有学员分散站好。【动作】下蹲，双手背在身后，像鸭子一样横向前进，绕过标志桶后返回。',
    duration: 5,
    category: 'physical',
    skills: ['physical'],
    difficulty: 2,
    equipment: ['标志桶'],
    form: '集体',
    coachGuide: '蹲下去！像小鸭子一样！双手背后面，横着走！加油！不要站起来！',
    keyPoints: ['下蹲到位', '横向移动', '坚持完成'],
  },
  {
    name: '蛙跳',
    description:
      '【队形】所有学员在起点站好。【动作】下蹲，像青蛙一样向前跳，落地后再次下蹲跳起，重复动作跳过一定距离。',
    duration: 5,
    category: 'physical',
    skills: ['physical'],
    difficulty: 2,
    equipment: [],
    form: '集体',
    coachGuide: '蹲下去！像青蛙一样跳！跳得远一点！落地后再跳！加油！你是最厉害的青蛙！',
    keyPoints: ['蹲得低', '跳得远', '落地稳'],
  },
  {
    name: '仰卧起坐',
    description:
      '【队形】所有学员在垫子上躺好。【动作】双手抱头，屈膝，利用腹肌力量坐起，然后躺下，重复动作。',
    duration: 8,
    category: 'physical',
    skills: ['physical'],
    difficulty: 1,
    equipment: ['垫子'],
    form: '集体',
    coachGuide: '躺下去！双手抱头！腹肌用力坐起来！像小弹簧一样！躺下！再起来！',
    keyPoints: ['抱头正确', '腹肌发力', '动作规范'],
  },
  {
    name: '折返运球',
    description:
      '【队形】学员在底线排好。【动作】运球到中线折返，再运球到对侧底线折返，最后返回起点。',
    duration: 8,
    category: 'physical',
    skills: ['physical', 'dribbling'],
    difficulty: 2,
    equipment: ['球'],
    form: '依次',
    coachGuide: '运球跑！快速到中线！转身！再跑！控制好球！你是最快的！',
    keyPoints: ['运球稳定', '折返迅速', '全程控球'],
  },
];

// 战术训练
const TACTICAL_ACTIVITIES: Omit<TrainingActivity, 'id'>[] = [
  {
    name: '二打一练习',
    description:
      '【队形】三人一组：进攻者2人，防守者1人。【动作】进攻者通过传球配合，突破防守者完成投篮。防守者积极防守，进攻结束后轮换。',
    duration: 10,
    category: 'tactical',
    skills: ['tactical', 'passing'],
    difficulty: 2,
    equipment: ['球', '篮筐'],
    form: '分组',
    coachGuide: '两个人配合！一个人运球，另一个人空位要球！看到队友有空位就传！防守的人要积极！',
    keyPoints: ['传球配合', '拉开空间', '积极防守'],
  },
  {
    name: '三打二练习',
    description:
      '【队形】五人一块：进攻者3人，防守者2人。【动作】进攻者通过传球寻找防守漏洞，完成投篮。防守者沟通配合，轮转换位。',
    duration: 12,
    category: 'tactical',
    skills: ['tactical'],
    difficulty: 3,
    equipment: ['球', '篮筐'],
    form: '分组',
    coachGuide: '三个人打两个人！多打少！传球找空位！防守的人要沟通！轮转换位！',
    keyPoints: ['传球寻找空位', '防守沟通', '轮转换位'],
  },
  {
    name: '挡拆配合',
    description:
      '【队形】两人一组站好。【动作】持球者靠近掩护者，掩护者设立掩护后切入或外撤，持球者利用掩护突破或投篮。',
    duration: 10,
    category: 'tactical',
    skills: ['tactical'],
    difficulty: 3,
    equipment: ['球'],
    form: '分组',
    coachGuide: '一个人设立掩护，另一个人利用掩护突破！掩护要稳！利用掩护的人要快！',
    keyPoints: ['掩护位置', '利用掩护', '时机把握'],
  },
  {
    name: '轮转防守',
    description:
      '【队形】四名防守者站好位置。【动作】进攻者传球，防守者根据球的位置轮转换位，保持正确的防守站位。',
    duration: 10,
    category: 'tactical',
    skills: ['tactical', 'defending'],
    difficulty: 3,
    equipment: ['球'],
    form: '集体',
    coachGuide: '球动人动！看球！轮转到正确位置！保持沟通！告诉我你的位置！',
    keyPoints: ['球动人动', '轮转到位', '保持沟通'],
  },
  {
    name: '快攻练习',
    description:
      '【队形】进攻者在己方半场站好。【动作】抢到篮板或断球后，快速传球推进，完成快攻上篮。',
    duration: 10,
    category: 'tactical',
    skills: ['tactical', 'physical'],
    difficulty: 3,
    equipment: ['球', '篮筐'],
    form: '分组',
    coachGuide: '抢到球就快攻！传得快！跑得快！不要等！3打2！球领人！',
    keyPoints: ['快攻意识', '传球推进', '球领人'],
  },
  {
    name: '3v3半场比赛',
    description:
      '【队形】3人一组，在半场进行。【动作】进行3对3半场比赛，进攻方投篮后交换球权继续进攻。',
    duration: 15,
    category: 'tactical',
    skills: ['tactical'],
    difficulty: 3,
    equipment: ['球', '篮筐'],
    form: '分组',
    coachGuide: '3打3！拉开空间！传球！接球！投篮！防守的人要积极！轮转换位！',
    keyPoints: ['拉开空间', '传球配合', '积极防守'],
  },
  {
    name: '5v5全场比赛',
    description: '【队形】两队各5人，进行全场比赛。【动作】标准篮球比赛规则进攻和防守。',
    duration: 15,
    category: 'tactical',
    skills: ['tactical'],
    difficulty: 4,
    equipment: ['球', '篮筐'],
    form: '分组',
    coachGuide: '5打5！全场比赛！团队配合！进攻！防守！我们是一个团队！',
    keyPoints: ['团队配合', '攻守转换', '战术执行'],
  },
];

// 对抗比赛
const GAME_ACTIVITIES: Omit<TrainingActivity, 'id'>[] = [
  {
    name: '3v3对抗',
    description:
      '【队形】两队各3人，在半场进行。【动作】进行3对3对抗比赛，进攻方投篮后交换球权，先到规定分数者获胜。',
    duration: 15,
    category: 'game',
    skills: [],
    difficulty: 3,
    equipment: ['球', '篮筐'],
    form: '分组',
    coachGuide: '3打3比赛开始！团队配合！进攻要积极！防守要凶狠！我们是最棒的团队！',
    keyPoints: ['团队配合', '积极进攻', '凶狠防守'],
  },
  {
    name: '4v4对抗',
    description:
      '【队形】两队各4人，在半场进行。【动作】进行4对4对抗比赛，练习团队配合和攻防转换。',
    duration: 15,
    category: 'game',
    skills: [],
    difficulty: 3,
    equipment: ['球', '篮筐'],
    form: '分组',
    coachGuide: '4打4！人多了更要配合！传球！跑位！我们一定能赢！',
    keyPoints: ['团队配合', '传球意识', '空间利用'],
  },
  {
    name: '投篮比赛',
    description: '【队形】两队在罚球线后站好。【动作】每队轮流投篮，记录进球数，进球多的队伍获胜。',
    duration: 10,
    category: 'game',
    skills: ['shooting'],
    difficulty: 2,
    equipment: ['球', '篮筐'],
    form: '分组',
    coachGuide: '投篮比赛！每队轮流！看准篮筐！深呼吸！投进去！加油！',
    keyPoints: ['姿势标准', '心态稳定', '团队鼓励'],
  },
  {
    name: '运球接力',
    description:
      '【队形】两队在起点站好。【动作】第一名队员运球绕过障碍到达终点后返回，下一名队员接力，用时少的队伍获胜。',
    duration: 8,
    category: 'game',
    skills: ['dribbling'],
    difficulty: 1,
    equipment: ['球', '标志桶'],
    form: '分组',
    coachGuide: '运球接力比赛！绕障碍！跑得快！传棒！加油！下一位准备！',
    keyPoints: ['运球稳定', '绕过障碍', '团队配合'],
  },
  {
    name: '传球抢分',
    description:
      '【队形】两队在规定区域内。【动作】在限定时间内，成功传球次数多的队伍得分，失误的队伍扣分。',
    duration: 8,
    category: 'game',
    skills: ['passing'],
    difficulty: 2,
    equipment: ['球'],
    form: '分组',
    coachGuide: '传球比赛！接住球！传出去！不要失误！数数看我们传了多少个！',
    keyPoints: ['传球准确', '接球稳定', '减少失误'],
  },
];

// 放松/课后
const COOLDOWN_ACTIVITIES: Omit<TrainingActivity, 'id'>[] = [
  {
    name: '全身静态拉伸',
    description:
      '【队形】所有学员围成一个圈站好。【动作】教练带领进行全身各部位的静态拉伸，每个动作保持15-20秒。',
    duration: 8,
    category: 'cooldown',
    skills: [],
    difficulty: 1,
    equipment: [],
    form: '集体',
    coachGuide: '慢慢来！深呼吸！感觉到拉伸了吗？保持住！不要弹！慢慢呼吸！',
    keyPoints: ['动作缓慢', '不弹不急', '保持呼吸'],
  },
  {
    name: '大腿前侧拉伸',
    description:
      '【队形】所有学员原地站好。【动作】单腿站立，另一只手抓住同侧脚踝，将脚拉向臀部，拉伸大腿前侧。',
    duration: 3,
    category: 'cooldown',
    skills: [],
    difficulty: 1,
    equipment: [],
    form: '集体',
    coachGuide: '单腿站稳！手抓住脚踝！把脚拉向屁股！感觉到大腿前面拉伸了吗？保持住！',
    keyPoints: ['站稳扶好', '拉伸感明显', '保持15秒'],
  },
  {
    name: '大腿内侧拉伸',
    description:
      '【队形】所有学员原地坐下。【动作】双脚底相对相贴，膝盖向两侧打开，双手按住膝盖向下压。',
    duration: 3,
    category: 'cooldown',
    skills: [],
    difficulty: 1,
    equipment: [],
    form: '集体',
    coachGuide: '坐下来！脚底对脚底！像蝴蝶翅膀一样！膝盖往下压！慢慢来！',
    keyPoints: ['双脚贴紧', '膝盖下压', '身体放松'],
  },
  {
    name: '手臂后侧拉伸',
    description:
      '【队形】所有学员原地站好。【动作】一只手臂伸直，另一只手臂从下方扣住伸直手臂的手肘，向身体方向拉。',
    duration: 3,
    category: 'cooldown',
    skills: [],
    difficulty: 1,
    equipment: [],
    form: '集体',
    coachGuide: '伸直一只手臂！另一只手抓住手肘！往身体方向拉！感觉到后面拉伸了吗？',
    keyPoints: ['手臂伸直', '用力适当', '保持呼吸'],
  },
  {
    name: '总结回顾',
    description:
      '【队形】所有学员围在教练身边。【动作】教练总结本节课的训练内容和重点，表扬表现好的学员，布置课后作业。',
    duration: 5,
    category: 'cooldown',
    skills: [],
    difficulty: 1,
    equipment: [],
    form: '集体',
    coachGuide: '今天训练结束了！谁能告诉我今天学了什么？太棒了！回家记得练习！',
    keyPoints: ['回顾重点', '表扬鼓励', '布置作业'],
  },
  {
    name: '深呼吸放松',
    description:
      '【队形】所有学员原地站好或坐下。【动作】闭上眼睛，深呼吸，吸气时双臂上举，呼气时双臂放下，放松全身。',
    duration: 3,
    category: 'cooldown',
    skills: [],
    difficulty: 1,
    equipment: [],
    form: '集体',
    coachGuide: '闭上眼睛！深呼吸！吸气...双手举起来！呼气...双手放下来！再深呼吸！',
    keyPoints: ['闭眼放松', '深呼吸', '全身放松'],
  },
];

// 礼仪
const ETIQUETTE_ACTIVITIES: Omit<TrainingActivity, 'id'>[] = [
  {
    name: '课前礼仪',
    description:
      '【队形】所有学员在中场线站好，教练与学员相对而站。【动作】教练说"教练好"，学员鞠躬回应；学员与家长相互鞠躬问好（家长不在，与教练依次击掌问好）。',
    duration: 2,
    category: 'etiquette',
    skills: [],
    difficulty: 1,
    equipment: [],
    form: '集体',
    coachGuide: '小朋友们好！今天我们开始训练！先来问好！站直！鞠躬！说"教练好"！和家长击掌！',
    keyPoints: ['站姿端正', '鞠躬问好', '声音响亮'],
  },
  {
    name: '课后礼仪',
    description:
      '【队形】所有学员在中场线站好，教练与学员相对而站。【动作】教练说"教练辛苦了"，学员鞠躬回应；教练与学员集体转向家长鞠躬说辛苦了。',
    duration: 2,
    category: 'etiquette',
    skills: [],
    difficulty: 1,
    equipment: [],
    form: '集体',
    coachGuide: '训练结束了！站直！鞠躬！说"教练辛苦了"！转向家长！鞠躬！说辛苦了！',
    keyPoints: ['整理队形', '鞠躬感谢', '礼貌告别'],
  },
  {
    name: '表扬鼓励',
    description:
      '【队形】所有学员围在教练身边。【动作】教练表扬今天训练中表现优秀的学员，发放小贴纸或口头鼓励。',
    duration: 3,
    category: 'etiquette',
    skills: [],
    difficulty: 1,
    equipment: [],
    form: '集体',
    coachGuide: '今天要表扬...因为你...太棒了！其他小朋友也要加油！下次我们更努力！',
    keyPoints: ['表扬具体', '鼓励进步', '全员认可'],
  },
];

// 年龄段配置
const AGE_GROUP_CONFIG: Record<
  AgeGroup,
  {
    name: string;
    minAge: number;
    maxAge: number;
    sections: string[];
    warmupDuration: number;
    ballFamDuration: number;
    technicalDuration: number;
    physicalDuration: number;
    tacticalDuration: number;
    gameDuration: number;
    cooldownDuration: number;
    etiquetteDuration: number;
    maxDifficulty: number;
    recommendedSkills: string[];
    avoidActivities: string[];
    hasEtiquette: boolean;
  }
> = {
  U6: {
    name: 'U6 (4-6岁 幼儿班)',
    minAge: 4,
    maxAge: 6,
    sections: ['etiquette', 'warmup', 'ball_familiarity', 'game', 'cooldown', 'etiquette'],
    warmupDuration: 8,
    ballFamDuration: 20,
    technicalDuration: 10,
    physicalDuration: 10,
    tacticalDuration: 0,
    gameDuration: 20,
    cooldownDuration: 8,
    etiquetteDuration: 4,
    maxDifficulty: 2,
    recommendedSkills: ['dribbling', 'shooting'],
    avoidActivities: ['对抗比赛', '复杂战术', '背后运球'],
    hasEtiquette: true,
  },
  U8: {
    name: 'U8 (7-8岁 小学低年级)',
    minAge: 7,
    maxAge: 8,
    sections: [
      'etiquette',
      'warmup',
      'ball_familiarity',
      'technical',
      'game',
      'cooldown',
      'etiquette',
    ],
    warmupDuration: 6,
    ballFamDuration: 12,
    technicalDuration: 25,
    physicalDuration: 10,
    tacticalDuration: 5,
    gameDuration: 20,
    cooldownDuration: 6,
    etiquetteDuration: 4,
    maxDifficulty: 2,
    recommendedSkills: ['dribbling', 'passing', 'shooting'],
    avoidActivities: ['复杂挡拆'],
    hasEtiquette: true,
  },
  U10: {
    name: 'U10 (9-10岁 小学中年级)',
    minAge: 9,
    maxAge: 10,
    sections: [
      'etiquette',
      'warmup',
      'technical',
      'physical',
      'tactical',
      'game',
      'cooldown',
      'etiquette',
    ],
    warmupDuration: 6,
    ballFamDuration: 5,
    technicalDuration: 25,
    physicalDuration: 15,
    tacticalDuration: 15,
    gameDuration: 18,
    cooldownDuration: 6,
    etiquetteDuration: 4,
    maxDifficulty: 3,
    recommendedSkills: ['dribbling', 'passing', 'shooting', 'defending'],
    avoidActivities: [],
    hasEtiquette: true,
  },
  U12: {
    name: 'U12 (11-12岁 小学高年级/初一)',
    minAge: 11,
    maxAge: 12,
    sections: [
      'etiquette',
      'warmup',
      'technical',
      'physical',
      'tactical',
      'game',
      'cooldown',
      'etiquette',
    ],
    warmupDuration: 6,
    ballFamDuration: 0,
    technicalDuration: 22,
    physicalDuration: 18,
    tacticalDuration: 18,
    gameDuration: 22,
    cooldownDuration: 6,
    etiquetteDuration: 4,
    maxDifficulty: 4,
    recommendedSkills: ['dribbling', 'passing', 'shooting', 'defending', 'tactical'],
    avoidActivities: [],
    hasEtiquette: true,
  },
  U14: {
    name: 'U14 (13-14岁 初二/初三)',
    minAge: 13,
    maxAge: 14,
    sections: [
      'etiquette',
      'warmup',
      'technical',
      'physical',
      'tactical',
      'game',
      'cooldown',
      'etiquette',
    ],
    warmupDuration: 5,
    ballFamDuration: 0,
    technicalDuration: 20,
    physicalDuration: 20,
    tacticalDuration: 22,
    gameDuration: 25,
    cooldownDuration: 5,
    etiquetteDuration: 3,
    maxDifficulty: 5,
    recommendedSkills: ['dribbling', 'passing', 'shooting', 'defending', 'tactical', 'physical'],
    avoidActivities: [],
    hasEtiquette: true,
  },
};

// 主题配置
const THEME_CONFIG = {
  运球基础: {
    skills: ['dribbling'],
    categories: ['technical', 'ball_familiarity'],
    intensity: 'medium',
  },
  传球技术: {
    skills: ['passing'],
    categories: ['technical'],
    intensity: 'medium',
  },
  投篮训练: {
    skills: ['shooting'],
    categories: ['technical'],
    intensity: 'medium',
  },
  防守入门: {
    skills: ['defending'],
    categories: ['technical'],
    intensity: 'medium',
  },
  进攻战术: {
    skills: ['tactical'],
    categories: ['tactical'],
    intensity: 'high',
  },
  防守战术: {
    skills: ['defending', 'tactical'],
    categories: ['tactical'],
    intensity: 'high',
  },
  体能训练: {
    skills: ['physical'],
    categories: ['physical'],
    intensity: 'high',
  },
  综合训练: {
    skills: ['dribbling', 'passing', 'shooting'],
    categories: ['technical', 'game'],
    intensity: 'medium',
  },
  对抗比赛: { skills: [], categories: ['game'], intensity: 'high' },
  考核评估: {
    skills: ['dribbling', 'passing', 'shooting'],
    categories: ['technical'],
    intensity: 'medium',
  },
  球性熟悉: {
    skills: ['dribbling'],
    categories: ['ball_familiarity'],
    intensity: 'low',
  },
  中考体育: {
    skills: ['physical'],
    categories: ['physical'],
    intensity: 'medium',
  },
};

// ============================================
// 教案生成函数
// ============================================

export function generateTrainingPlan(params: {
  group: AgeGroup;
  duration: number;
  location: Location;
  weather?: string;
  theme?: string;
  focusSkills?: string[];
}): TrainingPlanOutput {
  const { group, duration, location, weather, theme, focusSkills = [] } = params;

  const config = AGE_GROUP_CONFIG[group];

  // 确定主题
  const selectedTheme = theme || Object.keys(THEME_CONFIG)[Math.floor(Math.random() * 4)];
  const themeConfig =
    THEME_CONFIG[selectedTheme as keyof typeof THEME_CONFIG] || THEME_CONFIG['综合训练'];

  // 根据主题调整时间分配
  const adjustedDuration = duration || 90;
  const sections: PlanSection[] = [];

  // 1. 课前礼仪
  if (config.hasEtiquette) {
    sections.push({
      name: '课前礼仪',
      category: 'etiquette',
      duration: config.etiquetteDuration,
      activities: selectActivities(ETIQUETTE_ACTIVITIES, 1, config.etiquetteDuration, ['课前礼仪']),
      points: ['师生相互问好', '整理队形'],
    });
  }

  // 2. 热身
  sections.push({
    name: '热身部分',
    category: 'warmup',
    duration: config.warmupDuration,
    activities: selectActivities(
      WARMUP_ACTIVITIES,
      config.maxDifficulty,
      config.warmupDuration,
      themeConfig.categories
    ),
    points: ['注意活动开', '避免受伤'],
  });

  // 3. 球性熟悉（U6/U8为主）
  if (config.ballFamDuration > 0) {
    sections.push({
      name: '球性熟悉',
      category: 'ball_familiarity',
      duration: config.ballFamDuration,
      activities: selectActivities(
        BALL_FAMILIARITY_ACTIVITIES,
        Math.min(config.maxDifficulty, 2),
        config.ballFamDuration,
        themeConfig.categories
      ),
      points: ['左右手均衡', '球感培养'],
    });
  }

  // 4. 技术训练
  if (config.technicalDuration > 0) {
    sections.push({
      name: '技术训练',
      category: 'technical',
      duration: config.technicalDuration,
      activities: selectActivities(
        TECHNICAL_ACTIVITIES,
        config.maxDifficulty,
        config.technicalDuration,
        [...themeConfig.categories, ...focusSkills]
      ),
      points: ['注意动作规范性', '循序渐进'],
    });
  }

  // 5. 体能训练（U10以上）
  if (config.physicalDuration > 0 && group !== 'U6') {
    sections.push({
      name: '体能素质',
      category: 'physical',
      duration: config.physicalDuration,
      activities: selectActivities(
        PHYSICAL_ACTIVITIES,
        config.maxDifficulty,
        config.physicalDuration,
        themeConfig.categories
      ),
      points: ['注意安全', '量力而行'],
    });
  }

  // 6. 战术训练（U8以上）
  if (config.tacticalDuration > 0 && group !== 'U6' && group !== 'U8') {
    sections.push({
      name: '战术训练',
      category: 'tactical',
      duration: config.tacticalDuration,
      activities: selectActivities(
        TACTICAL_ACTIVITIES,
        config.maxDifficulty,
        config.tacticalDuration,
        themeConfig.categories
      ),
      points: ['注意配合', '多沟通'],
    });
  }

  // 7. 对抗比赛
  if (config.gameDuration > 0) {
    sections.push({
      name: '对抗比赛',
      category: 'game',
      duration: config.gameDuration,
      activities: selectActivities(
        GAME_ACTIVITIES,
        config.maxDifficulty,
        config.gameDuration,
        themeConfig.categories
      ),
      points: ['积极防守', '团队配合'],
    });
  }

  // 8. 放松总结
  sections.push({
    name: '放松总结',
    category: 'cooldown',
    duration: config.cooldownDuration,
    activities: selectActivities(COOLDOWN_ACTIVITIES, 1, config.cooldownDuration, ['cooldown']),
    points: ['静态拉伸', '总结本课', '布置作业'],
  });

  // 9. 课后礼仪
  if (config.hasEtiquette) {
    sections.push({
      name: '课后礼仪',
      category: 'etiquette',
      duration: config.etiquetteDuration,
      activities: selectActivities(ETIQUETTE_ACTIVITIES, 1, config.etiquetteDuration, ['课后礼仪']),
      points: ['感谢教练', '礼貌告别'],
    });
  }

  // 计算总时长
  const actualDuration = sections.reduce((sum, s) => sum + s.duration, 0);

  // 生成标题
  const themeNames: Record<string, string> = {
    运球基础: '运球进阶',
    传球技术: '传球配合',
    投篮训练: '投篮强化',
    防守入门: '防守提升',
    进攻战术: '进攻战术',
    防守战术: '防守体系',
    体能训练: '体能强化',
    综合训练: '综合训练',
    对抗比赛: '实战对抗',
    考核评估: '技能考核',
    球性熟悉: '球性培养',
    中考体育: '体测训练',
  };

  const title = `${config.name} - ${themeNames[selectedTheme] || selectedTheme}`;

  // 生成备注
  const notes = generateNotes(group, location, weather, sections);

  // 合并所有技能作为重点
  const allFocusSkills = Array.from(new Set([...themeConfig.skills, ...focusSkills]));

  return {
    title,
    date: new Date().toISOString().split('T')[0],
    duration: actualDuration,
    group,
    location,
    weather,
    theme: selectedTheme,
    focusSkills: allFocusSkills,
    intensity: themeConfig.intensity as Intensity,
    sections,
    notes,
  };
}

// 选择合适的活动
function selectActivities(
  pool: Omit<TrainingActivity, 'id'>[],
  maxDifficulty: number,
  targetDuration: number,
  preferredCategories: string[]
): SectionActivity[] {
  const result: SectionActivity[] = [];
  let usedTime = 0;

  // 优先选择匹配类别的活动
  const preferred = pool.filter(
    a =>
      a.difficulty <= maxDifficulty &&
      (preferredCategories.includes(a.category) || preferredCategories.length === 0)
  );

  const others = pool.filter(
    a => a.difficulty <= maxDifficulty && !preferredCategories.includes(a.category)
  );

  const sorted = [...preferred, ...others];

  for (const activity of sorted) {
    if (usedTime + activity.duration > targetDuration + 3) continue;
    if (result.length >= 4) break;

    result.push({
      name: activity.name,
      duration: activity.duration,
      description: activity.description,
      keyPoints: activity.keyPoints || [],
      equipment: activity.equipment,
      form: activity.form,
      coachGuide: activity.coachGuide,
    });
    usedTime += activity.duration;
  }

  // 如果时间不够，调整最后一个活动
  if (usedTime < targetDuration - 2 && result.length > 0) {
    const lastActivity = result[result.length - 1];
    lastActivity.duration = targetDuration - (usedTime - lastActivity.duration);
  }

  return result;
}

// 生成备注
function generateNotes(
  group: AgeGroup,
  location: Location,
  weather: string | undefined,
  sections: PlanSection[]
): string {
  const notes: string[] = [];

  // 年龄段注意事项
  if (group === 'U6') {
    notes.push('幼儿班以游戏为主，注意时长控制');
    notes.push('多鼓励、少批评，保护孩子自信心');
    notes.push('每5-8分钟休息一次');
  } else if (group === 'U8') {
    notes.push('加强球性熟悉，注意手部力量训练');
    notes.push('培养基本功，循序渐进');
  } else if (group === 'U10') {
    notes.push('开始加入体能训练');
    notes.push('技术动作规范化');
  }

  // 场地天气
  if (location === '室外') {
    if (weather === '晴天') {
      notes.push('注意防晒，每15分钟补充水分');
      notes.push('避免长时间阳光直射');
    }
    if (weather === '阴天') {
      notes.push('注意保暖，活动后及时穿衣');
    }
    if (weather === '雨天') {
      notes.push('建议改室内，或减少对抗');
      notes.push('注意场地湿滑');
    }
  }

  // 安全提示
  notes.push('训练前检查场地，确保无安全隐患');
  notes.push('准备急救箱');
  notes.push('关注学员状态，及时调整强度');

  return notes.join('；');
}

// ============================================
// 辅助函数
// ============================================

export function getAgeGroupInfo(group: AgeGroup) {
  return AGE_GROUP_CONFIG[group];
}

export function getThemeList(): string[] {
  return Object.keys(THEME_CONFIG);
}

export function getActivityCategories(): string[] {
  return [
    'warmup',
    'ball_familiarity',
    'technical',
    'physical',
    'tactical',
    'game',
    'cooldown',
    'etiquette',
  ];
}

export function getSectionName(category: string): string {
  const names: Record<string, string> = {
    warmup: '热身部分',
    ball_familiarity: '球性熟悉',
    technical: '技术训练',
    physical: '体能素质',
    tactical: '战术训练',
    game: '对抗比赛',
    cooldown: '放松总结',
    etiquette: '礼仪',
  };
  return names[category] || category;
}
