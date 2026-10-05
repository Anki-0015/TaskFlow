'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: 'bg-green-50 border-green-300 text-green-800',
    error:   'bg-red-50 border-red-300 text-red-800',
    info:    'bg-blue-50 border-blue-300 text-blue-800',
  };

  const icons = { success: '✓', error: '✕', info: 'ℹ' };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-md text-sm animate-fade-in ${colors[type]}`}>
      <span className="font-bold">{icons[type]}</span>
      <span>{message}</span>
    </div>
  );
}

// Global toast context
export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

let addToastFn: ((msg: string, type: ToastData['type']) => void) | null = null;

export function showToast(message: string, type: ToastData['type'] = 'success') {
  if (addToastFn) addToastFn(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    addToastFn = (message, type) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type }]);
    };
    return () => { addToastFn = null; };
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />
      ))}
    </div>
  );
}
