# fire-extinguisher-register 実装仕様書

作成日: 2026-06-01
PM: クリーデ
承認済み要件定義: 2026-06-01
改訂: 同日。報告カード方式・動的プリセット・プロンプト設計を反映

---

## 1. 概要

- 何を作るか: 板橋区公共施設（68施設・401本）の消火器台帳管理＋点検記録PWA
- なぜ作るか: 現場巡回で消火器登録・点検・不具合報告を完結させる。ラベルAI読み取りで登録を効率化し、不具合は看板式報告カードで週報に直結させる
- 誰が使うか: ショウゴさん（Pixel 10）

## 2. ファイル構成

```
fire-extinguisher-register/
├── index.html
├── vite.config.js
├── package.json
├── CLAUDE.md
├── _STATUS.md
├── .github/workflows/deploy.yml
├── public/
│   ├── manifest.json
│   ├── sw.js
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── data/
│   │   └── facilities.js
│   ├── components/
│   │   ├── HomeScreen.jsx          # §3
│   │   ├── FacilityScreen.jsx      # §4
│   │   ├── EditScreen.jsx          # §5 §6
│   │   ├── InspectScreen.jsx       # §7
│   │   ├── IssueCardScreen.jsx     # §8
│   │   ├── SettingsScreen.jsx      # §11
│   │   └── Toast.jsx
│   ├── lib/
│   │   ├── storage.js              # §2
│   │   ├── idb.js                  # §2
│   │   ├── presets.js              # §2 §6
│   │   ├── gemini.js               # §6
│   │   ├── camera.js               # §6 §8
│   │   ├── canvas-card.js          # §8
│   │   ├── export-csv.js           # §9
│   │   └── export-xlsx.js          # §10
│   └── hooks/
│       └── useToast.js
└── docs/
    ├── requirements.md
    ├── spec-phase1.md
    └── instructions-phase1.md
```

## 3. 技術選定

| 技術 | 理由 |
|---|---|
| Vite 6.x + React 19.x | 既存スタック準拠 |
| localStorage | 台帳・点検・プリセット・設定 |
| IndexedDB 生API | 報告カード画像（Blob） |
| Gemini API (gemini-2.0-flash) | ラベルOCR。最小プロンプトで4項目抽出 |
| Canvas API | 報告カード→画像化。外部ライブラリ不要 |
| ExcelJS (dynamic import) | 週報xlsx（画像タイルのみ） |
| GitHub Pages + GitHub Actions | デプロイ |
| PWA (manifest + SW) | オフライン・ホーム画面追加 |

## 4. 機能仕様

### §1: プロジェクト基盤

- 何を: Vite + React プロジェクト初期構成、GitHub Pages デプロイ設定
- どのように:
  - `npm create vite@latest` でReactテンプレート生成
  - vite.config.jsに `base: '/fire-extinguisher-register/'`
  - GitHub Actionsでmainブランチpush時に自動デプロイ（mkb-readerのdeploy.ymlを参考）
- 制約: Node.js v24、npm workspaces不使用

### §2: データ層

- 何を: localStorage（台帳・点検・プリセット・設定）とIndexedDB（報告カード画像）

**storage.js — localStorageラッパー**
```js
// キープレフィックス: "fer_"
// fer_exts: 消火器配列
// fer_insps: 点検配列
// fer_presets: カスタムプリセット配列
// fer_settings: { geminiKey, version }
export function load(key) { ... }
export function save(key, val) { ... }
export function clear() { ... }  // fer_プレフィックスのキーをすべて削除
```

**idb.js — IndexedDB（報告カード画像）**
```js
// DB名: "fer_photos", ストア名: "cards"
// キー: "card_{inspId}" (例: "card_abc123")
// 値: Blob (Canvas APIで生成したJPEG)
export async function saveCard(inspId, blob) { ... }
export async function getCard(inspId) { ... }
export async function getAllCards() { ... }
export async function deleteCard(inspId) { ... }
export async function clearAllCards() { ... }
```

**presets.js — プリセット管理**
```js
// 組み込みプリセット（変更不可）
const BUILTIN = [
  { id:"morita-2016", label:"モリタ 2016",
    match:{ model:"MEA10", year:2016, certNo:"26-26" },
    data:{ maker:"モリタ宮田工業", model:"MEA10", type:"粉末ABC 10型",
           certNo:"26-26", agentWeight:"3.0kg", year:2016 },
    bg:"#92400e" },
  { id:"hatsuta-2024", label:"初田 2024",
    match:{ model:"PEP-10N", year:2024, certNo:"29-1" },
    data:{ maker:"初田製作所", model:"PEP-10N", type:"粉末ABC 10型",
           certNo:"29-1", agentWeight:"3.0kg", year:2024 },
    bg:"#1e40af" },
];

// カスタムプリセット（localStorage fer_presets）
// 形式はBUILTINと同じ。idは uid() で生成。bg は固定色を順番に割り当て

export function getAllPresets() { ... }  // BUILTIN + カスタム
export function findPreset(aiResult) { ... }  // マッチング
export function addCustomPreset(data, label) { ... }
export function removeCustomPreset(id) { ... }
```

**プリセットマッチングロジック（findPreset）:**
```js
function findPreset(result) {
  const all = getAllPresets();
  return all.find(p =>
    (result.model  && result.model  === p.match.model) ||
    (result.year   && result.year   === p.match.year) ||
    (result.certNo && result.certNo === p.match.certNo)
  );
}
```
3つの識別子（model, year, certNo）のうち1つでもヒットすれば該当プリセットを返す。

- 制約:
  - localStorageキーはすべて `fer_` プレフィックス
  - IndexedDB生API使用。ライブラリ不使用
  - 組み込みプリセットはソースコード内定数。ユーザーは削除できない

### §3: ホーム画面（HomeScreen）

- 何を: 68施設の一覧、検索、統計、出力ボタン
- どのように:
  - FACILITIES配列を一覧表示。各行に施設名・住所・登録数/規定数
  - 充足状態: 登録数≧規定数で緑ボーダー、それ以外はグレー
  - 検索: 施設名・住所の部分一致フィルタ
  - ヘッダー: 「消火器点検」タイトル、統計、⚙ボタン（設定画面へ）
  - 検索バー横に「CSV」ボタンと「不具合」ボタン
- 制約: 施設一覧のデータ構造・表示順は既存プロトタイプを踏襲

### §4: 施設詳細画面（FacilityScreen）

- 何を: 施設の消火器一覧、プリセット登録
- どのように:
  - ヘッダー: 施設名・住所・登録数/規定数
  - プリセットボタン: 組み込み＋カスタム＋「手動入力」を横並び表示
    - カスタムプリセットは組み込みの右に追加される
    - ボタン色: 組み込みは固定色、カスタムは順番に割り当て
  - 消火器カード: 種別、製造年、メーカー型番、消第、設置場所、製造番号
  - 最終点検結果バッジ（○緑/×赤）、不備内容の警告表示
  - 各カードに「点検」「編集」「削除」ボタン
- 制約: カード表示は既存プロトタイプ踏襲＋新フィールド追加

### §5: 消火器登録・編集画面（EditScreen）

- 何を: 消火器の新規登録と編集。プリセット・AI自動入力・カスタムプリセット登録
- どのように:
  - フォームフィールド:
    - 設置場所（テキスト、必須）
    - 製造者（テキスト）
    - 型番（テキスト）
    - 種別（テキスト、デフォルト: 粉末ABC 10型）
    - 消第（テキスト）
    - 薬剤量（テキスト）
    - 製造年（数値、inputMode="numeric"）
    - 製造番号（テキスト、必須、フォント大きめ）
    - 備考（テキストエリア）
  - 「ラベル撮影」ボタン → §6 自動入力フロー
  - プリセット選択時: 該当フィールドを自動入力、設置場所と製造番号は空
  - 保存ボタン: バリデーション（設置場所・製造番号必須）→保存
  - **新規登録でプリセット未該当の場合**: 保存成功後に「このデータをプリセットに追加しますか？」の確認トースト（「追加」「不要」ボタン付き）。「追加」で addCustomPreset
- 制約: 製造番号入力欄は18px以上。カスタムプリセット登録はトーストUIで完結（別画面不要）

### §6: ラベル撮影→AI自動入力

- 何を: 消火器ラベル写真からGemini APIで4項目を抽出し、プリセットマッチング→フォーム自動入力

**camera.js — 撮影・リサイズ**
```js
export async function capturePhoto(maxPx = 1024) { ... }
// <input type="file" accept="image/*" capture="environment"> 動的生成
// Canvas APIで長辺maxPxにリサイズ → { blob, base64 }
```

**gemini.js — Gemini API連携**

エンドポイント:
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}
```

リクエストボディ:
```json
{
  "contents": [{
    "parts": [
      { "inlineData": { "mimeType": "image/jpeg", "data": "{base64}" } },
      { "text": "消火器ラベルの写真です。次の4項目をJSONで返してください。読み取れない項目はnullとしてください。他のテキストは不要です。\n\n{\"sn\":\"製造番号\",\"model\":\"型番や品番\",\"year\":製造年の数値,\"certNo\":\"型式番号の数字部分\"}" }
    ]
  }]
}
```

レスポンスパース:
```js
export async function readLabel(base64) {
  // 1. API呼び出し
  // 2. response.candidates[0].content.parts[0].text を取得
  // 3. ```json ... ``` ブロックがあれば中身を抽出、なければ全体をパース
  // 4. JSON.parse → { sn, model, year, certNo }
  // 5. パース失敗時は null を返す
  return { sn, model, year, certNo };
}
```

**EditScreenでの統合フロー:**
```
1. 「ラベル撮影」タップ → capturePhoto(1024)
2. プレビュー表示 + ローディング
3. readLabel(base64) → { sn, model, year, certNo }
4. findPreset({ model, year, certNo }) で照合
5a. プリセットヒット:
    → プリセットdata全フィールドをフォームに適用
    → sn でフォームの製造番号を上書き
    → トースト「初田 2024 を適用しました」
5b. プリセットミス:
    → 読み取れたフィールド（nullでないもの）だけフォームに個別適用
    → トースト「ラベルを読み取りました（プリセット該当なし）」
6. ショウゴさんが確認・修正 → 保存
7. 画像は保存しない（一時利用）
```

- 制約:
  - APIキー未設定 → トースト「設定画面でAPIキーを登録してください」
  - オフライン → トースト「オフラインでは自動入力できません」
  - API呼び出し中 → ボタン無効化＋ローディング
  - JSON不正 → トースト「読み取りに失敗しました」、フォーム変更なし
  - プロンプトは gemini.js 内に定数として定義。変更しやすいようコメント付きで

### §7: 点検記録画面（InspectScreen）

- 何を: 消火器の点検記録。不具合時は報告カード画面へ自動遷移
- どのように:
  - ヘッダー: 消火器情報（設置場所 | メーカー型番 | 製造年）
  - 点検日（type="date"、デフォルト当日）
  - 4項目の判定行: 本体容器・圧力計・設置状況・表示ラベル（○△×／）
  - 総合判定（○× 必須、太線区切り、フォントサイズ大きめ）
  - 不備内容（テキストエリア）
  - 措置（テキストエリア）
  - 保存ボタン → バリデーション → localStorage保存
  - **保存後の遷移:**
    - 総合判定が○ → 施設詳細画面に戻る + トースト「点検記録を保存」
    - 総合判定が× または 不備内容あり → 報告カード画面（§8）に遷移
- 制約: この画面に写真撮影機能は置かない。写真は報告カード画面で撮る

### §8: 報告カード画面（IssueCardScreen）— 新規

- 何を: 不具合情報を「看板」として1画面に表示し、写真を撮影し、Canvas APIで全体を画像化して保存する
- 前提: §7で不具合ありの点検を保存した直後に遷移してくる。点検レコードと消火器レコードはすでに保存済み

**画面レイアウト（看板デザイン）:**
```
┌─────────────────────────┐
│ ■ 施設名         日付   │ ← 黒帯ヘッダー
├─────────────────────────┤
│                         │
│    [不具合写真]     [×]  │ ← 写真エリア + 判定バッジ
│                         │
├─────────────────────────┤
│ 設置場所  2F ポンプ室    │
│ 種別      粉末ABC 10型  │ ← 情報グリッド
│ 消第      26-26          │
│ 製造番号  149573K        │
│ 製造年    2016           │
├─────────────────────────┤
│ 不備: 圧力計動作不良     │ ← 赤背景
│ 措置: 交換手配中         │
└─────────────────────────┘
```

**操作フロー:**
1. 画面表示時: 点検データ＋消火器データを自動反映
2. 「撮影」ボタンタップ → capturePhoto(800) → 写真エリアにプレビュー表示
3. 「画像として保存」ボタンタップ → canvas-card.js で看板全体を画像化
4. 生成したJPEG BlobをIndexedDBに保存（キー: card_{inspId}）
5. トースト「報告カードを保存しました」→ 施設詳細画面に戻る

**canvas-card.js — Canvas描画**
```js
// Canvas APIで看板レイアウトを描画する
// 外部ライブラリ不使用
// サイズ: 幅600px × 高さ自動計算（写真アスペクト比に依存）
// 背景: 白
// ヘッダー: 黒帯に白文字（施設名・日付）
// 写真: 幅いっぱい、アスペクト比維持
// 判定バッジ: 赤丸に白×（写真右上にオーバーレイ）
// 情報行: ラベル（グレー）+ 値（黒太字）
// 不備セクション: 薄赤背景に赤文字
// フォント: sans-serif（Canvas標準フォント）
// 出力: canvas.toBlob(callback, 'image/jpeg', 0.85)
export async function renderIssueCard({ facility, ext, insp, photoBlob }) { ... }
// 返り値: Blob (JPEG)
```

- 制約:
  - 写真未撮影でも保存可（写真エリアはグレープレースホルダ）
  - 写真を撮り直す場合は「撮影」を再タップで上書き
  - Canvas描画はテキストの改行処理が必要（不備内容が長い場合）
  - 600px幅は、xlsxで2列タイル配置した時にA4で読みやすいサイズ
  - 「画像として保存」を押さずに戻った場合、報告カード画像は保存されない（点検データは§7で保存済みなので失われない）

### §9: 台帳CSV出力

- 何を: 全消火器の台帳CSV。写真なし
- どのように:
  - BOM付きUTF-8
  - 列順: 番号, 施設名, 設置場所, 製造者, 型番, 種別, 消第, 薬剤量, 製造年, 製造番号, 備考, 登録日
  - ファイル名: `消火器台帳_YYYY-MM-DD.csv`
  - Blob URL + aタグclick
- 制約: カンマ含むフィールドはダブルクォートで囲む

### §10: 不具合報告xlsx出力

- 何を: 報告カード画像を2列タイルで並べた週報xlsx
- どのように:

**export-xlsx.js**
```js
// ExcelJS dynamic import
// IndexedDBから全報告カード画像を取得
// 不具合のある点検レコード（vrd==="×" || issue非空）を日付降順でソート
export async function exportIssueReport(insps, exts, facilities) { ... }
```

**シート構成:**
- シート名: 「不具合報告」
- 1行目: 「消火器点検 不具合報告」（太字14pt）
- 2行目: 「報告日: YYYY-MM-DD | 不具合: N件」
- 3行目: 空行
- 4行目〜: 報告カード画像を2列グリッドで配置
  - 各セル: 幅300px × 高さ400px程度（画像アスペクト比に応じて調整）
  - 対応するIndexedDBキー（card_{inspId}）で画像を取得
  - 画像がない点検（報告カード未保存）はスキップ
- ファイル名: `不具合報告_YYYY-MM-DD.xlsx`

- 制約:
  - ExcelJS dynamic import失敗時 → トースト通知
  - 報告カード画像が0件 → 「報告カードがありません」トースト、ファイル不生成
  - 画像のみ。テキスト列は不要（報告カード画像自体が自己説明的）

### §11: 設定・デバッグ画面（SettingsScreen）

- 何を: APIキー管理、カスタムプリセット管理、デバッグ機能
- どのように:
  - **APIキー設定:**
    - Gemini APIキー入力欄（type="password"）
    - 保存ボタン → fer_settings に保存
    - 設定済み表示: 「設定済み（末尾4文字）」
  - **カスタムプリセット一覧:**
    - 名前・型番・製造年を表示
    - 各プリセットに削除ボタン（confirm付き）
    - 組み込みプリセットは表示のみ（削除不可、ラベル表示で区別）
  - **デバッグ:**
    - バージョン表示
    - データ件数表示（消火器N件 / 点検N件 / 報告カードN枚）
    - 「全データ削除」→ window.confirm → localStorage + IndexedDB削除 → リロード
    - 「キャッシュ削除」→ SW unregister + caches.delete → リロード

### §12: Service Worker・PWA

- 何を: オフライン対応とPWAインストール
- どのように:
  - **manifest.json:**
    - name: "消火器点検", short_name: "消火器"
    - display: standalone, theme_color: "#18181b", background_color: "#fafafa"
    - start_url: "/fire-extinguisher-register/"
    - icons: 192x192, 512x512
  - **sw.js（Cache-first）:**
    - インストール時: アプリシェルをキャッシュ
    - フェッチ時: キャッシュ優先→ネットワークフォールバック
    - Gemini APIリクエストはキャッシュ除外（ネットワークオンリー）
    - バージョン番号でキャッシュ管理、更新時に古いキャッシュ削除
  - **更新通知:** 新SW待機時にトースト「更新があります」→タップでskipWaiting→リロード
- 制約: キャッシュ名にバージョン含める（fer-cache-v1）。ExcelJSのchunkはキャッシュしない

## 5. データモデル

### FACILITIES（定数・68件）
```js
{ id: number, name: string, addr: string, ext: number }
```

### 消火器レコード（fer_exts）
```js
{ id, fid, loc, maker, model, type, certNo, agentWeight, year, sn, note, at }
```

### 点検レコード（fer_insps）
```js
{ id, eid, date, body, prs, plc, lbl, vrd, issue, act }
```
写真フィールドなし。報告カード画像はIndexedDBにcard_{id}キーで独立保存。

### 報告カード画像（IndexedDB: fer_photos/cards）
```
key: "card_{inspId}"
value: Blob (JPEG, Canvas API生成, 幅600px)
```

### カスタムプリセット（fer_presets）
```js
[{ id, label, match:{ model, year, certNo }, data:{ maker, model, type, certNo, agentWeight, year }, bg }]
```

### 設定（fer_settings）
```js
{ geminiKey: string }
```

## 6. 画面遷移

```
[home] → [fac]    → [edit]                （登録・編集）
              ↘ [insp] → [issueCard]  （点検→不具合時のみ）
[home] → [settings]                        （設定）
```

useState("home"|"fac"|"edit"|"insp"|"issueCard"|"settings") で管理。React Router不使用。

## 7. テスト方針

| テスト対象 | 方法 | 合格条件 |
|---|---|---|
| ビルド | npm run build | エラー警告なし。gzip 200KB以下（ExcelJS chunk除く） |
| 施設一覧 | 手動 | 68施設表示、検索動作 |
| プリセット登録 | 手動 | 組み込み2件＋カスタムが表示、ワンタップで自動入力 |
| ラベルAI自動入力 | Pixel 10 | 撮影→プリセットマッチ→フォーム入力→保存が完了 |
| カスタムプリセット | 手動 | AI未該当→保存時に追加確認→以後ワンタップ登録 |
| 点検記録 | 手動 | 判定入力→保存。×判定で報告カードへ遷移 |
| 報告カード | Pixel 10 | 写真撮影→看板表示→画像保存が完了 |
| 台帳CSV | 手動 | 全消火器出力、Excel文字化けなし |
| 週報xlsx | 手動 | 報告カード画像が2列タイルで出力 |
| PWA | Pixel 10 | ホーム画面追加、オフライン操作（AI除く） |
| SW更新 | 手動 | バージョン変更後にトースト通知 |
| GitHub Pages | デプロイ後 | URLアクセス可能 |
