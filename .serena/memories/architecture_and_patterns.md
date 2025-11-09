# アーキテクチャとデザインパターン

## レイヤー構造

```
┌────────────────────────────────────────┐
│        Presentation Layer              │
│  (React Components + Keyboard Events)  │
└──────────────┬─────────────────────────┘
               │
┌──────────────▼─────────────────────────┐
│       Application Layer                │
│    (State Management: Zustand)         │
└──────────────┬─────────────────────────┘
               │
┌──────────────▼─────────────────────────┐
│          Audio Layer                   │
│     (Tone.js + Web Audio API)          │
└────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────┐
│          Data Layer                    │
│   (LocalStorage + Gemini API)          │
└────────────────────────────────────────┘
```

## コアパターン

### 1. Flux風単方向データフロー（Zustand）
```
User Action → Store Action → State Update → Component Re-render
```

**実装例**:
```typescript
// 1. User Action（ボタンクリック）
<button onClick={startRecording}>録音開始</button>

// 2. Store Action
const startRecording = () => {
  recordingStartTimestamp = nowSec();
  set({ isRecording: true, playhead: 0 });
  startPlayheadTicker(set, get);  // 副作用
};

// 3. State Update（Zustand内部）
// 4. Component Re-render（自動）
```

### 2. プレゼンテーション・コンテナ分離

#### プレゼンテーションコンポーネント
- **責務**: UIレンダリングのみ
- **状態**: ローカルUIステート（useState）のみ
- **例**: `Header.tsx`

#### コンテナコンポーネント
- **責務**: ビジネスロジック + UIレンダリング
- **状態**: Zustandストアに接続
- **例**: `Timeline.tsx`, `ControlPanel.tsx`

### 3. カスタムフック抽出パターン

**Before（コンポーネント内）**:
```typescript
const Component = () => {
  const [key, setKey] = useState('');
  useEffect(() => {
    const handler = (e) => setKey(e.key);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
};
```

**After（フック抽出）**:
```typescript
// app/hooks/useKeyboardInput.ts
export const useKeyboardInput = () => {
  const [key, setKey] = useState('');
  // ロジック抽出
  return key;
};

// Component
const Component = () => {
  const key = useKeyboardInput();
};
```

### 4. Zustand副作用管理パターン

#### 副作用の種類
1. **同期副作用**: setState内で完結
2. **非同期副作用**: クロージャ変数 + requestAnimationFrame

**例: プレイヘッド更新（非同期副作用）**
```typescript
let playheadTickerId: number | null = null;

const startPlayheadTicker = (setState, getState) => {
  const tick = () => {
    setState((prev) => ({ ...prev, playhead: elapsed }));
    if (getState().isRecording) {
      playheadTickerId = window.requestAnimationFrame(tick);
    }
  };
  tick();
};

const stopPlayheadTicker = () => {
  if (playheadTickerId !== null) {
    window.cancelAnimationFrame(playheadTickerId);
  }
  playheadTickerId = null;
};
```

### 5. オーディオエンジン分離パターン

**目的**: Tone.jsの複雑さをカプセル化

```typescript
// lib/audioEngine.ts（シングルトン）
export const audioEngine = createAudioEngine();

// 使用側（ControlPanel.tsx）
await audioEngine.init();
audioEngine.playSound('kick');
await audioEngine.playRecording(notes, bpm, onProgress);
```

**利点**:
- コンポーネントから音声処理の詳細を隠蔽
- テスト容易性（モック可能）
- Tone.js Transport状態の一元管理

### 6. プログレッシブエンハンスメント

#### 段階的機能提供
1. **コア機能**: キーボード録音・再生（必須）
2. **拡張機能**: Gemini AI提案（オプション）

```typescript
// Gemini APIキー未設定でも動作
const handleAnalyze = async () => {
  if (!apiKey) {
    setError('APIキーを設定してください');
    return;  // 処理中断、アプリは動作継続
  }
  // AI処理
};
```

## 重要な設計判断

### 1. なぜZustand？（Redux/Contextではなく）
- **軽量**: ボイラープレート最小
- **簡潔**: selector最適化が容易
- **柔軟**: vanillaストア作成でテスト容易

### 2. なぜTone.js？（生Web Audio APIではなく）
- **抽象化**: Transport、Sampler等の高レベルAPI
- **BPM管理**: 音楽的な時間管理が容易
- **クロスブラウザ**: 互換性問題を吸収

### 3. なぜLocalStorage？（外部DB不要）
- **オフライン動作**: ネットワーク不要
- **プライバシー**: データがローカル完結
- **シンプル**: バックエンド不要

### 4. なぜ静的エクスポート？
- **CDN配信**: Vercel/Netlify/GitHub Pagesで簡単デプロイ
- **高速**: SSRオーバーヘッドなし
- **コスト削減**: サーバーレス

## アンチパターン（避けるべき）

### ❌ プロップドリリング
```typescript
// Bad: 深いネストでprops渡し
<Parent>
  <Child1 value={x}>
    <Child2 value={x}>
      <Child3 value={x} />  // 深すぎ
```

### ✅ Zustandで直接購読
```typescript
// Good: 必要な場所で直接取得
const Child3 = () => {
  const x = useBeatStore((s) => s.x);
};
```

### ❌ 巨大なコンポーネント
```typescript
// Bad: 1000行超のコンポーネント
const BigComponent = () => {
  // 複雑すぎるロジック
};
```

### ✅ 責務分割
```typescript
// Good: フック抽出 + 子コンポーネント分割
const useComplexLogic = () => { /* ... */ };
const SubComponent = () => { /* ... */ };
const Parent = () => {
  const logic = useComplexLogic();
  return <SubComponent {...logic} />;
};
```

## パフォーマンス最適化パターン

### 1. React.memo（不要な再レンダリング防止）
```typescript
export const Timeline = memo(TimelineComponent);
```

### 2. useMemo（高コスト計算のキャッシュ）
```typescript
const timelineWidth = useMemo(
  () => Math.max(MIN_WIDTH, duration * PIXELS_PER_SECOND * zoom),
  [duration, zoom]
);
```

### 3. Zustandセレクター最適化
```typescript
// Bad: オブジェクト全体を購読
const state = useBeatStore();

// Good: 必要な値のみ購読
const isRecording = useBeatStore((s) => s.isRecording);
```

### 4. requestAnimationFrame（スムーズアニメーション）
```typescript
const tick = () => {
  setState({ playhead: elapsed });
  rafId = window.requestAnimationFrame(tick);
};
```

## セキュリティ考慮事項

### 1. XSS防止
- React自動エスケープに依存
- `dangerouslySetInnerHTML`使用禁止

### 2. APIキー管理
- **NG**: ソースコードに直接記述
- **OK**: LocalStorageに暗号化なしで保存（ユーザーローカル限定）

### 3. CORS対応
- Gemini API: サーバーサイドプロキシ不要（ブラウザから直接呼び出し可能）
