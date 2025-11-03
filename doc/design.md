# app023: サウンドスケッチャー - 技術設計書

## 1. 技術スタック

### 1.1 フレームワーク・ライブラリ
- **Next.js**: 14.x (App Router)
- **React**: 18.x
- **TypeScript**: 5.x
- **Tailwind CSS**: 3.x

### 1.2 選定理由
- **Next.js 14**: App Router、静的エクスポート可能
- **React 18**: useTransition等の最新機能
- **TypeScript**: 型安全性、音声処理の複雑なロジックに有効
- **Tailwind CSS**: ダークテーマに適したユーティリティ

### 1.3 主要ライブラリ
- **音声処理**: Tone.js（Web Audio API ラッパー）
- **状態管理**: Zustand
- **データ永続化**: LocalStorage
- **AI API**: @google/genai（Gemini API）
- **UI コンポーネント**: Radix UI
- **アイコン**: lucide-react
- **ファイル生成**: FileSaver.js（JSON/CSVエクスポート）

## 2. アーキテクチャ設計

### 2.1 全体アーキテクチャ
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

### 2.2 コンポーネント構成
```
app/
├── page.tsx                    # メインページ
├── layout.tsx                  # ルートレイアウト
└── components/
    ├── KeyboardGuide.tsx       # キーボードガイド
    ├── Timeline.tsx            # タイムライン表示
    ├── TimelineMarker.tsx      # タイムラインマーカー
    ├── ControlPanel.tsx        # 録音・再生コントロール
    ├── BPMSettings.tsx         # BPM設定
    ├── SoundSelector.tsx       # 音色選択
    ├── ExportDialog.tsx        # エクスポートダイアログ
    ├── AIBeatSuggestion.tsx    # AI ビート提案
    ├── ApiKeySettings.tsx      # APIキー設定
    └── Header.tsx              # ヘッダー
```

## 3. データモデル設計

### 3.1 BeatNote（ビート音符）
```typescript
interface BeatNote {
  id: string;                    // UUID
  time: number;                  // タイムスタンプ（秒）
  sound: SoundType;              // 音色種別
  velocity: number;              // ベロシティ（0-1）
}

type SoundType =
  | 'kick'
  | 'snare'
  | 'hihat-closed'
  | 'hihat-open'
  | 'clap'
  | 'tom'
  | 'cymbal'
  | 'rim';
```

### 3.2 Recording（録音データ）
```typescript
interface Recording {
  id: string;                    // UUID
  name: string;                  // 録音名
  bpm: number;                   // BPM
  notes: BeatNote[];             // ビート音符配列
  duration: number;              // 長さ（秒）
  createdAt: Date;               // 作成日時
  updatedAt: Date;               // 更新日時
}
```

### 3.3 AppSettings（アプリ設定）
```typescript
interface AppSettings {
  geminiApiKey?: string;         // Gemini APIキー
  bpm: number;                   // デフォルトBPM
  gridSnap: boolean;             // グリッドスナップON/OFF
  gridDivision: number;          // グリッド分割（4, 8, 16分音符）
  volume: number;                // マスターボリューム
  keyMapping: Record<string, SoundType>; // キーマッピング
}
```

## 4. ファイル構成

```
app023/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   └── components/
│       ├── KeyboardGuide.tsx
│       ├── Timeline.tsx
│       ├── TimelineMarker.tsx
│       ├── ControlPanel.tsx
│       ├── BPMSettings.tsx
│       ├── SoundSelector.tsx
│       ├── ExportDialog.tsx
│       ├── AIBeatSuggestion.tsx
│       ├── ApiKeySettings.tsx
│       └── Header.tsx
├── lib/
│   ├── audioEngine.ts           # Tone.js初期化・音声再生
│   ├── keyboardHandler.ts       # キーボードイベント処理
│   ├── geminiService.ts         # Gemini API呼び出し
│   ├── exportUtils.ts           # JSON/CSVエクスポート
│   └── storage.ts               # LocalStorage管理
├── store/
│   └── useBeatStore.ts          # Zustand Store
├── types/
│   └── index.ts                 # 型定義
├── public/
│   └── sounds/                  # 音源ファイル（.wav）
│       ├── kick.wav
│       ├── snare.wav
│       ├── hihat-closed.wav
│       ├── hihat-open.wav
│       ├── clap.wav
│       ├── tom.wav
│       ├── cymbal.wav
│       └── rim.wav
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## 5. API・インターフェース設計

### 5.1 Zustand Store
```typescript
interface BeatStore {
  // State
  recording: Recording | null;
  isRecording: boolean;
  isPlaying: boolean;
  currentTime: number;
  bpm: number;

  // Actions
  startRecording: () => void;
  stopRecording: () => void;
  startPlayback: () => void;
  stopPlayback: () => void;
  addNote: (note: BeatNote) => void;
  removeNote: (id: string) => void;
  updateNote: (id: string, updates: Partial<BeatNote>) => void;
  setBPM: (bpm: number) => void;
  clear: () => void;
  exportJSON: () => string;
  exportCSV: () => string;
}
```

### 5.2 Audio Engine（Tone.js）
```typescript
interface AudioEngine {
  // 初期化
  init(): Promise<void>;

  // 音声再生
  playSound(sound: SoundType, time?: number): void;

  // BPM設定
  setBPM(bpm: number): void;

  // メトロノーム
  startMetronome(): void;
  stopMetronome(): void;

  // 録音再生
  playRecording(notes: BeatNote[]): void;
  stopPlayback(): void;

  // ボリューム
  setVolume(volume: number): void;
}
```

### 5.3 Keyboard Handler
```typescript
interface KeyboardHandler {
  // イベントリスナー登録
  register(onKeyPress: (sound: SoundType) => void): () => void;

  // キーマッピング
  setKeyMapping(mapping: Record<string, SoundType>): void;
}
```

### 5.4 Gemini API インターフェース
```typescript
interface GeminiService {
  // ビート分析・提案
  analyzeBeat(notes: BeatNote[]): Promise<{
    genre: string;
    suggestions: string[];
    nextPattern: BeatNote[];
  }>;

  // ジャンル判定
  detectGenre(notes: BeatNote[]): Promise<string>;

  // 改善提案
  suggestImprovements(notes: BeatNote[]): Promise<string[]>;
}
```

## 6. 主要機能の実装方針

### 6.1 キーボード演奏
1. useEffect で keydown イベントリスナー登録
2. キーマッピングに基づいて音色を判定
3. Tone.js で即座に音声再生（latency < 50ms）
4. 録音中なら BeatNote を追加
5. 視覚的フィードバック（キーハイライト）

### 6.2 録音・再生
1. 録音開始時に Recording オブジェクト作成
2. キー入力ごとに BeatNote 追加（タイムスタンプ記録）
3. 録音停止時に LocalStorage に保存
4. 再生時は Tone.js の Transport で時間管理
5. タイムライン表示を同期

### 6.3 タイムライン表示
1. Canvas または SVG で描画
2. 横軸: 時間（秒）、縦軸: 音色種別
3. BeatNote をマーカーで表示（色分け）
4. 再生位置カーソルをリアルタイム更新
5. ズーム・スクロール対応

### 6.4 JSON/CSVエクスポート
**JSON形式**:
```json
[
  {"time": 0.0, "sound": "kick", "velocity": 0.8},
  {"time": 0.5, "sound": "snare", "velocity": 0.9},
  {"time": 1.0, "sound": "hihat-closed", "velocity": 0.6}
]
```

**CSV形式**:
```csv
time,sound,velocity
0.0,kick,0.8
0.5,snare,0.9
1.0,hihat-closed,0.6
```

### 6.5 AI機能（Gemini API）
1. 録音データを JSON 化して Gemini に送信
2. ビートパターンを分析
3. ジャンル判定・展開提案を取得
4. ユーザーに提案を表示
5. ワンクリックで提案を適用

## 7. パフォーマンス最適化

### 7.1 音声処理
- Tone.js の Sampler で音源プリロード
- Web Audio API のバッファリング最適化
- 低レイテンシモード有効化

### 7.2 タイムライン描画
- Canvas で描画（SVG より高速）
- requestAnimationFrame で60fps維持
- ビューポート外は描画スキップ

### 7.3 React最適化
- useMemo でタイムラインデータ計算をキャッシュ
- React.memo でコンポーネント再レンダリング抑制
- デバウンス処理（BPM変更等）

## 8. セキュリティ対策

### 8.1 入力検証
- BPM範囲チェック（60-240）
- ファイル名のサニタイズ

### 8.2 APIキー管理
- LocalStorage保存（平文）
- 設定画面でマスク表示

### 8.3 データ保護
- LocalStorageのデータはブラウザ内のみ
- エクスポートはユーザーの明示的な操作のみ

## 9. エラーハンドリング

### 9.1 音声処理
- 音源ロード失敗: 「音源の読み込みに失敗しました」
- Web Audio API未対応: 「お使いのブラウザは対応していません」
- レイテンシ高: 「音声の遅延が発生しています」

### 9.2 Gemini API
- APIキー未設定: 「APIキーを設定してください」
- レート制限: 「APIリクエスト制限に達しました」
- ネットワークエラー: 「ネットワークエラーが発生しました」

### 9.3 LocalStorage
- 容量不足: 「ストレージ容量が不足しています」
- データ破損: 「データの読み込みに失敗しました」

## 10. テスト戦略

### 10.1 単体テスト
- audioEngine の各関数
- exportUtils（JSON/CSV生成）
- Zustand Store のアクション

### 10.2 統合テスト
- キー入力 → 音声再生
- 録音 → 保存 → 再生
- エクスポート全体フロー

### 10.3 E2Eテスト
- ユーザーシナリオ全体
- ブラウザ間互換性
- レイテンシ計測

## 11. デプロイ・運用

### 11.1 ビルド
- `next build` で静的エクスポート
- 音源ファイル（.wav）を public/ に配置

### 11.2 ブラウザ対応
- Chrome 90+（Web Audio API）
- Firefox 90+
- Safari 15+
- Edge 90+

### 11.3 モニタリング
- エラー追跡（Sentry等）
- レイテンシ計測

## 12. 今後の拡張性

### 12.1 追加機能候補
- MIDIファイルエクスポート
- 複数トラック対応
- エフェクト（リバーブ、ディレイ）
- ループ機能

### 12.2 技術的改善
- WebAssembly（音声処理高速化）
- Service Worker（PWA化）
- WebRTC（リアルタイムコラボレーション）
