'use client';

import { useState } from 'react';
import { Upload, FileSpreadsheet, X, Loader2, Link, ChevronDown, ChevronUp } from 'lucide-react';

interface ExcelUploaderProps {
  onDataLoaded: (data: any[], fileName: string) => void;
}

export function ExcelUploader({ onDataLoaded }: ExcelUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [showLarkInput, setShowLarkInput] = useState(false);
  const [larkUrl, setLarkUrl] = useState('');
  const [isLoadingLark, setIsLoadingLark] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('请上传 Excel 文件 (.xlsx 或 .xls)');
      return;
    }

    setIsUploading(true);
    setUploadedFile(file.name);

    try {
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

      if (data.success && data.data) {
        onDataLoaded(data.data, data.fileName);
      } else if (data.success && data.dataPreview) {
        // 兼容只有预览数据的情况
        onDataLoaded(data.dataPreview, data.fileName);
      } else {
        alert(data.error || '上传失败');
        setUploadedFile(null);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('上传失败，请重试');
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLarkUpload = async () => {
    if (!larkUrl.trim()) {
      alert('请输入飞书Excel链接');
      return;
    }

    setIsLoadingLark(true);
    try {
      const res = await fetch('/api/lark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: larkUrl }),
      });

      const data = await res.json();

      if (data.success && data.data) {
        onDataLoaded(data.data, data.fileName || '飞书表格');
      } else if (data.success && data.dataPreview) {
        onDataLoaded(data.dataPreview, data.fileName || '飞书表格');
      } else {
        alert(data.error || '获取飞书数据失败，请确保链接正确且表格已开启分享权限');
      }
    } catch (error) {
      console.error('Lark upload error:', error);
      alert('获取飞书数据失败，请重试');
    } finally {
      setIsLoadingLark(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      {/* 飞书链接上传区域 */}
      <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowLarkInput(!showLarkInput)}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Link className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-700">从飞书表格导入</p>
              <p className="text-sm text-gray-500">支持飞书在线表格链接</p>
            </div>
          </div>
          {showLarkInput ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {showLarkInput && (
          <div className="p-6 bg-white border-t border-gray-100">
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>使用说明：</strong><br/>
                1. 在飞书表格中，点击右上角 <strong>「···」</strong> 更多按钮<br/>
                2. 选择 <strong>「导出」</strong> → <strong>「导出为 Excel」</strong><br/>
                3. 下载后，将Excel文件拖拽到下方区域上传
              </p>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={larkUrl}
                onChange={(e) => setLarkUrl(e.target.value)}
                placeholder="粘贴飞书表格链接（选填，用于记录来源）"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleLarkUpload}
                disabled={isLoadingLark}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center gap-2"
              >
                {isLoadingLark ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    处理中
                  </>
                ) : (
                  '导入'
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              注：飞书表格需要导出为Excel格式后才能解析
            </p>
          </div>
        )}
      </div>

      {/* 本地上传区域 */}
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          dragActive
            ? 'border-violet-500 bg-violet-50'
            : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-16 h-16 text-violet-500 animate-spin" />
            <p className="text-gray-600">正在上传并分析 {uploadedFile}...</p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-violet-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              拖拽Excel文件到此处
            </h3>
            <p className="text-gray-500 mb-4">或者</p>
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg cursor-pointer hover:bg-violet-700 transition-colors">
              <FileSpreadsheet className="w-5 h-5" />
              <span>选择文件</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleChange}
                className="hidden"
              />
            </label>
            <p className="text-sm text-gray-400 mt-4">
              支持 .xlsx 和 .xls 格式
            </p>
          </>
        )}
      </div>

      {uploadedFile && !isUploading && (
        <div className="mt-4 flex items-center justify-between bg-green-50 text-green-700 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            <span className="text-sm">{uploadedFile}</span>
          </div>
          <button
            onClick={() => setUploadedFile(null)}
            className="p-1 hover:bg-green-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
