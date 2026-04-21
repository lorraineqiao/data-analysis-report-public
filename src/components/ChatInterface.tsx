'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatInterfaceProps {
  onDataLoaded?: (data: any[], fileName: string) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FileStatus {
  hasData: boolean;
  fileName: string | null;
  dataPreview: any[];
}

export function ChatInterface({ onDataLoaded }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fileStatus, setFileStatus] = useState<FileStatus>({ hasData: false, fileName: null, dataPreview: [] });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 检查状态
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' }),
      });
      const data = await res.json();
      setFileStatus(data);

      if (data.hasData) {
        setMessages([
          {
            role: 'assistant',
            content: `已加载文件：${data.fileName}\n\n数据预览（前5行）：\n${JSON.stringify(data.dataPreview.slice(0, 5), null, 2)}\n\n你可以问我以下问题：\n• "哪些渠道的流量效率最高？"\n• "CPM最高的渠道是哪个？"\n• "我应该增加还是减少哪些渠道的投放？"\n• "帮我比较不同渠道的效果"\n• "给出具体的优化建议"`,
          },
        ]);
      } else {
        setMessages([
          {
            role: 'assistant',
            content: '你好！我是营销数据分析助手。\n\n请先上传你的Excel文件，我会自动分析流量效率、CPM等数据，然后你可以用自然语言询问任何问题。\n\n支持的Excel格式：.xlsx, .xls',
          },
        ]);
      }
    } catch (error) {
      console.error('Status check failed:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setIsLoading(true);

    try {
      // 读取文件并转换为 base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          fileData: base64,
          fileName: file.name,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setFileStatus({
          hasData: true,
          fileName: data.fileName,
          dataPreview: data.dataPreview || [],
        });
        
        // 调用回调通知父组件数据已加载
        if (onDataLoaded && data.dataPreview) {
          onDataLoaded(data.dataPreview, data.fileName);
        }
        
        setMessages([
          {
            role: 'assistant',
            content: `文件 "${data.fileName}" 上传成功！\n\n已分析 ${data.stats.validRows} 条有效数据。\n\n现在你可以问我：\n• "哪些渠道的流量效率最高？"\n• "CPM最高的渠道是哪个？"\n• "我应该增加还是减少哪些渠道的投放？"\n• "给出具体的优化建议"`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `文件上传失败：${data.error || '未知错误'}`,
          },
        ]);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '文件上传失败，请检查网络后重试',
        },
      ]);
    } finally {
      setIsUploading(false);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          messages: [...messages, { role: 'user', content: userMessage }],
        }),
      });

      if (!response.ok) throw new Error('请求失败');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          assistantMessage += chunk;
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.role === 'assistant' && prev.length > 0) {
              return [...prev.slice(0, -1), { role: 'assistant', content: assistantMessage }];
            }
            return [...prev, { role: 'assistant', content: assistantMessage }];
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '抱歉，分析服务暂时不可用，请稍后重试。' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    '哪些渠道流量效率最高？',
    'CPM最高的渠道是哪个？',
    '给出优化建议',
    '比较直播和短视频',
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">AI 数据分析助手</h3>
              <p className="text-xs text-violet-200">
                {fileStatus.hasData ? `已加载: ${fileStatus.fileName}` : '等待上传Excel文件'}
              </p>
            </div>
          </div>

          {/* Upload Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className={`flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg cursor-pointer transition-colors ${
                isUploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isUploading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )}
              <span className="text-sm font-medium">{fileStatus.hasData ? '更换文件' : '上传Excel'}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-[350px] overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white rounded-br-md'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {fileStatus.hasData && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">快捷问题：</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setInput(q)}
                className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={fileStatus.hasData ? '输入你的问题...' : '请先上传Excel文件...'}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
}
