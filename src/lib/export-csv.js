// 何を: 台帳CSVエクスポート（§9 で実装）
// なぜ: 仕様書 §9「全消火器台帳CSV出力」
import { FACILITIES } from '../data/facilities.js';

/** BOM付きUTF-8 CSV としてダウンロード */
export function exportCSV(exts, facilities) {
  const facMap = Object.fromEntries((facilities ?? FACILITIES).map(f => [f.id, f]));
  const header = ['番号', '施設名', '設置場所', '製造者', '型番', '種別', '消第', '薬剤量', '製造年', '製造番号', '備考', '登録日'];

  const rows = exts.map((e, i) => {
    const f = facMap[e.fid] ?? {};
    return [
      i + 1,
      f.name ?? '',
      e.loc ?? '',
      e.maker ?? '',
      e.model ?? '',
      e.type ?? '',
      e.certNo ?? '',
      e.agentWeight ?? '',
      e.year ?? '',
      e.sn ?? '',
      e.note ?? '',
      e.at ? e.at.slice(0, 10) : '',
    ].map(v => {
      const s = String(v);
      // カンマ・改行・ダブルクォートを含む場合はクォート
      return (s.includes(',') || s.includes('\n') || s.includes('"'))
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    });
  });

  const bom = '﻿';
  const csv = bom + [header, ...rows].map(r => r.join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `消火器台帳_${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
