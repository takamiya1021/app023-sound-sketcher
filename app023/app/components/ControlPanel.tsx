'use client';

import { useState } from 'react';

import { audioEngine } from '@/lib/audioEngine';
import { useBeatStore } from '@/store/useBeatStore';

const formatDuration = (seconds: number) => seconds.toFixed(2).replace(/\.00$/, '');

const ControlPanel = () => {
  const recording = useBeatStore((state) => state.recording);
  const isRecording = useBeatStore((state) => state.isRecording);
  const isPlaying = useBeatStore((state) => state.isPlaying);
  const startRecording = useBeatStore((state) => state.startRecording);
  const stopRecording = useBeatStore((state) => state.stopRecording);
  const startPlayback = useBeatStore((state) => state.startPlayback);
  const stopPlayback = useBeatStore((state) => state.stopPlayback);
  const clearRecording = useBeatStore((state) => state.clearRecording);
  const setPlayhead = useBeatStore((state) => state.setPlayhead);

  const [message, setMessage] = useState<string>('準備完了です。録音を始めましょう。');

  const ensureAudioReady = async () => {
    try {
      await audioEngine.init();
    } catch (error) {
      const description = (error as Error).message ?? 'Failed to initialise audio context';
      setMessage(description);
      throw error;
    }
  };

  const handleRecord = async () => {
    if (isRecording) {
      const finalDuration = stopRecording();
      setPlayhead(finalDuration);
      setMessage('録音を停止しました。');
      return;
    }
    await ensureAudioReady();
    setPlayhead(0);
    startRecording();
    setMessage('録音中：キーボードを叩くとタイムラインに記録されます。');
  };

  const handlePlay = async () => {
    if (!recording.notes.length || isRecording) {
      setMessage('再生するには、まず録音を行ってください。');
      return;
    }
    await ensureAudioReady();
    setPlayhead(0);
    startPlayback();
    setMessage('録音したビートを再生中…');

    const playbackDuration = (recording.duration + 0.5) * 1000;

    try {
      // 音声再生を開始（Promiseを待たずに実行）
      audioEngine.playRecording(recording.notes, recording.bpm).catch((error) => {
        console.error('Audio playback error:', error);
      });

      // setTimeout で指定時間後に自動停止
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, playbackDuration);
      });
    } catch (error) {
      setMessage((error as Error).message ?? '再生に失敗しました');
    } finally {
      audioEngine.stopPlayback();
      stopPlayback();
      setPlayhead(0);
    }
  };

  const handleStop = () => {
    if (isRecording) {
      stopRecording();
    }
    audioEngine.stopPlayback();
    stopPlayback();
    setPlayhead(0);
    setMessage('停止しました。');
  };

  const handleClear = () => {
    handleStop();
    clearRecording();
    setPlayhead(0);
    setMessage('録音データをクリアしました。');
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-6 text-sm text-zinc-100">
      <header className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">セッション</span>
        <p className="text-lg font-semibold">
          {isRecording ? '録音中' : isPlaying ? '再生中' : '待機中'}
        </p>
        <p className="text-xs text-zinc-400" data-testid="control-message">
          {message}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={handleRecord}
          aria-label="Record"
          className={`rounded-md px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] transition-colors ${
            isRecording
              ? 'bg-red-500 text-white'
              : 'bg-emerald-500 text-black hover:bg-emerald-400'
          }`}
        >
          {isRecording ? '録音停止' : '録音開始'}
        </button>
        <button
          type="button"
          onClick={handlePlay}
          disabled={!recording.notes.length || isRecording}
          aria-label="Play"
          className="rounded-md bg-sky-500 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:bg-sky-500/30"
        >
          再生
        </button>
        <button
          type="button"
          onClick={handleStop}
          aria-label="Stop"
          className="rounded-md border border-zinc-700 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em]"
        >
          再生停止
        </button>
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear Recording"
          className="rounded-md border border-zinc-700 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em]"
        >
          録音データ削除
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-xs text-zinc-400 sm:grid-cols-4">
        <div>
          <dt className="uppercase tracking-[0.2em]">テンポ</dt>
          <dd className="text-base text-zinc-100">{recording.bpm}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.2em]">ノート数</dt>
          <dd className="text-base text-zinc-100">{recording.notes.length}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.2em]">長さ</dt>
          <dd className="text-base text-zinc-100">
            {recording.duration ? `${formatDuration(recording.duration)}s` : '—'}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.2em]">状態</dt>
          <dd className="text-base text-zinc-100">
            {isRecording ? 'REC' : isPlaying ? 'PLAY' : 'IDLE'}
          </dd>
        </div>
      </dl>
    </section>
  );
};

export default ControlPanel;
