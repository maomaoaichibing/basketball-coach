'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/auth';
import {
  ArrowLeft,
  Search,
  Filter,
  Calendar,
  Users,
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
} from 'lucide-react';

type TrainingRecord = {
  id: string;
  playerId?: string;
  playerName?: string;
  playerGroup?: string;
  planId?: string;
  planTitle?: string;
  planDate?: string;
  planTheme?: string;
  attendance: string;
  performance?: number;
  feedback?: string;
  recordedAt: string;
};

// 按教案分组
type GroupedRecords = {
  planId: string;
  planTitle: string;
  planDate: string;
  planTheme?: string;
  records: TrainingRecord[];
};

const attendanceConfig: Record<
  string,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  present: { label: '出勤', color: 'text-green-600 bg-green-50', icon: CheckCircle2 },
  late: { label: '迟到', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
  absent: { label: '缺勤', color: 'text-red-600 bg-red-50', icon: XCircle },
};

export default function RecordsPage() {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [filterAttendance, setFilterAttendance] = useState<string>('all');

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/records?limit=200');
      const data = await res.json();
      if (data.success) {
        setRecords(data.records || []);
        // 默认展开第一个教案
        const firstPlanId = data.records?.[0]?.planId;
        if (firstPlanId) setExpandedPlan(firstPlanId);
      }
    } catch (error) {
      console.error('获取训练记录失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // 按教案分组
  const grouped = records
    .filter((r) => {
      if (filterAttendance !== 'all' && r.attendance !== filterAttendance) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          (r.playerName || '').toLowerCase().includes(term) ||
          (r.planTitle || '').toLowerCase().includes(term) ||
          (r.planTheme || '').toLowerCase().includes(term) ||
          (r.feedback || '').toLowerCase().includes(term)
        );
      }
      return true;
    })
    .reduce<GroupedRecords[]>((acc, r) => {
      const planId = r.planId || 'unknown';
      const existing = acc.find((g) => g.planId === planId);
      if (existing) {
        existing.records.push(r);
      } else {
        acc.push({
          planId,
          planTitle: r.planTitle || '训练课',
          planDate: r.planDate || r.recordedAt,
          planTheme: r.planTheme,
          records: [r],
        });
      }
      return acc;
    }, []);

  // 统计
  const totalRecords = records.length;
  const presentCount = records.filter((r) => r.attendance === 'present').length;
  const lateCount = records.filter((r) => r.attendance === 'late').length;
  const absentCount = records.filter((r) => r.attendance === 'absent').length;
  const avgPerformance =
    records.filter((r) => r.performance && r.performance > 0).length > 0
      ? (
          records
            .filter((r) => r.performance && r.performance > 0)
            .reduce((sum, r) => sum + (r.performance || 0), 0) /
          records.filter((r) => r.performance && r.performance > 0).length
        ).toFixed(1)
      : '--';

  // 导出CSV
  function handleExportCSV() {
    const header = ['训练日期', '教案名称', '训练主题', '学员姓名', '组别', '出勤状态', '表现评分', '教练反馈', '记录时间'];
    const rows = records.map((r) => [
      r.planDate ? new Date(r.planDate).toLocaleDateString('zh-CN') : '',
      r.planTitle || '',
      r.planTheme || '',
      r.playerName || '',
      r.playerGroup || '',
      attendanceConfig[r.attendance]?.label || r.attendance,
      r.performance ? String(r.performance) : '',
      r.feedback || '',
      r.recordedAt ? new Date(r.recordedAt).toLocaleString('zh-CN') : '',
    ]);

    // BOM + CSV内容，确保中文在Excel中正确显示
    const bom = '\uFEFF';
    const csv = bom + [header, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `训练记录_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">训练记录</h1>
              <p className="text-sm text-gray-500">共 {totalRecords} 条记录</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium shadow-sm"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* 统计概览 */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="text-xl font-bold text-blue-600">{presentCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">出勤</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="text-xl font-bold text-yellow-600">{lateCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">迟到</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="text-xl font-bold text-red-600">{absentCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">缺勤</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="text-xl font-bold text-orange-600">{avgPerformance}</div>
            <div className="text-xs text-gray-500 mt-0.5">平均评分</div>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索学员、教案..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            />
          </div>
          <select
            value={filterAttendance}
            onChange={(e) => setFilterAttendance(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">全部</option>
            <option value="present">出勤</option>
            <option value="late">迟到</option>
            <option value="absent">缺勤</option>
          </select>
        </div>

        {/* 记录列表（按教案分组） */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">
              {searchTerm || filterAttendance !== 'all' ? '没有匹配的记录' : '暂无训练记录'}
            </p>
            {!searchTerm && filterAttendance === 'all' && (
              <Link href="/plan/new" className="text-orange-500 hover:underline text-sm">
                创建第一个教案 →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map((group) => {
              const isExpanded = expandedPlan === group.planId;
              const groupPresent = group.records.filter((r) => r.attendance === 'present').length;
              const groupLate = group.records.filter((r) => r.attendance === 'late').length;
              const groupAbsent = group.records.filter((r) => r.attendance === 'absent').length;
              const groupScored = group.records.filter((r) => r.performance && r.performance > 0);
              const groupAvg =
                groupScored.length > 0
                  ? (
                      groupScored.reduce((s, r) => s + (r.performance || 0), 0) / groupScored.length
                    ).toFixed(1)
                  : '--';

              return (
                <div
                  key={group.planId}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* 教案头部（可展开） */}
                  <button
                    onClick={() => setExpandedPlan(isExpanded ? null : group.planId)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{group.planTitle}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(group.planDate).toLocaleDateString('zh-CN')}
                        </span>
                        {group.planTheme && <span>· {group.planTheme}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-green-600">{groupPresent}到</span>
                      {groupLate > 0 && (
                        <span className="text-xs text-yellow-600">{groupLate}迟</span>
                      )}
                      {groupAbsent > 0 && (
                        <span className="text-xs text-red-600">{groupAbsent}缺</span>
                      )}
                      <span className="text-xs font-medium text-gray-700">
                        {group.records.length}人
                      </span>
                    </div>
                  </button>

                  {/* 展开后的记录列表 */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {group.records.map((record) => {
                        const attConfig =
                          attendanceConfig[record.attendance] || attendanceConfig.present;
                        const AttIcon = attConfig.icon;
                        return (
                          <div
                            key={record.id}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                          >
                            {/* 学员头像 */}
                            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0 text-sm font-medium text-gray-600">
                              {(record.playerName || '?').charAt(0)}
                            </div>

                            {/* 学员信息 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {record.playerName || '未知学员'}
                                </span>
                                {record.playerGroup && (
                                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                                    {record.playerGroup}
                                  </span>
                                )}
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${attConfig.color}`}
                                >
                                  <AttIcon className="w-3 h-3" />
                                  {attConfig.label}
                                </span>
                              </div>
                              {record.feedback && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                  {record.feedback}
                                </p>
                              )}
                            </div>

                            {/* 评分 */}
                            <div className="text-right shrink-0">
                              {record.performance && record.performance > 0 ? (
                                <div className="flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                  <span className="text-sm font-semibold text-gray-700">
                                    {record.performance}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-300">未评</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
