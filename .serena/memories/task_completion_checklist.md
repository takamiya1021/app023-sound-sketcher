# タスク完了時のチェックリスト

## 必須チェック項目

### 1. テストの実行と成功
```bash
# 全Jestテスト実行
npm test

# ✅ 全テストがPASSすること
# Test Suites: X passed, X total
# Tests: X passed, X total
```

### 2. リンティング
```bash
# ESLint実行
npm run lint

# ✅ エラー・警告がゼロであること
# ⚠️ 警告がある場合は修正を検討
```

### 3. TypeScriptコンパイルエラー確認
```bash
# ビルド実行（型チェック含む）
npm run build

# ✅ ビルドが成功すること
# ✅ 型エラーがゼロであること
```

### 4. 開発サーバーで動作確認
```bash
# 開発サーバー起動
npm run dev

# ✅ ブラウザでアクセス（http://localhost:3000）
# ✅ コンソールエラーがないこと（F12キー）
# ✅ 想定通りの動作をすること
```

## 機能別チェック項目

### コンポーネント追加・修正時
- [ ] PropTypes/TypeScript型定義が適切
- [ ] 単体テストを追加・更新
- [ ] アクセシビリティ（aria-label等）を考慮
- [ ] レスポンシブ対応（sm:, md:等）

### 状態管理（Zustand）修正時
- [ ] セレクター最適化（不要な再レンダリング防止）
- [ ] 副作用処理が適切（startPlayheadTicker等）
- [ ] LocalStorage永続化が正しく動作

### 音声処理（audioEngine）修正時
- [ ] Tone.js Transportの状態管理が適切
- [ ] メモリリーク防止（cleanup処理）
- [ ] エラーハンドリング（サンプルロード失敗等）

### Gemini API連携修正時
- [ ] APIキー未設定時のエラーハンドリング
- [ ] レート制限対応
- [ ] タイムアウト設定

## Gitコミット前チェック

### コミット前必須項目
```bash
# 1. ステージング確認
git status

# 2. 差分確認
git diff

# 3. 機密情報の混入確認
# ✅ APIキー、パスワード等が含まれていないこと
# ✅ .envファイルがコミットされていないこと

# 4. 全テスト実行
npm test

# 5. リンティング
npm run lint
```

### コミットメッセージ規約
```bash
# プレフィックス + 簡潔な説明（日本語OK）
# feat: 新機能
# fix: バグ修正
# refactor: リファクタリング
# test: テスト追加・修正
# docs: ドキュメント更新
# style: コードスタイル修正（動作変更なし）

git commit -m "feat: Timelineコンポーネントにズーム機能を追加"
```

## デプロイ前チェック

### 本番ビルド確認
```bash
# 1. 本番ビルド
npm run build

# ✅ ビルド成功
# ✅ 警告がないこと

# 2. 出力確認
ls -la out/

# ✅ out/ディレクトリが生成されている
# ✅ 静的ファイルが適切に出力されている

# 3. ローカルで本番ビルドをサーブ
npm run start

# ✅ http://localhost:3000 で正常動作
```

### E2Eテスト実行
```bash
npm run test:e2e

# ✅ 全E2Eテストが成功
# ✅ ブラウザ自動化が正常動作
```

## トラブルシューティング

### テスト失敗時
1. エラーメッセージを確認
2. テストファイルの想定と実装の差異を確認
3. 必要に応じてテストを更新（仕様変更時）

### ビルドエラー時
1. TypeScript型エラーを確認
2. 未使用import削除
3. next.config.tsの設定確認

### リンティングエラー時
```bash
# 自動修正試行
npm run lint -- --fix

# 手動修正が必要な場合はエラーメッセージに従う
```

## パフォーマンス確認（推奨）
- [ ] Lighthouse スコア確認（Performance, Accessibility）
- [ ] 不要な再レンダリングがないか（React DevTools）
- [ ] バンドルサイズ確認（next build出力）
