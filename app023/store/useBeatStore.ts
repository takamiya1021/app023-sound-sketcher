import { createStore, StoreApi } from 'zustand/vanilla';
import { create, StateCreator } from 'zustand';

import {
  AppSettings,
  BeatNote,
  Recording,
  DEFAULT_BPM,
  DEFAULT_SETTINGS,
  SoundType,
  createEmptyRecording,
} from '@/types';
import {
  clearPersistedState,
  loadRecording,
  loadSettings,
  saveRecording,
  saveSettings,
} from '@/lib/storage';

export interface BeatStoreState {
  recording: Recording;
  isRecording: boolean;
  isPlaying: boolean;
  playhead: number;
  settings: AppSettings;
  hasHydrated: boolean;
}

export interface BeatStoreActions {
  startRecording: () => void;
  stopRecording: (duration?: number) => void;
  addNote: (note: BeatNote) => void;
  updateNote: (
    id: string,
    updates: Partial<Omit<BeatNote, 'id' | 'sound'>> & {
      sound?: SoundType;
    }
  ) => void;
  removeNote: (id: string) => void;
  clearRecording: () => void;
  setBpm: (bpm: number) => void;
  startPlayback: () => void;
  stopPlayback: () => void;
  setPlayhead: (position: number) => void;
  updateRecordingProgress: (elapsed: number) => void;
  loadRecording: (recording: Recording) => void;
  loadSettings: (settings: AppSettings) => void;
  resetPersistedState: () => void;
  setKeyMapping: (key: string, sound: SoundType) => void;
  hydrateFromStorage: () => void;
}

export type BeatStore = BeatStoreState & BeatStoreActions;

const sanitizeVelocity = (velocity: number) => {
  if (Number.isNaN(velocity)) return 0.5;
  return Math.min(1, Math.max(0, velocity));
};

const sortNotes = (notes: BeatNote[]) =>
  [...notes].sort((a, b) => a.time - b.time);

const nowSec = () => (typeof performance !== 'undefined'
  ? performance.now() / 1000
  : Date.now() / 1000);

const createInitialRecording = (fallback?: Recording): Recording => {
  if (fallback) return fallback;
  return createEmptyRecording();
};

const createInitialSettings = (fallback?: AppSettings): AppSettings => {
  if (fallback) {
    return {
      ...DEFAULT_SETTINGS,
      ...fallback,
      keyMapping: {
        ...DEFAULT_SETTINGS.keyMapping,
        ...fallback.keyMapping,
      },
    };
  }
  return {
    ...DEFAULT_SETTINGS,
    keyMapping: { ...DEFAULT_SETTINGS.keyMapping },
  };
};

const hasWindow = () => typeof window !== 'undefined';

const createBeatStoreConfig = (
  initialState?: Partial<BeatStore>
): StateCreator<BeatStore> => {
  let recordingStartTimestamp: number | null = null;
  let playheadTickerId: number | null = null;
  let playheadBaseTimestamp: number | null = null;

  const baseRecording = createInitialRecording(initialState?.recording);
  const baseSettings = createInitialSettings(initialState?.settings);

  const stopPlayheadTicker = () => {
    if (playheadTickerId !== null && hasWindow() && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(playheadTickerId);
    }
    playheadTickerId = null;
    playheadBaseTimestamp = null;
  };

  const startPlayheadTicker = (
    setState: StoreApi<BeatStore>['setState'],
    getState: StoreApi<BeatStore>['getState']
  ) => {
    if (!hasWindow() || typeof window.requestAnimationFrame !== 'function') {
      return;
    }
    playheadBaseTimestamp = nowSec() - getState().playhead;

    const tick = () => {
      if (!getState().isRecording) {
        stopPlayheadTicker();
        return;
      }
      const elapsed = Math.max(0, nowSec() - (playheadBaseTimestamp ?? 0));
      setState((prev) => {
        if (!prev.isRecording) {
          return prev;
        }
        const duration = Math.max(prev.recording.duration, elapsed);
        return {
          ...prev,
          playhead: elapsed,
          recording: {
            ...prev.recording,
            duration,
          },
        };
      });
      playheadTickerId = window.requestAnimationFrame(tick);
    };

    stopPlayheadTicker();
    playheadTickerId = window.requestAnimationFrame(tick);
  };

  return (set, get) => ({
    recording: baseRecording,
    isRecording: initialState?.isRecording ?? false,
    isPlaying: initialState?.isPlaying ?? false,
    playhead: initialState?.playhead ?? 0,
    settings: baseSettings,
    hasHydrated: initialState?.hasHydrated ?? false,
    startRecording: () => {
      recordingStartTimestamp = nowSec();
      const freshRecording: Recording = {
        ...get().recording,
        notes: [],
        duration: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      set({
        isRecording: true,
        recording: freshRecording,
      });
      startPlayheadTicker(set, get);
    },
    stopRecording: (duration) => {
      const elapsed =
        typeof duration === 'number'
          ? duration
          : recordingStartTimestamp
            ? Math.max(nowSec() - recordingStartTimestamp, 0)
            : get().recording.duration;
      recordingStartTimestamp = null;
      set((state) => {
        const recording: Recording = {
          ...state.recording,
          duration: elapsed,
          updatedAt: new Date(),
        };
        saveRecording(recording);
        return {
          ...state,
          recording,
          isRecording: false,
        };
      });
      stopPlayheadTicker();
    },
    addNote: (note) => {
      const sound = note.sound;
      set((state) => {
        const nextNotes = sortNotes([
          ...state.recording.notes,
          { ...note, velocity: sanitizeVelocity(note.velocity), sound },
        ]);
        const nextRecording: Recording = {
          ...state.recording,
          notes: nextNotes,
          duration: Math.max(
            state.recording.duration,
            note.time
          ),
          updatedAt: new Date(),
        };
        saveRecording(nextRecording);
        return {
          ...state,
          recording: nextRecording,
        };
      });
    },
    updateNote: (id, updates) => {
      set((state) => {
        const nextNotes = sortNotes(
          state.recording.notes.map((note) =>
            note.id === id
              ? {
                  ...note,
                  ...updates,
                  velocity:
                    updates.velocity !== undefined
                      ? sanitizeVelocity(updates.velocity)
                      : note.velocity,
                  sound: updates.sound ?? note.sound,
                }
              : note
          )
        );
        const nextRecording: Recording = {
          ...state.recording,
          notes: nextNotes,
          updatedAt: new Date(),
        };
        saveRecording(nextRecording);
        return {
          ...state,
          recording: nextRecording,
        };
      });
    },
    removeNote: (id) => {
      set((state) => {
        const nextNotes = state.recording.notes.filter(
          (note) => note.id !== id
        );
        const nextRecording: Recording = {
          ...state.recording,
          notes: nextNotes,
          updatedAt: new Date(),
        };
        saveRecording(nextRecording);
        return {
          ...state,
          recording: nextRecording,
        };
      });
    },
    clearRecording: () => {
      const fresh = createEmptyRecording();
      set((state) => {
        saveRecording(fresh);
        return {
          ...state,
          recording: fresh,
          isRecording: false,
          isPlaying: false,
          playhead: 0,
        };
      });
      stopPlayheadTicker();
    },
    setBpm: (bpm) => {
      const clamped = Math.min(240, Math.max(60, bpm || DEFAULT_BPM));
      set((state) => {
        const recording: Recording = {
          ...state.recording,
          bpm: clamped,
          updatedAt: new Date(),
        };
        const settings: AppSettings = {
          ...state.settings,
          bpm: clamped,
        };
        saveRecording(recording);
        saveSettings(settings);
        return {
          ...state,
          recording,
          settings,
        };
      });
    },
    startPlayback: () => {
      set({ isPlaying: true });
    },
    stopPlayback: () => {
      set({ isPlaying: false, playhead: 0 });
    },
    setPlayhead: (position) => {
      set({ playhead: Math.max(0, position) });
    },
    updateRecordingProgress: (elapsed) => {
      set((state) => {
        if (!state.isRecording) {
          return state;
        }
        const safeElapsed = Math.max(0, elapsed);
        if (safeElapsed <= state.recording.duration + 0.005) {
          return state;
        }
        return {
          ...state,
          recording: {
            ...state.recording,
            duration: safeElapsed,
          },
        };
      });
    },
    loadRecording: (recording) => {
      set((state) => {
        const nextRecording: Recording = {
          ...recording,
          bpm: recording.bpm || DEFAULT_BPM,
        };
        saveRecording(nextRecording);
        return {
          ...state,
          recording: nextRecording,
        };
      });
    },
    loadSettings: (settings) => {
      set((state) => {
        const merged: AppSettings = {
          ...state.settings,
          ...settings,
          keyMapping: {
            ...state.settings.keyMapping,
            ...settings.keyMapping,
          },
        };
        saveSettings(merged);
        return {
          ...state,
          settings: merged,
        };
      });
    },
    resetPersistedState: () => {
      clearPersistedState();
      set({
        recording: createEmptyRecording(),
        settings: {
          ...DEFAULT_SETTINGS,
          keyMapping: { ...DEFAULT_SETTINGS.keyMapping },
        },
        isRecording: false,
        isPlaying: false,
        playhead: 0,
      });
      stopPlayheadTicker();
    },
    setKeyMapping: (key, sound) => {
      const normalisedKey = key.toLowerCase();
      set((state) => {
        const mapping = {
          ...state.settings.keyMapping,
          [normalisedKey]: sound,
        };
        const settings: AppSettings = {
          ...state.settings,
          keyMapping: mapping,
        };
        saveSettings(settings);
        return {
          ...state,
          settings,
        };
      });
    },
    hydrateFromStorage: () => {
      if (!hasWindow()) {
        return;
      }
      const state = get();
      if (state.hasHydrated) {
        return;
      }
      const storedRecording = loadRecording();
      const storedSettings = loadSettings();
      set((prev) => ({
        ...prev,
        recording: storedRecording ?? prev.recording,
        settings: storedSettings ?? prev.settings,
        playhead: storedRecording?.duration ?? prev.playhead,
        hasHydrated: true,
      }));
    },
  });
};

export const createBeatStore = (initialState?: Partial<BeatStore>) =>
  createStore<BeatStore>()(createBeatStoreConfig(initialState));

export const useBeatStore = create<BeatStore>(createBeatStoreConfig());
