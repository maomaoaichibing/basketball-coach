'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Trophy,
  ChevronRight,
  Calendar,
  MapPin,
  Users,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  ArrowLeft,
  Target,
  TrendingUp
} from 'lucide-react'

type QuarterScore = {
  quarter: string
  homeScore: number
  opponentScore: number
}

type PlayerStat = {
  playerId: string
  playerName: string
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  fouls: number
  minutes?: number
}

type Match = {
  id: string
  title: string
  matchType: string
  group: string
  matchDate: string
  location: string
  teamName?: string
  homeScore: number
  opponent: string
  opponentScore: number
  quarterScores: QuarterScore[]
  result: string
  isHome: boolean
  status: string
  players: string[]
  playerStats: PlayerStat[]
  coachName?: string
  notes?: string
  events: MatchEvent[]
}

type MatchEvent = {
  id: string
  eventTime: string
  quarter?: number
  playerId?: string
  playerName?: string
  eventType: string
  description?: string
  points?: number
  relatedPlayerId?: string
  relatedPlayerName?: string
}

type Player = {
  id: string
  name: string
  group: string
}

export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [match, setMatch] = useState<Match | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [matchId, setMatchId] = useState<string>('')

  // 编辑表单
  const [editForm, setEditForm] = useState({
    homeScore: 0,
    opponentScore: 0,
    quarterScores: [] as QuarterScore[],
    notes: ''
  })

  // 新增事件表单
  const [eventForm, setEventForm] = useState({
    eventTime: '',
    quarter: 1,
    playerId: '',
    playerName: '',
    eventType: 'score',
    description: '',
    points: 2
  })

  useEffect(() => {
    params.then(p => {
      setMatchId(p.id)
      fetchMatch(p.id)
    })
  }, [params])

  useEffect(() => {
    fetchPlayers()
  }, [])

  async function fetchMatch(id: string) {
    try {
      setLoading(true)
      const response = await fetch(`/api/matches/${id}`)
      const data = await response.json()

      if (data.success) {
        setMatch(data.match)
        setEditForm({
          homeScore: data.match.homeScore,
          opponentScore: data.match.opponentScore,
          quarterScores: data.match.quarterScores || [],
          notes: data.match.notes || ''
        })
      }
    } catch (error) {
      console.error('获取比赛详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPlayers() {
    try {
      const response = await fetch('/api/players?limit=100')
      const data = await response.json()
      if (data.success) {
        setPlayers(data.players.filter((p: Player) => p.group === match?.group))
      }
    } catch (error) {
      console.error('获取球员列表失败:', error)
    }
  }

  async function handleUpdateScore() {
    if (!match) return

    try {
      const response = await fetch(`/api/matches/${match.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeScore: editForm.homeScore,
          opponentScore: editForm.opponentScore,
          quarterScores: editForm.quarterScores,
          notes: editForm.notes
        })
      })

      const data = await response.json()
      if (data.success) {
        setIsEditing(false)
        fetchMatch(match.id)
      }
    } catch (error) {
      console.error('更新比分失败:', error)
    }
  }

  async function handleAddEvent() {
    if (!match) return

    try {
      const selectedPlayer = players.find(p => p.id === eventForm.playerId)

      const response = await fetch('/api/match-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          ...eventForm,
          playerName: selectedPlayer?.name || eventForm.playerName
        })
      })

      const data = await response.json()
      if (data.success) {
        setShowAddEvent(false)
        setEventForm({
          eventTime: '',
          quarter: 1,
          playerId: '',
          playerName: '',
          eventType: 'score',
          description: '',
          points: 2
        })
        fetchMatch(match.id)
      }
    } catch (error) {
      console.error('添加事件失败:', error)
    }
  }

  async function handleDeleteEvent(eventId: string) {
    try {
      await fetch(`/api/match-events?id=${eventId}`, { method: 'DELETE' })
      fetchMatch(matchId)
    } catch (error) {
      console.error('删除事件失败:', error)
    }
  }

  async function handleDeleteMatch() {
    if (!match || !confirm('确定要删除这场比赛吗？')) return

    try {
      const response = await fetch(`/api/matches/${match.id}`, { method: 'DELETE' })
      if (response.ok) {
        router.push('/matches')
      }
    } catch (error) {
      console.error('删除比赛失败:', error)
    }
  }

  const eventTypeLabels: Record<string, string> = {
    score: '得分',
    rebound: '篮板',
    assist: '助攻',
    steal: '抢断',
    block: '盖帽',
    foul: '犯规',
    turnover: '失误',
    substitution: '换人'
  }

  const eventTypeColors: Record<string, string> = {
    score: 'bg-orange-100 text-orange-700',
    rebound: 'bg-blue-100 text-blue-700',
    assist: 'bg-green-100 text-green-700',
    steal: 'bg-yellow-100 text-yellow-700',
    block: 'bg-purple-100 text-purple-700',
    foul: 'bg-red-100 text-red-700',
    turnover: 'bg-gray-100 text-gray-700',
    substitution: 'bg-cyan-100 text-cyan-700'
  }

  const resultColors: Record<string, string> = {
    win: 'bg-green-500',
    lose: 'bg-red-500',
    draw: 'bg-gray-500',
    pending: 'bg-yellow-500'
  }

  const resultLabels: Record<string, string> = {
    win: '胜',
    lose: '负',
    draw: '平',
    pending: '待定'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">比赛不存在</h2>
          <Link href="/matches" className="text-orange-600 hover:text-orange-700">
            返回比赛列表
          </Link>
        </div>
      </div>
    )
  }

  // 计算球员统计数据
  const playerStatsMap: Record<string, any> = {}
  match.events.forEach(event => {
    if (event.playerId) {
      if (!playerStatsMap[event.playerId]) {
        playerStatsMap[event.playerId] = {
          playerId: event.playerId,
          playerName: event.playerName || '未知',
          points: 0,
          rebounds: 0,
          assists: 0,
          steals: 0,
          blocks: 0,
          fouls: 0,
          turnovers: 0
        }
      }
      switch (event.eventType) {
        case 'score':
          playerStatsMap[event.playerId].points += event.points || 0
          break
        case 'rebound':
          playerStatsMap[event.playerId].rebounds += 1
          break
        case 'assist':
          playerStatsMap[event.playerId].assists += 1
          break
        case 'steal':
          playerStatsMap[event.playerId].steals += 1
          break
        case 'block':
          playerStatsMap[event.playerId].blocks += 1
          break
        case 'foul':
          playerStatsMap[event.playerId].fouls += 1
          break
        case 'turnover':
          playerStatsMap[event.playerId].turnovers += 1
          break
      }
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/matches" className="text-gray-400 hover:text-gray-600">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs text-white rounded ${resultColors[match.result]}`}>
                    {resultLabels[match.result]}
                  </span>
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                    {match.group}
                  </span>
                </div>
                <h1 className="text-lg font-bold text-gray-900 mt-1">{match.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddEvent(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                记录事件
              </button>
              <button
                onClick={handleDeleteMatch}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 比分板 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="text-sm opacity-80 mb-2">
                  {match.isHome ? '我方' : match.opponent}
                </div>
                {isEditing ? (
                  <input
                    type="number"
                    value={editForm.homeScore}
                    onChange={(e) => setEditForm({ ...editForm, homeScore: parseInt(e.target.value) || 0 })}
                    className="w-20 text-5xl font-bold text-center bg-white/20 rounded-lg px-2 py-1 outline-none"
                  />
                ) : (
                  <div className="text-5xl font-bold">{match.homeScore}</div>
                )}
                <div className="text-sm mt-2">{match.isHome ? match.teamName || '我方' : ''}</div>
              </div>

              <div className="text-center px-8">
                <div className="text-2xl font-bold opacity-80">VS</div>
                <div className="text-sm opacity-60 mt-2">
                  {new Date(match.matchDate).toLocaleDateString('zh-CN')}
                </div>
              </div>

              <div className="text-center flex-1">
                <div className="text-sm opacity-80 mb-2">
                  {match.isHome ? match.opponent : '我方'}
                </div>
                {isEditing ? (
                  <input
                    type="number"
                    value={editForm.opponentScore}
                    onChange={(e) => setEditForm({ ...editForm, opponentScore: parseInt(e.target.value) || 0 })}
                    className="w-20 text-5xl font-bold text-center bg-white/20 rounded-lg px-2 py-1 outline-none"
                  />
                ) : (
                  <div className="text-5xl font-bold">{match.opponentScore}</div>
                )}
                <div className="text-sm mt-2">{match.isHome ? '' : match.teamName || '我方'}</div>
              </div>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between border-t border-gray-100">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {match.location || '未知地点'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(match.matchDate).toLocaleString('zh-CN')}
              </span>
            </div>
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleUpdateScore}
                  className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors text-sm"
              >
                <Edit3 className="w-4 h-4" />
                修改比分
              </button>
            )}
          </div>
        </div>

        {/* 球员数据统计 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              球员数据
            </h2>
          </div>
          <div className="overflow-x-auto">
            {Object.keys(playerStatsMap).length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">球员</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">得分</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">篮板</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">助攻</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">抢断</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">盖帽</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">犯规</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.values(playerStatsMap).map((stats: PlayerStat) => (
                    <tr key={stats.playerId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{stats.playerName}</td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-orange-600">{stats.points}</td>
                      <td className="px-4 py-3 text-center text-sm">{stats.rebounds}</td>
                      <td className="px-4 py-3 text-center text-sm">{stats.assists}</td>
                      <td className="px-4 py-3 text-center text-sm">{stats.steals}</td>
                      <td className="px-4 py-3 text-center text-sm">{stats.blocks}</td>
                      <td className="px-4 py-3 text-center text-sm text-red-500">{stats.fouls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500">
                暂无球员统计数据
              </div>
            )}
          </div>
        </div>

        {/* 比赛事件时间线 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              比赛事件
            </h2>
          </div>
          <div className="p-4">
            {match.events.length > 0 ? (
              <div className="relative">
                {/* 时间线 */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                <div className="space-y-4">
                  {match.events.map((event, index) => (
                    <div key={event.id} className="relative flex items-start gap-4 pl-12">
                      {/* 时间线节点 */}
                      <div className={`absolute left-4 w-5 h-5 rounded-full border-2 border-white ${eventTypeColors[event.eventType]} z-10 flex items-center justify-center`}>
                        {event.eventType === 'score' && <div className="w-2 h-2 bg-orange-500 rounded-full"></div>}
                        {event.eventType === 'rebound' && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                        {event.eventType === 'assist' && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                        {event.eventType === 'steal' && <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>}
                        {event.eventType === 'block' && <div className="w-2 h-2 bg-purple-500 rounded-full"></div>}
                        {event.eventType === 'foul' && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
                      </div>

                      {/* 事件内容 */}
                      <div className="flex-1 bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs rounded ${eventTypeColors[event.eventType]}`}>
                              {eventTypeLabels[event.eventType]}
                            </span>
                            {event.quarter && (
                              <span className="text-xs text-gray-500">第{event.quarter}节</span>
                            )}
                            <span className="text-xs text-gray-400">{event.eventTime}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">{event.playerName || '未知球员'}</span>
                          {event.eventType === 'score' && event.points && (
                            <span className="ml-2 text-orange-600 font-bold">+{event.points}分</span>
                          )}
                          {event.description && (
                            <span className="ml-2 text-gray-500">{event.description}</span>
                          )}
                        </div>
                        {event.relatedPlayerName && (
                          <div className="text-xs text-gray-500 mt-1">
                            对抗: {event.relatedPlayerName}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                暂无比赛事件记录
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 添加事件弹窗 */}
      {showAddEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">记录比赛事件</h2>
                <button
                  onClick={() => setShowAddEvent(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">节次</label>
                  <select
                    value={eventForm.quarter}
                    onChange={(e) => setEventForm({ ...eventForm, quarter: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value={1}>第1节</option>
                    <option value={2}>第2节</option>
                    <option value={3}>第3节</option>
                    <option value={4}>第4节</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">时间</label>
                  <input
                    type="text"
                    value={eventForm.eventTime}
                    onChange={(e) => setEventForm({ ...eventForm, eventTime: e.target.value })}
                    placeholder="12:34"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">球员</label>
                  <select
                    value={eventForm.playerId}
                    onChange={(e) => setEventForm({ ...eventForm, playerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">选择球员</option>
                    {players.map(player => (
                      <option key={player.id} value={player.id}>{player.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">事件类型</label>
                <select
                  value={eventForm.eventType}
                  onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="score">得分</option>
                  <option value="rebound">篮板</option>
                  <option value="assist">助攻</option>
                  <option value="steal">抢断</option>
                  <option value="block">盖帽</option>
                  <option value="foul">犯规</option>
                  <option value="turnover">失误</option>
                  <option value="substitution">换人</option>
                </select>
              </div>

              {eventForm.eventType === 'score' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">得分</label>
                  <select
                    value={eventForm.points}
                    onChange={(e) => setEventForm({ ...eventForm, points: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value={1}>1分（罚球）</option>
                    <option value={2}>2分</option>
                    <option value={3}>3分</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <input
                  type="text"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="事件描述（可选）"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddEvent(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddEvent}
                  disabled={!eventForm.playerId && !eventForm.playerName}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}