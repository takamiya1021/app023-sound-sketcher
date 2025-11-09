import { SOUND_KEY_MAP, SoundType } from '@/types';

type KeyMapping = Record<string, SoundType>;

const hasWindow = () => typeof window !== 'undefined';

const normaliseKey = (key: string) => key.toLowerCase();

export interface KeyboardEventPayload {
  key: string;
  sound: SoundType;
}

export interface KeyboardHandler {
  register: (onKeyPress: (payload: KeyboardEventPayload) => void) => () => void;
  setKeyMapping: (mapping: KeyMapping) => void;
}

const buildInitialMapping = (): KeyMapping => {
  const mapping: KeyMapping = {};
  for (const [key, sound] of Object.entries(SOUND_KEY_MAP)) {
    mapping[normaliseKey(key)] = sound;
  }
  return mapping;
};

export const createKeyboardHandler = (): KeyboardHandler => {
  let mapping = buildInitialMapping();

  const resolveSound = (key: string) => mapping[normaliseKey(key)];

  return {
    register: (onKeyPress) => {
      if (!hasWindow()) {
        return () => {};
      }
      const listener = (event: KeyboardEvent) => {
        if (event.repeat) {
          return;
        }
        const normalisedKey = normaliseKey(event.key);
        const sound = resolveSound(normalisedKey);
        if (!sound) {
          return;
        }
        event.preventDefault();
        onKeyPress({ key: normalisedKey, sound });
      };
      window.addEventListener('keydown', listener);
      return () => {
        window.removeEventListener('keydown', listener);
      };
    },
    setKeyMapping: (next) => {
      const updated: KeyMapping = {};
      for (const [key, sound] of Object.entries(next)) {
        updated[normaliseKey(key)] = sound;
      }
      mapping = updated;
    },
  };
};

export const keyboardHandler = createKeyboardHandler();
