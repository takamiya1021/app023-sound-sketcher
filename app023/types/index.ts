export const SOUND_TYPES = [
  'kick',
  'snare',
  'hihat-closed',
  'hihat-open',
  'clap',
  'tom',
  'cymbal',
  'rim',
] as const;

export type SoundType = (typeof SOUND_TYPES)[number];

export const SOUND_KEY_MAP: Record<string, SoundType> = {
  a: 'kick',
  s: 'snare',
  d: 'hihat-closed',
  f: 'hihat-open',
  j: 'clap',
  k: 'tom',
  l: 'cymbal',
  ';': 'rim',
};

export const DEFAULT_BPM = 120;
export const DEFAULT_VELOCITY = 0.8;

export interface BeatNote {
  id: string;
  time: number;
  sound: SoundType;
  velocity: number;
}

export interface Recording {
  id: string;
  name: string;
  bpm: number;
  notes: BeatNote[];
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  geminiApiKey?: string;
  bpm: number;
  gridSnap: boolean;
  gridDivision: number;
  volume: number;
  keyMapping: Record<string, SoundType>;
}

export const DEFAULT_SETTINGS: AppSettings = {
  bpm: DEFAULT_BPM,
  gridSnap: false,
  gridDivision: 16,
  volume: 0.8,
  keyMapping: { ...SOUND_KEY_MAP },
};

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const createEmptyRecording = (): Recording => ({
  id: generateId(),
  name: 'New Sketch',
  bpm: DEFAULT_BPM,
  notes: [],
  duration: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const isSoundType = (value: string): value is SoundType =>
  SOUND_TYPES.includes(value as SoundType);
