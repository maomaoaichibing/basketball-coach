'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/auth';
import { useCloudVoiceRecognition } from '@/hooks/useCloudVoiceRecognition';
import {
  ArrowLeft,
  Plus,
  Save,
  Calendar,
  Clock,
  MapPin,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  Search,
  X,
  Users,
  Check,
} from 'lucide-react';

import {
  generateTrainingPlan,
  type AgeGroup,
  type Location,
  type TrainingPlanOutput,
} from '@/lib/plan-generator';

// 学员类型
interface Player {
  id: string;
  name: string;
  group: string;
  age: number;
  status: string;
}

export default function NewPlanPage() {
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<TrainingPlanOutput | null>(null);
  const [useAI, setUseAI] = useState(false); // 是否使用AI生成
  const [configCollapsed, setConfigCollapsed] = useState(false); // 配置面板折叠状态

  // 学员选择状态
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [voiceMatchResult, setVoiceMatchResult] = useState<{
    matched: Player[];
    unmatched: string[];
  } | null>(null);
  const playerDropdownRef = useRef<HTMLDivElement>(null);

  // 语音识别
  const voice = useCloudVoiceRecognition();

  // 表单状态
  const [form, setForm] = useState({
    group: 'U10' as AgeGroup,
    duration: 90,
    location: '室内' as Location,
    weather: '',
    themes: [] as string[],
  });

  // AI特有配置
  const [aiConfig, setAiConfig] = useState({
    additionalNotes: '',
    playerCount: '',
    skillLevel: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    intensity: 'medium' as 'low' | 'medium' | 'high',
    previousTraining: '',
    enableWeaknessAnalysis: false, // 是否根据学员薄弱环节生成教案
  });

  const [focusSkills, setFocusSkills] = useState<string[]>([]);

  // 加载学员列表
  useEffect(() => {
    async function loadPlayers() {
      try {
        const res = await fetchWithAuth('/api/players?status=training&limit=200');
        const data = await res.json();
        if (data.success) {
          setAllPlayers(data.players);
        }
      } catch (err) {
        console.error('加载学员列表失败:', err);
      }
    }
    loadPlayers();
  }, []);

  // 根据年龄段过滤学员
  const filteredPlayers = allPlayers.filter(
    (p) => p.group === form.group && p.name.includes(playerSearch)
  );

  // 已选学员对象
  const selectedPlayers = allPlayers.filter((p) => selectedPlayerIds.includes(p.id));

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (playerDropdownRef.current && !playerDropdownRef.current.contains(e.target as Node)) {
        setShowPlayerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 切换学员选中
  function togglePlayer(playerId: string) {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  }

  // 语音录入学员
  const handleVoicePlayerInput = useCallback(async () => {
    try {
      await voice.startRecording();
    } catch (err) {
      console.error('启动录音失败:', err);
    }
  }, [voice]);

  useEffect(() => {
    if (!voice.transcript) return;

    // 解析语音识别结果中的学员名字
    // 支持多种分隔符：顿号、逗号、空格、"和"、"跟"
    const text = voice.transcript;
    const nameParts = text
      .replace(/[，、,，]/g, ' ')
      .replace(/[和跟与及]/g, ' ')
      .replace(/今天上课|今天来|到了|参加|上课/g, '')
      .split(/\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 1 && s.length <= 5); // 名字长度1-5

    if (nameParts.length === 0) return;

    // 在当前年龄段的学员中匹配
    const groupPlayers = allPlayers.filter((p) => p.group === form.group);
    const matched: Player[] = [];
    const unmatched: string[] = [];

    for (const name of nameParts) {
      const found = groupPlayers.find((p) => p.name === name);
      if (found) {
        if (!matched.some((m) => m.id === found.id)) {
          matched.push(found);
        }
      } else {
        // 模糊匹配
        const fuzzy = groupPlayers.find((p) => p.name.includes(name) || name.includes(p.name));
        if (fuzzy) {
          if (!matched.some((m) => m.id === fuzzy.id)) {
            matched.push(fuzzy);
          }
        } else {
          if (!unmatched.includes(name)) {
            unmatched.push(name);
          }
        }
      }
    }

    setVoiceMatchResult({ matched, unmatched });

    // 自动选中的学员
    if (matched.length > 0) {
      setSelectedPlayerIds((prev) => {
        const newIds = new Set(prev);
        matched.forEach((p) => newIds.add(p.id));
        return Array.from(newIds);
      });
    }
  }, [voice.transcript, allPlayers, form.group]);

  // 当学员人数变化时，同步到AI配置
  useEffect(() => {
    if (selectedPlayerIds.length > 0) {
      setAiConfig((prev) => ({ ...prev, playerCount: String(selectedPlayerIds.length) }));
    }
  }, [selectedPlayerIds]);

  const groups: { id: AgeGroup; name: string; age: string; desc: string }[] = [
    { id: 'U6', name: 'U6 幼儿班', age: '4-6岁', desc: '游戏为主 球性培养' },
    {
      id: 'U8',
      name: 'U8 小学低年级',
      age: '7-8岁',
      desc: '基础运球 传球入门',
    },
    {
      id: 'U10',
      name: 'U10 小学中年级',
      age: '9-10岁',
      desc: '技术规范 体能加入',
    },
    {
      id: 'U12',
      name: 'U12 小学高年级',
      age: '11-12岁',
      desc: '战术训练 对抗加强',
    },
    { id: 'U14', name: 'U14 初中', age: '13-14岁', desc: '综合提升 中考体育' },
  ];

  const durations = [60, 90, 120];
  const locations: Location[] = ['室内', '室外'];
  const weathers = ['', '晴天', '阴天', '雨天', '雪天'];
  const themes = [
    '',
    '运球基础',
    '传球技术',
    '投篮训练',
    '防守入门',
    '进攻战术',
    '防守战术',
    '体能训练',
    '综合训练',
    '对抗比赛',
    '考核评估',
    '球性熟悉',
    '中考体育',
  ];
  const skillOptions = ['运球', '传球', '投篮', '防守', '体能', '战术'];

  // 生成教案
  async function handleGenerate() {
    setGenerating(true);

    try {
      let result: TrainingPlanOutput;

      if (useAI) {
        // AI生成（通过服务端API代理）
        const aiParams = {
          group: form.group,
          duration: form.duration,
          location: form.location,
          weather: form.weather || undefined,
          theme: form.themes.length > 0 ? form.themes.join('+') : undefined,
          focusSkills,
          additionalNotes: aiConfig.additionalNotes || undefined,
          playerCount:
            selectedPlayerIds.length > 0
              ? selectedPlayerIds.length
              : aiConfig.playerCount
                ? parseInt(aiConfig.playerCount)
                : undefined,
          skillLevel: aiConfig.skillLevel,
          intensity: aiConfig.intensity,
          previousTraining: aiConfig.previousTraining
            ? aiConfig.previousTraining.split(/[,，]/).map((s) => s.trim())
            : undefined,
          // 传递选中学员ID（仅开关开启且有学员时）
          playerIds:
            aiConfig.enableWeaknessAnalysis && selectedPlayerIds.length > 0
              ? selectedPlayerIds
              : undefined,
        };

        // 调用服务端API生成教案
        const response = await fetchWithAuth('/api/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(aiParams),
        });
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'AI生成失败');
        }
        result = data.plan;
      } else {
        // 规则引擎生成
        await new Promise((resolve) => setTimeout(resolve, 800));
        result = generateTrainingPlan({
          group: form.group,
          duration: form.duration,
          location: form.location,
          weather: form.weather || undefined,
          theme: form.themes.length > 0 ? form.themes.join('+') : undefined,
          focusSkills,
        });
      }

      setPlan(result);
    } catch (error) {
      console.error('生成教案失败:', error);
      alert('生成教案失败，请重试');
    } finally {
      setGenerating(false);
    }
  }

  // 保存教案
  async function handleSave() {
    if (!plan) return;

    setSaving(true);

    try {
      const response = await fetchWithAuth('/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...plan,
          generatedBy: useAI ? 'ai' : 'rule',
          playerIds: selectedPlayerIds,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const msg =
          selectedPlayerIds.length > 0
            ? `教案保存成功！已为 ${data.attendanceCount} 名学员自动签到`
            : '教案保存成功！';
        alert(msg);
        // 跳转到教案详情页
        window.location.href = `/plans/${data.id}`;
      } else {
        alert('保存失败：' + data.error);
      }
    } catch (error) {
      console.error('保存教案失败:', error);
      alert('保存教案失败，请重试');
    } finally {
      setSaving(false);
    }
  }

  // 技能选择切换
  function toggleSkill(skill: string) {
    setFocusSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  // 获取天气图标
  const getWeatherIcon = (w: string) => {
    switch (w) {
      case '晴天':
        return <Sun className="w-5 h-5 text-yellow-500" />;
      case '阴天':
        return <Cloud className="w-5 h-5 text-gray-500" />;
      case '雨天':
        return <CloudRain className="w-5 h-5 text-blue-500" />;
      case '雪天':
        return <Snowflake className="w-5 h-5 text-blue-300" />;
      default:
        return null;
    }
  };

  // 获取环节颜色
  const getSectionColor = (category: string) => {
    switch (category) {
      case 'warmup':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'ball_familiarity':
        return 'bg-amber-100 border-amber-300 text-amber-800';
      case 'technical':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'physical':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'tactical':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'game':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'cooldown':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'etiquette':
        return 'bg-pink-100 border-pink-300 text-pink-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  // 获取环节名称
  const getSectionLabel = (category: string) => {
    const labels: Record<string, string> = {
      warmup: '热身',
      ball_familiarity: '球性',
      technical: '技术',
      physical: '体能',
      tactical: '战术',
      game: '对抗',
      cooldown: '放松',
      etiquette: '礼仪',
    };
    return labels[category] || category;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">生成新教案</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：配置表单 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
              {/* 移动端折叠标题栏 + 切换按钮 */}
              <div className="lg:hidden flex items-center justify-between mb-0">
                <h2 className="font-semibold text-gray-900">训练配置</h2>
                <div className="flex items-center gap-2">
                  {/* 移动端生成模式切换 */}
                  <button
                    onClick={() => setUseAI(!useAI)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                      useAI
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {useAI ? (
                      <>
                        <Sparkles className="w-3 h-3" />
                        AI
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        规则
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setConfigCollapsed(!configCollapsed)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {configCollapsed ? '展开' : '收起'}
                    {configCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 配置内容 - 移动端可折叠 */}
              <div className={`${configCollapsed ? 'hidden' : 'block'} lg:block`}>
                {/* 桌面端标题栏 */}
                <div className="hidden lg:flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">训练配置</h2>
                  {/* 生成模式切换 */}
                  <button
                    onClick={() => setUseAI(!useAI)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      useAI
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {useAI ? (
                      <>
                        <Sparkles className="w-4 h-4" />
                        AI生成
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        规则生成
                      </>
                    )}
                  </button>
                </div>

                {/* ========== 参训学员选择 ========== */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    参训学员
                    {selectedPlayerIds.length > 0 && (
                      <span className="ml-2 text-xs text-orange-500 font-normal">
                        已选 {selectedPlayerIds.length} 人
                      </span>
                    )}
                  </label>

                  {/* 语音录入 + 搜索栏 */}
                  <div className="flex gap-2 mb-2">
                    {/* 语音按钮 */}
                    <button
                      onClick={async () => {
                        if (voice.isRecording) {
                          await voice.stopRecording();
                        } else {
                          setVoiceMatchResult(null);
                          await handleVoicePlayerInput();
                        }
                      }}
                      disabled={voice.isRecognizing}
                      className={`flex-shrink-0 p-2.5 rounded-lg transition-all ${
                        voice.isRecording
                          ? 'bg-red-500 text-white animate-pulse'
                          : voice.isRecognizing
                            ? 'bg-purple-100 text-purple-500'
                            : 'bg-blue-50 text-blue-500 hover:bg-blue-100'
                      } disabled:opacity-50`}
                      title={voice.isRecording ? '点击停止录音' : '语音录入学员'}
                    >
                      {voice.isRecording ? (
                        <MicOff className="w-5 h-5" />
                      ) : (
                        <Mic className="w-5 h-5" />
                      )}
                    </button>

                    {/* 搜索输入 */}
                    <div className="flex-1 relative" ref={playerDropdownRef}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={playerSearch}
                          onChange={(e) => {
                            setPlayerSearch(e.target.value);
                            setShowPlayerDropdown(true);
                          }}
                          onFocus={() => setShowPlayerDropdown(true)}
                          placeholder="搜索学员姓名..."
                          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {playerSearch && (
                          <button
                            onClick={() => {
                              setPlayerSearch('');
                              setShowPlayerDropdown(false);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* 学员下拉列表 */}
                      {showPlayerDropdown && playerSearch && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredPlayers.length === 0 ? (
                            <div className="p-3 text-sm text-gray-500 text-center">
                              未找到匹配的学员
                            </div>
                          ) : (
                            filteredPlayers.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => {
                                  togglePlayer(p.id);
                                  setPlayerSearch('');
                                  setShowPlayerDropdown(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50 ${
                                  selectedPlayerIds.includes(p.id)
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700'
                                }`}
                              >
                                <span>{p.name}</span>
                                <span className="text-xs text-gray-400">
                                  {p.group} · {p.age}岁
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 语音状态提示 */}
                  {voice.isRecording && (
                    <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-600">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      正在录音，请说出学员姓名...
                    </div>
                  )}
                  {voice.isRecognizing && (
                    <div className="mb-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2 text-sm text-purple-600">
                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                      正在识别语音...
                    </div>
                  )}
                  {voice.error && (
                    <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                      {voice.error}
                    </div>
                  )}

                  {/* 语音匹配结果 */}
                  {voiceMatchResult && (
                    <div className="mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                      <div className="text-blue-700 mb-1">语音识别结果：</div>
                      {voiceMatchResult.matched.length > 0 && (
                        <div className="text-green-700">
                          ✓ 已匹配：{voiceMatchResult.matched.map((p) => p.name).join('、')}
                        </div>
                      )}
                      {voiceMatchResult.unmatched.length > 0 && (
                        <div className="text-red-600 mt-1">
                          ✗ 未找到：{voiceMatchResult.unmatched.join('、')}
                          <span className="text-gray-500">（请手动添加）</span>
                        </div>
                      )}
                      <button
                        onClick={() => setVoiceMatchResult(null)}
                        className="mt-1 text-blue-500 hover:text-blue-700 text-xs"
                      >
                        关闭提示
                      </button>
                    </div>
                  )}

                  {/* 已选学员列表 */}
                  {selectedPlayers.length > 0 ? (
                    <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
                      {selectedPlayers.map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          {p.name}
                          <button
                            onClick={() => togglePlayer(p.id)}
                            className="text-blue-400 hover:text-blue-700 ml-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 px-1">
                      点击搜索添加学员，或按住 🎤 语音录入
                    </div>
                  )}
                </div>

                {/* ========== 以下为原有配置（未修改） ========== */}

                {/* 年龄段 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">年龄段</label>
                  <div className="grid grid-cols-1 gap-2">
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setForm({ ...form, group: g.id })}
                        className={`p-2 rounded-lg text-center transition-all ${
                          form.group === g.id
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <div className="font-bold text-left">{g.name}</div>
                        <div className="text-xs text-left opacity-80">
                          {g.age} · {g.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 时长 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">训练时长</label>
                  <div className="flex gap-2">
                    {durations.map((d) => (
                      <button
                        key={d}
                        onClick={() => setForm({ ...form, duration: d })}
                        className={`flex-1 p-2 rounded-lg text-center transition-all flex items-center justify-center gap-1 ${
                          form.duration === d
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        {d}分钟
                      </button>
                    ))}
                  </div>
                </div>

                {/* 训练强度 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">训练强度</label>
                  <div className="flex gap-2">
                    {(
                      [
                        {
                          value: 'low',
                          label: '低强度',
                          color: 'bg-green-500',
                          hover: 'hover:bg-green-600',
                        },
                        {
                          value: 'medium',
                          label: '中强度',
                          color: 'bg-yellow-500',
                          hover: 'hover:bg-yellow-600',
                        },
                        {
                          value: 'high',
                          label: '高强度',
                          color: 'bg-red-500',
                          hover: 'hover:bg-red-600',
                        },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setAiConfig({ ...aiConfig, intensity: opt.value })}
                        className={`flex-1 p-2 rounded-lg text-center transition-all text-sm font-medium ${
                          aiConfig.intensity === opt.value
                            ? `${opt.color} text-white`
                            : `bg-gray-100 text-gray-700 ${opt.hover}`
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 场地 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">训练场地</label>
                  <div className="flex gap-2">
                    {locations.map((l) => (
                      <button
                        key={l}
                        onClick={() => setForm({ ...form, location: l })}
                        className={`flex-1 p-2 rounded-lg text-center transition-all flex items-center justify-center gap-1 ${
                          form.location === l
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <MapPin className="w-4 h-4" />
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 天气 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    天气（可选）
                  </label>
                  <select
                    value={form.weather}
                    onChange={(e) => setForm({ ...form, weather: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">请选择</option>
                    {weathers
                      .filter((w) => w)
                      .map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                  </select>
                </div>

                {/* 主题（多选） */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    训练主题（可多选，支持一节课练多个内容）
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {themes
                      .filter((t) => t)
                      .map((t) => (
                        <button
                          key={t}
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              themes: f.themes.includes(t)
                                ? f.themes.filter((x) => x !== t)
                                : [...f.themes, t],
                            }))
                          }
                          className={`px-3 py-1 rounded-full text-sm transition-all ${
                            form.themes.includes(t)
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                  </div>
                </div>

                {/* 重点技能 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    重点训练技能
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {skillOptions.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleSkill(s)}
                        className={`px-3 py-1 rounded-full text-sm transition-all ${
                          focusSkills.includes(s)
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI专属配置 */}
                {useAI && (
                  <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-3 text-purple-700">
                      <Sparkles className="w-4 h-4" />
                      <span className="font-medium text-sm">AI生成配置</span>
                    </div>

                    {/* 学员人数 - 自动从选择学员同步 */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        学员人数 <span className="text-orange-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        placeholder="请填写"
                        value={aiConfig.playerCount}
                        onChange={(e) =>
                          setAiConfig({
                            ...aiConfig,
                            playerCount: e.target.value,
                          })
                        }
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                          !aiConfig.playerCount
                            ? 'border-orange-300 bg-orange-50'
                            : 'border-gray-300'
                        }`}
                      />
                      {!aiConfig.playerCount ? (
                        <p className="mt-1 text-xs text-orange-600">
                          请填写学员人数，AI将据此调整训练分组和强度
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-green-600">
                          已设置 {aiConfig.playerCount} 名学员
                          {selectedPlayerIds.length > 0 && `（从学员选择自动同步）`}
                        </p>
                      )}
                    </div>

                    {/* 技能水平 */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        学员水平
                      </label>
                      <select
                        value={aiConfig.skillLevel}
                        onChange={(e) =>
                          setAiConfig({
                            ...aiConfig,
                            skillLevel: e.target.value as 'beginner' | 'intermediate' | 'advanced',
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      >
                        <option value="beginner">基础</option>
                        <option value="intermediate">进阶</option>
                        <option value="advanced">精英</option>
                      </select>
                    </div>

                    {/* 最近训练 */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        最近训练内容（避免重复）
                      </label>
                      <input
                        type="text"
                        placeholder="如：运球, 传球"
                        value={aiConfig.previousTraining}
                        onChange={(e) =>
                          setAiConfig({
                            ...aiConfig,
                            previousTraining: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                    </div>

                    {/* 薄弱环节分析开关 */}
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={aiConfig.enableWeaknessAnalysis}
                          onChange={(e) =>
                            setAiConfig({
                              ...aiConfig,
                              enableWeaknessAnalysis: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-xs font-medium text-gray-700">
                          根据学员薄弱环节生成教案
                        </span>
                      </label>
                      <p className="text-xs text-gray-400 mt-1 ml-6">
                        {selectedPlayerIds.length === 0
                          ? '需先选择参训学员'
                          : `已选 ${selectedPlayerIds.length} 名学员，将分析其技能短板并针对性调整训练内容`}
                      </p>
                    </div>

                    {/* 其他要求 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        其他要求
                      </label>
                      <textarea
                        placeholder="如：重点培养团队协作，增加趣味性..."
                        value={aiConfig.additionalNotes}
                        onChange={(e) =>
                          setAiConfig({
                            ...aiConfig,
                            additionalNotes: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* 生成按钮 */}
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className={`w-full py-3 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                    useAI
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  {generating ? (
                    <>生成中...</>
                  ) : useAI ? (
                    <>
                      <Sparkles className="w-5 h-5" />
                      AI生成教案
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      生成教案
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：教案预览 */}
          <div className="lg:col-span-2">
            {plan ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* 教案头部 */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">{plan.title}</h2>
                      <p className="text-orange-100">
                        {plan.date} · {plan.duration}分钟 · {plan.location}
                        {plan.weather && ` · ${plan.weather}`}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {/* 学员水平标签 */}
                      {plan.skillLevel && (
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            plan.skillLevel === 'advanced'
                              ? 'bg-indigo-500'
                              : plan.skillLevel === 'intermediate'
                                ? 'bg-blue-500'
                                : 'bg-cyan-500'
                          } text-white`}
                        >
                          {plan.skillLevel === 'advanced'
                            ? '精英'
                            : plan.skillLevel === 'intermediate'
                              ? '进阶'
                              : '基础'}
                        </span>
                      )}
                      {/* 训练强度标签 */}
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          plan.intensity === 'high'
                            ? 'bg-red-600'
                            : plan.intensity === 'medium'
                              ? 'bg-yellow-600'
                              : 'bg-green-600'
                        } text-white`}
                      >
                        {plan.intensity === 'high'
                          ? '高强度'
                          : plan.intensity === 'medium'
                            ? '中强度'
                            : '低强度'}
                      </span>
                    </div>
                  </div>

                  {/* 参训学员展示 */}
                  {selectedPlayers.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/30">
                      <div className="flex items-center gap-2 text-orange-100 text-sm mb-2">
                        <Users className="w-4 h-4" />
                        参训学员（{selectedPlayers.length}人）
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPlayers.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-sm"
                          >
                            <Check className="w-3 h-3" />
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 重点技能标签 */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(plan.focusSkills || []).map((skill) => (
                      <span key={skill} className="px-2 py-1 bg-white/20 rounded text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 训练内容 */}
                <div className="p-6 space-y-4">
                  {plan.sections.map((section, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg border-2 p-4 ${getSectionColor(section.category)}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-lg">{section.name}</h3>
                        <span className="text-sm font-medium bg-white/50 px-2 py-1 rounded">
                          {section.duration}分钟
                        </span>
                      </div>

                      {/* 第一节显示训练递进说明（仅在第一节顶部显示一次） */}
                      {idx === 0 && plan.trainingProgression && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="text-sm font-medium text-blue-800 mb-2">
                            📈 训练递进关联说明
                          </div>
                          <div className="text-xs text-blue-700 whitespace-pre-line leading-relaxed">
                            {plan.trainingProgression}
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        {section.activities.map((activity, aIdx) => (
                          <div key={aIdx} className="bg-white/60 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{activity.name}</span>
                              <span className="text-sm text-gray-500">{activity.duration}分钟</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{activity.description}</p>

                            {/* 关联提示 - 在热身为后面的训练做准备时显示 */}
                            {activity.relatedTo && (
                              <div className="mt-1 mb-2">
                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                  💡 {activity.relatedTo}
                                </span>
                              </div>
                            )}
                            {activity.keyPoints && activity.keyPoints.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {activity.keyPoints.map((point, pIdx) => (
                                  <span
                                    key={pIdx}
                                    className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded"
                                  >
                                    {point}
                                  </span>
                                ))}
                              </div>
                            )}
                            {activity.equipment && activity.equipment.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                器材：{activity.equipment.join('、')}
                              </div>
                            )}

                            {/* 动作图解 */}
                            {activity.drillDiagram && (
                              <div className="mt-3 bg-white rounded-lg border border-gray-200 p-3">
                                <div className="text-xs font-medium text-gray-600 mb-2">
                                  动作路线示意图
                                </div>
                                <div
                                  className="flex justify-center"
                                  dangerouslySetInnerHTML={{ __html: activity.drillDiagram }}
                                />
                              </div>
                            )}

                            {/* 组数、次数、递进式 */}
                            {(activity.sets || activity.repetitions || activity.progression) && (
                              <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
                                {activity.sets && (
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-700">组数：</span>
                                    <span className="text-gray-600">{activity.sets}</span>
                                  </div>
                                )}
                                {activity.repetitions && (
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-700">次数/时间：</span>
                                    <span className="text-gray-600">{activity.repetitions}</span>
                                  </div>
                                )}
                                {activity.progression && (
                                  <div className="mt-1">
                                    <div className="font-medium text-gray-700 mb-1">
                                      递进式设计：
                                    </div>
                                    <div className="text-gray-600 whitespace-pre-line">
                                      {activity.progression}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {section.points && section.points.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-black/10">
                          <p className="text-sm font-medium">重点：{section.points.join(' · ')}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 备注 */}
                {plan.notes && (
                  <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-2">注意事项</h3>
                    <p className="text-sm text-gray-600">{plan.notes}</p>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="p-6 border-t border-gray-100 flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>保存中...</>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {selectedPlayerIds.length > 0
                          ? `保存教案并签到（${selectedPlayerIds.length}人）`
                          : '保存教案'}
                      </>
                    )}
                  </button>
                  <button className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors">
                    导出PDF
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">等待生成教案</h3>
                <p className="text-gray-500 mb-4">
                  请在左侧配置训练参数
                  <br />
                  然后点击"生成教案"
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
