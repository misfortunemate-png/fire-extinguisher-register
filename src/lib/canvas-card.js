// 何を: Canvas APIで看板形式の報告カード画像を描画する
// なぜ: 仕様書 §8「Canvas API自前描画。html2canvas等ライブラリ不使用」
// 描画順: ヘッダー黒帯 → 写真 → 判定バッジ → 情報グリッド → 不備セクション

const CARD_W = 600;
const FONT   = 'sans-serif';

/**
 * 看板カード画像を描画してBlobで返す
 * @param {{ facility, ext, insp, photoBlob }} params
 * @returns {Promise<Blob>} JPEG Blob
 */
export async function renderIssueCard({ facility, ext, insp, photoBlob }) {
  // 写真を Image オブジェクトに変換
  let photoImg = null;
  if (photoBlob) {
    photoImg = await loadImage(photoBlob);
  }

  // 写真エリアの高さを計算（アスペクト比維持）
  const PHOTO_H = photoImg
    ? Math.round(CARD_W * photoImg.naturalHeight / photoImg.naturalWidth)
    : 240; // 写真なし時のプレースホルダ高

  // 情報行
  const infoRows = [
    ['設置場所', ext.loc ?? ''],
    ['種別',     ext.type ?? ''],
    ['消第',     ext.certNo ?? ''],
    ['製造番号', ext.sn ?? ''],
    ['製造年',   ext.year ? `${ext.year}年` : ''],
  ];

  // 不備テキスト（折り返し考慮）
  const ISSUE_MAX_W = CARD_W - 32;
  const ISSUE_FONT_SIZE = 14;

  // 高さを事前計算するための仮描画
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width  = CARD_W;
  tmpCanvas.height = 10;
  const tmpCtx = tmpCanvas.getContext('2d');

  const issueLines  = wrapText(tmpCtx, `不備: ${insp.issue  ?? ''}`, ISSUE_FONT_SIZE, ISSUE_MAX_W);
  const actionLines = wrapText(tmpCtx, `措置: ${insp.act ?? ''}`,    ISSUE_FONT_SIZE, ISSUE_MAX_W);

  const HEADER_H  = 48;
  const ROW_H     = 28;
  const INFO_H    = infoRows.length * ROW_H + 16;
  const ISSUE_H   = Math.max(
    (issueLines.length + actionLines.length) * (ISSUE_FONT_SIZE + 6) + 24,
    56
  );
  const TOTAL_H   = HEADER_H + PHOTO_H + INFO_H + ISSUE_H + 8;

  // 本描画
  const canvas = document.createElement('canvas');
  canvas.width  = CARD_W;
  canvas.height = TOTAL_H;
  const ctx = canvas.getContext('2d');

  // 背景: 白
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CARD_W, TOTAL_H);

  let y = 0;

  // ── ヘッダー黒帯 ─────────────────────
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, CARD_W, HEADER_H);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillText(facility.name ?? '', 16, y + 20);
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText(insp.date ?? '', 16, y + 38);
  y += HEADER_H;

  // ── 写真エリア ────────────────────────
  if (photoImg) {
    ctx.drawImage(photoImg, 0, y, CARD_W, PHOTO_H);
  } else {
    // グレープレースホルダ
    ctx.fillStyle = '#d4d4d8';
    ctx.fillRect(0, y, CARD_W, PHOTO_H);
    ctx.fillStyle = '#71717a';
    ctx.font = `16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('写真なし', CARD_W / 2, y + PHOTO_H / 2);
    ctx.textAlign = 'left';
  }

  // 判定バッジ（写真右上オーバーレイ）
  const BADGE_R = 22;
  const bx = CARD_W - BADGE_R - 10;
  const by = y + BADGE_R + 10;
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(bx, by, BADGE_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 22px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(insp.vrd === '○' ? '○' : '×', bx, by);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  y += PHOTO_H;

  // ── 情報グリッド ───────────────────────
  ctx.fillStyle = '#f4f4f5';
  ctx.fillRect(0, y, CARD_W, INFO_H);
  let iy = y + ROW_H / 2 + 6;
  for (const [label, val] of infoRows) {
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = '#71717a';
    ctx.fillText(label, 16, iy);
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillStyle = '#18181b';
    ctx.fillText(val, 100, iy);
    iy += ROW_H;
  }
  y += INFO_H;

  // ── 不備セクション（薄赤背景） ──────────
  ctx.fillStyle = '#fef2f2';
  ctx.fillRect(0, y, CARD_W, ISSUE_H);
  let issuey = y + 16;
  ctx.font = `${ISSUE_FONT_SIZE}px ${FONT}`;
  ctx.fillStyle = '#dc2626';
  for (const line of issueLines) {
    ctx.fillText(line, 16, issuey);
    issuey += ISSUE_FONT_SIZE + 6;
  }
  ctx.fillStyle = '#52525b';
  for (const line of actionLines) {
    ctx.fillText(line, 16, issuey);
    issuey += ISSUE_FONT_SIZE + 6;
  }

  // Blob として出力
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      blob ? resolve(blob) : reject(new Error('画像生成失敗'));
    }, 'image/jpeg', 0.85);
  });
}

/** テキストを折り返して行配列を返す */
function wrapText(ctx, text, fontSize, maxW) {
  if (!text) return [];
  ctx.font = `${fontSize}px ${FONT}`;
  const words = text.split('');
  const lines = [];
  let line = '';
  for (const ch of words) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line.length > 0) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('写真読み込み失敗')); };
    img.src = url;
  });
}
