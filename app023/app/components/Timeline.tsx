'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';

import { useBeatStore } from '@/store/useBeatStore';
import { SOUND_TYPES, SoundType } from '@/types';

const SOUND_LABELS: Record<SoundType, string> = {
  kick: 'キック',
  snare: 'スネア',
  'hihat-closed': 'ハイハット（クローズ）',
  'hihat-open': 'ハイハット（オープン）',
  clap: 'クラップ',
  tom: 'タム',
  cymbal: 'シンバル',
  rim: 'リムショット',
};

const MIN_DURATION = 4;
const MIN_TIMELINE_WIDTH = 1280;
const PIXELS_PER_SECOND = 160;
const HIGHLIGHT_WINDOW = 0.12;
const RECORDING_HEADROOM_SECONDS = 12;

const formatTimeAxisTicks = (duration: number, divisions = 4) => {
  const increment = duration / divisions;
  return Array.from({ length: divisions + 1 }, (_, index) => Number((increment * index).toFixed(2)));
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const TimelineComponent = () => {
  const recording = useBeatStore((state) => state.recording);
  const playhead = useBeatStore((state) => state.playhead);
  const isRecording = useBeatStore((state) => state.isRecording);
  const baseDuration = Math.max(recording.duration, MIN_DURATION);
  const duration = isRecording
    ? Math.max(baseDuration, playhead + RECORDING_HEADROOM_SECONDS)
    : baseDuration;
  const [zoom, setZoom] = useState(1);
  const playheadRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackAreaRef = useRef<HTMLDivElement | null>(null);

  const timelineWidth = useMemo(
    () => Math.max(MIN_TIMELINE_WIDTH, duration * PIXELS_PER_SECOND * zoom),
    [duration, zoom]
  );
  const pxPerSecond = timelineWidth / duration;
  const playheadPixels = clamp(playhead * pxPerSecond, 0, timelineWidth);

  const groupedNotes = useMemo(() => {
    const grouped = SOUND_TYPES.reduce<Record<SoundType, typeof recording.notes>>((acc, sound) => {
      acc[sound] = [];
      return acc;
    }, {} as Record<SoundType, typeof recording.notes>);
    recording.notes.forEach((note) => {
      grouped[note.sound] = [...grouped[note.sound], note];
    });
    return grouped;
  }, [recording.notes]);

  const { highlightedSound, activeNoteIds } = useMemo(() => {
    const threshold = Math.min(HIGHLIGHT_WINDOW, duration / 24);
    let nearestSound: SoundType | null = null;
    let minDelta = Number.POSITIVE_INFINITY;
    const active = new Set<string>();
    recording.notes.forEach((note) => {
      const delta = Math.abs(note.time - playhead);
      if (delta <= threshold) {
        active.add(note.id);
        if (delta < minDelta) {
          minDelta = delta;
          nearestSound = note.sound;
        }
      }
    });
    return { highlightedSound: nearestSound, activeNoteIds: active };
  }, [playhead, recording.notes, duration]);

  const ticks = useMemo(() => formatTimeAxisTicks(duration), [duration]);

  useEffect(() => {
    const playheadEl = playheadRef.current;
    const container = containerRef.current;
    const trackArea = trackAreaRef.current;
    if (!playheadEl || !container || !trackArea) {
      return;
    }

    const trackOffset = trackArea.offsetLeft;

    // プレイヘッドを画面上のtrackOffset位置に固定、タイムラインをスクロール
    const maxScroll = Math.max(container.scrollWidth - container.clientWidth, 0);
    const targetScroll = playheadPixels - trackOffset;
    const actualScroll = maxScroll > 0 ? clamp(targetScroll, 0, maxScroll) : 0;

    container.scrollLeft = actualScroll;

    // プレイヘッドの画面上の位置をtrackOffsetで固定（スクロール補正）
    playheadEl.style.left = `${trackOffset + actualScroll}px`;
  }, [playheadPixels, timelineWidth]);

  return (
    <section
      aria-label="タイムライン"
      className="flex w-full flex-col gap-4 rounded-xl bg-zinc-950/70 p-6 text-zinc-100 shadow-inner shadow-black/50"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-400">
          タイムライン
        </h2>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <label className="flex items-center gap-2" htmlFor="timeline-zoom">
            <span className="uppercase tracking-widest text-[0.65rem] text-zinc-500">
              ズーム
            </span>
            <input
              id="timeline-zoom"
              data-testid="timeline-zoom"
              type="range"
              min={1}
              max={4}
              step={0.5}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="accent-emerald-400"
            />
          </label>
          {ticks.map((tick) => (
            <span key={tick} data-testid={`time-tick-${tick}`} className="tabular-nums">
              {tick.toFixed(2)}秒
            </span>
          ))}
        </div>
      </header>
      <div
        role="table"
        ref={containerRef}
        className="relative flex flex-col gap-2 overflow-x-auto pb-1"
      >
        {SOUND_TYPES.map((sound) => (
          <div
            role="row"
            key={sound}
            data-testid={`timeline-lane-${sound}`}
            className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors ${
              highlightedSound === sound
                ? 'border-emerald-400 bg-emerald-500/10 shadow-inner shadow-emerald-500/20'
                : 'border-zinc-800/60 bg-zinc-900/60'
            }`}
          >
            <span
              role="rowheader"
              aria-label={SOUND_LABELS[sound]}
              className="w-16 shrink-0 text-xs uppercase tracking-widest text-zinc-500"
            >
              {SOUND_LABELS[sound]}
            </span>
            <div
              role="gridcell"
              className="relative h-8 flex-1 overflow-hidden rounded-md bg-zinc-900"
              data-sound={sound}
              ref={sound === SOUND_TYPES[0] ? trackAreaRef : undefined}
              style={{
                minWidth: `${timelineWidth}px`,
                width: `${timelineWidth}px`,
                flexShrink: 0,
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:3rem_100%]" />
              {groupedNotes[sound].map((note) => {
                const positionPx = clamp((note.time / duration) * timelineWidth, 0, timelineWidth);
                const isActive = activeNoteIds.has(note.id);
                return (
                  <span
                    key={note.id}
                    data-testid={`timeline-note-${note.id}`}
                    className={`absolute top-1/2 h-4 w-2 -translate-y-1/2 rounded-sm shadow transition-colors ${
                      isActive
                        ? 'bg-yellow-300 shadow-yellow-400'
                        : 'bg-emerald-400 shadow-emerald-500/40'
                    }`}
                    style={{ left: `${positionPx}px` }}
                    aria-label={`${SOUND_LABELS[sound]}: ${note.time.toFixed(2)}秒`}
                  />
                );
              })}
            </div>
          </div>
        ))}

        <div
          aria-hidden
          data-testid="timeline-playhead"
          ref={playheadRef}
          className="pointer-events-none absolute inset-y-0 w-[3px] bg-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.9)] mix-blend-screen"
          style={{ left: 0 }}
        />
      </div>
    </section>
  );
};

export const Timeline = memo(TimelineComponent);

export default Timeline;
