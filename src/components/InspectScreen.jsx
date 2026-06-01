// 何を: 点検記録画面 — 4項目判定・総合判定・不備内容・保存後の遷移
// なぜ: 仕様書 §7

import { useState } from 'react';
import { load, save } from '../lib/storage.js';
import { useToast } from '../hooks/useToast.js';
import Toast from './Toast.jsx';

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function today() { return new Date().toISOString().slice(0, 10); }

const ITEMS = [
  { key: 'body', label: '本体容器' },
  { key: 'prs',  label: '圧力計' },
  { key: 'plc',  label: '設置状況' },
  { key: 'lbl',  label: '表示ラベル' },
];
const ITEM_OPTS = ['○', '△', '×', '/'];

function VerdictButton({ value, current, onClick }) {
  let cls = 'verdict-btn';
  if (current === value) cls += value === '○' ? ' selected-ok' : ' selected-ng';
  return <button className={cls} onClick={() => onClick(value)}>{value}</button>;
}

export default function InspectScreen({ facility, ext, onBack, onSaved }) {
  const [date, setDate]   = useState(today);
  const [items, setItems] = useState({ body: '', prs: '', plc: '', lbl: '' });
  const [vrd, setVrd]     = useState('');
  const [issue, setIssue] = useState('');
  const [act, setAct]     = useState('');
  const { toasts, showToast, dismissToast } = useToast();

  function setItem(key, val) { setItems(prev => ({ ...prev, [key]: val })); }

  function handleSave() {
    if (!vrd) { showToast('総合判定を選択してください', { error: true }); return; }

    const record = {
      id: uid(),
      eid: ext.id,
      date,
      body: items.body,
      prs:  items.prs,
      plc:  items.plc,
      lbl:  items.lbl,
      vrd,
      issue: issue.trim(),
      act:   act.trim(),
    };

    const all = load('insps', []);
    save('insps', [...all, record]);

    const hasIssue = vrd === '×' || issue.trim().length > 0;
    if (!hasIssue) {
      showToast('点検記録を保存しました');
      setTimeout(() => onSaved(record.id, false), 600);
    } else {
      onSaved(record.id, true);
    }
  }

  return (
    <div className="app">
      <header className="screen-header">
        <button onClick={onBack}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            {ext.loc} | {ext.maker} {ext.model} | {ext.year}年製
          </div>
          <div style={{ fontSize: 12, color: '#a1a1aa' }}>{facility.name}</div>
        </div>
      </header>

      <div className="screen-body">
        {/* 点検日 */}
        <div className="form-group">
          <label className="form-label">点検日</label>
          <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {/* 4項目判定 */}
        {ITEMS.map(({ key, label }) => (
          <div key={key} className="form-group">
            <label className="form-label">{label}</label>
            <div className="verdict-row">
              {ITEM_OPTS.map(v => (
                <VerdictButton key={v} value={v} current={items[key]} onClick={val => setItem(key, val)} />
              ))}
            </div>
          </div>
        ))}

        <hr className="divider" />

        {/* 総合判定（必須・強調） */}
        <div className="form-group">
          <label className="form-label" style={{ fontSize: 15, fontWeight: 700 }}>総合判定 *</label>
          <div className="verdict-row">
            <VerdictButton value="○" current={vrd} onClick={setVrd} />
            <VerdictButton value="×" current={vrd} onClick={setVrd} />
          </div>
        </div>

        {/* 不備内容 */}
        <div className="form-group">
          <label className="form-label">不備内容</label>
          <textarea className="form-input" value={issue} onChange={e => setIssue(e.target.value)} rows={2} placeholder="例: 圧力計動作不良" />
        </div>

        {/* 措置 */}
        <div className="form-group">
          <label className="form-label">措置</label>
          <textarea className="form-input" value={act} onChange={e => setAct(e.target.value)} rows={2} placeholder="例: 交換手配中" />
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSave}>
          保存する
        </button>
      </div>

      <Toast toasts={toasts} dismissToast={dismissToast} />
    </div>
  );
}
