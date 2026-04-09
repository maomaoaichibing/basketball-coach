'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/auth';
import {
  ArrowLeft,
  Save,
  Plus,
  History,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  FileText,
  Zap,
  AlertTriangle,
} from 'lucide-react';

type PromptTemplate = {
  id: string;
  name: string;
  key: string;
  description: string | null;
  content: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalVersions?: number;
};

export default function PromptsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [versions, setVersions] = useState<PromptTemplate[]>([]);
  const [editingContent, setEditingContent] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [diffContent, setDiffContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState<PromptTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/prompts');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVersions = useCallback(async (key: string) => {
    try {
      const res = await fetchWithAuth(`/api/prompts?key=${key}&all=true`);
      const data = await res.json();
      if (data.success) {
        setVersions(data.templates);
      }
    } catch (error) {
      console.error('加载版本失败:', error);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleSelectTemplate = (template: PromptTemplate) => {
    setSelectedKey(template.key);
    setShowHistory(true);
    setShowEditor(false);
    setShowDiff(false);
    setShowPreview(false);
    loadVersions(template.key);
  };

  const handleEdit = (template: PromptTemplate) => {
    setEditingContent(template.content);
    setEditDescription(template.description || '');
    setShowEditor(true);
    setShowHistory(false);
    setShowDiff(false);
  };

  const handlePreview = (template: PromptTemplate) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const handleDiff = (template: PromptTemplate) => {
    setDiffContent(template.content);
    setShowDiff(true);
  };

  const handleSave = async () => {
    if (!selectedKey || !editingContent.trim()) {
      showToast('error', 'Prompt 内容不能为空');
      return;
    }

    // 找到当前版本的 ID
    const current = versions.find((v) => v.isActive) || versions[0];
    if (!current) return;

    setSaving(true);
    try {
      const res = await fetchWithAuth(`/api/prompts/${current.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          content: editingContent,
          description: editDescription,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `已创建 v${data.template.version} 新版本`);
        setShowEditor(false);
        await loadTemplates();
        await loadVersions(selectedKey);
      } else {
        showToast('error', data.error || '保存失败');
      }
    } catch (error) {
      showToast('error', '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (template: PromptTemplate) => {
    if (!confirm(`确定要激活 v${template.version} 版本吗？`)) return;

    try {
      const res = await fetchWithAuth(`/api/prompts/${template.id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `v${template.version} 已激活`);
        await loadTemplates();
        await loadVersions(selectedKey!);
      } else {
        showToast('error', data.error || '激活失败');
      }
    } catch (error) {
      showToast('error', '激活失败');
    }
  };

  const handleDelete = async (template: PromptTemplate) => {
    if (!confirm(`确定要删除 v${template.version} 版本吗？此操作不可撤销。`)) return;

    setDeleting(template.id);
    try {
      const res = await fetchWithAuth(`/api/prompts/${template.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', '已删除');
        await loadTemplates();
        await loadVersions(selectedKey!);
      } else {
        showToast('error', data.error || '删除失败');
      }
    } catch (error) {
      showToast('error', '删除失败');
    } finally {
      setDeleting(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('success', '已复制到剪贴板');
  };

  // 统计字符数和行数
  const getContentStats = (content: string) => {
    const chars = content.length;
    const lines = content.split('\n').length;
    return `${chars} 字符 / ${lines} 行`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 inline mr-1" /> : <XCircle className="w-4 h-4 inline mr-1" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Prompt 管理
            </h1>
            <p className="text-purple-200 text-sm">管理和编辑 AI 教案生成的提示词模板，支持版本控制</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 模板列表 */}
        {!selectedKey && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Prompt 模板</h2>
            {templates.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无 Prompt 模板</p>
                <p className="text-sm mt-1">首次部署时会自动导入当前 Prompt</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          <p className="text-xs text-gray-500 font-mono">{template.key}</p>
                        </div>
                      </div>
                      {template.isActive ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> 使用中
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">
                          未激活
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>v{template.version}</span>
                      <span>{getContentStats(template.content)}</span>
                      {template.totalVersions && template.totalVersions > 1 && (
                        <span className="text-violet-500 font-medium">
                          {template.totalVersions} 个版本
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 版本历史 */}
        {selectedKey && showHistory && !showEditor && !showPreview && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  setSelectedKey(null);
                  setVersions([]);
                }}
                className="text-sm text-violet-600 hover:text-violet-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> 返回列表
              </button>
              <button
                onClick={() => {
                  const current = versions.find((v) => v.isActive) || versions[0];
                  if (current) handleEdit(current);
                }}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> 新建版本
              </button>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <History className="w-5 h-5" />
              版本历史
              <span className="text-sm font-normal text-gray-500">
                ({versions.length} 个版本)
              </span>
            </h2>
            <div className="space-y-3">
              {versions.map((v, idx) => (
                <div
                  key={v.id}
                  className={`bg-white rounded-xl p-5 shadow-sm border ${
                    v.isActive ? 'border-green-200 bg-green-50/30' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-gray-900">v{v.version}</span>
                        {v.isActive && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> 使用中
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(v.updatedAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      {v.description && (
                        <p className="text-sm text-gray-600 mb-2">{v.description}</p>
                      )}
                      <p className="text-xs text-gray-400">{getContentStats(v.content)}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handlePreview(v)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="预览"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(v)}
                        className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                        title="基于此版本编辑"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {!v.isActive && (
                        <button
                          onClick={() => handleActivate(v)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="激活此版本"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {versions.length > 1 && !v.isActive && (
                        <button
                          onClick={() => handleDelete(v)}
                          disabled={deleting === v.id}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="删除此版本"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 编辑器 */}
        {showEditor && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  setShowEditor(false);
                  setShowHistory(true);
                }}
                className="text-sm text-violet-600 hover:text-violet-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> 返回版本历史
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {getContentStats(editingContent)}
                </span>
                <button
                  onClick={handleSave}
                  disabled={saving || !editingContent.trim()}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  {saving ? '保存中...' : '保存新版本'}
                </button>
              </div>
            </div>

            {/* 版本说明 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                版本说明（可选）
              </label>
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="描述本次修改了什么，如：强化战术库，新增反跑配合..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* 提示 */}
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                保存后将创建一个新版本，当前使用中的版本不受影响。保存后可以切换到版本历史页面激活新版本。
              </p>
            </div>

            {/* 编辑区域 */}
            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="w-full h-[70vh] px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white resize-none"
              placeholder="在这里编辑 Prompt 内容..."
              spellCheck={false}
            />
          </div>
        )}

        {/* 预览 */}
        {showPreview && previewTemplate && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  setShowPreview(false);
                  if (selectedKey) setShowHistory(true);
                }}
                className="text-sm text-violet-600 hover:text-violet-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> 返回
              </button>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">v{previewTemplate.version}</span>
                {previewTemplate.isActive && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                    使用中
                  </span>
                )}
                <button
                  onClick={() => handleCopy(previewTemplate.content)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg flex items-center gap-1"
                >
                  <Copy className="w-4 h-4" /> 复制
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-gray-800 max-h-[75vh] overflow-y-auto">
                {previewTemplate.content}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
