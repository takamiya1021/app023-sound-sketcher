# プロジェクト固有の注意事項・Tips

## 重要な既知の問題と解決策

### 1. WSL2環境でのlsof使用禁止
**問題**: WSL2カーネルとの互換性問題により、`lsof`がIPv6ソケット検出に失敗する

**❌ 使用禁止**:
```bash
lsof -i :3000  # 不安定、使用禁止
```

**✅ 代替手段**:
```bash
ss -tuln | grep :3000  # netlinkソケット経由で安定
```

### 2. プレイヘッド更新の2つのメカニズム

**レコーディング時**: `startPlayheadTicker()` (requestAnimationFrame)
**プレイバック時**: `audioEngine.playRecording()` のコールバック

**重要**: これらは競合しないよう設計されている
- レコーディング: `isRecording` フラグで制御
- プレイバック: `audioEngine`のコールバック内で`setPlayhead()`を呼び出し

### 3. Tone.js Transport状態管理

**注意点**: Tone.Transportはグローバルシングルトン
- 複数の`playRecording()`呼び出しが競合しないよう、必ず`cancel(0)`で初期化
- 再生完了時に確実にクリーンアップ（メモリリーク防止）

```typescript
// 正しいパターン
tone.Transport.stop();
tone.Transport.cancel(0);  // 全スケジュールクリア
// 新しいスケジュール
scheduleNotes(sampler, notes);
tone.Transport.start();
```

## 開発環境固有の設定

### WSL2 + Windows環境
```bash
# WSL IPアドレス確認
hostname -I  # 例: 172.22.157.213

# Windowsブラウザからアクセス
# http://172.22.157.213:3000

# tmuxでバックグラウンド起動（推奨）
tmux new-session -d -s sound-sketcher "npm run dev -- --hostname 0.0.0.0"
```

### ポート設定
- **開発サーバー**: 3000（デフォルト）
- **E2Eテスト**: 3100（Playwright自動起動）

## テスト戦略

### Jestテスト
- **Mock**: `@/lib/audioEngine` は `__mocks__/` でモック化
- **LocalStorage**: `jest.setup.ts` で自動モック
- **requestAnimationFrame**: Jestタイマーモック使用

### Playwrightテスト
- **自動サーバー起動**: webServerオプションでport 3100起動
- **ヘッドレスモード**: デフォルト（CI/CD対応）

## Gemini API使用上の注意

### レート制限
- **gemini-2.0-flash-exp**: 無料枠は1分あたり10リクエスト
- **エラーハンドリング**: 429 Too Many Requestsを想定

### プロンプト設計
```typescript
// lib/geminiService.ts
// JSONのみを返すよう指示（パース容易性）
const prompt = `以下のビートを分析し、必ずJSON形式で返してください。
JSONのみを返し、説明文は含めないでください。`;
```

## パフォーマンス最適化

### 音声レイテンシ削減
```typescript
// audioEngine.ts
configureLowLatency(tone);
// context.latencyHint = 'interactive'
// context.lookAhead = 0.01
```

### Timeline再レンダリング最適化
- `React.memo`でコンポーネント全体をメモ化
- `useMemo`で重い計算をキャッシュ
- Zustandセレクター最適化

## デバッグTips

### Zustand状態確認
```javascript
// ブラウザコンソール
useBeatStore.getState()  // 現在の状態確認
useBeatStore.setState({ playhead: 5 })  // 手動更新
```

### Tone.js状態確認
```javascript
// ブラウザコンソール
Tone.Transport.state  // "started" | "stopped"
Tone.Transport.seconds  // 現在位置（秒）
Tone.Transport.bpm.value  // 現在のBPM
```

### React DevTools
- **Components**: Zustandフックの値確認
- **Profiler**: 再レンダリング回数・時間計測

## よくあるエラーと対処法

### 1. "AudioContext was not allowed to start"
**原因**: ユーザー操作前のAudioContext起動
**解決**: `audioEngine.init()`をボタンクリック等のイベント内で呼び出し

### 2. "Failed to load drum samples"
**原因**: `public/sounds/` 内の音声ファイル欠落
**解決**: 全8種類の.wavファイルが存在することを確認

### 3. テスト時の "localStorage is not defined"
**原因**: Node.js環境にはlocalStorageがない
**解決**: `jest.setup.ts`で自動モック済み（通常は発生しない）

### 4. E2Eテスト "Port 3100 is already in use"
**原因**: 前回のテスト実行がクリーンアップされていない
**解決**:
```bash
# ポート使用確認
ss -tuln | grep :3100

# プロセス特定・終了
ps aux | grep "next dev" | grep 3100
kill <PID>
```

## ファイル・ディレクトリ構造の意図

```
app023/
├── app/
│   ├── components/     # 再利用可能UIコンポーネント
│   ├── hooks/          # カスタムフック（ビジネスロジック抽出）
│   ├── layout.tsx      # グローバルレイアウト
│   ├── page.tsx        # ホームページ（全コンポーネント統合）
│   └── providers.tsx   # クライアント側プロバイダー（Zustand Hydration）
├── lib/
│   ├── audioEngine.ts  # Tone.js抽象化レイヤー
│   ├── geminiService.ts # Gemini API クライアント
│   ├── storage.ts      # LocalStorage永続化
│   └── exportUtils.ts  # JSON/CSVエクスポート
├── store/
│   └── useBeatStore.ts # Zustand全体ストア（単一ファイル）
├── types/
│   └── index.ts        # 型定義集約
├── public/sounds/      # 静的音声アセット
├── __tests__/          # Jestテスト（ファイル名: <name>.test.ts(x)）
└── e2e/                # Playwrightテスト（ファイル名: <name>.spec.ts）
```

## Git運用

### ブランチ戦略
- **main**: 安定版（デプロイ可能）
- **feature/***: 機能開発
- **fix/***: バグ修正

### コミット前チェック
```bash
npm test && npm run lint && npm run build
```

## ドキュメント保管場所
- **要件定義**: `doc/requirements.md`
- **技術設計**: `doc/design.md`
- **実装計画**: `doc/implementation.md`
- **スクリーンショット**: `doc/*.png`
