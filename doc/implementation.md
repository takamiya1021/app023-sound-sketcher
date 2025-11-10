# app023: サウンドスケッチャー - 実装計画書（TDD準拠版）

## 概要
本実装計画書は、TDD（Test-Driven Development）の原則に従い、全ての機能実装において**Red-Green-Refactor**サイクルを適用します。音声処理の複雑性を考慮し、段階的に機能を実装します。

## 完了条件
- ✅ 全テストがパス（Jest + React Testing Library + Playwright）
- ✅ コードカバレッジ80%以上
- ✅ ESLintエラー・警告ゼロ
- ✅ 音声レイテンシ < 50ms
- ✅ 要件定義書の全機能が実装済み

## 工数見積もり合計
**約65時間**（TDD対応分を含む）

---

## Phase 0: テスト環境構築（予定工数: 3時間）

### 目的
音声処理のテスト環境を含む、全テスト基盤を整備。

### タスク

#### 【x】0-1. Next.jsプロジェクト初期化（30分）
- `npx create-next-app@latest app023 --typescript --tailwind --app`
- 基本設定確認
- **Red**: 動作確認テスト作成
- **Green**: プロジェクト起動確認
- **Refactor**: 不要ファイル削除

#### 【x】0-2. Jestセットアップ（1時間）
- **Red**: Jest設定ファイルのテスト作成
- **Green**: Jest, @testing-library/react インストール
- Web Audio API モック設定
  ```typescript
  // jest.setup.js
  global.AudioContext = jest.fn();
  ```
- **Refactor**: 設定最適化

#### 【x】0-3. Playwrightセットアップ（1時間）
- **Red**: E2Eテストスケルトン作成
- **Green**: Playwright インストール・設定
- **Refactor**: テスト構成整理

#### 【x】0-4. テスト実行確認（30分）
- **Red**: ダミーテスト作成（失敗するテスト）
- **Green**: テスト実行スクリプト設定
- **Refactor**: テストコマンド整理

---

## Phase 1: データモデル・状態管理実装（予定工数: 5時間）

### 目的
BeatNote、Recording等のデータモデルとZustand Storeを実装。

### タスク

#### 【x】1-1. 型定義作成（1時間）
- **Red**: 型定義のテスト作成
- **Green**: `types/index.ts` に BeatNote, Recording, AppSettings 定義
- **Refactor**: 型の共通化

#### 【x】1-2. Zustand Store実装（3時間）
- **Red**: Store各アクションのテスト作成
  ```typescript
  test('should add note', () => {
    const { addNote, recording } = useBeatStore.getState();
    addNote(mockNote);
    expect(recording.notes).toHaveLength(1);
  });
  ```
- **Green**: `store/useBeatStore.ts` 実装
  - startRecording, stopRecording
  - addNote, removeNote, updateNote
  - startPlayback, stopPlayback
- **Refactor**: 状態管理最適化

#### 【x】1-3. LocalStorage統合（1時間）
- **Red**: 永続化テスト
- **Green**: `lib/storage.ts` 実装、保存・読み込み
- **Refactor**: デバウンス処理

---

## Phase 2: 音声処理エンジン実装（Tone.js）（予定工数: 8時間）

### 目的
Tone.jsを使った音声再生、録音、メトロノーム機能を実装。

### タスク

#### 【x】2-1. Tone.js初期化（1時間）
- **Red**: 初期化テスト（モック）
- **Green**: Tone.js インストール、`lib/audioEngine.ts` 実装
  ```bash
  npm install tone
  ```
- **Refactor**: 設定最適化

#### 【x】2-2. 音源プリロード（2時間）
- **Red**: 音源読み込みテスト
- **Green**: Sampler実装、/public/sounds/ に音源配置
  ```typescript
  const sampler = new Tone.Sampler({
    urls: { C3: "kick.wav" },
    baseUrl: "/sounds/"
  });
  ```
- **Refactor**: 音源バッファリング最適化

#### 【x】2-3. 音声再生機能（2時間）
- **Red**: playSound テスト
- **Green**: リアルタイム再生実装（レイテンシ < 50ms）
- **Refactor**: レイテンシ計測・最適化

#### 【x】2-4. BPM設定・Transport（2時間）
- **Red**: BPM変更テスト
- **Green**: Tone.Transport 統合、BPM設定
- **Refactor**: タイミング精度向上

#### 【x】2-5. メトロノーム機能（1時間）
- **Red**: メトロノームテスト
- **Green**: クリック音再生実装
- **Refactor**: 音量調整

---

## Phase 3: キーボード入力・演奏機能（予定工数: 6時間）

### 目的
キーボードイベント処理、リアルタイム演奏機能を実装。

### タスク

#### 【x】3-1. キーボードハンドラー実装（3時間）
- **Red**: キーイベントテスト
- **Green**: `lib/keyboardHandler.ts` 実装
  - キーマッピング設定
  - keydown/keyup イベントリスナー
- **Refactor**: イベント最適化

#### 【x】3-2. 視覚的フィードバック（2時間）
- **Red**: キーハイライトテスト
- **Green**: キー押下時のアニメーション実装
- **Refactor**: パフォーマンス改善

#### 【x】3-3. 録音中のノート追加（1時間）
- **Red**: 録音中のノート追加テスト
- **Green**: タイムスタンプ記録、BeatNote追加
- **Refactor**: タイミング精度向上

---

## Phase 4: タイムライン表示実装（予定工数: 8時間）

### 目的
Canvas/SVGによるタイムライン描画、再生位置カーソル実装。

### タスク

#### 【x】4-1. Timelineコンポーネント基盤（2時間）
- **Red**: Timeline描画テスト
- **Green**: Canvas実装、基本レイアウト描画
- **Refactor**: レスポンシブ対応

#### 【x】4-2. BeatNoteマーカー描画（3時間）
- **Red**: マーカー描画テスト
- **Green**: 音色別マーカー実装（色分け）
- **Refactor**: 描画パフォーマンス最適化（requestAnimationFrame）

#### 【x】4-3. 再生位置カーソル（2時間）
- **Red**: カーソル移動テスト
- **Green**: リアルタイムカーソル更新実装
- **Refactor**: 60fps維持

#### 【x】4-4. ズーム・スクロール（1時間）
- **Red**: ズーム・スクロールテスト
- **Green**: マウスホイール・ドラッグ操作実装
- **Refactor**: 操作性改善

---

## Phase 5: 録音・再生機能実装（予定工数: 6時間）

### 目的
録音開始/停止、再生機能、録音データ保存を実装。

### タスク

#### 【x】5-1. 録音機能（3時間）
- **Red**: 録音開始/停止テスト
- **Green**: Recording作成、BeatNote追加ロジック
- **Refactor**: タイミング精度向上

#### 【x】5-2. 再生機能（2時間）
- **Red**: 再生テスト
- **Green**: Tone.Transport使用、スケジュール再生
- **Refactor**: 同期精度向上

#### 【x】5-3. 録音データ保存（1時間）
- **Red**: 保存テスト
- **Green**: LocalStorage保存実装
- **Refactor**: データ圧縮

---

## Phase 6: UIコンポーネント実装（予定工数: 7時間）

### 目的
ヘッダー、コントロールパネル、設定画面などUI実装。

### タスク

#### 【x】6-1. Headerコンポーネント（1時間）
- **Red**: Header表示テスト
- **Green**: `app/components/Header.tsx` 実装
- **Refactor**: レイアウト調整

#### 【x】6-2. ControlPanelコンポーネント（2時間）
- **Red**: コントロールボタンテスト
- **Green**: 録音/再生/停止ボタン実装
- **Refactor**: アイコン・スタイル改善

#### 【x】6-3. KeyboardGuideコンポーネント（2時間）
- **Red**: ガイド表示テスト
- **Green**: キーマッピング表示UI実装
- **Refactor**: レスポンシブ対応

#### 【x】6-4. BPMSettingsコンポーネント（1時間）
- **Red**: BPM変更テスト
- **Green**: BPMスライダー・入力実装
- **Refactor**: バリデーション追加

#### 【x】6-5. SoundSelectorコンポーネント（1時間）
- **Red**: 音色選択テスト
- **Green**: 音色切り替えUI実装
- **Refactor**: プレビュー再生機能

---

## Phase 7: エクスポート・インポート機能実装（予定工数: 13時間）

### 目的
JSON/CSVエクスポート・インポート、WAVファイルインポート、ダウンロード・アップロード機能を実装。

### タスク

#### 【x】7-1. JSON/CSVエクスポートロジック（2時間）
- **Red**: エクスポートテスト
- **Green**: `lib/exportUtils.ts` 実装
  ```typescript
  function exportJSON(notes: BeatNote[]): string
  function exportCSV(notes: BeatNote[]): string
  ```
- **Refactor**: フォーマット最適化

#### 【x】7-2. ExportDialogコンポーネント（1時間）
- **Red**: ダイアログ表示テスト
- **Green**: モーダルUI実装
- **Refactor**: UX改善

#### 【x】7-3. ファイルダウンロード（1時間）
- **Red**: ダウンロードテスト
- **Green**: FileSaver.js統合
- **Refactor**: ファイル名生成

#### 【x】7-4. JSON/CSVインポートロジック（2時間）
- **Red**: インポートテスト作成
  ```typescript
  test('should import valid JSON', async () => {
    const json = '[{"time": 0.0, "sound": "kick", "velocity": 0.8}]';
    const notes = await importJSON(json);
    expect(notes).toHaveLength(1);
  });
  ```
- **Green**: `lib/importUtils.ts` 実装
  ```typescript
  function importJSON(file: File): Promise<BeatNote[]>
  function importCSV(file: File): Promise<BeatNote[]>
  ```
  - FileReader API使用
  - JSON/CSVパース
  - バリデーション（time: 0以上, sound: SoundType, velocity: 0.0-1.0）
  - エラーハンドリング（形式エラー、データエラー、範囲エラー）
- **Refactor**: パース処理最適化

#### 【x】7-5. WAVファイルインポート（3時間）
- **Red**: WAVインポートテスト作成
- **Green**: WAVファイル処理実装
  ```typescript
  function importWAVFile(file: File): Promise<AudioBuffer>
  ```
  - FileReader API（ArrayBuffer読み込み）
  - AudioContext.decodeAudioData()
  - Tone.js Samplerに動的追加
  - 新しいSoundType作成
  - キーマッピング自動割り当て
  - バリデーション
    - MIMEタイプチェック（audio/wav, audio/x-wav）
    - ファイルサイズチェック（5MB以下）
    - AudioBufferデコード確認
- **Refactor**: エラー処理強化

#### 【x】7-6. ImportDialogコンポーネント（2時間）
- **Red**: インポートダイアログテスト
- **Green**: ImportDialog UI実装
  - ファイル選択（input type="file"）
  - JSON/CSV/WAVファイル対応
  - ドラッグ&ドロップ対応
  - プログレス表示
  - エラーメッセージ表示
- **Refactor**: UX改善

#### 【x】7-7. インポート機能テスト（2時間）
- **Red**: 統合テスト作成
  - 正常系テスト（JSON/CSV/WAV）
  - 異常系テスト（不正ファイル、破損データ）
- **Green**: テストパス確認
- **Refactor**: テストカバレッジ向上

---

## Phase 8: AI機能実装（Gemini API）（予定工数: 6時間）

### 目的
ビート分析、ジャンル判定、AI提案機能を実装。

### タスク

#### 【x】8-1. Gemini API統合（1時間）
- **Red**: API接続テスト（モック）
- **Green**: `lib/geminiService.ts` 実装
- **Refactor**: エラーハンドリング

#### 【x】8-2. ビート分析機能（2時間）
- **Red**: 分析テスト
- **Green**: analyzeBeat 実装
  - BeatNote配列をJSON化
  - Gemini API送信
  - ジャンル・提案パース
- **Refactor**: プロンプト最適化

#### 【x】8-3. 次パターン提案（2時間）
- **Red**: パターン生成テスト
- **Green**: nextPattern生成実装
- **Refactor**: パターン検証

#### 【x】8-4. AIBeatSuggestionコンポーネント（1時間）
- **Red**: UI表示テスト
- **Green**: 提案表示・適用UI実装
- **Refactor**: ワンクリック適用

---

## Phase 9: パフォーマンス最適化（予定工数: 3時間）

### 目的
音声レイテンシ、タイムライン描画、React最適化。

### タスク

#### 【x】9-1. 音声レイテンシ最適化（1時間）
- **Red**: レイテンシ計測テスト
- **Green**: Web Audio API設定調整、バッファリング最適化
- **Refactor**: レイテンシ < 50ms達成

#### 【x】9-2. タイムライン描画最適化（1時間）
- **Red**: 描画フレームレートテスト
- **Green**: requestAnimationFrame最適化、ビューポート外スキップ
- **Refactor**: 60fps維持

#### 【x】9-3. React最適化（1時間）
- **Red**: 再レンダリングテスト
- **Green**: React.memo, useMemo, useCallback適用
- **Refactor**: パフォーマンス計測

---

## Phase 10: エラーハンドリング・バリデーション（予定工数: 3時間）

### 目的
音声処理、Gemini API、LocalStorageのエラー処理強化。

### タスク

#### 【x】10-1. 音声処理エラーハンドリング（1時間）
- **Red**: エラー処理テスト
- **Green**: 音源ロード失敗、Web Audio未対応処理
- **Refactor**: フォールバック実装

#### 【x】10-2. Gemini APIエラーハンドリング（1時間）
- **Red**: APIエラーテスト
- **Green**: レート制限、ネットワークエラー処理
- **Refactor**: ユーザーフィードバック

#### 【x】10-3. BPMバリデーション（1時間）
- **Red**: バリデーションテスト
- **Green**: BPM範囲チェック（60-240）実装
- **Refactor**: エラーメッセージ

---

## Phase 11: E2Eテスト・統合テスト（予定工数: 4時間）

### 目的
Playwrightによるユーザーシナリオ全体のテスト。

### タスク

#### 【x】11-1. 演奏・録音シナリオ（1時間）
- **Red**: E2Eテスト作成
- **Green**: テストパス確認
- **Refactor**: アサーション強化

#### 【x】11-2. 再生シナリオ（1時間）
- **Red**: E2Eテスト作成
- **Green**: テストパス確認
- **Refactor**: 同期確認

#### 【x】11-3. エクスポートシナリオ（1時間）
- **Red**: E2Eテスト作成
- **Green**: テストパス確認
- **Refactor**: ダウンロード検証

#### 【x】11-4. AI機能統合テスト（1時間）
- **Red**: AI機能E2Eテスト作成
- **Green**: モックAPI使用テスト
- **Refactor**: テスト安定性向上

---

## Phase 12: デプロイ準備・最終調整（予定工数: 3時間）

### 目的
静的エクスポート、音源ファイル配置、セキュリティヘッダー・WAF対策、ビルド確認。

### タスク

#### 【x】12-1. 音源ファイル配置（30分）
- public/sounds/ に全音源配置
- 著作権フリー確認
- public/sounds/README.md 作成

#### 【x】12-2. 静的エクスポート設定（30分）
- next.config.js 設定
- ビルドエラー修正

#### 【x】12-3. ビルド・動作確認（30分）
- `npm run build` 実行
- 音声再生確認（E2Eテスト 9/11パス）

#### 【x】12-4. README作成（30分）
- セットアップ手順、使い方記述
- キーボード操作ガイド追加

#### 【x】12-5. セキュリティヘッダー・WAF対策実装（1時間）
- **Red**: セキュリティヘッダー確認テスト作成
- **Green**:
  - `public/_headers` 作成（Netlify/Cloudflare Pages用）
  - `vercel.json` 作成（Vercel用）
  - セキュリティヘッダー設定
    - X-Frame-Options: DENY（Clickjacking対策）
    - X-Content-Type-Options: nosniff（MIME sniffing対策）
    - X-XSS-Protection: 1; mode=block（XSS対策）
    - Referrer-Policy: strict-origin-when-cross-origin
    - Permissions-Policy: 適切な機能制限
  - CSP（Content Security Policy）実装
    - script-src: 'self' 'unsafe-inline'（Tone.js対応）
    - style-src: 'self' 'unsafe-inline'（Tailwind CSS対応）
    - connect-src: Google Gemini API許可
- **Refactor**: ヘッダー最適化、ポリシー調整

---

## マイルストーン

### M1: テスト環境構築完了（Phase 0）
- 期限: 開始から1日目
- 完了条件: Jest, Playwright, 音声モックが動作

### M2: 音声エンジン実装完了（Phase 1-3）
- 期限: 開始から1週間
- 完了条件: キーボード演奏、録音が動作

### M3: タイムライン・再生実装完了（Phase 4-6）
- 期限: 開始から2週間
- 完了条件: タイムライン表示、再生、UI実装完了

### M4: 品質保証・デプロイ準備完了（Phase 7-12）
- 期限: 開始から3週間
- 完了条件: 全テストパス、カバレッジ80%以上、音声レイテンシ < 50ms

---

## 依存関係

- Phase 0 → 全Phase（テスト環境必須）
- Phase 1 → Phase 2, 5, 8（データモデル依存）
- Phase 2 → Phase 3, 5（音声エンジン依存）
- Phase 3 → Phase 5（キーボード入力依存）
- Phase 4 → Phase 5（タイムライン依存）
- Phase 8 → Phase 5（録音データ依存）
- Phase 9, 10, 11 → 全機能実装完了後

---

## リスク管理

### 高リスク項目
1. **音声レイテンシ**: 50ms以下の達成が困難
   - 対策: Web Audio API低レイテンシモード、バッファサイズ調整
2. **ブラウザ互換性**: SafariでWeb Audio API制約
   - 対策: Safari専用テスト、フォールバック実装

### 中リスク項目
1. **タイムライン描画パフォーマンス**: 60fps維持困難
   - 対策: ビューポート外スキップ、Canvas最適化
2. **Gemini APIレート制限**: AI機能が制限される
   - 対策: レート制限エラー処理、キャッシュ実装

---

## 品質チェックリスト

### コード品質
- [ ] ESLint エラー・警告ゼロ
- [ ] TypeScript型エラーゼロ
- [ ] 音声レイテンシ < 50ms
- [ ] タイムライン描画 60fps維持

### テスト品質
- [ ] 単体テストカバレッジ80%以上
- [ ] E2Eテスト全シナリオパス
- [ ] ブラウザ間互換性確認（特にSafari）

### UX品質
- [ ] キーボード演奏が直感的
- [ ] 録音・再生がスムーズ
- [ ] タイムライン操作が快適
- [ ] AI提案が役立つ

### セキュリティ
- [ ] セキュリティヘッダー実装（X-Frame-Options, X-Content-Type-Options等）
- [ ] CSP（Content Security Policy）設定
- [ ] XSS対策実装
- [ ] Clickjacking対策実装
- [ ] APIキーが平文表示されない
- [ ] BPM範囲チェック実装
