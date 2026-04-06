'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/auth';
import {
  MessageCircle,
  Calendar,
  Camera,
  Users,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Heart,
  Clock,
} from 'lucide-react';

type Leave = {
  id: string;
  playerName: string;
  leaveType: string;
  dates: string[];
  reason: string;
  status: string;
  createdAt: string;
};

type CheckIn = {
  id: string;
  playerName: string;
  checkInType: string;
  duration: number;
  content: string;
  coachFeedback: string;
  likes: number;
  date: string;
};

type Message = {
  id: string;
  senderName: string;
  senderType: string;
  content: string;
  playerId: string;
  isRead: boolean;
  createdAt: string;
};

export default function InteractionPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leaves');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [leavesRes, checkinsRes, messagesRes] = await Promise.all([
        fetchWithAuth('/api/leaves?status=pending'),
        fetchWithAuth('/api/checkins?limit=20'),
        fetchWithAuth('/api/messages?isRead=false'),
      ]);

      const [leavesData, checkinsData, messagesData] = await Promise.all([
        leavesRes.json(),
        checkinsRes.json(),
        messagesRes.json(),
      ]);

      if (leavesData.success) setLeaves(leavesData.leaves);
      if (checkinsData.success) setCheckins(checkinsData.checkins);
      if (messagesData.success) setMessages(messagesData.messages);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveLeave(leaveId: string, approved: boolean) {
    try {
      const response = await fetchWithAuth(`/api/leaves/${leaveId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: approved ? 'approved' : 'rejected',
          approverId: 'coach_001',
          approverName: '教练',
          reply: approved ? '已批准' : '请注意训练安排',
        }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('审批失败:', error);
    }
  }

  async function handleFeedback(checkInId: string, feedback: string) {
    try {
      const response = await fetchWithAuth(`/api/checkins/${checkInId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachFeedback: feedback,
          coachId: 'coach_001',
          coachName: '教练',
          feedbackAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('反馈失败:', error);
    }
  }

  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const unreadMessages = messages.filter(m => !m.isRead).length;
  const recentCheckins = checkins.filter(c => !c.coachFeedback).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-400 hover:text-gray-600">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </Link>
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-orange-500" />
                <h1 className="text-xl font-bold text-gray-900">家校互动</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{pendingLeaves}</div>
                <div className="text-sm text-gray-500">待审批请假</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{recentCheckins}</div>
                <div className="text-sm text-gray-500">待点评打卡</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{unreadMessages}</div>
                <div className="text-sm text-gray-500">未读消息</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab切换 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('leaves')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'leaves'
                  ? 'text-orange-600 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              请假申请 ({pendingLeaves})
            </button>
            <button
              onClick={() => setActiveTab('checkins')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'checkins'
                  ? 'text-orange-600 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              训练打卡 ({recentCheckins})
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'messages'
                  ? 'text-orange-600 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              消息 ({unreadMessages})
            </button>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <>
                {/* 请假申请列表 */}
                {activeTab === 'leaves' && (
                  <div className="space-y-4">
                    {leaves.filter(l => l.status === 'pending').length === 0 ? (
                      <div className="text-center py-8 text-gray-500">暂无待审批的请假申请</div>
                    ) : (
                      leaves
                        .filter(l => l.status === 'pending')
                        .map(leave => (
                          <div key={leave.id} className="border border-gray-100 rounded-xl p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="font-medium text-gray-900">{leave.playerName}</div>
                                <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(leave.createdAt).toLocaleDateString('zh-CN')}
                                </div>
                              </div>
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                待审批
                              </span>
                            </div>

                            <div className="mb-3">
                              <div className="text-sm text-gray-500 mb-1">请假日期</div>
                              <div className="flex flex-wrap gap-2">
                                {leave.dates.map((date, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded"
                                  >
                                    {date}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {leave.reason && (
                              <div className="mb-3">
                                <div className="text-sm text-gray-500 mb-1">请假原因</div>
                                <p className="text-sm text-gray-700">{leave.reason}</p>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveLeave(leave.id, true)}
                                className="flex-1 px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                              >
                                <CheckCircle className="w-4 h-4" />
                                批准
                              </button>
                              <button
                                onClick={() => handleApproveLeave(leave.id, false)}
                                className="flex-1 px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                              >
                                <XCircle className="w-4 h-4" />
                                拒绝
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                )}

                {/* 训练打卡列表 */}
                {activeTab === 'checkins' && (
                  <div className="space-y-4">
                    {checkins.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">暂无训练打卡记录</div>
                    ) : (
                      checkins.map(checkin => (
                        <div
                          key={checkin.id}
                          className="border border-gray-100 rounded-xl overflow-hidden"
                        >
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {checkin.playerName}
                                </span>
                                <span
                                  className={`px-2 py-0.5 text-xs rounded-full ${
                                    checkin.checkInType === 'training'
                                      ? 'bg-orange-100 text-orange-700'
                                      : checkin.checkInType === 'homework'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-green-100 text-green-700'
                                  }`}
                                >
                                  {checkin.checkInType === 'training'
                                    ? '训练'
                                    : checkin.checkInType === 'homework'
                                      ? '作业'
                                      : '自主'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Clock className="w-3 h-3" />
                                {checkin.duration}分钟
                              </div>
                            </div>

                            {checkin.content && (
                              <p className="text-sm text-gray-700 mb-2">{checkin.content}</p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {checkin.likes}
                              </span>
                              <span>{new Date(checkin.date).toLocaleDateString('zh-CN')}</span>
                            </div>
                          </div>

                          {checkin.coachFeedback ? (
                            <div className="px-4 py-3 bg-green-50 border-l-4 border-green-500">
                              <div className="text-xs text-green-600 mb-1">教练点评</div>
                              <p className="text-sm text-gray-700">{checkin.coachFeedback}</p>
                            </div>
                          ) : (
                            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="添加点评..."
                                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  onKeyPress={e => {
                                    if (e.key === 'Enter') {
                                      handleFeedback(
                                        checkin.id,
                                        (e.target as HTMLInputElement).value
                                      );
                                    }
                                  }}
                                />
                                <button
                                  onClick={e => {
                                    const input = (
                                      e.target as HTMLButtonElement
                                    ).parentElement?.querySelector('input');
                                    if (input?.value) {
                                      handleFeedback(checkin.id, input.value);
                                    }
                                  }}
                                  className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600"
                                >
                                  点评
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 消息列表 */}
                {activeTab === 'messages' && (
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">暂无未读消息</div>
                    ) : (
                      messages.map(message => (
                        <div key={message.id} className="border border-gray-100 rounded-xl p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {message.senderName}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full ${
                                  message.senderType === 'guardian'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {message.senderType === 'guardian' ? '家长' : '其他'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(message.createdAt).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{message.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
