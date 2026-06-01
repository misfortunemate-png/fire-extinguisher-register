import { useState } from 'react';

// §3〜§11 で各画面を順次インポート・実装
// 画面状態: 'home' | 'fac' | 'edit' | 'insp' | 'issueCard' | 'settings'

export default function App() {
  const [screen, setScreen] = useState('home');

  // §3以降でここに各画面コンポーネントを追加
  return (
    <div className="app">
      <div className="screen-body loading">
        <p>消火器点検 — 実装中</p>
      </div>
    </div>
  );
}
