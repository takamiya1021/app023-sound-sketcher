'use client';

import { useEffect, useState } from 'react';

import { useBeatStore } from '@/store/useBeatStore';

const MIN_BPM = 60;
const MAX_BPM = 240;

const validateBpm = (value: number) => {
  if (!Number.isFinite(value)) {
    return '数字で入力してください';
  }
  if (value < MIN_BPM || value > MAX_BPM) {
    return `BPMは${MIN_BPM}〜${MAX_BPM}の範囲で入力してください`;
  }
  return '';
};

const BpmControl = () => {
  const bpm = useBeatStore((state) => state.recording.bpm);
  const setBpm = useBeatStore((state) => state.setBpm);
  const [value, setValue] = useState(() => bpm.toString());
  const [error, setError] = useState('');

  useEffect(() => {
    setValue(bpm.toString());
  }, [bpm]);

  const applyBpm = () => {
    const next = Number(value);
    const validation = validateBpm(next);
    if (validation) {
      setError(validation);
      return;
    }
    setError('');
    setBpm(next);
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 text-sm text-zinc-100 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">テンポ</p>
        <p className="text-xl font-semibold text-emerald-300" data-testid="bpm-current">
          {bpm}
        </p>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <input
          aria-label="Set BPM"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          type="number"
          min={MIN_BPM}
          max={MAX_BPM}
          className="w-full rounded-md border border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-100 focus:border-emerald-400 focus:outline-none md:w-32"
        />
        <button
          type="button"
          onClick={applyBpm}
          className="rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
        >
          反映
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-400" data-testid="bpm-error">
          {error}
        </p>
      )}
    </section>
  );
};

export default BpmControl;
