'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Search, Users, TrendingUp, Star, Filter, X } from 'lucide-react'

// 模拟球员数据类型
type Player = {
  id: string
  name: string
  group: string
  age: number
  dribbling: number
  passing: number
  shooting: number
  defending: number
  physical: number
  tactical: number
}

// 初始球员数据
const INITIAL_PLAYERS: Player[] = [
  { id: '1', name: '张三', group: 'U10', age: 9, dribbling: 7, passing: 6, shooting: 8, defending: 5, physical: 6, tactical: 5 },
  { id: '2', name: '李四', group: 'U10', age: 10, dribbling: 8, passing: 7, shooting: 6, defending: 7, physical: 7, tactical: 6 },
  { id: '3', name: '王五', group: 'U10', age: 9, dribbling: 5, passing: 6, shooting: 5, defending: 6, physical: 8, tactical: 4 },
  { id: '4', name: '赵六', group: 'U8', age: 7, dribbling: 6, passing: 5, shooting: 7, defending: 4, physical: 5, tactical: 3 },
  { id: '5', name: '钱七', group: 'U8', age: 8, dribbling: 7, passing: 6, shooting: 6, defending: 5, physical: 6, tactical: 4 },
  { id: '6', name: '孙八', group: 'U12', age: 11, dribbling: 8, passing: 8, shooting: 7, defending: 8, physical: 7, tactical: 7 },
]

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS)
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newPlayer, setNewPlayer] = useState({ name: '', age: '', group: '' })

  const groups = ['all', 'U6', 'U8', 'U10', 'U12', 'U14']

  const handleAddPlayer = () => {
    if (!newPlayer.name || !newPlayer.age || !newPlayer.group) {
      alert('请填写完整信息')
      return
    }

    // 添加新球员
    setPlayers([...players, {
      id: String(Date.now()),
      name: newPlayer.name,
      age: parseInt(newPlayer.age),
      group: newPlayer.group,
      dribbling: 5,
      passing: 5,
      shooting: 5,
      defending: 5,
      physical: 5,
      tactical: 5
    }])

    // 重置表单并关闭弹窗
    setNewPlayer({ name: '', age: '', group: '' })
    setShowAddModal(false)
  }

  const filteredPlayers = useMemo(() => {
    return players
      .filter(p => {
        if (groupFilter !== 'all' && p.group !== groupFilter) return false
        if (search && !p.name.includes(search)) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        if (sortBy === 'age') return a.age - b.age
        return 0
      })
  }, [players, search, groupFilter, sortBy])

  // 计算平均能力值
  const getAvgAbility = (player: Player) => {
    return ((player.dribbling + player.passing + player.shooting + player.defending + player.physical + player.tactical) / 6).toFixed(1)
  }

  // 能力条颜色
  const getAbilityColor = (score: number) => {
    if (score >= 8) return 'bg-green-500'
    if (score >= 6) return 'bg-blue-500'
    if (score >= 4) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900">球员管理</h1>
              <span className="text-sm text-gray-500">{filteredPlayers.length}名球员</span>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
            >
              <Plus className="w-4 h-4" />
              添加球员
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 搜索和筛选 */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索球员姓名..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              {groups.map(g => (
                <option key={g} value={g}>{g === 'all' ? '全部分组' : g}</option>
              ))}
            </select>
          </div>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="name">按姓名</option>
            <option value="age">按年龄</option>
          </select>
        </div>

        {/* 球员列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlayers.map(player => (
            <div key={player.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              {/* 球员基本信息 */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{player.name}</h3>
                  <p className="text-sm text-gray-500">{player.group} · {player.age}岁</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-600">{getAvgAbility(player)}</div>
                  <div className="text-xs text-gray-400">综合评分</div>
                </div>
              </div>

              {/* 能力雷达/条形图 */}
              <div className="space-y-2 mb-4">
                {(['dribbling', 'passing', 'shooting', 'defending', 'physical', 'tactical'] as const).map(skill => {
                  const score = player[skill]
                  const labels: Record<string, string> = {
                    dribbling: '运球', passing: '传球', shooting: '投篮',
                    defending: '防守', physical: '体能', tactical: '战术'
                  }
                  return (
                    <div key={skill} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-8">{labels[skill]}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${getAbilityColor(score)}`}
                          style={{ width: `${score * 10}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-4">{score}</span>
                    </div>
                  )
                })}
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors">
                  评估
                </button>
                <button className="flex-1 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-sm transition-colors">
                  成长记录
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 空状态 */}
        {filteredPlayers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无球员</h3>
            <p className="text-gray-500 mb-4">点击右上角添加球员开始管理</p>
          </div>
        )}
      </main>

      {/* 添加球员弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">添加新球员</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input
                  type="text"
                  value={newPlayer.name}
                  onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
                  placeholder="请输入球员姓名"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">年龄</label>
                <input
                  type="number"
                  min="4"
                  max="16"
                  value={newPlayer.age}
                  onChange={e => setNewPlayer({ ...newPlayer, age: e.target.value })}
                  placeholder="请输入年龄"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分组</label>
                <select
                  value={newPlayer.group}
                  onChange={e => setNewPlayer({ ...newPlayer, group: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">请选择分组</option>
                  <option value="U6">U6 (4-6岁)</option>
                  <option value="U8">U8 (6-8岁)</option>
                  <option value="U10">U10 (8-10岁)</option>
                  <option value="U12">U12 (10-12岁)</option>
                  <option value="U14">U14 (12-14岁)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setNewPlayer({ name: '', age: '', group: '' })
                    setShowAddModal(false)
                  }}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddPlayer}
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
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
