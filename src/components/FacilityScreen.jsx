// 何を: 施設詳細画面 — 消火器カード一覧・プリセットボタン・操作
// なぜ: 仕様書 §4

import { useState, useCallback } from 'react';
import { load, save } from '../lib/storage.js';
import { getAllPresets } from '../lib/presets.js';
import { useToast } from '../hooks/useToast.js';
import Toast from './Toast.jsx';

export default function FacilityScreen({ facility, onBack, onEdit, onInspect, onAddNew }) {
  const [refresh, setRefresh] = useState(0);
  const { toasts, showToast, dismissToast } = useToast();

  const exts  = load('exts', []).filter(e => e.fid === facility.id);
  const insps = load('insps', []);
  const presets = getAllPresets();

  // 消火器の最新点検を返す
  function latestInsp(extId) {
    const list = insps.filter(i => i.eid === extId).sort((a, b) => b.date.localeCompare(a.date));
    return list[0] ?? null;
  }

  function handleDelete(extId) {
    if (!window.confirm('この消火器を削除しますか？')) return;
    const all = load('exts', []);
    save('exts', all.filter(e => e.id !== extId));
    // 関連点検も削除
    save('insps', load('insps', []).filter(i => i.eid !== extId));
    setRefresh(r => r + 1);
    showToast('削除しました');
  }

  // プリセットボタンから新規登録（プリセットデータを事前セット）
  function handlePresetAdd(preset) {
    onEdit({ _preset: preset });
  }

  return (
    <div className="app">
      {/* ヘッダー */}
      <header className="screen-header">
        <button onClick={onBack}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{facility.name}</div>
          <div style={{ fontSize: 12, color: '#a1a1aa' }}>{facility.addr}</div>
        </div>
        <div style={{ fontSize: 13, color: '#a1a1aa', whiteSpace: 'nowrap' }}>
          {exts.length}/{facility.ext}本
        </div>
      </header>

      {/* プリセットボタン */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #e4e4e7', background: '#fafafa' }}>
        <div className="preset-bar">
          {presets.map(p => (
            <button
              key={p.id}
              className="preset-btn"
              style={{ background: p.bg }}
              onClick={() => handlePresetAdd(p)}
            >
              {p.label}
            </button>
          ))}
          <button className="preset-btn preset-btn-manual" onClick={() => onAddNew()}>
            手動入力
          </button>
        </div>
      </div>

      {/* 消火器カード一覧 */}
      <div className="screen-body">
        {exts.length === 0 && (
          <p style={{ padding: '24px 0', color: '#71717a', textAlign: 'center' }}>
            消火器が登録されていません
          </p>
        )}
        {exts.map(e => {
          const insp = latestInsp(e.id);
          const hasIssue = insp && (insp.vrd === '×' || (insp.issue && insp.issue.trim()));
          return (
            <div key={e.id} className="ext-card">
              <div className="ext-card-header">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{e.loc}</div>
                  <div style={{ fontSize: 13, color: '#52525b' }}>
                    {e.maker && `${e.maker} `}{e.model}
                    {e.year ? ` (${e.year}年製)` : ''}
                  </div>
                  {e.certNo && (
                    <div style={{ fontSize: 12, color: '#71717a' }}>消第 {e.certNo}</div>
                  )}
                  <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1, marginTop: 2 }}>
                    {e.sn}
                  </div>
                </div>
                {insp && (
                  <span className={`badge ${insp.vrd === '○' ? 'badge-ok' : 'badge-ng'}`}>
                    {insp.vrd}
                  </span>
                )}
              </div>
              {hasIssue && insp.issue && (
                <div style={{ fontSize: 13, background: '#fef2f2', color: '#dc2626', padding: '4px 8px', borderRadius: 4, marginBottom: 6 }}>
                  ⚠ {insp.issue}
                </div>
              )}
              <div className="ext-card-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => onInspect(e)}>点検</button>
                <button className="btn btn-secondary btn-sm" onClick={() => onEdit(e)}>編集</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(e.id)}>削除</button>
              </div>
            </div>
          );
        })}
      </div>

      <Toast toasts={toasts} dismissToast={dismissToast} />
    </div>
  );
}
