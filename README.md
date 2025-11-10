# 🎵 Sound Sketcher (サウンドスケッチャー)

キーボードタップでビートを刻み、タイムラインを書き出せる音楽スケッチツール。
ミュージックビデオや映像編集の音楽プロトタイピングに最適。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/takamiya1021/app023-sound-sketcher)

## ✨ 特徴

- **🎹 キーボード演奏**: キーボードのキー（A, S, D, F, J, K, L, ;）でドラム音をリアルタイム演奏
- **⏺️ 録音・再生**: タップしたタイミングを記録して再生
- **📊 タイムライン表示**: 時間軸に沿って打ち込んだ音を色分け可視化
- **💾 エクスポート**: JSON/CSV形式でタイムライン書き出し
- **📥 インポート**: JSON/CSVファイル読み込み、WAVファイルでカスタム音源追加
- **🎚️ BPM設定**: テンポ調整（60〜240 BPM）
- **🤖 AI機能**: Gemini APIによるビート補完・展開提案

## 🎮 デモ

🔗 **[Live Demo](https://app023-au84w1zlf-hiroaki-yoshikuras-projects-7b26a5a1.vercel.app)**

## 🚀 クイックスタート

### 前提条件

- Node.js 18.x 以上
- npm または yarn

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/takamiya1021/app023-sound-sketcher.git
cd app023-sound-sketcher

# 依存関係をインストール
cd app023
npm install

# 開発サーバーを起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

### プロダクションビルド

```bash
npm run build
npm start
```

## 🎼 使い方

### 基本操作

1. **録音開始**: 「録音開始」ボタンをクリック
2. **演奏**: キーボードでビートを刻む
   - `A`: Kick（バスドラム）
   - `S`: Snare（スネア）
   - `D`: Hihat Closed（クローズドハイハット）
   - `F`: Hihat Open（オープンハイハット）
   - `J`: Clap（クラップ）
   - `K`: Tom（タム）
   - `L`: Cymbal（シンバル）
   - `;`: Rim（リムショット）
3. **録音停止**: 「録音停止」ボタンをクリック
4. **再生**: 「再生」ボタンで録音したビートを再生

### エクスポート

- **JSON/CSV**: 「エクスポート」セクションでJSON/CSV形式をダウンロード
- エクスポートしたファイルは他のツール（映像編集ソフト等）で利用可能

### インポート

- **録音データ**: エクスポートしたJSON/CSVファイルを読み込んでタイムラインに復元
- **カスタム音源**: WAVファイルをアップロードして新しいドラム音源として使用（5MB以下）

### AI機能（オプション）

1. Gemini APIキーを設定画面で登録
2. 録音後、AI機能を使ってビートの展開提案やジャンル判定を受ける

## 🛠️ 技術スタック

- **フレームワーク**: [Next.js](https://nextjs.org/) 14.x (App Router)
- **言語**: [TypeScript](https://www.typescriptlang.org/) 5.x
- **UI**: [React](https://reactjs.org/) 18.x, [Tailwind CSS](https://tailwindcss.com/) 3.x
- **音声処理**: [Tone.js](https://tonejs.github.io/) (Web Audio API)
- **状態管理**: [Zustand](https://github.com/pmndrs/zustand)
- **AI**: [Google Gemini API](https://ai.google.dev/)
- **テスト**: Jest, React Testing Library
- **E2Eテスト**: Playwright

## 📁 プロジェクト構造

```
app023-sound-sketcher/
├── app023/                     # Next.jsアプリケーション
│   ├── app/
│   │   ├── components/         # Reactコンポーネント
│   │   │   ├── Timeline.tsx    # タイムライン表示
│   │   │   ├── KeyboardGuide.tsx # キーボードガイド
│   │   │   ├── ControlPanel.tsx # 録音・再生コントロール
│   │   │   ├── ExportDialog.tsx # エクスポート
│   │   │   ├── ImportDialog.tsx # インポート
│   │   │   └── ...
│   │   ├── page.tsx            # メインページ
│   │   └── layout.tsx          # ルートレイアウト
│   ├── lib/
│   │   ├── audioEngine.ts      # 音声エンジン
│   │   ├── exportUtils.ts      # エクスポート処理
│   │   └── importUtils.ts      # インポート処理
│   ├── store/
│   │   └── useBeatStore.ts     # Zustand状態管理
│   ├── __tests__/              # テストファイル
│   └── public/
│       └── samples/            # ドラム音源サンプル
├── doc/                        # ドキュメント
│   ├── requirements.md         # 要件定義書
│   ├── design.md               # 技術設計書
│   └── implementation.md       # 実装計画書
└── README.md
```

## 🧪 テスト

```bash
# 全テスト実行
npm test

# カバレッジ付きテスト
npm run test:coverage

# E2Eテスト
npm run test:e2e
```

## 🤝 コントリビュート

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

1. フォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを開く

## 📝 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 🙏 謝辞

- [Tone.js](https://tonejs.github.io/) - Web Audio API ラッパー
- [Tailwind CSS](https://tailwindcss.com/) - ユーティリティファーストCSSフレームワーク
- [Next.js](https://nextjs.org/) - Reactフレームワーク
- [Vercel](https://vercel.com/) - デプロイメントプラットフォーム

## 📧 お問い合わせ

質問や提案がある場合は、[Issues](https://github.com/takamiya1021/app023-sound-sketcher/issues) を開いてください。

---

Made with ❤️ by [takamiya1021](https://github.com/takamiya1021)
