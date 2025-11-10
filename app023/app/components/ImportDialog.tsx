'use client';

import { useRef, useState } from 'react';

import { importCSV, importJSON, importWAVFile, importWAVFromURL, importWAVAndAnalyze, importWAVFromURLAndAnalyze } from '@/lib/importUtils';
import { audioEngine } from '@/lib/audioEngine';
import { useBeatStore } from '@/store/useBeatStore';
import { BeatNote, createEmptyRecording, SoundType, SOUND_TYPES } from '@/types';

type SoundSummary = {
  totalBeats: number;
  classificationCounts: Partial<Record<SoundType, number>>;
  processing?: {
    energyAvg: number;
    classifyAvg: number;
    energyTotal: number;
    classifyTotal: number;
  };
};

declare global {
  interface Window {
    __soundSummary?: {
      totalBeats: number;
      classificationCounts: Record<string, number>;
      processing?: {
        energyAvg: number;
        classifyAvg: number;
        energyTotal: number;
        classifyTotal: number;
      };
    };
  }
}

const getSoundSummary = (): SoundSummary | null => {
  if (typeof window === 'undefined' || !window.__soundSummary) {
    return null;
  }

  const { totalBeats, classificationCounts, processing } = window.__soundSummary;
  return {
    totalBeats,
    classificationCounts,
    processing,
  };
};

const ImportDialog = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSound, setSelectedSound] = useState<SoundType>('kick');
  const [urlInput, setUrlInput] = useState('');
  const [beatDetectionMode, setBeatDetectionMode] = useState(true); // ビート検出モード（デフォルトON）
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<SoundSummary | null>(null);

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const wavInputRef = useRef<HTMLInputElement>(null);

  const loadRecording = useBeatStore((state) => state.loadRecording);
  const setCustomSound = useBeatStore((state) => state.setCustomSound);

  const handleImportNotes = async (notes: BeatNote[]) => {
    console.log('[ImportDialog] handleImportNotes呼び出し:', { notesCount: notes.length });

    if (!notes.length) {
      setError('インポートするノートがありません');
      return;
    }

    // 最後のノートの時間からdurationを計算
    const duration = notes[notes.length - 1].time + 0.5;

    // 新しいRecordingを作成
    const newRecording = {
      ...createEmptyRecording(),
      notes,
      duration,
      name: 'Imported Sketch',
    };

    console.log('[ImportDialog] Recording作成:', newRecording);

    // storeに読み込み
    loadRecording(newRecording);

    console.log('[ImportDialog] loadRecording完了');

    setSuccess(`${notes.length} ノートをインポートしました`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'json' | 'csv'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      let notes: BeatNote[];

      if (type === 'json') {
        notes = await importJSON(file);
      } else {
        notes = await importCSV(file);
      }

      await handleImportNotes(notes);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('インポート中にエラーが発生しました');
      }
    } finally {
      setIsLoading(false);
      // input をリセット（同じファイルを再度選択可能にする）
      event.target.value = '';
    }
  };

  const handleWAVFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setIsLoading(true);
    setStatusMessage('WAV解析を開始しました…');
    setAnalysisSummary(null);

    try {
      if (beatDetectionMode) {
        // ビート検出モード：自動的にビートを検出してタイムラインに配置
        const notes = await importWAVAndAnalyze(file);
        await handleImportNotes(notes);
        const summary = getSoundSummary();
        if (summary) {
          setAnalysisSummary(summary);
          setStatusMessage(`解析完了: ${summary.totalBeats}ビート`);
        } else {
          setStatusMessage('解析が完了しました');
        }
      } else {
        // 音源設定モード：カスタム音源として設定
        const audioBuffer = await importWAVFile(file);

        // zustand storeに保存
        setCustomSound(selectedSound, audioBuffer);

        // audioEngineに反映
        audioEngine.setCustomSound(selectedSound, audioBuffer);

        setSuccess(`${selectedSound} にカスタム音源を設定しました`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('WAVファイルのインポート中にエラーが発生しました');
      }
      setStatusMessage('解析に失敗しました');
      setAnalysisSummary(null);
    } finally {
      setIsLoading(false);
      if (!beatDetectionMode) {
        setStatusMessage(null);
      }
      event.target.value = '';
    }
  };

  const handleButtonClick = (type: 'json' | 'csv' | 'wav') => {
    setError(null);
    setSuccess(null);

    if (type === 'json') {
      jsonInputRef.current?.click();
    } else if (type === 'csv') {
      csvInputRef.current?.click();
    } else {
      wavInputRef.current?.click();
    }
  };

  const handleURLImport = async () => {
    if (!urlInput.trim()) {
      setError('URLを入力してください');
      return;
    }

    console.log('[ImportDialog] URLインポート開始:', { url: urlInput, beatDetectionMode });

    setError(null);
    setSuccess(null);
    setIsLoading(true);
    setStatusMessage('URLからWAV解析を開始しました…');
    setAnalysisSummary(null);

    try {
      if (beatDetectionMode) {
        console.log('[ImportDialog] ビート検出モードで解析開始');
        // ビート検出モード：自動的にビートを検出してタイムラインに配置
        const notes = await importWAVFromURLAndAnalyze(urlInput);
        console.log('[ImportDialog] 解析完了、ノート数:', notes.length);
        await handleImportNotes(notes);
        const summary = getSoundSummary();
        if (summary) {
          setAnalysisSummary(summary);
          setStatusMessage(`解析完了: ${summary.totalBeats}ビート`);
        } else {
          setStatusMessage('解析が完了しました');
        }
      } else {
        console.log('[ImportDialog] 音源設定モード');
        // 音源設定モード：カスタム音源として設定
        const audioBuffer = await importWAVFromURL(urlInput);

        // zustand storeに保存
        setCustomSound(selectedSound, audioBuffer);

        // audioEngineに反映
        audioEngine.setCustomSound(selectedSound, audioBuffer);

        setSuccess(`${selectedSound} にカスタム音源を設定しました（Web）`);
        setTimeout(() => setSuccess(null), 3000);
      }

      // URL入力をクリア
      setUrlInput('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Web音源のインポート中にエラーが発生しました');
      }
      setStatusMessage('解析に失敗しました');
      setAnalysisSummary(null);
    } finally {
      setIsLoading(false);
      if (!beatDetectionMode) {
        setStatusMessage(null);
      }
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-6 text-sm text-zinc-100">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">インポート</p>
        <p className="text-lg font-semibold">録音データ・音源を読み込めます。</p>
        <p className="text-xs text-zinc-400">
          JSON/CSVファイルから録音データを復元、WAVファイルでカスタム音源を追加できます。
        </p>
      </header>

      {/* ファイル選択 input（非表示） */}
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        onChange={(e) => handleFileChange(e, 'json')}
        data-testid="json-file-input"
        className="hidden"
      />
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => handleFileChange(e, 'csv')}
        data-testid="csv-file-input"
        className="hidden"
      />
      <input
        ref={wavInputRef}
        type="file"
        accept=".wav,audio/wav,audio/x-wav"
        onChange={handleWAVFileChange}
        data-testid="wav-file-input"
        className="hidden"
      />

      {/* 録音データインポート */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          録音データ
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleButtonClick('json')}
            disabled={isLoading}
            className="rounded-md bg-blue-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:bg-blue-500/30"
          >
            JSONから読み込み
          </button>
          <button
            type="button"
            onClick={() => handleButtonClick('csv')}
            disabled={isLoading}
            className="rounded-md border border-zinc-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] disabled:opacity-50"
          >
            CSVから読み込み
          </button>
        </div>
      </div>

      {/* WAVインポート設定 */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          WAVファイルインポート
        </p>
        <div className="mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="beat-detection-mode"
            checked={beatDetectionMode}
            onChange={(e) => setBeatDetectionMode(e.target.checked)}
            className="h-4 w-4 accent-emerald-500"
          />
          <label htmlFor="beat-detection-mode" className="text-xs text-zinc-300">
            ビート検出モード（WAVファイルを解析してタイムラインに自動配置）
          </label>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {!beatDetectionMode && (
              <select
                value={selectedSound}
                onChange={(e) => setSelectedSound(e.target.value as SoundType)}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs uppercase tracking-wider"
              >
                {SOUND_TYPES.map((sound) => (
                  <option key={sound} value={sound}>
                    {sound}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => handleButtonClick('wav')}
              disabled={isLoading}
              className="rounded-md bg-purple-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:bg-purple-500/30"
            >
              {beatDetectionMode ? 'WAVを解析してインポート' : 'WAVをアップロード'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/sound.wav"
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs placeholder:text-zinc-600"
            />
            <button
              type="button"
              onClick={handleURLImport}
              disabled={isLoading}
              className="rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:bg-emerald-500/30"
            >
              {beatDetectionMode ? 'Webから解析してインポート' : 'Webから取り込み'}
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            {beatDetectionMode
              ? 'WAVファイルを自動解析してビートを検出し、タイムラインに配置します（5MB以下）'
              : '選択した音色をWAVファイルで上書きできます（5MB以下）'}
          </p>
        </div>
      </div>

      {/* ローディング表示 */}
      {isLoading && (
        <p className="text-xs text-zinc-400">読み込み中...</p>
      )}

      {/* ステータスメッセージ */}
      {statusMessage && !isLoading && (
        <p className="text-xs text-zinc-400">{statusMessage}</p>
      )}

      {/* エラーメッセージ */}
      {error && (
        <p className="rounded-md bg-red-500/20 px-3 py-2 text-xs text-red-400">
          エラー: {error}
        </p>
      )}

      {/* 成功メッセージ */}
      {success && (
        <p className="rounded-md bg-green-500/20 px-3 py-2 text-xs text-green-400">
          {success}
        </p>
      )}

      {/* 解析サマリー */}
      {analysisSummary && (
        <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/60 p-4 text-xs text-zinc-200">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-zinc-500">
            <span>解析サマリー</span>
            <span>{analysisSummary.totalBeats} beats</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {SOUND_TYPES.map((sound) => (
              <div key={sound} className="flex items-center justify-between rounded-md bg-zinc-900/60 px-2 py-1">
                <span className="text-[11px] uppercase tracking-wide text-zinc-500">{sound}</span>
                <span className="text-sm font-semibold">{analysisSummary.classificationCounts?.[sound] ?? 0}</span>
              </div>
            ))}
          </div>
          {analysisSummary.processing && (
            <div className="mt-3 grid grid-cols-2 gap-1 text-[11px] text-zinc-500">
              <p>energy avg: {analysisSummary.processing.energyAvg.toFixed(2)}ms</p>
              <p>classify avg: {analysisSummary.processing.classifyAvg.toFixed(2)}ms</p>
              <p>energy total: {analysisSummary.processing.energyTotal.toFixed(2)}ms</p>
              <p>classify total: {analysisSummary.processing.classifyTotal.toFixed(2)}ms</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default ImportDialog;
