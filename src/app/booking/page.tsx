'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/auth';
import { Plus, Calendar, Users, Check, ArrowLeft, Clock, MapPin } from 'lucide-react';

type Schedule = {
  id: string;
  title: string;
  group: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string;
  coachName?: string;
  maxPlayers: number;
  currentCount: number;
};

type Player = {
  id: string;
  name: string;
  group: string;
};

const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export default function BookingPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSchedules();
    fetchPlayers();
    // 默认选择下周六
    const today = new Date();
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7));
    setSelectedDate(nextSaturday.toISOString().split('T')[0]);
  }, []);

  async function fetchSchedules() {
    try {
      const res = await fetchWithAuth('/api/schedules?status=active');
      const data = await res.json();
      if (data.success) setSchedules(data.schedules);
    } catch (error) {
      console.error('获取课程失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPlayers() {
    try {
      const res = await fetchWithAuth('/api/players?status=training');
      const data = await res.json();
      if (data.success) setPlayers(data.players);
    } catch (error) {
      console.error('获取学员失败:', error);
    }
  }

  async function handleBook() {
    if (!selectedSchedule || !selectedPlayer || !selectedDate) {
      alert('请选择课程、学员和日期');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: selectedSchedule.id,
          playerId: selectedPlayer.id,
          bookingDate: selectedDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        // 更新本地状态
        setSchedules((prev) =>
          prev.map((s) =>
            s.id === selectedSchedule.id ? { ...s, currentCount: s.currentCount + 1 } : s
          )
        );
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('预约失败');
    } finally {
      setSubmitting(false);
    }
  }

  function getWeekDates() {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">预约成功！</h2>
          <p className="text-gray-500 mb-6">
            {selectedPlayer?.name} 已成功预约 {selectedSchedule?.title}
          </p>
          <div className="flex gap-3">
            <Link
              href="/"
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-semibold text-center"
            >
              返回首页
            </Link>
            <button
              onClick={() => setSuccess(false)}
              className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold"
            >
              继续预约
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">预约课程</h1>
              <p className="text-sm text-gray-500">为学员预约训练课程</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 步骤1：选择课程 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm">
                  1
                </span>
                选择课程
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {schedules.map((schedule) => (
                  <button
                    key={schedule.id}
                    onClick={() => setSelectedSchedule(schedule)}
                    className={`p-4 rounded-xl text-left border-2 transition-all ${
                      selectedSchedule?.id === schedule.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-900">{schedule.title}</span>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                        {schedule.group}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {dayNames[schedule.dayOfWeek]} {schedule.startTime}-{schedule.endTime}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {schedule.location}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-gray-400">{schedule.coachName || '待定'}</span>
                      <span
                        className={
                          schedule.currentCount >= schedule.maxPlayers
                            ? 'text-red-500'
                            : 'text-green-600'
                        }
                      >
                        {schedule.currentCount}/{schedule.maxPlayers} 人
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 步骤2：选择学员 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm">
                  2
                </span>
                选择学员
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {players.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedPlayer(player)}
                    className={`p-4 rounded-xl text-center border-2 transition-all ${
                      selectedPlayer?.id === player.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-bold mx-auto mb-2">
                      {player.name.charAt(0)}
                    </div>
                    <div className="font-medium text-gray-900">{player.name}</div>
                    <div className="text-xs text-gray-500">{player.group}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 步骤3：选择日期 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm">
                  3
                </span>
                选择日期
              </h2>
              <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                {getWeekDates().map((date, i) => {
                  const dateStr = date.toISOString().split('T')[0];
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`p-3 rounded-xl text-center border-2 transition-all ${
                        selectedDate === dateStr
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xs text-gray-500">
                        {date.toLocaleDateString('zh-CN', { weekday: 'short' })}
                      </div>
                      <div className="text-lg font-bold text-gray-900">{date.getDate()}</div>
                      <div className="text-xs text-gray-400">
                        {date.toLocaleDateString('zh-CN', { month: 'short' })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 确认预约 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">确认预约</h2>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                {selectedSchedule && selectedPlayer && selectedDate ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">学员：</span>
                      <span className="font-medium">{selectedPlayer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">课程：</span>
                      <span className="font-medium">{selectedSchedule.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">时间：</span>
                      <span className="font-medium">
                        {dayNames[selectedSchedule.dayOfWeek]} {selectedSchedule.startTime}-
                        {selectedSchedule.endTime}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">地点：</span>
                      <span className="font-medium">{selectedSchedule.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">日期：</span>
                      <span className="font-medium">
                        {new Date(selectedDate).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">请完成以上选择</div>
                )}
              </div>
              <button
                onClick={handleBook}
                disabled={!selectedSchedule || !selectedPlayer || !selectedDate || submitting}
                className="w-full py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    预约中...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    确认预约
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
