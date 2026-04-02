'use client';

import Link from 'next/link';
import { ArrowLeft, ClipboardList } from 'lucide-react';

export default function LibraryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">训练库</h1>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-12 text-center">
        <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">训练模块库</h2>
        <p className="text-gray-500">即将推出</p>
      </main>
    </div>
  );
}
