// 何を: Gemini API 連携 — 消火器ラベル画像から4項目を抽出
// なぜ: 仕様書 §6「gemini-2.0-flash で sn/model/year/certNo を抽出」

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Gemini に渡すプロンプト（変更しやすいよう定数化）
const PROMPT = '消火器ラベルの写真です。次の4項目をJSONで返してください。読み取れない項目はnullとしてください。他のテキストは不要です。\n\n{"sn":"製造番号","model":"型番や品番","year":製造年の数値,"certNo":"型式番号の数字部分"}';

/**
 * base64画像を送信してラベル情報を抽出する
 * @param {string} base64 - JPEG base64 文字列
 * @param {string} apiKey - Gemini API キー
 * @returns {{ sn, model, year, certNo } | null} パース失敗時は null
 */
export async function readLabel(base64, apiKey) {
  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64 } },
          { text: PROMPT },
        ],
      }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API エラー: ${res.status}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // ```json ... ``` ブロックがあれば中身を抽出、なければ全体をパース
  const match = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = match ? match[1] : text;

  try {
    const parsed = JSON.parse(raw.trim());
    return {
      sn:     parsed.sn     ?? null,
      model:  parsed.model  ?? null,
      year:   typeof parsed.year === 'number' ? parsed.year : null,
      certNo: parsed.certNo ?? null,
    };
  } catch {
    // JSON パース失敗 → null を返す（呼び出し側でエラートーストを表示）
    return null;
  }
}
