# fire-extinguisher-register

板橋区公共施設の消火器台帳管理・点検記録PWA。ラベルAI読み取り＋看板式報告カード＋週報xlsx出力。

## 状態確認
作業開始前に `_STATUS.md` を読み、現在のフェーズと未完了事項を確認すること。
作業中断時は `_STATUS.md` を更新してから終了すること。

## 技術スタック
- Vite 6.x + React 19.x
- localStorage（台帳・点検・プリセット・設定）
- IndexedDB 生API（報告カード画像）
- Gemini API gemini-2.0-flash（ラベルOCR）
- Canvas API（報告カード→画像化）
- ExcelJS dynamic import（週報xlsx）
- GitHub Pages（GitHub Actions）
- PWA（manifest.json + Service Worker）

## ビルド・テスト
```
npm install
npm run dev
npm run build
npm run preview
```

## 規約
- コミット: `[Phase1] §N タイトル` + 5W1H本文
- コード内コメント: 各ブロックの「何を・なぜ」
- 仕様外の判断 → 停止・報告
- 仕様外のファイル作成禁止（R-006）
- localStorageキー: `fer_` プレフィックス
- IndexedDB: DB名 `fer_photos`, ストア `cards`
- APIキーをソースにハードコードしない
- html2canvas等DOM画像化ライブラリ不使用（Canvas API自前）
