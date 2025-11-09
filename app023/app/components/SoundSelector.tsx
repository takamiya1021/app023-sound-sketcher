'use client';

import { SOUND_KEY_MAP, SOUND_TYPES, SoundType } from '@/types';
import { useBeatStore } from '@/store/useBeatStore';

const KEY_ORDER = Object.keys(SOUND_KEY_MAP);

const SoundSelector = () => {
  const keyMapping = useBeatStore((state) => state.settings.keyMapping);
  const setKeyMapping = useBeatStore((state) => state.setKeyMapping);

  const handleChange = (key: string, sound: SoundType) => {
    setKeyMapping(key, sound);
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-6 text-sm text-zinc-100">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">キー音色アサイン</p>
        <p className="text-lg font-semibold text-zinc-100">
          よく使うキーに好きなドラム音を割り当てましょう。
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {KEY_ORDER.map((key) => (
          <label key={key} className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em]">
            <span className="text-zinc-500">{key}</span>
            <select
              aria-label={`Select sound for ${key}`}
              value={keyMapping[key]}
              onChange={(event) => handleChange(key, event.target.value as SoundType)}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-100 focus:border-emerald-400 focus:outline-none"
            >
              {SOUND_TYPES.map((sound) => (
                <option key={sound} value={sound} className="text-black">
                  {sound}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
};

export default SoundSelector;
