// 何を: プリセット管理（組み込み2件 + カスタムプリセット）
// なぜ: ワンタップで消火器データを自動入力するため。AI読み取り結果とのマッチングにも使う
import { load, save } from './storage.js';

/** カスタムプリセットの背景色ローテーション */
const CUSTOM_COLORS = ['#065f46', '#7c2d12', '#1e3a5f', '#4a044e', '#713f12'];

/** 組み込みプリセット（変更不可・ユーザー削除不可） */
const BUILTIN = [
  {
    id: 'morita-2016',
    label: 'モリタ 2016',
    match: { model: 'MEA10', year: 2016, certNo: '26-26' },
    data: { maker: 'モリタ宮田工業', model: 'MEA10', type: '粉末ABC 10型', certNo: '26-26', agentWeight: '3.0kg', year: 2016 },
    bg: '#92400e',
    builtin: true,
  },
  {
    id: 'hatsuta-2024',
    label: '初田 2024',
    match: { model: 'PEP-10N', year: 2024, certNo: '29-1' },
    data: { maker: '初田製作所', model: 'PEP-10N', type: '粉末ABC 10型', certNo: '29-1', agentWeight: '3.0kg', year: 2024 },
    bg: '#1e40af',
    builtin: true,
  },
];

/** 組み込み + カスタムプリセットを返す */
export function getAllPresets() {
  const custom = load('presets', []);
  return [...BUILTIN, ...custom];
}

/**
 * AI読み取り結果でプリセットを検索する
 * なぜ: model / year / certNo のいずれか1つでもヒットすれば適用する（仕様書 §2 マッチングロジック）
 */
export function findPreset(result) {
  const all = getAllPresets();
  return all.find(p =>
    (result.model  && result.model  === p.match.model) ||
    (result.year   && result.year   === p.match.year) ||
    (result.certNo && result.certNo === p.match.certNo)
  ) ?? null;
}

/** カスタムプリセットを追加する。idは簡易uid、bgは順番割り当て */
export function addCustomPreset(data, label) {
  const custom = load('presets', []);
  const bg = CUSTOM_COLORS[custom.length % CUSTOM_COLORS.length];
  const preset = {
    id: `custom-${Date.now()}`,
    label,
    match: { model: data.model || null, year: data.year || null, certNo: data.certNo || null },
    data: { ...data },
    bg,
    builtin: false,
  };
  save('presets', [...custom, preset]);
  return preset;
}

/** カスタムプリセットを削除する（組み込みは削除できない） */
export function removeCustomPreset(id) {
  const custom = load('presets', []);
  save('presets', custom.filter(p => p.id !== id));
}
