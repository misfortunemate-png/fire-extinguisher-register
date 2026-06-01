// 何を: 不具合報告xlsx出力（ExcelJS dynamic import、報告カード画像2列タイル）
// なぜ: 仕様書 §10「週報xlsx — 報告カード画像タイル配置」
import { getAllCards } from './idb.js';

/**
 * 不具合報告xlsxを生成してダウンロードする
 * @param {Array} insps - 全点検レコード
 * @param {Array} exts  - 全消火器レコード
 * @param {Array} facilities - 施設マスタ
 */
export async function exportIssueReport(insps, exts, facilities) {
  // 不具合のある点検を日付降順で抽出
  const issues = insps
    .filter(i => i.vrd === '×' || (i.issue && i.issue.trim()))
    .sort((a, b) => b.date.localeCompare(a.date));

  // 全報告カード画像を取得
  const cards = await getAllCards();
  const cardMap = Object.fromEntries(cards.map(c => [c.key, c.blob]));

  // 画像がある点検のみ対象
  const withImage = issues.filter(i => cardMap[`card_${i.id}`]);

  if (withImage.length === 0) {
    throw new Error('報告カードがありません');
  }

  // ExcelJS を動的インポート（バンドルサイズ制約のため）
  let ExcelJS;
  try {
    ExcelJS = (await import('exceljs')).default;
  } catch {
    throw new Error('xlsx出力ライブラリの読み込みに失敗しました');
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('不具合報告');

  const today = new Date().toISOString().slice(0, 10);

  // 1行目: タイトル
  sheet.getCell('A1').value = '消火器点検 不具合報告';
  sheet.getCell('A1').font = { bold: true, size: 14 };

  // 2行目: 報告日・件数
  sheet.getCell('A2').value = `報告日: ${today} | 不具合: ${withImage.length}件`;

  // 3行目: 空行
  // 4行目〜: 画像2列グリッド
  const COL_W = 36;   // エクセル列幅（約300px相当）
  const ROW_H = 220;  // エクセル行高（pt相当）
  const IMG_W = 300;  // 画像表示幅px
  const IMG_H = 400;  // 画像表示高px

  // 列幅を設定
  sheet.getColumn(1).width = COL_W;
  sheet.getColumn(2).width = COL_W;

  for (let i = 0; i < withImage.length; i++) {
    const col = i % 2;        // 0: A列, 1: B列
    const rowIdx = Math.floor(i / 2);
    const excelRow = 4 + rowIdx * 2; // 4行目から2行ずつ
    const colLetter = col === 0 ? 'A' : 'B';

    // 行高を設定
    sheet.getRow(excelRow).height = ROW_H;

    // Blobを ArrayBuffer → base64 に変換
    const blob = cardMap[`card_${withImage[i].id}`];
    const buf = await blob.arrayBuffer();
    const uint8 = new Uint8Array(buf);
    const b64 = btoa(String.fromCharCode(...uint8));

    const imgId = workbook.addImage({ base64: b64, extension: 'jpeg' });
    const cell = `${colLetter}${excelRow}`;
    const cellRef = sheet.getCell(cell);
    cellRef.value = null;

    sheet.addImage(imgId, {
      tl: { col: col, row: excelRow - 1 },
      ext: { width: IMG_W, height: IMG_H },
    });
  }

  // 生成してダウンロード
  const buf = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `不具合報告_${today}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
