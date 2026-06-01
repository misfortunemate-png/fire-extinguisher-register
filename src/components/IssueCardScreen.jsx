// 何を: 報告カード画面 — 写真撮影・看板レイアウト表示・Canvas画像化・IndexedDB保存
// なぜ: 仕様書 §8

import { useState } from 'react';
import { load } from '../lib/storage.js';
import { capturePhoto } from '../lib/camera.js';
import { renderIssueCard } from '../lib/canvas-card.js';
import { saveCard } from '../lib/idb.js';
import { useToast } from '../hooks/useToast.js';
import Toast from './Toast.jsx';

export default function IssueCardScreen({ facility, ext, inspId, onBack }) {
  const [photoBlob, setPhotoBlob]   = useState(null);
  const [photoUrl, setPhotoUrl]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const { toasts, showToast, dismissToast } = useToast();

  // 点検レコードを取得
  const insp = load('insps', []).find(i => i.id === inspId) ?? {};

  async function handleCapture() {
    try {
      const { blob } = await capturePhoto(800);
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoBlob(blob);
      setPhotoUrl(URL.createObjectURL(blob));
    } catch (e) {
      if (!e.message.includes('キャンセル')) {
        showToast('撮影に失敗しました', { error: true });
      }
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const blob = await renderIssueCard({ facility, ext, insp, photoBlob });
      await saveCard(inspId, blob);
      showToast('報告カードを保存しました');
      setTimeout(onBack, 800);
    } catch (e) {
      showToast(e.message ?? '保存に失敗しました', { error: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app">
      <header className="screen-header">
        <button onClick={onBack}>←</button>
        <h1>報告カード</h1>
        <button className="btn btn-sm" style={{ background: '#3f3f46', color: '#fff' }} onClick={handleCapture}>
          📷 撮影
        </button>
      </header>

      <div className="screen-body" style={{ padding: 0 }}>
        {/* 看板プレビュー */}
        <div style={{ background: '#18181b', color: '#fff', padding: '12px 16px' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{facility?.name}</div>
          <div style={{ fontSize: 13, color: '#a1a1aa' }}>{insp.date}</div>
        </div>

        {/* 写真エリア */}
        <div style={{ position: 'relative', background: '#d4d4d8', minHeight: 200 }}>
          {photoUrl ? (
            <img src={photoUrl} alt="不具合写真" style={{ width: '100%', display: 'block' }} />
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a' }}>
              撮影ボタンで写真を追加
            </div>
          )}
          {/* 判定バッジ */}
          <div style={{
            position: 'absolute', top: 10, right: 10,
            width: 44, height: 44, borderRadius: '50%',
            background: insp.vrd === '○' ? '#22c55e' : '#dc2626',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 20,
          }}>
            {insp.vrd ?? '×'}
          </div>
        </div>

        {/* 情報グリッド */}
        <div style={{ background: '#f4f4f5', padding: '10px 16px' }}>
          {[
            ['設置場所', ext?.loc ?? ''],
            ['種別',     ext?.type ?? ''],
            ['消第',     ext?.certNo ?? ''],
            ['製造番号', ext?.sn ?? ''],
            ['製造年',   ext?.year ? `${ext.year}年` : ''],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 12, padding: '3px 0', fontSize: 14 }}>
              <span style={{ color: '#71717a', width: 72, flexShrink: 0 }}>{k}</span>
              <span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* 不備セクション */}
        <div style={{ background: '#fef2f2', padding: '10px 16px' }}>
          {insp.issue && (
            <div style={{ color: '#dc2626', fontSize: 14, marginBottom: 4 }}>
              不備: {insp.issue}
            </div>
          )}
          {insp.act && (
            <div style={{ color: '#52525b', fontSize: 14 }}>
              措置: {insp.act}
            </div>
          )}
        </div>

        <div style={{ padding: 16 }}>
          <button
            className="btn btn-primary btn-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中…' : '画像として保存'}
          </button>
          <button className="btn btn-secondary btn-full" style={{ marginTop: 8 }} onClick={onBack}>
            保存せずに戻る
          </button>
        </div>
      </div>

      <Toast toasts={toasts} dismissToast={dismissToast} />
    </div>
  );
}
