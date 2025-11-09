# 推奨コマンド集

## 開発サーバー
```bash
# 開発サーバー起動（localhost:3000）
npm run dev

# WSL環境で外部アクセス可能にする
npm run dev -- --hostname 0.0.0.0

# tmuxで永続起動（バックグラウンド）
tmux new-session -d -s sound-sketcher "npm run dev -- --hostname 0.0.0.0"

# tmuxセッション確認
tmux list-sessions

# tmuxセッション接続
tmux attach -t sound-sketcher
```

## テスト
```bash
# 全Jestテスト実行
npm test

# 特定ファイルのみテスト
npm test -- Timeline.test.tsx

# E2Eテスト実行（Playwright）
npm run test:e2e

# ※注意: test:e2eは自動的にdev serverをport 3100で起動
```

## ビルド・本番
```bash
# 本番ビルド（静的エクスポート）
npm run build

# ビルド結果サーブ
npm run start

# 出力確認
ls -la out/
```

## リンティング
```bash
# ESLint実行
npm run lint

# 自動修正
npm run lint -- --fix
```

## システムコマンド（Linux/WSL2）
```bash
# ポート使用確認（lsofは使用禁止、ssを使用）
ss -tuln | grep :3000

# プロセス確認
ps aux | grep -E "node|npm" | grep -v grep

# WSL IPアドレス確認
hostname -I

# tmux操作
tmux list-sessions          # セッション一覧
tmux kill-session -t <name> # セッション終了

# Git操作
git status
git add .
git commit -m "message"
git push
```

## デバッグ
```bash
# ブラウザコンソール: F12キー
# React Developer Tools推奨

# Zustand状態確認
# ブラウザコンソールで: window.__ZUSTAND__
```

## 環境要件
- Node.js 20.18.0（.nvmrc参照）
- npm 9+
- WSL2 Ubuntu（推奨）
