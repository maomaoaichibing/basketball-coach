'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/auth';
import {
  ChevronRight,
  Plus,
  Camera,
  MapPin,
  Clock,
  Heart,
  MessageCircle,
  Award,
  Calendar,
} from 'lucide-react';

type CheckIn = {
  id: string;
  playerId: string;
  playerName: string;
  checkInType: string;
  date: string;
  duration: number;
  content: string;
  mediaUrls: string[];
  location: string;
  coachFeedback: string;
  coachName: string;
  likes: number;
  createdAt: string;
};

type Player = {
  id: string;
  name: string;
  group: string;
};

export default function ParentCheckInPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [createForm, setCreateForm] = useState({
    checkInType: 'training',
    content: '',
    duration: 60,
    location: '',
  });

  useEffect(() => {
    const stored = localStorage.getItem('parentPlayer');
    if (stored) {
      const playerData = JSON.parse(stored);
      setPlayer(playerData);
      fetchCheckins(playerData.id);
    } else {
      router.push('/parent');
    }
  }, []);

  async function fetchCheckins(playerId: string) {
    try {
      const response = await fetchWithAuth(`/api/checkins?playerId=${playerId}&limit=20`);
      const data = await response.json();
      if (data.success) {
        setCheckins(data.checkins);
      }
    } catch (error) {
      console.error('获取打卡记录失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCheckIn() {
    if (!player) return;

    try {
      const response = await fetchWithAuth('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          playerName: player.name,
          guardianId: localStorage.getItem('guardianId') || '',
          checkInType: createForm.checkInType,
          date: new Date().toISOString(),
          content: createForm.content,
          duration: createForm.duration,
          location: createForm.location,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        setCreateForm({
          checkInType: 'training',
          content: '',
          duration: 60,
          location: '',
        });
        fetchCheckins(player.id);
      }
    } catch (error) {
      console.error('创建打卡失败:', error);
    }
  }

  const checkInTypeLabels: Record<string, string> = {
    training: '训练打卡',
    homework: '作业打卡',
    exercise: '自主锻炼',
  };

  const checkInTypeColors: Record<string, string> = {
    training: 'bg-orange-100 text-orange-700',
    homework: 'bg-blue-100 text-blue-700',
    exercise: 'bg-green-100 text-green-700',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/parent" className="text-gray-400 hover:text-gray-600">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </Link>
              <div className="flex items-center gap-2">
                <Camera className="w-6 h-6 text-orange-500" />
                <h1 className="text-xl font-bold text-gray-900">训练打卡</h1>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              打卡
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 打卡统计 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-around text-center">
            <div>
              <div className="text-2xl font-bold text-orange-600">{checkins.length}</div>
              <div className="text-sm text-gray-500">总打卡</div>
            </div>
            <div className="w-px h-10 bg-gray-200"></div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {checkins.filter(c => c.checkInType === 'training').length}
              </div>
              <div className="text-sm text-gray-500">训练</div>
            </div>
            <div className="w-px h-10 bg-gray-200"></div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {checkins.filter(c => c.checkInType === 'homework').length}
              </div>
              <div className="text-sm text-gray-500">作业</div>
            </div>
            <div className="w-px h-10 bg-gray-200"></div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {checkins.reduce((sum, c) => sum + (c.duration || 0), 0) / 60}
              </div>
              <div className="text-sm text-gray-500">总时长(h)</div>
            </div>
          </div>
        </div>

        {/* 打卡列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : checkins.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
            <Camera className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无打卡记录</h3>
            <p className="text-gray-500 mb-4">记录孩子的训练时刻吧</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-orange-600 hover:text-orange-700"
            >
              立即打卡 →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {checkins.map(checkin => (
              <div
                key={checkin.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* 打卡头部 */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${checkInTypeColors[checkin.checkInType]}`}
                      >
                        {checkInTypeLabels[checkin.checkInType]}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {checkin.duration}分钟
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(checkin.date).toLocaleDateString('zh-CN')}
                    </span>
                  </div>

                  {/* 打卡内容 */}
                  {checkin.content && <p className="text-gray-700 mb-2">{checkin.content}</p>}

                  {/* 打卡地点 */}
                  {checkin.location && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                      <MapPin className="w-3 h-3" />
                      {checkin.location}
                    </div>
                  )}
                </div>

                {/* 教练反馈 */}
                {checkin.coachFeedback && (
                  <div className="p-4 bg-orange-50 border-l-4 border-orange-500">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageCircle className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium text-gray-700">教练点评</span>
                      {checkin.coachName && (
                        <span className="text-xs text-gray-500">- {checkin.coachName}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{checkin.coachFeedback}</p>
                  </div>
                )}

                {/* 底部互动 */}
                <div className="p-4 flex items-center justify-between border-t border-gray-100">
                  <div className="flex items-center gap-4 text-gray-400">
                    <button className="flex items-center gap-1 hover:text-red-500 transition-colors">
                      <Heart className="w-4 h-4" />
                      <span className="text-xs">{checkin.likes}</span>
                    </button>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(checkin.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 创建打卡弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">训练打卡</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">打卡类型</label>
                <select
                  value={createForm.checkInType}
                  onChange={e =>
                    setCreateForm({
                      ...createForm,
                      checkInType: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="training">训练打卡</option>
                  <option value="homework">作业打卡</option>
                  <option value="exercise">自主锻炼</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  训练时长（分钟）
                </label>
                <input
                  type="number"
                  value={createForm.duration}
                  onChange={e =>
                    setCreateForm({
                      ...createForm,
                      duration: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">打卡描述</label>
                <textarea
                  value={createForm.content}
                  onChange={e => setCreateForm({ ...createForm, content: e.target.value })}
                  placeholder="记录训练内容..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">训练地点</label>
                <input
                  type="text"
                  value={createForm.location}
                  onChange={e => setCreateForm({ ...createForm, location: e.target.value })}
                  placeholder="如: 篮球馆"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
                <p>温馨提示：</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>请上传训练照片或视频</li>
                  <li>教练会及时点评</li>
                  <li>坚持打卡可获得积分奖励</li>
                </ul>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateCheckIn}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  打卡
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
