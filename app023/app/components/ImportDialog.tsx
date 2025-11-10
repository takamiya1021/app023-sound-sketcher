'use client';

import { useRef, useState } from 'react';

import { importCSV, importJSON, importWAVFile, importWAVFromURL } from '@/lib/importUtils';
import { audioEngine } from '@/lib/audioEngine';
import { useBeatStore } from '@/store/useBeatStore';
import { BeatNote, createEmptyRecording, SoundType, SOUND_TYPES } from '@/types';

const ImportDialog = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSound, setSelectedSound] = useState<SoundType>('kick');
  const [urlInput, setUrlInput] = useState('');

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const wavInputRef = useRef<HTMLInputElement>(null);

  const loadRecording = useBeatStore((state) => state.loadRecording);
  const setCustomSound = useBeatStore((state) => state.setCustomSound);

  const handleImportNotes = async (notes: BeatNote[]) => {
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

    // storeに読み込み
    loadRecording(newRecording);

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

    try {
      const audioBuffer = await importWAVFile(file);

      // zustand storeに保存
      setCustomSound(selectedSound, audioBuffer);

      // audioEngineに反映
      audioEngine.setCustomSound(selectedSound, audioBuffer);

      setSuccess(`${selectedSound} にカスタム音源を設定しました`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('WAVファイルのインポート中にエラーが発生しました');
      }
    } finally {
      setIsLoading(false);
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

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const audioBuffer = await importWAVFromURL(urlInput);

      // zustand storeに保存
      setCustomSound(selectedSound, audioBuffer);

      // audioEngineに反映
      audioEngine.setCustomSound(selectedSound, audioBuffer);

      setSuccess(`${selectedSound} にカスタム音源を設定しました（Web）`);
      setTimeout(() => setSuccess(null), 3000);

      // URL入力をクリア
      setUrlInput('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Web音源のインポート中にエラーが発生しました');
      }
    } finally {
      setIsLoading(false);
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

      {/* カスタム音源インポート */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          カスタム音源
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
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
            <button
              type="button"
              onClick={() => handleButtonClick('wav')}
              disabled={isLoading}
              className="rounded-md bg-purple-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:bg-purple-500/30"
            >
              WAVをアップロード
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
              Webから取り込み
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            選択した音色をWAVファイルで上書きできます（5MB以下）
          </p>
        </div>
      </div>

      {/* ローディング表示 */}
      {isLoading && (
        <p className="text-xs text-zinc-400">読み込み中...</p>
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
    </section>
  );
};

export default ImportDialog;
