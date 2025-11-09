import { createBeatStore, BeatStore } from '@/store/useBeatStore';
import { DEFAULT_BPM, SoundType } from '@/types';

const makeId = () => Math.random().toString(36).slice(2);

const buildNote = (
  overrides: Partial<Parameters<BeatStore['addNote']>[0]> = {}
) => ({
  id: makeId(),
  time: 0.5,
  sound: 'kick' as SoundType,
  velocity: 0.8,
  ...overrides,
});

describe('useBeatStore', () => {
  let store: ReturnType<typeof createBeatStore>;

  beforeEach(() => {
    store = createBeatStore();
  });

  it('initialises with default bpm and empty recording', () => {
    const state = store.getState();
    expect(state.recording.bpm).toBe(DEFAULT_BPM);
    expect(state.recording.notes).toHaveLength(0);
    expect(state.isRecording).toBe(false);
    expect(state.isPlaying).toBe(false);
  });

  it('starts and stops recording while managing timestamps', () => {
    const { startRecording, stopRecording } = store.getState();
    startRecording();
    expect(store.getState().isRecording).toBe(true);
    stopRecording(1.25);
    const state = store.getState();
    expect(state.isRecording).toBe(false);
    expect(state.recording.duration).toBeCloseTo(1.25);
  });

  it('adds notes in time order when recording', () => {
    const { startRecording, addNote } = store.getState();
    startRecording();
    addNote(buildNote({ time: 0.4, sound: 'snare' }));
    addNote(buildNote({ time: 0.1, sound: 'kick' }));
    const times = store.getState().recording.notes.map((note) => note.time);
    expect(times).toEqual([0.1, 0.4]);
  });

  it('updates note properties', () => {
    const { startRecording, addNote, updateNote } = store.getState();
    startRecording();
    const note = buildNote({ sound: 'clap' });
    addNote(note);
    updateNote(note.id, { velocity: 0.5, time: 0.75 });
    const updated = store
      .getState()
      .recording.notes.find((item) => item.id === note.id);
    expect(updated?.velocity).toBe(0.5);
    expect(updated?.time).toBe(0.75);
  });

  it('removes notes by id', () => {
    const { startRecording, addNote, removeNote } = store.getState();
    startRecording();
    const note = buildNote({ sound: 'clap' });
    addNote(note);
    removeNote(note.id);
    expect(store.getState().recording.notes).toHaveLength(0);
  });

  it('clears recording state', () => {
    const {
      startRecording,
      addNote,
      clearRecording,
      setBpm,
      stopRecording,
    } = store.getState();
    startRecording();
    addNote(buildNote());
    setBpm(90);
    stopRecording(1.5);
    clearRecording();
    const state = store.getState();
    expect(state.recording.notes).toHaveLength(0);
    expect(state.recording.duration).toBe(0);
    expect(state.recording.bpm).toBe(DEFAULT_BPM);
  });

  it('toggles playback state', () => {
    const { startPlayback, stopPlayback } = store.getState();
    startPlayback();
    expect(store.getState().isPlaying).toBe(true);
    stopPlayback();
    expect(store.getState().isPlaying).toBe(false);
  });

  it('updates key mapping and persists it via setKeyMapping', () => {
    const { setKeyMapping } = store.getState();
    setKeyMapping('a', 'snare');
    expect(store.getState().settings.keyMapping.a).toBe('snare');
  });

  it('extends recording duration while recording via updateRecordingProgress', () => {
    const { startRecording, updateRecordingProgress } = store.getState();
    startRecording();
    updateRecordingProgress(0.5);
    expect(store.getState().recording.duration).toBeCloseTo(0.5);
    updateRecordingProgress(0.25);
    expect(store.getState().recording.duration).toBeCloseTo(0.5);
  });
});
