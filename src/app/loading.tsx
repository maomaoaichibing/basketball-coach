// 全局 loading 骨架屏 - 所有路由自动生效
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        {/* 篮球旋转动画 */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-orange-200" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
        </div>
        <p className="text-sm text-gray-400">加载中...</p>
      </div>
    </div>
  );
}
