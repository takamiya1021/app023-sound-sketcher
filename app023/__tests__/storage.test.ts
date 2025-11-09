import {
  loadRecording,
  saveRecording,
  loadSettings,
  saveSettings,
  clearPersistedState,
} from '@/lib/storage';
import { DEFAULT_BPM, SoundType } from '@/types';

const RECORDING_KEY = 'app023:recording';
const SETTINGS_KEY = 'app023:settings';

const buildRecording = () => ({
  id: 'rec-1',
  name: 'Draft Groove',
  bpm: 110,
  notes: [
    { id: 'n1', time: 0, sound: 'kick' as SoundType, velocity: 0.9 },
    { id: 'n2', time: 0.5, sound: 'snare' as SoundType, velocity: 0.8 },
  ],
  duration: 2,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
});

const buildSettings = () => ({
  bpm: 120,
  gridSnap: true,
  gridDivision: 16,
  volume: 0.8,
  keyMapping: { a: 'kick' as SoundType },
});

describe('storage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists recording payloads to localStorage', () => {
    const recording = buildRecording();
    saveRecording(recording);
    const raw = localStorage.getItem(RECORDING_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? '{}')).toMatchObject({
      id: 'rec-1',
      bpm: 110,
      notes: expect.any(Array),
    });
  });

  it('restores recordings from localStorage', () => {
    const recording = buildRecording();
    localStorage.setItem(RECORDING_KEY, JSON.stringify(recording));
    const restored = loadRecording();
    expect(restored?.notes).toHaveLength(2);
    expect(restored?.bpm).toBe(110);
  });

  it('persists settings payloads to localStorage', () => {
    const settings = buildSettings();
    saveSettings(settings);
    const raw = localStorage.getItem(SETTINGS_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? '{}')).toMatchObject({
      bpm: 120,
      gridSnap: true,
    });
  });

  it('restores settings with defaults when missing', () => {
    const settings = loadSettings();
    expect(settings.bpm).toBe(DEFAULT_BPM);
    expect(settings.gridSnap).toBe(false);
  });

  it('clears persisted state', () => {
    saveRecording(buildRecording());
    saveSettings(buildSettings());
    clearPersistedState();
    expect(localStorage.getItem(RECORDING_KEY)).toBeNull();
    expect(localStorage.getItem(SETTINGS_KEY)).toBeNull();
  });
});
