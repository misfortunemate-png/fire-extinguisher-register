// 何を: 設定・デバッグ画面 — APIキー管理・カスタムプリセット管理・デバッグ
// なぜ: 仕様書 §11

import { useState } from 'react';
import { load, save, clear } from '../lib/storage.js';
import { getAllPresets, removeCustomPreset } from '../lib/presets.js';
import { clearAllCards, getAllCards } from '../lib/idb.js';
import { useToast } from '../hooks/useToast.js';
import Toast from './Toast.jsx';

export default function SettingsScreen({ onBack }) {
  const [apiKey, setApiKey]   = useState('');
  const [refresh, setRefresh] = useState(0);
  const { toasts, showToast, dismissToast } = useToast();

  const settings = load('settings', {});
  const maskedKey = settings.geminiKey
    ? `設定済み（…${settings.geminiKey.slice(-4)}）`
    : '未設定';

  const allPresets = getAllPresets();
  const customPresets = allPresets.filter(p => !p.builtin);
  const builtinPresets = allPresets.filter(p => p.builtin);

  const exts  = load('exts', []);
  const insps = load('insps', []);

  async function handleSaveKey() {
    if (!apiKey.trim()) { showToast('APIキーを入力してください', { error: true }); return; }
    save('settings', { ...settings, geminiKey: apiKey.trim() });
    setApiKey('');
    showToast('APIキーを保存しました');
    setRefresh(r => r + 1);
  }

  function handleDeletePreset(id) {
    if (!window.confirm('このプリセットを削除しますか？')) return;
    removeCustomPreset(id);
    setRefresh(r => r + 1);
    showToast('削除しました');
  }

  async function handleClearAll() {
    if (!window.confirm('すべてのデータ（消火器・点検・設定・プリセット・報告カード）を削除しますか？\nこの操作は元に戻せません。')) return;
    clear();
    await clearAllCards();
    window.location.reload();
  }

  async function handleClearCache() {
    if (!window.confirm('キャッシュを削除してリロードしますか？')) return;
    const regs = await navigator.serviceWorker?.getRegistrations() ?? [];
    await Promise.all(regs.map(r => r.unregister()));
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(n => caches.delete(n)));
    window.location.reload();
  }

  async function getCardCount() {
    const cards = await getAllCards();
    return cards.length;
  }

  const [cardCount, setCardCount] = useState(null);
  if (cardCount === null) {
    getCardCount().then(n => setCardCount(n));
  }

  return (
    <div className="app">
      <header className="screen-header">
        <button onClick={onBack}>←</button>
        <h1>設定</h1>
      </header>

      <div className="screen-body">

        {/* APIキー */}
        <div className="settings-section">
          <h2>Gemini APIキー</h2>
          <div style={{ fontSize: 13, color: '#52525b', marginBottom: 8 }}>
            現在: {maskedKey}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              type="password"
              placeholder="新しいAPIキーを入力"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleSaveKey}>保存</button>
          </div>
        </div>

        {/* 組み込みプリセット */}
        <div className="settings-section">
          <h2>組み込みプリセット</h2>
          {builtinPresets.map(p => (
            <div key={p.id} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: p.bg, color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 13, fontWeight: 600 }}>
                  {p.label}
                </span>
                <span style={{ fontSize: 12, color: '#71717a' }}>削除不可</span>
              </div>
              <div style={{ fontSize: 12, color: '#52525b', marginTop: 4 }}>
                {p.data.maker} / {p.data.model} / {p.data.year}年 / 消第{p.data.certNo}
              </div>
            </div>
          ))}
        </div>

        {/* カスタムプリセット */}
        <div className="settings-section">
          <h2>カスタムプリセット</h2>
          {customPresets.length === 0 && (
            <p style={{ color: '#71717a', fontSize: 13 }}>カスタムプリセットはありません</p>
          )}
          {customPresets.map(p => (
            <div key={p.id} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ background: p.bg, color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 13, fontWeight: 600 }}>
                    {p.label}
                  </span>
                  <div style={{ fontSize: 12, color: '#52525b', marginTop: 4 }}>
                    {p.data.maker} / {p.data.model}
                    {p.data.year ? ` / ${p.data.year}年` : ''}
                    {p.data.certNo ? ` / 消第${p.data.certNo}` : ''}
                  </div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeletePreset(p.id)}>削除</button>
              </div>
            </div>
          ))}
        </div>

        {/* デバッグ */}
        <div className="settings-section">
          <h2>デバッグ</h2>
          <div style={{ fontSize: 13, color: '#52525b', marginBottom: 12 }}>
            <div>消火器: {exts.length}件</div>
            <div>点検: {insps.length}件</div>
            <div>報告カード: {cardCount ?? '…'}枚</div>
            <div style={{ marginTop: 4, color: '#71717a' }}>v0.1.0</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-danger" onClick={handleClearAll}>
              全データ削除
            </button>
            <button className="btn btn-secondary" onClick={handleClearCache}>
              キャッシュ削除
            </button>
          </div>
        </div>

      </div>

      <Toast toasts={toasts} dismissToast={dismissToast} />
    </div>
  );
}
