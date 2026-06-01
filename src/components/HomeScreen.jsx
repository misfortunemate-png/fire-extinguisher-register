// 何を: ホーム画面 — 68施設一覧・検索・統計・CSV/不具合出力ボタン
// なぜ: 仕様書 §3

import { useState, useMemo } from 'react';
import { FACILITIES } from '../data/facilities.js';
import { load } from '../lib/storage.js';
import { exportCSV } from '../lib/export-csv.js';
import { exportIssueReport } from '../lib/export-xlsx.js';
import { useToast } from '../hooks/useToast.js';
import Toast from './Toast.jsx';

export default function HomeScreen({ onSelectFacility, onSettings }) {
  const [query, setQuery] = useState('');
  const { toasts, showToast, dismissToast } = useToast();

  // 消火器・点検データをlocalStorageから読む
  const exts   = load('exts', []);
  const insps  = load('insps', []);

  // 施設ごとの登録数
  const countMap = useMemo(() => {
    const m = {};
    exts.forEach(e => { m[e.fid] = (m[e.fid] ?? 0) + 1; });
    return m;
  }, [exts]);

  // ヘッダー統計
  const totalRequired  = FACILITIES.reduce((s, f) => s + f.ext, 0);
  const totalRegistered = exts.length;
  const issueCount = insps.filter(i => i.vrd === '×' || (i.issue && i.issue.trim())).length;

  // 施設名・住所で部分一致フィルタ
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FACILITIES;
    return FACILITIES.filter(f =>
      f.name.toLowerCase().includes(q) || f.addr.toLowerCase().includes(q)
    );
  }, [query]);

  async function handleExportCSV() {
    const allFacilities = FACILITIES;
    exportCSV(exts, allFacilities);
    showToast('台帳CSVを出力しました');
  }

  async function handleExportXlsx() {
    try {
      await exportIssueReport(insps, exts, FACILITIES);
      showToast('週報xlsxを出力しました');
    } catch (e) {
      showToast(e.message ?? '出力に失敗しました', { error: true });
    }
  }

  return (
    <div className="app">
      {/* ヘッダー */}
      <header className="screen-header">
        <h1>消火器点検</h1>
        <div className="stats-row" style={{ color: '#a1a1aa' }}>
          <span><strong style={{ color: '#fff' }}>{totalRegistered}</strong>/{totalRequired}本</span>
          {issueCount > 0 && <span style={{ color: '#fca5a5' }}>不具合 {issueCount}件</span>}
        </div>
        <button onClick={onSettings} title="設定">⚙</button>
      </header>

      {/* 検索バー + 出力ボタン */}
      <div style={{ padding: '12px 16px', background: '#f4f4f5', borderBottom: '1px solid #e4e4e7' }}>
        <div className="search-bar">
          <input
            className="search-input"
            type="search"
            placeholder="施設名・住所で検索"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>CSV</button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportXlsx}>不具合</button>
        </div>
      </div>

      {/* 施設一覧 */}
      <div className="screen-body" style={{ padding: '0 16px' }}>
        {filtered.length === 0 && (
          <p style={{ padding: '24px 0', color: '#71717a', textAlign: 'center' }}>該当施設なし</p>
        )}
        {filtered.map(f => {
          const registered = countMap[f.id] ?? 0;
          const ok = registered >= f.ext;
          return (
            <div key={f.id} className="facility-row" onClick={() => onSelectFacility(f)}>
              <div>
                <div className="facility-name">{f.name}</div>
                <div className="facility-addr">{f.addr}</div>
              </div>
              <div className={`facility-count ${ok ? 'ok' : 'ng'}`}>
                {registered}/{f.ext}本
              </div>
            </div>
          );
        })}
      </div>

      <Toast toasts={toasts} dismissToast={dismissToast} />
    </div>
  );
}
