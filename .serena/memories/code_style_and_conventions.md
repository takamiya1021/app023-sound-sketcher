# コードスタイルと規約

## TypeScript設定
- **Strict Mode**: 有効（tsconfig.json: "strict": true）
- **Target**: ES2017
- **JSX**: react-jsx（Next.js 14推奨）
- **Module Resolution**: bundler

## コンポーネント規約

### ファイル構成
- **1ファイル1コンポーネント**: 原則として単一責務
- **命名**: PascalCase（例: `Timeline.tsx`, `ControlPanel.tsx`）
- **エクスポート**: defaultエクスポート推奨

### React規約
```typescript
// 'use client'ディレクティブ（クライアントコンポーネント）
'use client';

// import順序: React → サードパーティ → ローカル
import { useState, useEffect } from 'react';
import { useBeatStore } from '@/store/useBeatStore';

// 関数コンポーネント（アロー関数）
const ComponentName = () => {
  // hooks
  const state = useBeatStore((s) => s.state);
  const [local, setLocal] = useState(0);

  // JSX return
  return (
    <div>...</div>
  );
};

export default ComponentName;
```

## 状態管理（Zustand）

### ストア設計パターン
```typescript
// vanilla store作成 + create wrapper
export const createBeatStore = (initialState?: Partial<BeatStore>) =>
  createStore<BeatStore>()(createBeatStoreConfig(initialState));

export const useBeatStore = create<BeatStore>(createBeatStoreConfig());

// selector使用（再レンダリング最適化）
const isRecording = useBeatStore((state) => state.isRecording);
```

## 型定義

### インターフェース vs Type
- **Interface**: オブジェクト構造（拡張可能性）
- **Type**: Union、関数シグネチャ、複雑な型

```typescript
// Interface（拡張可能）
export interface BeatStoreState {
  recording: Recording;
  isRecording: boolean;
}

// Type（Union型）
export type SoundType = 
  | 'kick' 
  | 'snare' 
  | 'hihat-closed' 
  | 'hihat-open';
```

## スタイリング（Tailwind CSS）

### クラス順序（推奨）
1. レイアウト（flex, grid, position）
2. サイズ（w-, h-, p-, m-）
3. タイポグラフィ（text-, font-）
4. 色（bg-, text-color）
5. ボーダー・エフェクト
6. アニメーション（transition-, hover:）

```tsx
<button
  className="flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-black transition-colors hover:bg-emerald-400"
>
```

## テスト規約

### ファイル配置
- **単体テスト**: `__tests__/<name>.test.tsx`
- **E2Eテスト**: `e2e/<name>.spec.ts`

### テスト構成
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // セットアップ
  });

  it('should do something', () => {
    // Arrange, Act, Assert
  });
});
```

## コメント規約
- **日本語コメント**: 複雑なロジックのみ
- **JSDocは不要**: TypeScriptの型で十分
- **TODOコメント**: `// TODO: 説明` 形式

## 命名規約

### 変数・関数
- **camelCase**: 変数、関数、メソッド
- **PascalCase**: コンポーネント、型、インターフェース
- **UPPER_SNAKE_CASE**: 定数

```typescript
// 定数
const DEFAULT_BPM = 120;
const PIXELS_PER_SECOND = 160;

// 関数（動詞+名詞）
const handlePlay = () => {};
const formatDuration = (seconds: number) => {};

// コンポーネント（名詞）
const Timeline = () => {};
```

## パス解決
- **@/**: プロジェクトルート（tsconfig.json paths）
- **@/components/**: app/components/
- **@/hooks/**: app/hooks/

```typescript
import { useBeatStore } from '@/store/useBeatStore';
import { Timeline } from '@/components/Timeline';
```

## ESLint設定
- **eslint-config-next**: コアウェブバイタル + TypeScript
- **自動修正**: `npm run lint -- --fix`
- **無視パターン**: .next/, out/, build/, node_modules/
