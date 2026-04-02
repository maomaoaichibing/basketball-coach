'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Users,
  ClipboardList,
  BarChart3,
  Sparkles,
  Menu,
  X,
  Bell,
  Grid3X3,
  LogOut,
  User,
} from 'lucide-react';
// use-gesture v10 doesn't export useSwipeable directly, removed unused import

import { useAuth } from '@/components/AuthProvider';

// 主导航项配置（底部显示）
const mainNavItems = [
  { href: '/dashboard', icon: Home, label: '工作台' },
  { href: '/players', icon: Users, label: '学员' },
  { href: '/plans', icon: ClipboardList, label: '教案' },
  { href: '/stats', icon: BarChart3, label: '统计' },
];

// 更多功能菜单项
const moreMenuItems = [
  { href: '/dashboard', icon: '🏠', label: '教练工作台' },
  { href: '/checkin', icon: '📋', label: '签到点名' },
  { href: '/training', icon: '▶️', label: '训练执行' },
  { href: '/goals', icon: '🎯', label: '阶段目标' },
  { href: '/growth', icon: '📈', label: '成长追踪' },
  { href: '/assessment', icon: '🏆', label: '球员评估' },
  { href: '/feedback', icon: '📝', label: '课后反馈' },
  { href: '/courses', icon: '📦', label: '课时管理' },
  { href: '/schedule', icon: '📅', label: '课程安排' },
  { href: '/booking', icon: '🎫', label: '课程预约' },
  { href: '/parent', icon: '👤', label: '家长端' },
  { href: '/orders', icon: '🧾', label: '订单管理' },
  { href: '/notifications', icon: '🔔', label: '通知管理' },
  { href: '/campuses', icon: '🏢', label: '多校区管理' },
  { href: '/recommendations', icon: '💡', label: '智能推荐' },
  { href: '/matches', icon: '🏅', label: '比赛记录' },
  { href: '/growth-reports', icon: '📄', label: '成长档案' },
  { href: '/analytics', icon: '✨', label: '智能分析' },
  { href: '/smart-plan', icon: '🧠', label: '智能教案' },
  { href: '/training-analysis', icon: '📊', label: '训练分析' },
  { href: '/interaction', icon: '💬', label: '家校互动' },
];

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3); // 未读通知数量（示例）
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    router.push('/login');
  };

  // 获取未读通知数量（实际项目中从API获取）
  useEffect(() => {
    // 示例：模拟获取未读通知
    const timer = setTimeout(() => {
      setUnreadCount(Math.floor(Math.random() * 10) + 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [pathname]); // 页面切换时更新

  return (
    <>
      {/* 移动端底部导航栏 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="flex items-center justify-around h-14">
          {mainNavItems.map(item => {
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            // 检查是否需要显示小红点（工作台有未读通知）
            const showBadge = item.href === '/dashboard' && unreadCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                  isActive ? 'text-orange-500' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {/* 小红点提示 */}
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                    </span>
                  )}
                </div>
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* 更多按钮 */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              showMoreMenu ? 'text-orange-500' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Grid3X3 className="w-5 h-5" />
            <span className="text-xs mt-1 font-medium">更多</span>
          </button>
        </div>
      </nav>

      {/* 用户菜单按钮 - 移动端 */}
      {isAuthenticated ? (
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-orange-600">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
        </button>
      ) : (
        <Link
          href="/login"
          className="md:hidden fixed top-4 right-4 z-50 px-4 py-2 bg-orange-500 text-white rounded-lg shadow-lg text-sm font-medium"
        >
          登录
        </Link>
      )}

      {/* 用户菜单 - 移动端 */}
      {showUserMenu && isAuthenticated && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowUserMenu(false)}
          />
          <div className="md:hidden fixed top-16 right-4 bg-white rounded-xl shadow-xl z-50 w-64 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="font-medium text-gray-900">{user?.name}</div>
              <div className="text-sm text-gray-500">{user?.email}</div>
              <div className="text-xs text-orange-500 mt-1">
                {user?.role === 'admin'
                  ? '管理员'
                  : user?.role === 'head_coach'
                    ? '主教练'
                    : '教练'}
              </div>
            </div>
            <div className="p-2">
              <Link
                href="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">个人设置</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-lg transition-colors text-red-600"
              >
                <LogOut className="w-5 h-5" />
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* 移动端更多功能菜单 - 从底部弹出 */}
      {showMoreMenu && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowMoreMenu(false)}
          />
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[70vh] overflow-y-auto safe-area-bottom">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">全部功能</h3>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {moreMenuItems.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMoreMenu(false)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-xs text-gray-700 text-center leading-tight">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 汉堡菜单按钮 - 仅在非移动端显示 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden md:flex fixed top-4 right-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="菜单"
      >
        {isOpen ? (
          <X className="w-5 h-5 text-gray-600" />
        ) : isAuthenticated ? (
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-orange-600">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
        ) : (
          <Menu className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {/* 全屏菜单 - 仅在非移动端显示 */}
      {isOpen && (
        <div className="hidden md:block fixed inset-0 z-40 bg-white pt-20">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {/* 用户信息 */}
            {isAuthenticated && (
              <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-lg font-medium text-white">
                        {user?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{user?.name}</div>
                      <div className="text-sm text-gray-500">{user?.email}</div>
                      <div className="text-xs text-orange-500">
                        {user?.role === 'admin'
                          ? '管理员'
                          : user?.role === 'head_coach'
                            ? '主教练'
                            : '教练'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                  >
                    退出登录
                  </button>
                </div>
              </div>
            )}

            {!isAuthenticated && (
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">全部功能</h2>
                <div className="flex gap-3">
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 bg-orange-500 text-white hover:bg-orange-600 rounded-lg transition-colors text-sm font-medium"
                  >
                    注册
                  </Link>
                </div>
              </div>
            )}

            <h2 className="text-lg font-semibold text-gray-900 mb-6">功能菜单</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { href: '/checkin', icon: '📋', label: '签到点名' },
                { href: '/training', icon: '▶️', label: '训练执行' },
                { href: '/goals', icon: '🎯', label: '阶段目标' },
                { href: '/growth', icon: '📈', label: '成长追踪' },
                { href: '/assessment', icon: '🏆', label: '球员评估' },
                { href: '/feedback', icon: '📝', label: '课后反馈' },
                { href: '/courses', icon: '📦', label: '课时管理' },
                { href: '/schedule', icon: '📅', label: '课程安排' },
                { href: '/booking', icon: '🎫', label: '课程预约' },
                { href: '/parent', icon: '👤', label: '家长端' },
                { href: '/orders', icon: '🧾', label: '订单管理' },
                { href: '/notifications', icon: '🔔', label: '通知管理' },
                { href: '/campuses', icon: '🏢', label: '多校区管理' },
                { href: '/recommendations', icon: '💡', label: '智能推荐' },
                { href: '/stats', icon: '📊', label: '数据统计' },
                { href: '/matches', icon: '🏅', label: '比赛记录' },
                { href: '/growth-reports', icon: '📄', label: '成长档案' },
                { href: '/analytics', icon: '✨', label: '智能分析' },
                { href: '/smart-plan', icon: '🧠', label: '智能教案' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-medium text-gray-700">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 安全区域适配 */}
      <style jsx global>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </>
  );
}
