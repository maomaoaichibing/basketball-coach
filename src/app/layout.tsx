import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '篮球青训教案系统',
  description: '智能篮球青训教案自动生成系统',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
