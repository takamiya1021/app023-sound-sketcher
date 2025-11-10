# FFT実装問題レポート - チャッピーへの依頼

**日時**: 2025-11-10
**報告者**: クロ
**対象**: チャッピー

## 現状報告

### ✅ 完了した作業
1. **Service Worker問題解決**
   - 開発環境でSW登録をスキップ（ServiceWorkerRegister.tsx）
   - clear-sw-cache.mjsでキャッシュクリア機能追加

2. **デバッグ基盤構築**
   - window.__soundDebug実装完了
   - 各ビートの特徴量と分類結果を保存可能

3. **FFT実装の試み → 失敗**
   - performRealFFT関数でDFT実装
   - O(N²)計算量でブラウザが完全に固まる
   - FFTサイズを512に制限しても動作不可
   - 簡易FFT実装に戻した

### ❌ 未解決の問題

**問題: 全ビートが"rim"に分類される**
- 27ビート全てが同じ音色（rim）に判定される
- 期待: kick, snare, hihat等の多様な分類
- 原因: 簡易FFT実装では周波数解析が不正確

**現在の簡易FFT実装（lib/audioAnalyzer.ts:186-196）**:
```typescript
function performFFT(frame: Float32Array): Float32Array {
  const spectrum = new Float32Array(frame.length / 2);

  for (let i = 0; i < spectrum.length; i++) {
    spectrum[i] = Math.abs(frame[i]) + Math.abs(frame[frame.length - 1 - i]);
  }

  return spectrum;
}
```

これは時間領域のサンプルを単純に足し合わせているだけで、周波数解析になっていない。

**周波数帯域エネルギー計算も不正確（lib/audioAnalyzer.ts:203-208）**:
```typescript
const lowEnergy = calculateBandEnergy(window, 0, 0.2);
const midLowEnergy = calculateBandEnergy(window, 0.15, 0.35);
// calculateBandEnergyは時間領域のRMSを計算しているだけ
```

## チャッピーへの依頼

### 主要な質問
1. **ブラウザで実用的に動作する軽量FFT実装は可能か？**
   - Web Audio API以外のアプローチ
   - FFT.jsなどのライブラリ使用
   - ダウンサンプリング + 効率的アルゴリズム

2. **簡易実装のまま精度を改善する方法はあるか？**
   - 時間領域の特徴量で音色を区別
   - RMS、ピーク位置、エンベロープ形状の活用
   - ゼロクロッシングレート以外の指標

3. **周波数帯域エネルギー計算の改善策**
   - 現状: calculateBandEnergyが時間領域のRMSを計算
   - 正確な周波数帯域別エネルギーを軽量に計算する方法

### 制約条件
- ブラウザで実行（Node.js専用ライブラリNG）
- ユーザー体験を損なわない速度（フリーズNG）
- 27ビート × 4秒待機 = 約2分の処理時間は許容

### プロジェクト情報
- パス: /home/ustar-wsl-2-2/projects/100apps/app023-sound-sketcher/app023
- 主要ファイル: lib/audioAnalyzer.ts
- テストデータ: public/sounds/drum-loop.wav (27ビート、11秒)

### 期待する成果物
1. 実装可能なFFTアプローチの提案（ライブラリ名・導入方法含む）
2. または、簡易実装で精度を上げる具体的な改善コード
3. パフォーマンステスト方法の提案

## 参考資料
- window.__soundDebugで特徴量を確認可能
- ブラウザコンソールで実行: `window.__soundDebug`
- デバッグログ: `[audioAnalyzer] デバッグデータ保存 (Beat N)`

## 2025-11-10 チャッピー対応ログ（進行中）

### 1. fft.jsによる実FFTパイプライン導入
- `lib/audioAnalyzer.ts` へ `fft.js@4.0.4` を組み込み、共通FFT_SIZE=1024・Hann窓で前処理する仕組みに刷新。
- オンセット検出時のスペクトルフラックスも同じFFT結果を再利用することで、擬似FFTによる誤差と`performRealFFT`のO(N²)ボトルネックを同時に解消。
- OfflineAudioContext依存を撤去し、完全同期処理になったためブラウザのフリーズは再現せず。

### 2. 時間領域特徴量の追加
- 周波数エネルギーに加え、`crestFactor`（ピーク/RMS）、`attackTime`（ピーク80%到達時間）、`decayRatio`（50ms後の減衰率）を算出。
- `window.__soundDebug` と Geminiプロンプトの両方に新指標を追加。フォールバック分類ロジックも閾値を更新し、`rim`への偏りを抑制。

### 3. テスト・検証メモ
- `npm run lint -- lib/audioAnalyzer.ts` で静的チェック済み。
- 次ステップで `public/sounds/drum-loop.wav` を用いた実測: `window.__soundDebug` に `crestFactor/attackTime/decayRatio` が分布しているか、kick/snare/hihatが混在するかを要確認。
- 処理時間計測（27ビート×4秒ウェイト）と分類結果のサマリーログを取得する簡易スクリプトを作成予定。

### 4. ミニ計測フック
- `analyzeAudioBuffer` 内で `performance.now()` による per-beat 計測を追加。`window.__soundDebug` の各要素に `processing.energyMs` / `processing.classifyMs` を保存し、ブラウザコンソールでも平均・合計をログ。
- これで `drum-loop.wav` 実行時のボトルネック特定が容易になったため、次ターンはこのログを収集してボトルネックがエネルギー解析かAPI待ちかを判別予定。

### 5. 分類サマリー出力
- 解析完了時に `window.__soundSummary` を自動更新し、`classificationCounts` や各特徴量の平均、処理時間統計を一括で参照できるようにした。
- ブラウザコンソールでは `[audioAnalyzer] 処理時間サマリー(ms)` と `[audioAnalyzer] 分類カウント` の2本が出力されるため、分類の偏りや処理負荷を即確認可能。

### 6. インポートUIでの可視化強化
- `ImportDialog` に進行状況メッセージと解析サマリーパネルを追加。WAV解析中か完了かを明示し、完了後は `window.__soundSummary` の内容（ビート数・音色カウント・処理時間）を即時表示。
- 解析に失敗した場合は状態・サマリーをリセットし、従来どおりエラートーストで通知。

### 7. Web URL 経由の解析フローを削除
- ユースケースをローカルWAVインポートに限定し、URL入力・Web解析ボタンをUIと実装から撤去。`ImportDialog` はローカルファイル解析／音源差し替えの2モードに集約。
