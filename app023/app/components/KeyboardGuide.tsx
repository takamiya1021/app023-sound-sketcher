'use client';

import { memo } from 'react';

import { useKeyboardController } from '@/hooks/useKeyboardController';
import { SoundType } from '@/types';

const SOUND_LABELS: Record<SoundType, string> = {
  kick: 'Kick',
  snare: 'Snare',
  'hihat-closed': 'Hi-Hat Closed',
  'hihat-open': 'Hi-Hat Open',
  clap: 'Clap',
  tom: 'Tom',
  cymbal: 'Cymbal',
  rim: 'Rim Shot',
};

const baseKeyClass =
  'flex flex-col items-center justify-center rounded-md border border-zinc-700 px-4 py-3 transition-colors duration-150';
const inactiveClass =
  'bg-zinc-900 text-zinc-200 shadow-inner shadow-black/40';
const activeClass = 'bg-emerald-500 text-white shadow-lg shadow-emerald-400/40';

const KeyboardGuideComponent = () => {
  const { activeKeys, mapping } = useKeyboardController();

  return (
    <div
      className="flex w-full flex-wrap justify-center gap-3 rounded-xl bg-zinc-950/60 p-6 text-sm text-zinc-100 shadow-inner shadow-black/40"
      role="list"
    >
      {mapping.map(([key, sound]) => {
        const isActive = activeKeys.has(key);
        return (
          <div
            key={key}
            data-testid={`key-${key}`}
            data-active={isActive ? 'true' : 'false'}
            aria-pressed={isActive}
            className={`${baseKeyClass} ${isActive ? activeClass : inactiveClass}`}
            role="listitem"
          >
            <span className="text-lg font-semibold uppercase tracking-wider">
              {key}
            </span>
            <span className="mt-1 text-xs text-zinc-400">
              {SOUND_LABELS[sound] ?? sound}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const KeyboardGuide = memo(KeyboardGuideComponent);

export default KeyboardGuide;
