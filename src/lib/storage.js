// 何を: localStorageの読み書きラッパー（fer_プレフィックス統一管理）
// なぜ: キー管理を一元化し、他画面からは load/save/clear だけ呼べばよくする

const PREFIX = 'fer_';

/** fer_プレフィックス付きキーで値を取得。未設定はデフォルト値を返す */
export function load(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

/** fer_プレフィックス付きキーに値を保存（JSON直列化） */
export function save(key, val) {
  localStorage.setItem(PREFIX + key, JSON.stringify(val));
}

/** fer_プレフィックスを持つキーをすべて削除 */
export function clear() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
}
