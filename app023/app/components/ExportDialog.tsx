'use client';

import { useMemo } from 'react';

import { exportCSV, exportJSON, downloadTextFile } from '@/lib/exportUtils';
import { useBeatStore } from '@/store/useBeatStore';

const ExportDialog = () => {
  const notes = useBeatStore((state) => state.recording.notes);

  const exportSummary = useMemo(() => {
    if (!notes.length) {
      return 'まだ録音データがありません。';
    }
    const lastTime = notes[notes.length - 1].time;
    return `${notes.length} ノート · ${lastTime.toFixed(2)} 秒`;
  }, [notes]);

  const handleExport = (type: 'json' | 'csv') => {
    if (!notes.length) {
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    if (type === 'json') {
      const content = exportJSON(notes);
      downloadTextFile(`sound-sketch-${timestamp}.json`, content, 'application/json');
    } else {
      const content = exportCSV(notes);
      downloadTextFile(`sound-sketch-${timestamp}.csv`, content, 'text/csv');
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-6 text-sm text-zinc-100">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">エクスポート</p>
        <p className="text-lg font-semibold">他ツールで使える形式に書き出せます。</p>
        <p className="text-xs text-zinc-400">{exportSummary}</p>
      </header>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleExport('json')}
          disabled={!notes.length}
          className="rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:bg-emerald-500/30"
        >
          JSONで保存
        </button>
        <button
          type="button"
          onClick={() => handleExport('csv')}
          disabled={!notes.length}
          className="rounded-md border border-zinc-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] disabled:opacity-50"
        >
          CSVで保存
        </button>
      </div>
    </section>
  );
};

export default ExportDialog;
