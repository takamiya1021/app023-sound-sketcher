# Timeline Fix Report for Kuro

## 背景
- タイムラインのプレイヘッドとノート表示がずれて見える、レーンハイライトが途切れる、目盛りの意味が伝わりにくい──という三つの課題が同時に発生していた。
- 録音／再生中に `container.scrollLeft` と `playheadEl.style.left` の基準が分離していたことが、ズレの第一原因。
- ハイライトは `HIGHLIGHT_WINDOW` に依存しており、プレイヘッド付近にノートが無い瞬間に `highlightedSound` が `null` になってしまう設計だった。
- 時間目盛りは固定数値を4分割で描画していたため、スクロールとの連動もなく、刻み幅も感覚的ではなかった。

## 修正アプローチ
1. **プレイヘッド／スクロールの統合**
   - `playheadPixels` を唯一の真値として扱い、プレイヘッド線の `style.left` を `trackOffset + playheadPixels` で常に求めるよう変更。
   - ズーム値や録音中のヘッドルームを加味しつつ、スクロールは `clamp(playheadPixels - insetWithinTrack)` で自動追従する形に統一。

2. **ハイライトの役割分離**
   - 「最も近いノートのサウンド」を常に `highlightedSound` に設定し続ける一方で、黄色ノートの発光は従来のウインドウ判定のまま運用。
   - レーン外枠は常時ダークのままにし、トラック内部のみ `ring-emerald` で光らせることで視認性を向上。

3. **ルーラー刷新**
   - 目盛り専用レーンを追加し、曲尺に応じて 1/2/5/10 秒系の「きれいな刻み」を自動生成。
   - メジャー目盛りは長線＋ラベル、マイナーは短線のみ。ラベルは数値だけを表示し、現在時刻はヘッダのインジケータで明示。

## テスト
- `npm run test -- Timeline`
- `npx playwright test e2e/test-detailed.spec.ts`
- `npx playwright test e2e/test-lane-highlight.spec.ts`

## 学び
- プレイヘッドとノート描画は必ず同一座標系（pxPerSecond）で処理する。
- ハイライトと視覚効果は「最も伝えたい情報のみ光らせる」ほうが混乱が少ない。
- 目盛りはスクロールと同期させ、刻みの生成も人間寄りにチューニングするとUXが安定する。
