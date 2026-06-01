# fire-extinguisher-register 作業指示書

作成日: 2026-06-01
PM: クリーデ
対応仕様書: docs/spec-phase1.md

---

## 作業範囲

- 何を: 消火器台帳管理＋点検記録PWAの新規構築（§1〜§12）
- なぜ: 要件定義書（2026-06-01承認済み）に基づくPhase 1全機能実装
- どこで: `D:\AI\github\fire-extinguisher-register`

## 実装順序

以下の順序で実装。各§完了時にコミット。

1. **§1 基盤** — Vite + React, vite.config.js, deploy.yml
2. **§2 データ層** — storage.js, idb.js, presets.js, facilities.js
3. **§3 ホーム画面** — HomeScreen, 施設一覧, 検索, 統計
4. **§4 施設詳細** — FacilityScreen, 消火器カード, プリセットボタン（組み込み＋カスタム）
5. **§5 登録・編集** — EditScreen, フォーム, プリセット反映, カスタムプリセット追加確認
6. **§6 AI自動入力** — camera.js, gemini.js, EditScreen統合, プリセットマッチング
7. **§7 点検記録** — InspectScreen, 判定UI, 不具合時→issueCard遷移
8. **§8 報告カード** — IssueCardScreen, camera.js共有, canvas-card.js, IndexedDB保存
9. **§9 台帳CSV** — export-csv.js, HomeScreen CSVボタン
10. **§10 週報xlsx** — export-xlsx.js (ExcelJS dynamic import), 画像タイル
11. **§11 設定** — SettingsScreen, APIキー, プリセット管理, デバッグ
12. **§12 PWA** — manifest.json, sw.js, 更新通知

## §6 実装前の疎通テスト

§6の着手前に、Gemini API無料枠の動作確認を行うこと。

```
手順:
1. fer_settings にテスト用APIキーが設定されていることを確認
2. gemini.js の readLabel を最小構成で実装
3. 任意のテスト画像（消火器ラベルでなくてよい）でAPI呼び出し
4. レスポンスが返ること、JSONパースができることを確認
5. 結果を _STATUS.md に記録

失敗した場合:
- APIキーの有効性を確認（Google AI Studioで発行済みか）
- エラーメッセージを _STATUS.md に記録し作業を停止
- §6をスキップし§7以降に進む判断は発注者が行う
```

## 参照ドキュメント

- 仕様書: `docs/spec-phase1.md`（§番号で機能を管理）
- 要件定義書: `docs/requirements.md`
- `_STATUS.md`: 作業開始前に読む、中断時に更新する
- `CLAUDE.md`: リポジトリの規約

## 既存プロトタイプとの差分

claude.aiアーティファクトのプロトタイプをベースに、以下が変更・追加:

- `window.storage` → localStorage / IndexedDB
- フィールド追加: certNo, agentWeight, note
- §6 ラベルAI自動入力（新規）
- §8 報告カード画面（新規）— 看板式レイアウト＋Canvas画像化
- §10 週報xlsx（新規）— 報告カード画像のタイル配置
- §2 動的プリセット（新規）— カスタムプリセットのlocalStorage管理
- §11 設定画面（新規）— APIキー＋プリセット管理
- §12 PWA基盤（新規）

プロトタイプのUIパターン（色、レイアウト、操作感）は踏襲すること。インラインスタイルからCSS（App.css）への移行は許可する。

## 禁止事項

- 仕様書に記載のない機能を追加しない
- 仕様書に記載のないファイルを新規作成しない（R-006）
- 仕様書の原本を改変しない
- React Router を導入しない
- Gemini APIキーをソースコードにハードコードしない
- idb-keyval等のIndexedDBラッパーライブラリを追加しない
- html2canvas等のDOM画像化ライブラリを追加しない（Canvas API自前描画）
- 仕様外の設計判断が必要な場合は停止・報告する

## 完了条件

- §1〜§12がすべて実装されていること
- npm run build がエラー・警告なく完了すること
- gzip後バンドルサイズ 200KB以下（ExcelJS chunk除く）
- テスト方針（仕様書§7）の全項目が確認可能な状態であること
- _STATUS.md が最終状態を反映していること

## コミットメッセージ形式

```
[Phase1] §N 作業タイトル

何を: 実装した内容
なぜ: 仕様書 §N への参照
どのように: 技術的アプローチ
テスト: 実行結果
```

## コード内コメント

各ブロックに「何を・なぜ」のコメント。特に以下は必須:
- gemini.js: プロンプト全文、レスポンスパース、JSONフォールバック
- presets.js: マッチングロジック、カスタムプリセット保存形式
- canvas-card.js: 描画手順（ヘッダー→写真→情報→不備）、テキスト改行処理
- idb.js: IndexedDB open/upgrade/transaction
- export-xlsx.js: ExcelJS dynamic import、画像タイル配置

## アイコン

manifest.json用の192x192, 512x512 PNGを生成すること。消火器をモチーフにした簡素なプレースホルダ。
