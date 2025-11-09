# 技術スタック

## コアフレームワーク
- **Next.js**: 16.0.1 (App Router)
- **React**: 19.2.0
- **TypeScript**: 5.x
- **Node.js**: 20.18.0

## UI/スタイリング
- **Tailwind CSS**: v4 (@tailwindcss/postcss)
- **デザイン**: ダークテーマ、モノクロベース、エメラルドアクセント

## 状態管理・データ
- **Zustand**: 5.0.8 - 軽量状態管理
- **LocalStorage**: 録音データ・設定の永続化

## 音声処理
- **Tone.js**: 15.1.22 - Web Audio APIラッパー
- **サンプル**: public/sounds/*.wav（低レイテンシドラム音源）

## AI統合
- **Google Gemini API**: ビート展開提案・ジャンル分析
- **モデル**: gemini-2.0-flash-exp（軽量・高速）

## テスト
- **Jest**: 30.2.0 - 単体・統合テスト
- **@testing-library/react**: 16.3.0
- **Playwright**: 1.56.1 - E2Eテスト

## リンティング・品質
- **ESLint**: 9.x - Next.js公式設定
- **eslint-config-next**: コアウェブバイタル + TypeScript

## ビルド・デプロイ
- **静的エクスポート**: `output: 'export'` in next.config.ts
- **出力先**: `out/` ディレクトリ
- **CDN対応**: 画像最適化無効化（unoptimized: true）
