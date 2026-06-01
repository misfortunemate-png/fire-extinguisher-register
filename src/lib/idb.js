// 何を: IndexedDB（fer_photos / cards）の生API操作
// なぜ: 報告カード画像（Blob）は容量が大きいため localStorage ではなく IndexedDB に格納する
// ラッパーライブラリ不使用（仕様書制約 §2）

const DB_NAME = 'fer_photos';
const STORE_NAME = 'cards';
const DB_VERSION = 1;

/** DB接続を開く。初回は cards ストアを作成 */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      // ストアが存在しなければ作成
      if (!e.target.result.objectStoreNames.contains(STORE_NAME)) {
        e.target.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** 報告カード画像を保存。key: "card_{inspId}", value: Blob */
export async function saveCard(inspId, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, `card_${inspId}`);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** 指定IDの報告カード画像を取得。未存在は null */
export async function getCard(inspId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(`card_${inspId}`);
    req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/** 全報告カード画像を { key, blob } 配列で取得 */
export async function getAllCards() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const results = [];
    const curReq = tx.objectStore(STORE_NAME).openCursor();
    curReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        results.push({ key: cursor.key, blob: cursor.value });
        cursor.continue();
      }
    };
    tx.oncomplete = () => { db.close(); resolve(results); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** 指定IDの報告カード画像を削除 */
export async function deleteCard(inspId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(`card_${inspId}`);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** 全報告カード画像を削除 */
export async function clearAllCards() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
