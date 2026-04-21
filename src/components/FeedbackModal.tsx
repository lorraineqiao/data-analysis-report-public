'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">反馈问题</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 text-center">
          <p className="text-gray-600 mb-6">
            请添加所有者的飞书，进行详细问题反馈
          </p>
          
          {/* 二维码 */}
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl shadow-md border border-gray-100 inline-block">
              <img 
                src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F20260416-182220.png&nonce=4e959604-ce78-4cb3-9384-f09b09e62178&project_id=7629252999420100614&sign=c29d3d38650c49640be0c02640ac443fbb03f6706336e95ffaced821709dae3e" 
                alt="飞书二维码"
                className="w-48 h-48 object-contain"
              />
            </div>
          </div>
          
          <p className="text-sm text-gray-400 mt-4">
            扫描上方二维码添加好友
          </p>
        </div>
      </div>
    </div>
  );
}
