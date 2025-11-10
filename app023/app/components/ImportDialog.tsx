'use client';

import { useRef, useState } from 'react';

import { importCSV, importJSON } from '@/lib/importUtils';
import { useBeatStore } from '@/store/useBeatStore';
import { BeatNote, createEmptyRecording } from '@/types';

const ImportDialog = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const loadRecording = useBeatStore((state) => state.loadRecording);

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

  const handleButtonClick = (type: 'json' | 'csv') => {
    setError(null);
    setSuccess(null);

    if (type === 'json') {
      jsonInputRef.current?.click();
    } else {
      csvInputRef.current?.click();
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-6 text-sm text-zinc-100">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">インポート</p>
        <p className="text-lg font-semibold">録音データを読み込めます。</p>
        <p className="text-xs text-zinc-400">
          JSON/CSV形式のファイルから録音データを復元できます。
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

      {/* ボタン */}
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
