'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, User } from 'lucide-react';
import { fetchWithAuth } from '@/lib/auth';

// 类型定义
type SkillKey = 'dribbling' | 'passing' | 'shooting' | 'defending' | 'physical' | 'tactical';

type Player = {
  id: string;
  name: string;
  group: string;
  dribbling: number;
  passing: number;
  shooting: number;
  defending: number;
  physical: number;
  tactical: number;
};

type ScoreRecord = Record<SkillKey, number>;

type Assessment = {
  id: string;
  playerId: string;
  dribbling?: number;
  passing?: number;
  shooting?: number;
  defending?: number;
  physical?: number;
  tactical?: number;
  overall?: number;
  notes?: string;
  assessor?: string;
  assessedAt: string;
};

const skillLabels: Record<string, string> = {
  dribbling: '运球',
  passing: '传球',
  shooting: '投篮',
  defending: '防守',
  physical: '体能',
  tactical: '战术',
};

export default function AssessmentPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 评估表单状态
  const [scores, setScores] = useState<ScoreRecord>({
    dribbling: 5,
    passing: 5,
    shooting: 5,
    defending: 5,
    physical: 5,
    tactical: 5,
  });
  const [notes, setNotes] = useState('');
  const [assessor, setAssessor] = useState('');

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (selectedPlayer) {
      fetchAssessments(selectedPlayer.id);
      // 用当前能力值初始化表单
      setScores({
        dribbling: selectedPlayer.dribbling,
        passing: selectedPlayer.passing,
        shooting: selectedPlayer.shooting,
        defending: selectedPlayer.defending,
        physical: selectedPlayer.physical,
        tactical: selectedPlayer.tactical,
      });
    }
  }, [selectedPlayer]);

  async function fetchPlayers() {
    try {
      const response = await fetchWithAuth('/api/players');
      const data = await response.json();
      if (data.success) {
        setPlayers(data.players);
        if (data.players.length > 0) {
          setSelectedPlayer(data.players[0]);
        }
      }
    } catch (error) {
      console.error('获取学员失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAssessments(playerId: string) {
    try {
      const response = await fetchWithAuth(`/api/assessments?playerId=${playerId}`);
      const data = await response.json();
      if (data.success) {
        setAssessments(data.assessments);
      }
    } catch (error) {
      console.error('获取评估记录失败:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlayer) return;

    setSaving(true);
    try {
      const response = await fetchWithAuth('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayer.id,
          ...scores,
          notes,
          assessor,
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert('评估已保存');
        setNotes('');
        fetchAssessments(selectedPlayer.id);
      } else {
        alert(data.error || '保存失败');
      }
    } catch {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  }

  const overallScore = Math.round(
    (scores.dribbling +
      scores.passing +
      scores.shooting +
      scores.defending +
      scores.physical +
      scores.tactical) /
      6
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">球员评估</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-20">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">暂无学员，请先添加学员</p>
            <Link href="/players" className="text-orange-500 hover:underline">
              去添加学员
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：学员选择 */}
            <div className="lg:col-span-1">
              <h2 className="font-semibold text-gray-700 mb-4">选择学员</h2>
              <div className="space-y-2">
                {players.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedPlayer(player)}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      selectedPlayer?.id === player.id
                        ? 'bg-orange-50 border-2 border-orange-500'
                        : 'bg-white border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          selectedPlayer?.id === player.id ? 'bg-orange-500' : 'bg-gray-400'
                        }`}
                      >
                        {player.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{player.name}</div>
                        <div className="text-sm text-gray-500">{player.group}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 右侧：评估表单 */}
            <div className="lg:col-span-2 space-y-6">
              {selectedPlayer && (
                <>
                  {/* 评估表单 */}
                  <form
                    onSubmit={handleSubmit}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
                  >
                    <h2 className="font-semibold text-gray-900 mb-6">
                      为 {selectedPlayer.name} 评分
                    </h2>

                    {/* 能力评分 */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      {(Object.keys(skillLabels) as Array<SkillKey>).map((skill) => (
                        <div key={skill} className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            {skillLabels[skill]}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={scores[skill]}
                              onChange={(e) =>
                                setScores({
                                  ...scores,
                                  [skill]: parseInt(e.target.value),
                                })
                              }
                              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                            <span className="w-8 text-center font-semibold text-gray-900">
                              {scores[skill]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 综合评分 */}
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">综合评分</span>
                        <div className="flex items-center gap-2">
                          <span className="text-3xl font-bold text-orange-600">{overallScore}</span>
                          <span className="text-gray-500">/10</span>
                        </div>
                      </div>
                    </div>

                    {/* 其他信息 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          评估人
                        </label>
                        <input
                          type="text"
                          value={assessor}
                          onChange={(e) => setAssessor(e.target.value)}
                          placeholder="输入评估人姓名"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                        <input
                          type="text"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="简短的评估备注"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          保存评估
                        </>
                      )}
                    </button>
                  </form>

                  {/* 历史评估 */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">评估历史</h2>
                    {assessments.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">暂无评估记录</p>
                    ) : (
                      <div className="space-y-3">
                        {assessments.slice(0, 5).map((assessment) => (
                          <div key={assessment.id} className="p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-500">
                                {new Date(assessment.assessedAt).toLocaleDateString()}
                              </span>
                              <span className="text-lg font-bold text-orange-600">
                                {assessment.overall || overallScore}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                              {Object.entries(skillLabels).map(([skill, label]) => {
                                const value = (
                                  assessment as unknown as { [key: string]: number | undefined }
                                )[skill];
                                if (!value) return null;
                                return (
                                  <div key={skill} className="text-center">
                                    <div className="text-gray-400">{label}</div>
                                    <div className="font-semibold">{value}</div>
                                  </div>
                                );
                              })}
                            </div>
                            {assessment.notes && (
                              <p className="mt-2 text-sm text-gray-600">{assessment.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
