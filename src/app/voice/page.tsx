'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Mic,
  MicOff,
  Volume2,
  User,
  Sparkles,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  BookOpen,
  Cloud,
  WifiOff,
} from 'lucide-react';
import { useCloudVoiceRecognition } from '@/hooks/useCloudVoiceRecognition';
import { parseVoiceCommand } from '@/hooks/useVoiceInput';
import { fetchWithAuth } from '@/lib/auth';

// 学员类型
interface Player {
  id: string;
  name: string;
  group: string;
  status: string;
  dribbling: number;
  passing: number;
  shooting: number;
  defending: number;
  physical: number;
  tactical: number;
  lastTraining?: string;
  trainingCount?: number;
  weakSkills?: string[];
}

interface ParsedCommand {
  action: 'attendance' | 'create_plan' | 'query_player' | 'unknown';
  playerName?: string;
  players?: Player[];
  ageGroup?: string;
  skills?: string[];
  raw: string;
}

export default function VoicePlanPage() {
  const [step, setStep] = useState<'voice' | 'confirm' | 'generating' | 'success'>('voice');
  const [recognizedText, setRecognizedText] = useState('');
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [generatedPlanId, setGeneratedPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const voice = useCloudVoiceRecognition();

  // 查询学员
  const queryPlayers = useCallback(async (name: string) => {
    try {
      const response = await fetch(`/api/players?q=${encodeURIComponent(name)}`);
      const data = await response.json();

      if (data.success && data.players && data.players.length > 0) {
        const players: Player[] = data.players;
        setParsedCommand({
          action: 'attendance',
          playerName: name,
          players,
          raw: recognizedText,
        });
        setSelectedPlayers(players);
        setStep('confirm');
        speak(`找到${players.length}位学员：${players.map((p) => p.name).join('、')}`);
      } else {
        setError(`未找到名为"${name}"的学员`);
        speak(`抱歉，未找到名为${name}的学员`);
      }
    } catch (err) {
      console.error('查询学员失败:', err);
      setError('查询学员失败，请重试');
    }
  }, [recognizedText, speak]);

  // 查询所有学员
  const queryAllPlayers = useCallback(async (ageGroup?: string, skills?: string[]) => {
    try {
      const response = await fetchWithAuth('/api/players');
      const data = await response.json();

      if (data.success && data.players && data.players.length > 0) {
        let players: Player[] = data.players;

        if (ageGroup) {
          players = players.filter((p) => p.group.toUpperCase() === ageGroup.toUpperCase());
        }

        if (skills && skills.length > 0) {
          players = players
            .map((p) => {
              const weakSkills: string[] = [];
              skills.forEach((skill) => {
                const skillKey = skillToKey(skill);
                if (skillKey && (p[skillKey as keyof Player] as number) < 5) {
                  weakSkills.push(skill);
                }
              });
              return { ...p, weakSkills };
            })
            .filter((p) => p.weakSkills && p.weakSkills.length > 0);
        }

        if (players.length === 0) {
          players = data.players.filter((p: Player) => p.group === 'U10').slice(0, 5);
        }

        setParsedCommand({
          action: 'create_plan',
          players,
          ageGroup,
          skills,
          raw: recognizedText,
        });
        setSelectedPlayers(players);
        setStep('confirm');
        speak(`将为${players.length}位学员生成教案`);
      } else {
        setError('系统中没有学员数据');
        speak('抱歉，系统中还没有学员数据');
      }
    } catch (err) {
      console.error('查询学员失败:', err);
      setError('查询学员失败，请重试');
    }
  }, [recognizedText, speak]);

  // 处理识别结果
  const processRecognizedText = useCallback((text: string) => {
    const parsed = parseVoiceCommand(text);
    console.log('解析结果:', parsed);

    if (parsed.action === 'attendance' && parsed.playerName) {
      queryPlayers(parsed.playerName);
    } else if (parsed.action === 'create_plan') {
      queryAllPlayers(parsed.ageGroup, parsed.skills);
    } else {
      setParsedCommand(parsed);
      if (parsed.action === 'unknown' || !parsed.playerName) {
        setError('没有识别到有效指令，请再说一遍');
      }
    }
  }, [queryPlayers, queryAllPlayers]);

  // 开始录音
  const handleStartRecording = useCallback(async () => {
    setError(null);
    setRecognizedText('');
    await voice.startRecording();
  }, [voice]);

  // 停止录音并处理结果
  const handleStopRecording = useCallback(async () => {
    setError(null);
    const text = await voice.stopRecording();

    if (text) {
      setRecognizedText(text);
      processRecognizedText(text);
    }
  }, [voice, processRecognizedText]);

  function skillToKey(skill: string): string {
    const map: Record<string, string> = {
      运球: 'dribbling',
      传球: 'passing',
      投篮: 'shooting',
      防守: 'defending',
      体能: 'physical',
      战术: 'tactical',
    };
    return map[skill] || '';
  }

  // 语音播报
  function speak(text: string) {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  // 生成教案
  async function handleGeneratePlan() {
    if (selectedPlayers.length === 0) return;

    setStep('generating');
    speak('正在根据学员情况生成教案，请稍候');

    try {
      const mainPlayer = selectedPlayers[0];

      const response = await fetchWithAuth('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ageGroup: mainPlayer.group,
          duration: 90,
          focusSkills: mainPlayer.weakSkills || ['运球'],
          playerCount: selectedPlayers.length,
          playerNames: selectedPlayers.map((p) => p.name),
        }),
      });

      const data = await response.json();

      if (data.success && data.plan) {
        const saveResponse = await fetchWithAuth('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data.plan,
            generatedBy: 'ai',
            title: `${mainPlayer.group}训练教案 - ${selectedPlayers.map((p) => p.name).join('、')}`,
          }),
        });

        const saveData = await saveResponse.json();

        if (saveData.success) {
          setGeneratedPlanId(saveData.id);
          setStep('success');
          speak(`教案生成成功！已为${selectedPlayers.map((p) => p.name).join('、')}创建训练教案`);
        } else {
          throw new Error('保存教案失败');
        }
      } else {
        throw new Error(data.error || '生成教案失败');
      }
    } catch (err: unknown) {
      console.error('生成教案失败:', err);
      const errorMessage = err instanceof Error ? err.message : '生成教案失败，请重试';
      setError(errorMessage);
      setStep('confirm');
      speak('抱歉，生成教案失败，请重试');
    }
  }

  function togglePlayer(player: Player) {
    setSelectedPlayers((prev) => {
      const isSelected = prev.some((p) => p.id === player.id);
      if (isSelected) {
        return prev.filter((p) => p.id !== player.id);
      } else {
        return [...prev, player];
      }
    });
  }

  // 重置到初始状态
  function resetToVoice() {
    setStep('voice');
    setRecognizedText('');
    setParsedCommand(null);
    setSelectedPlayers([]);
    setGeneratedPlanId(null);
    setError(null);
    voice.reset();
  }

  // 状态文本
  const getStatusText = () => {
    if (voice.error) return voice.error;
    if (voice.isRecording) return '正在录音...松开结束';
    if (voice.isRecognizing) return '正在识别语音...';
    return '按住开始语音输入';
  };

  const getStatusIcon = () => {
    if (voice.error) return <WifiOff className="w-6 h-6 text-red-400" />;
    if (voice.isRecording) return <MicOff className="w-8 h-8 text-white animate-pulse" />;
    if (voice.isRecognizing) return <Loader2 className="w-6 h-6 text-white animate-spin" />;
    return <Mic className="w-8 h-8 text-white" />;
  };

  const getButtonStyle = () => {
    if (voice.error || !voice.isSupported) {
      return 'bg-gray-400 cursor-not-allowed';
    }
    if (voice.isRecording) {
      return 'bg-red-500 shadow-lg shadow-red-500/50 scale-110';
    }
    if (voice.isRecognizing) {
      return 'bg-blue-500 shadow-lg shadow-blue-500/30';
    }
    return 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/30 active:scale-105';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* 头部 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">语音生成教案</h1>
            <div className="ml-auto flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <Cloud className="w-3 h-3" />
              云端识别
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* 语音输入阶段 */}
        {step === 'voice' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              {/* 大录音按钮 */}
              <div
                className={`w-36 h-36 mx-auto rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer select-none ${getButtonStyle()}`}
                onClick={() => {
                  if (voice.error || !voice.isSupported || voice.isRecognizing) return;
                  if (voice.isRecording) {
                    handleStopRecording();
                  } else {
                    handleStartRecording();
                  }
                }}
                onMouseDown={() => {
                  if (!voice.isRecording && !voice.isRecognizing && voice.isSupported) {
                    handleStartRecording();
                  }
                }}
                onMouseUp={() => {
                  if (voice.isRecording) {
                    handleStopRecording();
                  }
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  if (!voice.isRecording && !voice.isRecognizing && voice.isSupported) {
                    handleStartRecording();
                  }
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  if (voice.isRecording) {
                    handleStopRecording();
                  }
                }}
              >
                {getStatusIcon()}
              </div>

              {/* 录音波纹动画 */}
              {voice.isRecording && (
                <div className="mt-4 flex items-center justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-400 rounded-full animate-pulse"
                      style={{
                        height: `${12 + Math.random() * 20}px`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '0.5s',
                      }}
                    />
                  ))}
                </div>
              )}

              <p className="mt-5 text-lg font-medium text-gray-700">{getStatusText()}</p>

              <p className="mt-2 text-sm text-gray-500">点击或按住录音，松开自动识别</p>
            </div>

            {/* 识别结果 */}
            {recognizedText && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Volume2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">识别结果：</p>
                    <p className="text-gray-900 font-medium">{recognizedText}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 错误提示 */}
            {(error || voice.error) && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-700">{error || voice.error}</p>
                  {voice.error && voice.error.includes('麦克风') && (
                    <p className="text-red-500 text-xs mt-1">
                      请在浏览器地址栏左侧点击锁图标，允许麦克风权限
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 不支持提示 */}
            {!voice.isSupported && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-yellow-700 text-sm">
                  ⚠️ 当前浏览器不支持录音功能，请使用 Chrome、Edge 或 Safari
                </p>
              </div>
            )}

            {/* 识别中提示 */}
            {voice.isRecognizing && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <p className="text-blue-700 text-sm">正在云端识别语音，请稍候...</p>
              </div>
            )}

            {/* 示例指令 */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">支持的指令：</p>
              <ul className="text-sm text-gray-600 space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs">
                    1
                  </span>
                  &quot;今天张三来上课&quot; — 识别学员并查看信息
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs">
                    2
                  </span>
                  &quot;帮我生成教案&quot; — 为学员生成训练教案
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs">
                    3
                  </span>
                  &quot;为U10学员生成运球教案&quot; — 按条件筛选
                </li>
              </ul>
            </div>

            {/* 技术说明 */}
            <div className="text-center text-xs text-gray-400">
              使用腾讯云语音识别 · 16kHz PCM · 支持中文普通话
            </div>
          </div>
        )}

        {/* 确认阶段 */}
        {step === 'confirm' && parsedCommand && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium text-gray-900">语音识别结果</span>
                <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  云端识别
                </span>
              </div>
              <p className="text-gray-700 text-sm">&quot;{parsedCommand.raw}&quot;</p>
            </div>

            {parsedCommand.players && parsedCommand.players.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-orange-500" />
                    <span className="font-medium text-gray-900">
                      找到 {parsedCommand.players.length} 位学员
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedPlayers(parsedCommand.players!)}
                    className="text-sm text-orange-500 hover:text-orange-600"
                  >
                    全选
                  </button>
                </div>

                <div className="space-y-2">
                  {parsedCommand.players.map((player) => (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedPlayers.some((p) => p.id === player.id)
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => togglePlayer(player)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              selectedPlayers.some((p) => p.id === player.id)
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{player.name}</p>
                            <p className="text-sm text-gray-500">{player.group}</p>
                          </div>
                        </div>
                        {player.weakSkills && player.weakSkills.length > 0 && (
                          <div className="text-xs text-orange-600">
                            需加强：{player.weakSkills.join('、')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={resetToVoice}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                重新录音
              </button>
              <button
                onClick={handleGeneratePlan}
                disabled={selectedPlayers.length === 0}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                生成教案 ({selectedPlayers.length}人)
              </button>
            </div>
          </div>
        )}

        {/* 生成中 */}
        {step === 'generating' && (
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <Loader2 className="w-16 h-16 mx-auto text-orange-500 animate-spin" />
            <p className="mt-6 text-lg font-medium text-gray-900">正在生成教案...</p>
            <p className="mt-2 text-sm text-gray-500">
              正在分析 {selectedPlayers.map((p) => p.name).join('、')} 的学习进度
            </p>
          </div>
        )}

        {/* 成功 */}
        {step === 'success' && generatedPlanId && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <p className="mt-6 text-xl font-bold text-gray-900">教案生成成功！</p>
              <p className="mt-2 text-gray-500">
                已为 {selectedPlayers.map((p) => p.name).join('、')} 创建训练教案
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-gray-900">教案信息</span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-orange-500" />
                  <span>语音指令：&quot;{recognizedText}&quot;</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-orange-500" />
                  <span>训练时长：90分钟</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-orange-500" />
                  <span>重点技能：{selectedPlayers[0]?.weakSkills?.join('、') || '运球'}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetToVoice}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                继续使用
              </button>
              <Link
                href={`/plans/${generatedPlanId}`}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <BookOpen className="w-5 h-5" />
                查看教案
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
