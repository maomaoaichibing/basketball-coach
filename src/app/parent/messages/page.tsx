'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronRight,
  Send,
  MessageCircle,
  User
} from 'lucide-react'

type Message = {
  id: string
  senderId: string
  senderName: string
  senderType: string
  content: string
  messageType: string
  isRead: boolean
  createdAt: string
  receiverId: string
  receiverName: string
}

type Player = {
  id: string
  name: string
  group: string
}

export default function ParentMessagesPage() {
  const router = useRouter()
  const [player, setPlayer] = useState<Player | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('parentPlayer')
    if (stored) {
      const playerData = JSON.parse(stored)
      setPlayer(playerData)
      fetchMessages(playerData.id)
    } else {
      router.push('/parent')
    }
  }, [])

  async function fetchMessages(playerId: string) {
    try {
      const response = await fetch(`/api/messages?playerId=${playerId}`)
      const data = await response.json()
      if (data.success) {
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('获取消息列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !player) return

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: `guardian_${player.id}`,
          senderName: localStorage.getItem('guardianName') || '家长',
          senderType: 'guardian',
          content: newMessage,
          playerId: player.id,
          receiverId: 'admin',
          receiverName: '管理员'
        })
      })

      const data = await response.json()
      if (data.success) {
        setNewMessage('')
        fetchMessages(player.id)
      }
    } catch (error) {
      console.error('发送消息失败:', error)
    }
  }

  // 标记消息为已读
  async function markAsRead(messageId: string) {
    try {
      await fetch(`/api/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      })
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  const unreadCount = messages.filter(m => !m.isRead && m.receiverId.includes('guardian')).length

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/parent" className="text-gray-400 hover:text-gray-600">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </Link>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-orange-500" />
                <h1 className="text-xl font-bold text-gray-900">消息中心</h1>
              </div>
            </div>
            {unreadCount > 0 && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                {unreadCount} 未读
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 消息列表 */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无消息</h3>
            <p className="text-gray-500">如有需要，可通过下方输入框联系教练或管理员</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.senderType === 'guardian'

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  onClick={() => !message.isRead && !isOwn && markAsRead(message.id)}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl p-4 ${
                      isOwn
                        ? 'bg-orange-500 text-white rounded-br-md'
                        : 'bg-white border border-gray-100 rounded-bl-md'
                    } ${!message.isRead && !isOwn ? 'ring-2 ring-orange-200' : ''}`}
                  >
                    {/* 发送者 */}
                    {!isOwn && (
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-medium text-gray-500">
                          {message.senderName}
                        </span>
                      </div>
                    )}

                    {/* 消息内容 */}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                    {/* 时间 */}
                    <div className={`text-xs mt-2 ${isOwn ? 'text-orange-200' : 'text-gray-400'}`}>
                      {new Date(message.createdAt).toLocaleString('zh-CN')}
                      {!message.isRead && !isOwn && (
                        <span className="ml-2 text-orange-500">未读</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* 输入框 */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="输入消息..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-6 py-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}