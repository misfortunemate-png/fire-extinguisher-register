// 何を: 消火器登録・編集フォーム。プリセット反映・AI自動入力・カスタムプリセット追加確認
// なぜ: 仕様書 §5・§6

import { useState } from 'react';
import { load, save } from '../lib/storage.js';
import { addCustomPreset, getAllPresets } from '../lib/presets.js';
import { capturePhoto } from '../lib/camera.js';
import { readLabel } from '../lib/gemini.js';
import { findPreset } from '../lib/presets.js';
import { useToast } from '../hooks/useToast.js';
import Toast from './Toast.jsx';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const EMPTY_FORM = {
  loc: '', maker: '', model: '', type: '粉末ABC 10型',
  certNo: '', agentWeight: '', year: '', sn: '', note: '',
};

export default function EditScreen({ facility, ext, onBack, onSaved }) {
  // _preset付きのextはプリセットからの新規登録
  const isNew = !ext || ext._preset;
  const presetInit = ext?._preset;

  const [form, setForm] = useState(() => {
    if (presetInit) {
      return { ...EMPTY_FORM, ...presetInit.data, year: String(presetInit.data.year ?? '') };
    }
    if (ext && !ext._preset) {
      return {
        loc: ext.loc ?? '', maker: ext.maker ?? '', model: ext.model ?? '',
        type: ext.type ?? '粉末ABC 10型', certNo: ext.certNo ?? '',
        agentWeight: ext.agentWeight ?? '', year: String(ext.year ?? ''),
        sn: ext.sn ?? '', note: ext.note ?? '',
      };
    }
    return { ...EMPTY_FORM };
  });

  const [loading, setLoading] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();
  const presets = getAllPresets();

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  // プリセット選択
  function applyPreset(preset) {
    setForm(f => ({
      ...f,
      ...preset.data,
      year: String(preset.data.year ?? ''),
      loc: f.loc,  // 設置場所は保持
      sn: f.sn,    // 製造番号は保持
    }));
  }

  // ラベル撮影 → AI自動入力（§6）
  async function handleCapture() {
    const settings = load('settings', {});
    if (!settings.geminiKey) {
      showToast('設定画面でAPIキーを登録してください', { error: true });
      return;
    }
    if (!navigator.onLine) {
      showToast('オフラインでは自動入力できません', { error: true });
      return;
    }
    setLoading(true);
    try {
      const { base64 } = await capturePhoto(1024);
      const result = await readLabel(base64, settings.geminiKey);
      if (!result) {
        showToast('読み取りに失敗しました', { error: true });
        return;
      }
      const matched = findPreset(result);
      if (matched) {
        setForm(f => ({
          ...f, ...matched.data,
          year: String(matched.data.year ?? ''),
          sn: result.sn ?? f.sn,
        }));
        showToast(`${matched.label} を適用しました`);
      } else {
        // プリセット未一致: 読み取れたフィールドだけ適用
        setForm(f => ({
          ...f,
          ...(result.model  ? { model:  result.model }  : {}),
          ...(result.year   ? { year:   String(result.year) } : {}),
          ...(result.certNo ? { certNo: result.certNo } : {}),
          ...(result.sn     ? { sn:     result.sn }     : {}),
        }));
        showToast('ラベルを読み取りました（プリセット該当なし）');
      }
    } catch {
      showToast('読み取りに失敗しました', { error: true });
    } finally {
      setLoading(false);
    }
  }

  // 保存
  function handleSave() {
    if (!form.loc.trim()) { showToast('設置場所を入力してください', { error: true }); return; }
    if (!form.sn.trim())  { showToast('製造番号を入力してください', { error: true }); return; }

    const all = load('exts', []);
    const record = {
      id: ext && !ext._preset ? ext.id : uid(),
      fid: facility.id,
      loc: form.loc.trim(),
      maker: form.maker.trim(),
      model: form.model.trim(),
      type: form.type.trim(),
      certNo: form.certNo.trim(),
      agentWeight: form.agentWeight.trim(),
      year: form.year ? Number(form.year) : null,
      sn: form.sn.trim(),
      note: form.note.trim(),
      at: ext && !ext._preset ? (ext.at ?? new Date().toISOString()) : new Date().toISOString(),
    };

    if (ext && !ext._preset) {
      save('exts', all.map(e => e.id === ext.id ? record : e));
      showToast('更新しました');
      setTimeout(onSaved, 600);
    } else {
      save('exts', [...all, record]);
      // 新規登録かつプリセット未選択の場合、カスタムプリセット追加を提案
      const wasPreset = !!presetInit;
      if (!wasPreset) {
        showToast('登録しました。このデータをプリセットに追加しますか？', {
          actions: [
            {
              label: '追加',
              primary: true,
              onClick: () => {
                const label = [form.maker, form.model, form.year].filter(Boolean).join(' ') || '新プリセット';
                addCustomPreset({
                  maker: form.maker.trim(), model: form.model.trim(),
                  type: form.type.trim(), certNo: form.certNo.trim(),
                  agentWeight: form.agentWeight.trim(), year: form.year ? Number(form.year) : null,
                }, label);
                onSaved();
              },
            },
            { label: '不要', primary: false, onClick: () => onSaved() },
          ],
        });
      } else {
        showToast('登録しました');
        setTimeout(onSaved, 600);
      }
    }
  }

  return (
    <div className="app">
      <header className="screen-header">
        <button onClick={onBack}>←</button>
        <h1>{isNew ? '消火器登録' : '編集'}</h1>
        <button
          className="btn btn-sm"
          style={{ background: '#3f3f46', color: '#fff' }}
          onClick={handleCapture}
          disabled={loading}
        >
          {loading ? '…' : '📷 ラベル撮影'}
        </button>
      </header>

      <div className="screen-body">
        {/* 施設名 */}
        <div style={{ padding: '6px 0 10px', color: '#71717a', fontSize: 13 }}>
          {facility.name}
        </div>

        {/* プリセット選択 */}
        <div style={{ marginBottom: 14 }}>
          <div className="form-label">プリセット</div>
          <div className="preset-bar">
            {presets.map(p => (
              <button
                key={p.id}
                className="preset-btn"
                style={{ background: p.bg }}
                onClick={() => applyPreset(p)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* フォームフィールド */}
        <div className="form-group">
          <label className="form-label">設置場所 *</label>
          <input className="form-input" value={form.loc} onChange={e => set('loc', e.target.value)} placeholder="例: 1F 廊下" />
        </div>
        <div className="form-group">
          <label className="form-label">製造番号 *</label>
          <input className="form-input sn-input" value={form.sn} onChange={e => set('sn', e.target.value)} placeholder="例: 149573K" />
        </div>
        <div className="form-group">
          <label className="form-label">製造者</label>
          <input className="form-input" value={form.maker} onChange={e => set('maker', e.target.value)} placeholder="例: モリタ宮田工業" />
        </div>
        <div className="form-group">
          <label className="form-label">型番</label>
          <input className="form-input" value={form.model} onChange={e => set('model', e.target.value)} placeholder="例: MEA10" />
        </div>
        <div className="form-group">
          <label className="form-label">種別</label>
          <input className="form-input" value={form.type} onChange={e => set('type', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">消第（型式番号）</label>
          <input className="form-input" value={form.certNo} onChange={e => set('certNo', e.target.value)} placeholder="例: 26-26" />
        </div>
        <div className="form-group">
          <label className="form-label">薬剤量</label>
          <input className="form-input" value={form.agentWeight} onChange={e => set('agentWeight', e.target.value)} placeholder="例: 3.0kg" />
        </div>
        <div className="form-group">
          <label className="form-label">製造年</label>
          <input className="form-input" type="number" inputMode="numeric" value={form.year} onChange={e => set('year', e.target.value)} placeholder="例: 2016" />
        </div>
        <div className="form-group">
          <label className="form-label">備考</label>
          <textarea className="form-input" value={form.note} onChange={e => set('note', e.target.value)} rows={2} />
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSave}>
          {isNew ? '登録する' : '更新する'}
        </button>
      </div>

      <Toast toasts={toasts} dismissToast={dismissToast} />
    </div>
  );
}
