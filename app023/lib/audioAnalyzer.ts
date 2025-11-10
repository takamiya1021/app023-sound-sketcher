import { BeatNote, SoundType } from '@/types';
import FFT from 'fft.js';

/**
 * デバッグ用のグローバル型定義
 */
interface SoundDebugData {
  beatIndex: number;
  onsetTime: number;
  features: {
    lowEnergy: number;
    midLowEnergy: number;
    midEnergy: number;
    midHighEnergy: number;
    highEnergy: number;
    veryHighEnergy: number;
    noisiness: number;
    duration: number;
    crestFactor: number;
    attackTime: number;
    decayRatio: number;
  };
  classification: {
    sound: string;
    usedAI: boolean;
    confidence?: number;
  };
  processing?: {
    energyMs: number;
    classifyMs: number;
  };
}

export interface SoundDebugSummary {
  totalBeats: number;
  classificationCounts: Record<SoundType, number>;
  featureAverages: {
    lowEnergy: number;
    midLowEnergy: number;
    midEnergy: number;
    midHighEnergy: number;
    highEnergy: number;
    veryHighEnergy: number;
    noisiness: number;
    duration: number;
    crestFactor: number;
    attackTime: number;
    decayRatio: number;
  };
  processing: {
    energyAvg: number;
    classifyAvg: number;
    energyTotal: number;
    classifyTotal: number;
  };
}

declare global {
  interface Window {
    __soundDebug?: SoundDebugData[];
    __soundSummary?: SoundDebugSummary;
  }
}

// デバッグ用配列の初期化
if (typeof window !== 'undefined' && !window.__soundDebug) {
  window.__soundDebug = [];
}

/**
 * UUID生成（crypto.randomUUID()を使用）
 */
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

/**
 * オンセット検出のパラメータ
 */
interface OnsetDetectionParams {
  /** フレームサイズ（サンプル数） */
  frameSize: number;
  /** ホップサイズ（フレーム間の移動サンプル数） */
  hopSize: number;
  /** オンセット検出のしきい値（0.0-1.0） */
  threshold: number;
  /** 最小ピーク間隔（秒） */
  minPeakDistance: number;
}

/**
 * 周波数帯域別のエネルギー
 */
interface FrequencyEnergy {
  /** 低域エネルギー（20-150Hz） */
  lowEnergy: number;
  /** 中低域エネルギー（100-400Hz） */
  midLowEnergy: number;
  /** 中域エネルギー（150-500Hz） */
  midEnergy: number;
  /** 中高域エネルギー（1000-4000Hz） */
  midHighEnergy: number;
  /** 高域エネルギー（3000Hz以上） */
  highEnergy: number;
  /** 超高域エネルギー（5000Hz以上） */
  veryHighEnergy: number;
  /** ノイズ成分（スペクトルフラットネス） */
  noisiness: number;
  /** 持続時間（秒） */
  duration: number;
  /** クレストファクター（ピーク/RMS） */
  crestFactor: number;
  /** アタック時間（秒） */
  attackTime: number;
  /** ディケイ比（ピーク後の減衰率） */
  decayRatio: number;
}

/**
 * デフォルトのオンセット検出パラメータ
 */
const DEFAULT_ONSET_PARAMS: OnsetDetectionParams = {
  frameSize: 2048,
  hopSize: 512,
  threshold: 0.3,
  minPeakDistance: 0.05, // 50ms
};

/**
 * FFT実行用の定数・バッファ
 */
const FFT_SIZE = 1024;
const fft = new FFT(FFT_SIZE);
const fftInput = new Float32Array(FFT_SIZE);
const fftComplex = fft.createComplexArray();
const hannWindow = createHannWindow(FFT_SIZE);

/**
 * RMS（二乗平均平方根）を計算
 */
function calculateRMS(data: Float32Array): number {
  if (data.length === 0) {
    return 0;
  }

  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / data.length);
}

/**
 * Hann窓を生成
 */
function createHannWindow(size: number): Float32Array {
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return window;
}

/**
 * FFT入力バッファにフレームをコピー（必要ならダウンサンプリング）
 */
function prepareFFTInput(frame: Float32Array): void {
  fftInput.fill(0);

  if (frame.length >= FFT_SIZE) {
    const step = frame.length / FFT_SIZE;
    for (let i = 0; i < FFT_SIZE; i++) {
      const sourceIndex = Math.floor(i * step);
      fftInput[i] = (frame[sourceIndex] || 0) * hannWindow[i];
    }
    return;
  }

  for (let i = 0; i < frame.length; i++) {
    fftInput[i] = frame[i] * hannWindow[i];
  }
}

/**
 * クレストファクター（ピーク/RMS）を算出
 */
function calculateCrestFactor(data: Float32Array): number {
  if (data.length === 0) {
    return 0;
  }

  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > peak) {
      peak = abs;
    }
  }

  const rms = calculateRMS(data);
  if (rms === 0) {
    return 0;
  }

  return peak / rms;
}

/**
 * アタック時間とディケイ率を推定
 */
function calculateTemporalShape(
  data: Float32Array,
  sampleRate: number
): { attackTime: number; decayRatio: number } {
  if (data.length === 0) {
    return { attackTime: 0, decayRatio: 0 };
  }

  let peak = 0;
  let peakIndex = 0;
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > peak) {
      peak = abs;
      peakIndex = i;
    }
  }

  if (peak === 0) {
    return { attackTime: 0, decayRatio: 0 };
  }

  const target = peak * 0.8;
  let attackSamples = peakIndex;
  for (let i = 0; i <= peakIndex; i++) {
    if (Math.abs(data[i]) >= target) {
      attackSamples = i;
      break;
    }
  }

  const sustainWindowSamples = Math.max(1, Math.floor(sampleRate * 0.015));
  const tailOffsetSamples = Math.max(1, Math.floor(sampleRate * 0.05));

  const sustain = averageAbsAmplitude(data, peakIndex, sustainWindowSamples);
  const tail = averageAbsAmplitude(
    data,
    peakIndex + tailOffsetSamples,
    sustainWindowSamples
  );

  let decayRatio = 0;
  if (sustain > 1e-6) {
    decayRatio = Math.max(0, Math.min(tail / sustain, 1));
  }

  return {
    attackTime: attackSamples / sampleRate,
    decayRatio,
  };
}

function averageAbsAmplitude(
  data: Float32Array,
  start: number,
  length: number
): number {
  if (start >= data.length || length <= 0) {
    return 0;
  }

  const end = Math.min(data.length, start + length);
  let sum = 0;
  let count = 0;
  for (let i = start; i < end; i++) {
    sum += Math.abs(data[i]);
    count++;
  }

  return count > 0 ? sum / count : 0;
}

/**
 * スペクトルフラックス（周波数成分の変化量）を計算
 */
function calculateSpectralFlux(
  prevSpectrum: Float32Array,
  currSpectrum: Float32Array
): number {
  let flux = 0;
  const length = Math.min(prevSpectrum.length, currSpectrum.length);

  for (let i = 0; i < length; i++) {
    const diff = currSpectrum[i] - prevSpectrum[i];
    flux += diff > 0 ? diff : 0; // 正の変化のみを累積
  }

  return flux;
}

/**
 * オンセット（音の立ち上がり）を検出
 */
function detectOnsets(
  audioBuffer: AudioBuffer,
  params: OnsetDetectionParams = DEFAULT_ONSET_PARAMS
): number[] {
  const audioData = audioBuffer.getChannelData(0); // モノラルまたは左チャンネル
  const sampleRate = audioBuffer.sampleRate;
  const onsets: number[] = [];

  const { frameSize, hopSize, threshold, minPeakDistance } = params;
  const minPeakSamples = Math.floor(minPeakDistance * sampleRate);

  // スペクトルフラックスの計算
  const fluxes: number[] = [];
  let prevSpectrum: Float32Array | null = null;

  for (let i = 0; i + frameSize < audioData.length; i += hopSize) {
    const frame = audioData.slice(i, i + frameSize);
    const spectrum = performFFT(frame);

    if (prevSpectrum !== null) {
      const flux = calculateSpectralFlux(prevSpectrum, spectrum);
      fluxes.push(flux);
    } else {
      fluxes.push(0);
    }

    prevSpectrum = spectrum;
  }

  // フラックスの正規化
  const maxFlux = Math.max(...fluxes);
  const normalizedFluxes = fluxes.map((f) => (maxFlux > 0 ? f / maxFlux : 0));

  // ピーク検出
  let lastOnsetSample = -minPeakSamples;

  for (let i = 1; i < normalizedFluxes.length - 1; i++) {
    const prev = normalizedFluxes[i - 1];
    const curr = normalizedFluxes[i];
    const next = normalizedFluxes[i + 1];

    // ローカルピークかつしきい値以上
    if (curr > prev && curr > next && curr >= threshold) {
      const samplePosition = i * hopSize;

      // 最小ピーク間隔のチェック
      if (samplePosition - lastOnsetSample >= minPeakSamples) {
        const timeInSeconds = samplePosition / sampleRate;
        onsets.push(timeInSeconds);
        lastOnsetSample = samplePosition;
      }
    }
  }

  return onsets;
}

/**
 * FFT（実数入力）を実行し、振幅スペクトルを返す
 */
function performFFT(frame: Float32Array): Float32Array {
  prepareFFTInput(frame);

  fft.realTransform(fftComplex, fftInput);
  fft.completeSpectrum(fftComplex);

  const spectrum = new Float32Array(FFT_SIZE / 2);
  for (let k = 0; k < spectrum.length; k++) {
    const real = fftComplex[2 * k];
    const imag = fftComplex[2 * k + 1];
    spectrum[k] = (real * real + imag * imag) / FFT_SIZE;
  }

  return spectrum;
}

/**
 * 周波数帯域別のエネルギーを分析
 */
function analyzeFrequencyEnergy(
  audioBuffer: AudioBuffer,
  onsetTime: number,
  windowSize: number = 0.05 // 50ms window
): FrequencyEnergy {
  const sampleRate = audioBuffer.sampleRate;
  const audioData = audioBuffer.getChannelData(0);

  const startSample = Math.floor(onsetTime * sampleRate);
  const windowSamples = Math.floor(windowSize * sampleRate);
  const endSample = Math.min(startSample + windowSamples, audioData.length);

  if (startSample >= audioData.length) {
    return {
      lowEnergy: 0,
      midLowEnergy: 0,
      midEnergy: 0,
      midHighEnergy: 0,
      highEnergy: 0,
      veryHighEnergy: 0,
      noisiness: 0,
      duration: 0,
      crestFactor: 0,
      attackTime: 0,
      decayRatio: 0,
    };
  }

  const window = audioData.slice(startSample, endSample);

  const spectrum = performFFT(window);

  // 周波数帯域の定義（Hz）
  const bands = [
    { name: 'low', min: 20, max: 150 },        // キック: 低域
    { name: 'midLow', min: 100, max: 400 },    // スネア: 中低域
    { name: 'mid', min: 300, max: 1000 },      // タム: 中域
    { name: 'midHigh', min: 800, max: 3000 },  // リム/クラップ: 中高域
    { name: 'high', min: 2000, max: 8000 },    // ハイハット: 高域
    { name: 'veryHigh', min: 6000, max: 20000 }, // シンバル: 超高域
  ];

  // 周波数ビンあたりのHz幅
  const binWidth = sampleRate / FFT_SIZE;

  // 各帯域のエネルギーを計算
  const energies: { [key: string]: number } = {
    low: 0,
    midLow: 0,
    mid: 0,
    midHigh: 0,
    high: 0,
    veryHigh: 0,
  };
  for (const band of bands) {
    const startBin = Math.floor(band.min / binWidth);
    const endBin = Math.ceil(band.max / binWidth);
    let energy = 0;
    let count = 0;

    for (let i = startBin; i < endBin && i < spectrum.length; i++) {
      energy += spectrum[i];
      count++;
    }

    energies[band.name] = count > 0 ? energy / count : 0;
  }

  // 正規化（0-1範囲）
  const maxEnergy = Math.max(...Object.values(energies), 0.0001);
  const normalize = (val: number) => val / maxEnergy;

  // ノイズ成分の推定（ゼロクロッシングレート）
  const noisiness = calculateZeroCrossingRate(window);

  // 持続時間の推定（エネルギーが10%以上ある期間）
  const duration = estimateDuration(audioData, startSample, sampleRate);

  const crestFactor = calculateCrestFactor(window);
  const { attackTime, decayRatio } = calculateTemporalShape(window, sampleRate);

  return {
    lowEnergy: normalize(energies.low),
    midLowEnergy: normalize(energies.midLow),
    midEnergy: normalize(energies.mid),
    midHighEnergy: normalize(energies.midHigh),
    highEnergy: normalize(energies.high),
    veryHighEnergy: normalize(energies.veryHigh),
    noisiness,
    duration,
    crestFactor,
    attackTime,
    decayRatio,
  };
}


/**
 * ゼロクロッシングレート（ノイズ度合いの指標）を計算
 */
function calculateZeroCrossingRate(data: Float32Array): number {
  let crossings = 0;
  for (let i = 1; i < data.length; i++) {
    if ((data[i - 1] >= 0 && data[i] < 0) || (data[i - 1] < 0 && data[i] >= 0)) {
      crossings++;
    }
  }
  return crossings / data.length;
}

/**
 * 持続時間を推定
 */
function estimateDuration(
  audioData: Float32Array,
  startSample: number,
  sampleRate: number
): number {
  const threshold = 0.1;
  const maxDuration = 0.5; // 最大500ms
  const maxSamples = Math.floor(maxDuration * sampleRate);

  let duration = 0;
  for (let i = startSample; i < Math.min(startSample + maxSamples, audioData.length); i++) {
    if (Math.abs(audioData[i]) > threshold) {
      duration = (i - startSample) / sampleRate;
    } else if (i - startSample > sampleRate * 0.01) {
      // 10ms以上無音が続いたら終了
      break;
    }
  }

  return duration;
}

/**
 * Gemini API用のプロンプトを構築
 */
function buildClassificationPrompt(features: FrequencyEnergy): string {
  const total = features.lowEnergy + features.midLowEnergy + features.midEnergy +
                features.midHighEnergy + features.highEnergy + features.veryHighEnergy;

  const ratios = {
    low: (features.lowEnergy / total).toFixed(3),
    midLow: (features.midLowEnergy / total).toFixed(3),
    mid: (features.midEnergy / total).toFixed(3),
    midHigh: (features.midHighEnergy / total).toFixed(3),
    high: (features.highEnergy / total).toFixed(3),
    veryHigh: (features.veryHighEnergy / total).toFixed(3),
    noisiness: features.noisiness.toFixed(3),
    duration: features.duration.toFixed(3),
    crestFactor: features.crestFactor.toFixed(2),
    attackTime: features.attackTime.toFixed(3),
    decayRatio: features.decayRatio.toFixed(3),
  };

  return `You are a drum sound classifier. Analyze the following audio features and classify the sound into ONE of these categories:
- kick (bass drum): Low frequency dominant (20-150Hz), short duration (<0.15s)
- snare: Mid frequency (150-500Hz) with high noisiness (>0.3), short duration (<0.2s)
- hihat-closed: Very high frequency dominant (>5000Hz), very short duration (<0.1s)
- hihat-open: Very high frequency dominant (>5000Hz), medium duration (0.1-0.3s)
- clap: Mid-high frequency (1000-4000Hz), short duration (<0.15s), noisy
- tom: Mid-low frequency (100-400Hz), medium duration (0.1-0.25s)
- cymbal: High frequency (>3000Hz), long duration (>0.3s)
- rim: Mid-high frequency (2000-8000Hz), very short duration (<0.08s)

Audio Features:
- Low frequency ratio (20-150Hz): ${ratios.low}
- Mid-low frequency ratio (100-400Hz): ${ratios.midLow}
- Mid frequency ratio (150-500Hz): ${ratios.mid}
- Mid-high frequency ratio (1000-4000Hz): ${ratios.midHigh}
- High frequency ratio (3000Hz+): ${ratios.high}
- Very high frequency ratio (5000Hz+): ${ratios.veryHigh}
- Noisiness (0-1): ${ratios.noisiness}
- Duration (seconds): ${ratios.duration}
- Crest factor (peak / RMS): ${ratios.crestFactor}
- Attack time (seconds to 80% peak): ${ratios.attackTime}
- Decay ratio (50ms post-peak / peak): ${ratios.decayRatio}

Respond with ONLY the category name (e.g., "kick", "snare", "hihat-closed", etc.). No explanation needed.`;
}

/**
 * Geminiのレスポンスから音色を抽出
 */
function extractSoundFromResponse(text: string): SoundType {
  const normalized = text.toLowerCase().trim();

  const soundTypes: SoundType[] = [
    'kick',
    'snare',
    'hihat-closed',
    'hihat-open',
    'clap',
    'tom',
    'cymbal',
    'rim',
  ];

  // 完全一致を探す
  for (const soundType of soundTypes) {
    if (normalized === soundType) {
      return soundType;
    }
  }

  // 部分一致を探す
  for (const soundType of soundTypes) {
    if (normalized.includes(soundType)) {
      return soundType;
    }
  }

  // デフォルトはkick
  return 'kick';
}

/**
 * AI音色分類（Gemini API使用・クライアント側から直接呼び出し）
 */
async function classifySoundWithAI(energy: FrequencyEnergy): Promise<SoundType> {
  try {
    // ローカルストレージからAPIキーを取得
    const apiKey = typeof window !== 'undefined'
      ? localStorage.getItem('gemini_api_key')
      : null;

    if (!apiKey) {
      console.warn('[audioAnalyzer] Gemini API key not found in localStorage, using fallback classification');
      return classifySound(energy);
    }

    // Gemini APIエンドポイント
    const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildClassificationPrompt(energy) }],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const geminiData = await response.json();
    const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // レスポンスから音色を抽出
    const sound = extractSoundFromResponse(responseText);

    console.log('[audioAnalyzer] AI classification result:', { sound, usedAI: true, responseText });

    return sound;
  } catch (error) {
    console.error('[audioAnalyzer] AI classification error:', error);
    // エラー時はフォールバック分類を使用
    return classifySound(energy);
  }
}

/**
 * 周波数特徴から音色を分類（フォールバック用）
 */
function classifySound(energy: FrequencyEnergy): SoundType {
  const {
    lowEnergy,
    midLowEnergy,
    midEnergy,
    midHighEnergy,
    highEnergy,
    veryHighEnergy,
    noisiness,
    duration,
    crestFactor,
    attackTime,
    decayRatio,
  } = energy;

  // 正規化
  const total = lowEnergy + midLowEnergy + midEnergy + midHighEnergy + highEnergy + veryHighEnergy;
  if (total === 0) {
    return 'kick'; // デフォルト
  }

  const lowRatio = lowEnergy / total;
  const midLowRatio = midLowEnergy / total;
  const midRatio = midEnergy / total;
  const midHighRatio = midHighEnergy / total;
  const highRatio = highEnergy / total;
  const veryHighRatio = veryHighEnergy / total;

  const isShortTransient = attackTime < 0.02;
  const isVeryShort = duration < 0.08;

  // キック: 低域が強く、瞬発的
  if (lowRatio > 0.38 && crestFactor > 4.5 && duration < 0.18) {
    return 'kick';
  }

  // スネア: 中域が強い、ノイズ成分が多い
  if (midRatio > 0.28 && noisiness > 0.35 && duration < 0.22 && crestFactor < 9) {
    return 'snare';
  }

  // タム: 中低域が強い、持続時間が中程度
  if (midLowRatio > 0.32 && duration >= 0.12 && duration < 0.28 && crestFactor < 9) {
    return 'tom';
  }

  // ハイハット（クローズ）: 超高域が強い、持続時間が非常に短い
  if (veryHighRatio > 0.45 && duration < 0.09 && isShortTransient) {
    return 'hihat-closed';
  }

  // ハイハット（オープン）: 超高域が強い、持続時間がやや長い
  if (veryHighRatio > 0.38 && duration >= 0.09 && duration < 0.28 && decayRatio > 0.35) {
    return 'hihat-open';
  }

  // シンバル: 高域が強い、持続時間が長い
  if (highRatio > 0.32 && duration >= 0.25 && decayRatio > 0.5) {
    return 'cymbal';
  }

  // クラップ: 中高域が強い、持続時間が短い、ノイズ成分あり
  if (midHighRatio > 0.3 && duration < 0.15 && noisiness > 0.3) {
    return 'clap';
  }

  // リムショット: 中高域が強い、持続時間が非常に短い
  if (midHighRatio > 0.25 && isVeryShort && crestFactor > 10 && isShortTransient) {
    return 'rim';
  }

  // デフォルト: 最大エネルギー帯域に応じて分類
  const ratioToSound: Array<{ sound: SoundType; value: number }> = [
    { sound: 'kick', value: lowRatio },
    { sound: 'tom', value: midLowRatio },
    { sound: 'snare', value: midRatio },
    { sound: 'rim', value: midHighRatio },
    { sound: 'cymbal', value: highRatio },
    { sound: 'hihat-open', value: veryHighRatio },
  ];

  ratioToSound.sort((a, b) => b.value - a.value);
  return ratioToSound[0].sound;
}

/**
 * AudioBufferを解析してBeatNote配列を生成
 */
export async function analyzeAudioBuffer(
  audioBuffer: AudioBuffer
): Promise<BeatNote[]> {
  console.log('[audioAnalyzer] 解析開始:', {
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
    numberOfChannels: audioBuffer.numberOfChannels,
  });

  // デバッグデータをクリア
  if (typeof window !== 'undefined') {
    window.__soundDebug = [];
  }

  // オンセット検出
  const onsets = detectOnsets(audioBuffer);

  console.log('[audioAnalyzer] オンセット検出結果:', {
    count: onsets.length,
    onsets: onsets.slice(0, 10), // 最初の10個だけログ出力
  });

  if (onsets.length === 0) {
    throw new Error('ビートが検出されませんでした。音源を確認してください。');
  }

  // 各オンセットの音色を分類してBeatNoteを生成（AI使用）
  const notes: BeatNote[] = [];
  const perf = typeof performance !== 'undefined' ? performance : null;
  let totalEnergyMs = 0;
  let totalClassifyMs = 0;
  const classificationCounts: Record<SoundType, number> = {
    kick: 0,
    snare: 0,
    'hihat-closed': 0,
    'hihat-open': 0,
    clap: 0,
    tom: 0,
    cymbal: 0,
    rim: 0,
  };
  const featureSums = {
    lowEnergy: 0,
    midLowEnergy: 0,
    midEnergy: 0,
    midHighEnergy: 0,
    highEnergy: 0,
    veryHighEnergy: 0,
    noisiness: 0,
    duration: 0,
    crestFactor: 0,
    attackTime: 0,
    decayRatio: 0,
  };

  for (let i = 0; i < onsets.length; i++) {
    const time = onsets[i];
    const energyStart = perf ? perf.now() : 0;
    const energy = analyzeFrequencyEnergy(audioBuffer, time);
    const energyElapsed = perf ? perf.now() - energyStart : 0;
    totalEnergyMs += energyElapsed;

    const classifyStart = perf ? perf.now() : 0;
    const sound = await classifySoundWithAI(energy);
    const classifyElapsed = perf ? perf.now() - classifyStart : 0;
    totalClassifyMs += classifyElapsed;
    classificationCounts[sound] += 1;

    featureSums.lowEnergy += energy.lowEnergy;
    featureSums.midLowEnergy += energy.midLowEnergy;
    featureSums.midEnergy += energy.midEnergy;
    featureSums.midHighEnergy += energy.midHighEnergy;
    featureSums.highEnergy += energy.highEnergy;
    featureSums.veryHighEnergy += energy.veryHighEnergy;
    featureSums.noisiness += energy.noisiness;
    featureSums.duration += energy.duration;
    featureSums.crestFactor += energy.crestFactor;
    featureSums.attackTime += energy.attackTime;
    featureSums.decayRatio += energy.decayRatio;

    notes.push({
      id: generateId(),
      time: Number(time.toFixed(4)),
      sound,
      velocity: 0.8, // デフォルトベロシティ
    });

    // デバッグデータを保存
    if (typeof window !== 'undefined' && window.__soundDebug) {
      window.__soundDebug.push({
        beatIndex: i,
        onsetTime: time,
        features: {
          lowEnergy: energy.lowEnergy,
          midLowEnergy: energy.midLowEnergy,
          midEnergy: energy.midEnergy,
          midHighEnergy: energy.midHighEnergy,
          highEnergy: energy.highEnergy,
          veryHighEnergy: energy.veryHighEnergy,
          noisiness: energy.noisiness,
          duration: energy.duration,
          crestFactor: energy.crestFactor,
          attackTime: energy.attackTime,
          decayRatio: energy.decayRatio,
        },
        classification: {
          sound,
          usedAI: true, // classifySoundWithAI関数から返される情報を反映
        },
        processing: {
          energyMs: energyElapsed,
          classifyMs: classifyElapsed,
        },
      });

      console.log(`[audioAnalyzer] デバッグデータ保存 (Beat ${i}):`, {
        time,
        sound,
        features: energy,
      });
    }

    // レート制限対策: 各リクエストの間に4秒待機（Gemini API 15 RPM制限厳守）
    if (i < onsets.length - 1) {
      const RATE_LIMIT_DELAY_MS = 4000;
      console.log(`[audioAnalyzer] レート制限待機: ${RATE_LIMIT_DELAY_MS}ms`);
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
  }

  console.log('[audioAnalyzer] BeatNote生成完了:', {
    count: notes.length,
    notes: notes.slice(0, 5), // 最初の5個だけログ出力
  });

  if (notes.length > 0) {
    const processingSummary = {
      energyAvg: Number((totalEnergyMs / notes.length).toFixed(2)),
      classifyAvg: Number((totalClassifyMs / notes.length).toFixed(2)),
      energyTotal: Number(totalEnergyMs.toFixed(2)),
      classifyTotal: Number(totalClassifyMs.toFixed(2)),
    };

    const featureAverages = Object.fromEntries(
      Object.entries(featureSums).map(([key, value]) => [
        key,
        Number((value / notes.length).toFixed(3)),
      ])
    ) as SoundDebugSummary['featureAverages'];

    const summary: SoundDebugSummary = {
      totalBeats: notes.length,
      classificationCounts,
      featureAverages,
      processing: processingSummary,
    };

    console.log('[audioAnalyzer] 処理時間サマリー(ms)', processingSummary);
    console.log('[audioAnalyzer] 分類カウント', classificationCounts);

    if (typeof window !== 'undefined') {
      window.__soundSummary = summary;
    }
  }

  // デバッグデータをコンソールに出力
  if (typeof window !== 'undefined' && window.__soundDebug) {
    console.log('[audioAnalyzer] デバッグデータ全体:', window.__soundDebug);
    console.log('[audioAnalyzer] ブラウザコンソールで window.__soundDebug を確認できます');
  }

  return notes;
}
