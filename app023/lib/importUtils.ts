/**
 * インポートユーティリティ
 * JSON/CSVファイルからBeatNote配列をインポート
 * WAVファイルから自動ビート検出
 */

import { BeatNote, isSoundType, DEFAULT_VELOCITY } from '@/types';
import { analyzeAudioBuffer } from './audioAnalyzer';

/**
 * ファイルをテキストとして読み込む
 */
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('ファイルの読み込みに失敗しました'));
      }
    };

    reader.onerror = () => {
      reject(new Error('ファイルの読み込み中にエラーが発生しました'));
    };

    reader.readAsText(file);
  });
};

/**
 * UUID生成
 */
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

/**
 * インポートされたデータの型
 */
interface ImportedData {
  time?: string | number | null;
  sound?: string | null;
  velocity?: string | number | null;
}

/**
 * BeatNoteデータのバリデーション
 */
const validateBeatNoteData = (
  data: ImportedData,
  index: number
): {
  time: number;
  sound: string;
  velocity: number;
} => {
  // 必須フィールドチェック
  if (data.time === undefined || data.time === null || data.time === '') {
    throw new Error(`必須フィールドが欠損しています: 行${index + 1}のtimeが欠損`);
  }
  if (!data.sound) {
    throw new Error(`必須フィールドが欠損しています: 行${index + 1}のsoundが欠損`);
  }

  // time バリデーション
  const time = Number(data.time);
  if (isNaN(time)) {
    throw new Error(
      `timeは0以上の数値である必要があります: 行${index + 1}のtimeが数値でない`
    );
  }
  if (time < 0) {
    throw new Error(
      `timeは0以上の数値である必要があります: 行${index + 1}のtimeが負の値`
    );
  }

  // sound バリデーション
  const sound = String(data.sound);
  if (!isSoundType(sound)) {
    throw new Error(`soundが不正な値です: 行${index + 1}のsound="${sound}"`);
  }

  // velocity バリデーション（省略時はデフォルト値）
  let velocity = DEFAULT_VELOCITY;
  if (data.velocity !== undefined && data.velocity !== null && data.velocity !== '') {
    velocity = Number(data.velocity);
    if (isNaN(velocity)) {
      throw new Error(
        `velocityは0.0〜1.0の範囲である必要があります: 行${index + 1}のvelocityが数値でない`
      );
    }
    if (velocity < 0.0 || velocity > 1.0) {
      throw new Error(
        `velocityは0.0〜1.0の範囲である必要があります: 行${index + 1}のvelocity=${velocity}`
      );
    }
  }

  return { time, sound, velocity };
};

/**
 * JSONファイルからBeatNote配列をインポート
 * @param file - インポートするJSONファイル
 * @returns BeatNote配列
 */
export const importJSON = async (file: File): Promise<BeatNote[]> => {
  try {
    const text = await readFileAsText(file);

    // JSONパース
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('JSON形式が不正です');
    }

    // 配列チェック
    if (!Array.isArray(data)) {
      throw new Error('JSONは配列形式である必要があります');
    }

    // 各要素をバリデーション＆変換
    const notes: BeatNote[] = data.map((item: ImportedData, index) => {
      const { time, sound, velocity } = validateBeatNoteData(item, index);

      return {
        id: generateId(),
        time,
        sound: sound as BeatNote['sound'], // isSoundTypeで検証済み
        velocity,
      };
    });

    return notes;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('JSONインポート中に不明なエラーが発生しました');
  }
};

/**
 * ファイルをArrayBufferとして読み込む
 */
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;
      if (result instanceof ArrayBuffer) {
        resolve(result);
      } else {
        reject(new Error('ファイルの読み込みに失敗しました'));
      }
    };

    reader.onerror = () => {
      reject(new Error('ファイルの読み込み中にエラーが発生しました'));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * WAVファイルからAudioBufferをインポート
 * @param file - インポートするWAVファイル
 * @returns AudioBuffer
 */
export const importWAVFile = async (file: File): Promise<AudioBuffer> => {
  // MIMEタイプチェック
  const validMimeTypes = ['audio/wav', 'audio/x-wav', 'audio/wave'];
  if (!validMimeTypes.includes(file.type)) {
    throw new Error('WAVファイルのみ対応しています');
  }

  // ファイルサイズチェック（5MB = 5 * 1024 * 1024）
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('ファイルサイズは5MB以下である必要があります');
  }

  try {
    // ArrayBufferとして読み込み
    const arrayBuffer = await readFileAsArrayBuffer(file);

    // AudioContextでデコード
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    return audioBuffer;
  } catch (error) {
    if (error instanceof Error) {
      // ファイル読み込みエラーはそのまま再スロー
      if (error.message.includes('ファイルの読み込み')) {
        throw error;
      }
      // デコードエラー
      throw new Error('WAVファイルのデコードに失敗しました');
    }
    throw new Error('WAVファイルインポート中に不明なエラーが発生しました');
  }
};

/**
 * WebからURLを指定してWAV音源をインポート
 * @param url - WAVファイルのURL
 * @returns AudioBuffer
 */
export const importWAVFromURL = async (url: string): Promise<AudioBuffer> => {
  // URL検証
  if (!url || typeof url !== 'string') {
    throw new Error('URLが指定されていません');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('URLの形式が不正です');
  }

  // HTTPSまたはHTTPのみ許可
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('HTTP/HTTPSのURLのみ対応しています');
  }

  try {
    // fetchでダウンロード
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`ファイルの取得に失敗しました: ${response.status} ${response.statusText}`);
    }

    // Content-Typeチェック（厳密ではない）
    const contentType = response.headers.get('Content-Type');
    if (contentType && !contentType.includes('audio')) {
      console.warn(`警告: Content-Typeが音声ファイルではありません (${contentType})`);
    }

    // ArrayBufferとして取得
    const arrayBuffer = await response.arrayBuffer();

    // ファイルサイズチェック（5MB = 5 * 1024 * 1024）
    const maxSize = 5 * 1024 * 1024;
    if (arrayBuffer.byteLength > maxSize) {
      throw new Error('ファイルサイズは5MB以下である必要があります');
    }

    // AudioContextでデコード
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    return audioBuffer;
  } catch (error) {
    if (error instanceof Error) {
      // 既知のエラーはそのまま再スロー
      if (error.message.includes('ファイルの取得') ||
          error.message.includes('ファイルサイズ') ||
          error.message.includes('URLの形式') ||
          error.message.includes('URLが指定') ||
          error.message.includes('HTTP/HTTPS')) {
        throw error;
      }
      // ネットワークエラー
      if (error.name === 'TypeError') {
        throw new Error('ネットワークエラー: URLにアクセスできません');
      }
      // デコードエラー
      throw new Error('WAVファイルのデコードに失敗しました');
    }
    throw new Error('Web音源インポート中に不明なエラーが発生しました');
  }
};

/**
 * CSVファイルからBeatNote配列をインポート
 * @param file - インポートするCSVファイル
 * @returns BeatNote配列
 */
export const importCSV = async (file: File): Promise<BeatNote[]> => {
  try {
    const text = await readFileAsText(file);

    // 行分割
    const lines = text.split('\n').map((line) => line.trim()).filter((line) => line);

    if (lines.length === 0) {
      throw new Error('CSVファイルが空です');
    }

    // ヘッダー行解析
    const headerLine = lines[0];
    const headers = headerLine.split(',').map((h) => h.trim());

    // 必須カラムチェック
    const timeIndex = headers.indexOf('time');
    const soundIndex = headers.indexOf('sound');
    const velocityIndex = headers.indexOf('velocity');

    if (timeIndex === -1) {
      throw new Error('必須カラムが欠損しています: timeカラムが存在しません');
    }
    if (soundIndex === -1) {
      throw new Error('必須カラムが欠損しています: soundカラムが存在しません');
    }

    // データ行をパース
    const notes: BeatNote[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',').map((v) => v.trim());

      const data = {
        time: values[timeIndex],
        sound: values[soundIndex],
        velocity: velocityIndex !== -1 ? values[velocityIndex] : undefined,
      };

      const { time, sound, velocity } = validateBeatNoteData(data, i - 1);

      notes.push({
        id: generateId(),
        time,
        sound: sound as BeatNote['sound'], // isSoundTypeで検証済み
        velocity,
      });
    }

    return notes;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('CSVインポート中に不明なエラーが発生しました');
  }
};

/**
 * WAVファイルを解析してBeatNote配列を自動生成
 * @param file - インポートするWAVファイル
 * @returns BeatNote配列
 */
export const importWAVAndAnalyze = async (file: File): Promise<BeatNote[]> => {
  try {
    // WAVファイルをAudioBufferとして読み込み
    const audioBuffer = await importWAVFile(file);

    // オーディオ解析してビートを検出
    const notes = await analyzeAudioBuffer(audioBuffer);

    return notes;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('WAVファイル解析中に不明なエラーが発生しました');
  }
};

/**
 * WebからURLを指定してWAV音源を解析してBeatNote配列を自動生成
 * @param url - WAVファイルのURL
 * @returns BeatNote配列
 */
export const importWAVFromURLAndAnalyze = async (url: string): Promise<BeatNote[]> => {
  try {
    // Web URLからWAVファイルをAudioBufferとして読み込み
    const audioBuffer = await importWAVFromURL(url);

    // オーディオ解析してビートを検出
    const notes = await analyzeAudioBuffer(audioBuffer);

    return notes;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Web WAVファイル解析中に不明なエラーが発生しました');
  }
};
