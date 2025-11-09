import {
  AppSettings,
  DEFAULT_SETTINGS,
  Recording,
  SoundType,
  SOUND_KEY_MAP,
} from '@/types';

const RECORDING_STORAGE_KEY = 'app023:recording';
const SETTINGS_STORAGE_KEY = 'app023:settings';

const isBrowser = () => typeof window !== 'undefined' && !!window.localStorage;

type SerializableRecording = Omit<Recording, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

const serializeRecording = (recording: Recording): SerializableRecording => ({
  ...recording,
  createdAt: recording.createdAt.toISOString(),
  updatedAt: recording.updatedAt.toISOString(),
});

const deserializeRecording = (
  payload: SerializableRecording
): Recording => ({
  ...payload,
  createdAt: new Date(payload.createdAt),
  updatedAt: new Date(payload.updatedAt),
});

export const saveRecording = (recording: Recording): void => {
  if (!isBrowser()) return;
  const serialised = serializeRecording(recording);
  localStorage.setItem(RECORDING_STORAGE_KEY, JSON.stringify(serialised));
};

export const loadRecording = (): Recording | null => {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(RECORDING_STORAGE_KEY);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as SerializableRecording;
    return deserializeRecording({
      ...payload,
      notes: (payload.notes ?? []).map((note) => ({
        ...note,
        sound: note.sound as SoundType,
      })),
    });
  } catch (error) {
    console.error('Failed to parse recording from storage', error);
    return null;
  }
};

export const saveSettings = (settings: AppSettings): void => {
  if (!isBrowser()) return;
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

export const loadSettings = (): AppSettings => {
  if (!isBrowser()) return { ...DEFAULT_SETTINGS, keyMapping: { ...SOUND_KEY_MAP } };
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) {
    return {
      ...DEFAULT_SETTINGS,
      keyMapping: { ...SOUND_KEY_MAP },
    };
  }
  try {
    const parsed = JSON.parse(raw) as AppSettings;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      keyMapping: { ...SOUND_KEY_MAP, ...parsed.keyMapping },
    };
  } catch (error) {
    console.error('Failed to parse settings from storage', error);
    return {
      ...DEFAULT_SETTINGS,
      keyMapping: { ...SOUND_KEY_MAP },
    };
  }
};

export const clearPersistedState = (): void => {
  if (!isBrowser()) return;
  localStorage.removeItem(RECORDING_STORAGE_KEY);
  localStorage.removeItem(SETTINGS_STORAGE_KEY);
};

export const __storageKeys = {
  RECORDING_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
};
