// 何を: トースト通知の状態管理フック
// なぜ: 各画面で共通利用するため中央管理
import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, opts = {}) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, error: opts.error ?? false, actions: opts.actions ?? null };
    setToasts(prev => [...prev, toast]);
    // actionsがない場合は2.5秒後に自動消去
    if (!opts.actions) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
    }
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}
