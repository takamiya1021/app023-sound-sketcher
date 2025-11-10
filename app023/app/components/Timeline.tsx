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
const PLAYHEAD_VIEWPORT_FRACTION = 0.2;
const PLAYHEAD_MIN_OFFSET = 24;

const formatSecondsLabel = (value: number, step: number) => {
  if (step >= 1) {
    return value.toFixed(0);
  }
  if (step >= 0.1) {
    return value.toFixed(1);
  }
  return value.toFixed(2);
};

const computeNiceInterval = (range: number, maxTicks = 6) => {
  if (!Number.isFinite(range) || range <= 0) {
    return 1;
  }
  const roughStep = range / maxTicks;
  const exponent = Math.floor(Math.log10(roughStep));
  const power = 10 ** exponent;
  const fraction = roughStep / power;
  let niceFraction: number;
  if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }
  return niceFraction * power;
};

const buildRulerTicks = (duration: number, timelineWidth: number) => {
  if (!Number.isFinite(duration) || duration <= 0) {
    return [
      {
        value: 0,
        left: 0,
        alignment: 'left' as const,
        label: '0',
        isMajor: true,
      },
    ];
  }

  const range = Math.max(duration, 0.1);
  const majorStep = computeNiceInterval(range);
  const maxValue = Math.max(duration, majorStep);
  const ticks: Array<{
    value: number;
    left: number;
    alignment: 'left' | 'center' | 'right';
    label?: string;
    isMajor: boolean;
  }> = [];

  for (let major = 0; major <= maxValue + 1e-6; major += majorStep) {
    const ratio = clamp(major / duration, 0, 1);
    const left = ratio * timelineWidth;
    const alignment: 'left' | 'center' | 'right' = major === 0 ? 'left' : major >= duration - 1e-6 ? 'right' : 'center';
    ticks.push({
      value: Number(major.toFixed(4)),
      left,
      alignment,
      isMajor: true,
      label: formatSecondsLabel(major, majorStep),
    });

    const minorStep = majorStep / 4;
    if (minorStep >= 0.1) {
      for (let i = 1; i < 4; i += 1) {
        const minorValue = major + i * minorStep;
        if (minorValue >= duration - 1e-6) {
          break;
        }
        const minorRatio = clamp(minorValue / duration, 0, 1);
        ticks.push({
          value: Number(minorValue.toFixed(4)),
          left: minorRatio * timelineWidth,
          alignment: 'center',
          isMajor: false,
        });
      }
    }
  }

  const lastMajor = (() => {
    for (let i = ticks.length - 1; i >= 0; i -= 1) {
      if (ticks[i]?.isMajor) {
        return ticks[i];
      }
    }
    return undefined;
  })();
  if (lastMajor && duration - lastMajor.value > 1e-6) {
    ticks.push({
      value: duration,
      left: timelineWidth,
      alignment: 'right',
      isMajor: true,
      label: formatSecondsLabel(duration, majorStep),
    });
  }

  return ticks;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * BPMに基づいた拍グリッドを生成
 * @param bpm - テンポ（BPM）
 * @param duration - 録音の長さ（秒）
 * @param timelineWidth - タイムラインの幅（ピクセル）
 * @returns 拍グリッドの配列
 */
const buildBeatGrid = (bpm: number, duration: number, timelineWidth: number) => {
  if (!Number.isFinite(bpm) || bpm <= 0 || !Number.isFinite(duration) || duration <= 0) {
    return [];
  }

  // 1拍の長さ（秒）= 60秒 / BPM
  const beatDuration = 60 / bpm;

  const grid: Array<{
    beatNumber: number;
    time: number;
    left: number;
    isMeasure: boolean; // 小節の開始位置かどうか（4拍ごと）
  }> = [];

  let beatNumber = 0;
  for (let time = 0; time <= duration; time += beatDuration) {
    const ratio = time / duration;
    const left = ratio * timelineWidth;

    // 小節は4拍ごと（4/4拍子を想定）
    const isMeasure = beatNumber % 4 === 0;

    grid.push({
      beatNumber,
      time,
      left,
      isMeasure,
    });

    beatNumber++;
  }

  return grid;
};

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
      if (delta < minDelta) {
        minDelta = delta;
        nearestSound = note.sound;
      }
      if (delta <= threshold) {
        active.add(note.id);
      }
    });

    return { highlightedSound: nearestSound, activeNoteIds: active };
  }, [playhead, recording.notes, duration]);

  const tickEntries = useMemo(() => buildRulerTicks(duration, timelineWidth), [duration, timelineWidth]);
  const beatGrid = useMemo(() => buildBeatGrid(recording.bpm, duration, timelineWidth), [recording.bpm, duration, timelineWidth]);
  const formattedPlayhead = playhead.toFixed(2);

  useEffect(() => {
    const playheadEl = playheadRef.current;
    const container = containerRef.current;
    const trackArea = trackAreaRef.current;
    if (!playheadEl || !container || !trackArea) {
      return;
    }

    const trackOffset = trackArea.offsetLeft;
    const viewportWidth = container.clientWidth;
    const availableTrackWidth = Math.max(viewportWidth - trackOffset, 0);
    const desiredInset = availableTrackWidth * PLAYHEAD_VIEWPORT_FRACTION;
    const minInset = availableTrackWidth > 0 ? Math.min(PLAYHEAD_MIN_OFFSET, availableTrackWidth) : 0;
    const insetWithinTrack = availableTrackWidth > 0 ? clamp(desiredInset, minInset, availableTrackWidth) : 0;

    // プレイヘッドを視認しやすい位置に保つためタイムラインをスクロール
    const maxScroll = Math.max(container.scrollWidth - container.clientWidth, 0);
    const targetScroll = playheadPixels - insetWithinTrack;
    const actualScroll = maxScroll > 0 ? clamp(targetScroll, 0, maxScroll) : 0;

    container.scrollLeft = actualScroll;

    // プレイヘッドはタイムライン座標そのものに従って移動させる
    playheadEl.style.left = `${trackOffset + playheadPixels}px`;
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
        <div className="flex items-center gap-6 text-xs text-zinc-500">
          <span className="flex items-center gap-1 text-purple-400" data-testid="bpm-indicator">
            <span className="text-[0.65rem] uppercase tracking-widest text-zinc-500">BPM</span>
            <span className="tabular-nums text-sm">{recording.bpm}</span>
          </span>
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
          <span className="flex items-center gap-1 text-emerald-400" data-testid="playhead-time-indicator">
            <span className="text-[0.65rem] uppercase tracking-widest text-zinc-500">現在</span>
            <span className="tabular-nums text-sm">{formattedPlayhead}秒</span>
          </span>
        </div>
      </header>
      <div
        role="table"
        ref={containerRef}
        className="relative flex flex-col gap-1.5 overflow-x-auto pb-1"
      >
        <div
          data-testid="timeline-ruler-row"
          className="flex items-center gap-4 rounded-lg border border-zinc-800/60 bg-zinc-900/60 px-4 py-2"
        >
          <span className="w-16 shrink-0 text-xs uppercase tracking-widest text-zinc-500">目盛（秒）</span>
          <div
            className="relative h-12 flex-1 overflow-hidden rounded-md bg-zinc-900"
            style={{
              minWidth: `${timelineWidth}px`,
              width: `${timelineWidth}px`,
              flexShrink: 0,
            }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:3rem_100%]" />
            {tickEntries.map((tick) => {
              const transform =
                tick.alignment === 'center'
                  ? 'translateX(-50%)'
                  : tick.alignment === 'right'
                    ? 'translateX(-100%)'
                    : 'translateX(0)';
              return (
                <div
                  key={`ruler-${tick.value}`}
                  data-testid={`timeline-ruler-tick-${tick.value}`}
                  data-major={tick.isMajor ? 'true' : 'false'}
                  className="absolute top-1 flex flex-col items-center gap-0.5 text-[0.65rem] uppercase tracking-wide text-zinc-400"
                  style={{ left: `${tick.left}px`, transform }}
                >
                  <span
                    className={`block w-px ${tick.isMajor ? 'h-3 bg-emerald-400' : 'h-1.5 bg-emerald-500/40'}`}
                  />
                  {tick.isMajor && (
                    <span className="tabular-nums text-sm text-zinc-50">{tick.label}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {SOUND_TYPES.map((sound) => {
          const isLaneHighlighted = highlightedSound === sound;
          return (
            <div
              role="row"
              key={sound}
              data-testid={`timeline-lane-${sound}`}
              className="flex items-center gap-4 rounded-lg border border-zinc-800/60 bg-zinc-900/60 px-4 py-2"
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
                className={`relative h-6 flex-1 overflow-hidden rounded-md bg-zinc-900 transition-all ${
                  isLaneHighlighted
                    ? 'ring-2 ring-emerald-400/70 shadow-[0_0_18px_rgba(16,185,129,0.45)]'
                    : 'ring-1 ring-zinc-800/70'
                }`}
                data-sound={sound}
                data-highlighted={isLaneHighlighted ? 'true' : 'false'}
                ref={sound === SOUND_TYPES[0] ? trackAreaRef : undefined}
                style={{
                  minWidth: `${timelineWidth}px`,
                  width: `${timelineWidth}px`,
                  flexShrink: 0,
                }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:3rem_100%]" />
                {/* BPMに基づいた拍グリッド */}
                {beatGrid.map((beat) => (
                  <div
                    key={`beat-${beat.beatNumber}`}
                    data-testid={`timeline-beat-${beat.beatNumber}`}
                    className={`absolute inset-y-0 ${
                      beat.isMeasure
                        ? 'w-[2px] bg-purple-400/40'
                        : 'w-px bg-purple-400/20'
                    }`}
                    style={{ left: `${beat.left}px` }}
                    aria-hidden="true"
                  />
                ))}
                {groupedNotes[sound].map((note) => {
                  const positionPx = clamp((note.time / duration) * timelineWidth, 0, timelineWidth);
                  const isActive = activeNoteIds.has(note.id);
                  return (
                    <span
                      key={note.id}
                      data-testid={`timeline-note-${note.id}`}
                      className={`absolute top-1/2 h-3 w-2 -translate-y-1/2 rounded-sm shadow transition-colors ${
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
          );
        })}

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
