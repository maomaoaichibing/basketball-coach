'use client'

import Link from 'next/link'
import { ArrowLeft, Settings, Bell, Moon, Globe } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">设置</h1>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">消息通知</span>
            </div>
            <button className="w-12 h-6 bg-orange-500 rounded-full relative">
              <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">深色模式</span>
            </div>
            <button className="w-12 h-6 bg-gray-300 rounded-full relative">
              <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">语言</span>
            </div>
            <span className="text-gray-500">简体中文</span>
          </div>
        </div>
      </main>
    </div>
  )
}
