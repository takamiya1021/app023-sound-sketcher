'use client';

import { useState } from 'react';

import { geminiService, GeminiAnalysisResult } from '@/lib/geminiService';
import { useBeatStore } from '@/store/useBeatStore';
import { BeatNote } from '@/types';

const toStatus = (message: string) => message;

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const cloneNote = (note: BeatNote, offset: number): BeatNote => ({
  id: createId(),
  sound: note.sound,
  velocity: note.velocity,
  time: note.time + offset,
});

const AIBeatSuggestion = () => {
  const recording = useBeatStore((state) => state.recording);
  const addNote = useBeatStore((state) => state.addNote);
  const [apiKey, setApiKey] = useState(() => geminiService.getApiKey() ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'analyzing' | 'error'>(
    'idle'
  );
  const [message, setMessage] = useState<string>('');
  const [analysis, setAnalysis] = useState<GeminiAnalysisResult | null>(null);

  const handleSaveKey = () => {
    try {
      setStatus('saving');
      geminiService.setApiKey(apiKey.trim());
      setMessage('APIキーを保存しました');
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message);
    }
  };

  const handleAnalyze = async () => {
    setStatus('analyzing');
    setMessage('');
    try {
      const result = await geminiService.analyzeBeat(recording.notes, {
        bpm: recording.bpm,
      });
      setAnalysis(result);
      setMessage('Geminiが分析結果を返しました');
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      const raw = (error as Error).message;
      setMessage(
        raw.includes('API key is required')
          ? 'AI機能を使う前にAPIキーを設定してください'
          : raw
      );
    }
  };

  const handleApplyPattern = () => {
    if (!analysis?.nextPattern?.length) {
      return;
    }
    const offset = recording.duration;
    analysis.nextPattern.forEach((note) => {
      addNote(cloneNote(note, offset));
    });
    setMessage('提案パターンを録音末尾に追加しました');
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-6 text-sm text-zinc-100">
      <header>
        <h2
          className="text-base font-semibold uppercase tracking-[0.2em] text-emerald-300"
          aria-label="AI Suggestions"
        >
          AI提案
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Gemini APIキーを登録すると、録音したビートのジャンル判定や次に叩くパターンを提案してくれます。
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-[0.25em] text-zinc-500">
          Gemini APIキー
        </label>
        <div className="flex gap-2">
          <input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            type="password"
            placeholder="sk-..."
            className="w-full rounded-md border border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-100 focus:border-emerald-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSaveKey}
            aria-label="Save API key"
            className="rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
          >
            保存
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={status === 'analyzing'}
          onClick={handleAnalyze}
          aria-label="Analyze Beat"
          className="flex-1 rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:bg-emerald-500/40"
        >
          {status === 'analyzing' ? '解析中…' : 'ビート分析'}
        </button>
        <button
          type="button"
          disabled={!analysis?.nextPattern?.length}
          onClick={handleApplyPattern}
          aria-label="Apply Pattern"
          className="rounded-md border border-emerald-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300 disabled:border-zinc-800 disabled:text-zinc-600"
        >
          提案を適用
        </button>
      </div>

      {message && (
        <p className="text-xs text-emerald-300" data-testid="ai-message">
          {toStatus(message)}
        </p>
      )}

      {analysis && (
        <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-4" data-testid="ai-analysis">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
            {analysis.genre}
          </p>
          <p className="mt-1 text-sm text-zinc-100">{analysis.summary}</p>
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-zinc-400">
            {analysis.suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default AIBeatSuggestion;
