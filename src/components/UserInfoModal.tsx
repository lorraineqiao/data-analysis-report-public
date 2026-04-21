'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface UserInfoModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (agentName: string, managerName: string) => void
}

export default function UserInfoModal({ isOpen, onClose, onSubmit }: UserInfoModalProps) {
  const [agentName, setAgentName] = useState('')
  const [managerName, setManagerName] = useState('')

  if (!isOpen) return null

  const handleSubmit = () => {
    if (agentName.trim() && managerName.trim()) {
      onSubmit(agentName.trim(), managerName.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && agentName.trim() && managerName.trim()) {
      handleSubmit()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] max-w-[90vw] p-6 relative">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 标题 */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">信息收集</h2>
          <p className="text-sm text-gray-500">请填写以下信息以便我们更好地为您服务</p>
        </div>

        {/* 表单 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              代理商名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="请输入代理商名称"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              本地推端口的渠道经理姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="请输入本地推端口的渠道经理姓名"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            稍后填写
          </button>
          <button
            onClick={handleSubmit}
            disabled={!agentName.trim() || !managerName.trim()}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            开始分析
          </button>
        </div>

        {/* 提示 */}
        <p className="text-xs text-gray-400 text-center mt-4">
          这些信息将帮助我们更好地了解您的使用情况
        </p>
      </div>
    </div>
  )
}
