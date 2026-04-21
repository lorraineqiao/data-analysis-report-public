'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImageModal({ isOpen, src, alt, onClose }: ImageModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 max-w-4xl max-h-[90vh] p-4">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <img 
          src={src}
          alt={alt}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
        />
        {alt && <p className="text-white text-center mt-2 text-sm">{alt}</p>}
      </div>
    </div>
  );
}
