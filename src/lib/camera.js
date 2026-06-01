// 何を: カメラ撮影・画像リサイズ
// なぜ: 仕様書 §6「capturePhoto — input[type=file]動的生成＋Canvas APIリサイズ」

/**
 * カメラ起動→撮影→Canvas APIで長辺maxPxにリサイズ
 * @param {number} maxPx 長辺の最大ピクセル数
 * @returns {{ blob: Blob, base64: string }}
 */
export function capturePhoto(maxPx = 1024) {
  return new Promise((resolve, reject) => {
    // <input type="file" capture="environment"> を動的生成してカメラを起動
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { reject(new Error('撮影がキャンセルされました')); return; }

      const img = await loadImage(file);
      const { w, h } = resize(img.naturalWidth, img.naturalHeight, maxPx);

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('画像変換失敗')); return; }
        const reader = new FileReader();
        reader.onload = () => {
          // data URL から base64 部分のみ取り出す
          const base64 = reader.result.split(',')[1];
          resolve({ blob, base64 });
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.85);
    };

    input.onerror = () => reject(new Error('カメラエラー'));
    input.click();
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('画像読み込み失敗')); };
    img.src = url;
  });
}

function resize(w, h, maxPx) {
  if (w <= maxPx && h <= maxPx) return { w, h };
  if (w >= h) return { w: maxPx, h: Math.round(h * maxPx / w) };
  return { w: Math.round(w * maxPx / h), h: maxPx };
}
