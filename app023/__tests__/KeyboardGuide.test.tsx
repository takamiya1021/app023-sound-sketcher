import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import KeyboardGuide from '@/app/components/KeyboardGuide';
import { useBeatStore } from '@/store/useBeatStore';
import { keyboardHandler } from '@/lib/keyboardHandler';
import {
  DEFAULT_SETTINGS,
  SOUND_KEY_MAP,
  createEmptyRecording,
} from '@/types';
import { audioEngine } from '@/lib/audioEngine';

jest.mock('@/lib/audioEngine', () => {
  const init = jest.fn().mockResolvedValue(undefined);
  const playSound = jest.fn();
  const isReady = jest.fn().mockReturnValue(true);
  return {
    audioEngine: {
      init,
      playSound,
      isReady,
    },
  };
});

const resetStore = () => {
  useBeatStore.setState({
    recording: createEmptyRecording(),
    isRecording: false,
    isPlaying: false,
    playhead: 0,
    settings: {
      ...DEFAULT_SETTINGS,
      keyMapping: { ...SOUND_KEY_MAP },
    },
  });
};

describe('KeyboardGuide', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
    keyboardHandler.setKeyMapping(SOUND_KEY_MAP);
    jest.clearAllMocks();
  });

  it('highlights keys while pressed and clears on release', () => {
    render(<KeyboardGuide />);

    const keyElement = screen.getByTestId('key-a');
    expect(keyElement).toHaveAttribute('data-active', 'false');

    fireEvent.keyDown(window, { key: 'a' });
    expect(keyElement).toHaveAttribute('data-active', 'true');

    fireEvent.keyUp(window, { key: 'a' });
    expect(keyElement).toHaveAttribute('data-active', 'false');
  });

  it('initialises the audio engine when not ready before playing sound', async () => {
    const mockedAudio = audioEngine as jest.Mocked<typeof audioEngine>;
    mockedAudio.isReady.mockReturnValue(false);

    render(<KeyboardGuide />);

    fireEvent.keyDown(window, { key: 'a' });

    await waitFor(() => {
      expect(mockedAudio.init).toHaveBeenCalledTimes(1);
      expect(mockedAudio.playSound).toHaveBeenCalledWith('kick');
    });
  });

  it('records notes while recording is active', async () => {
    const mockedAudio = audioEngine as jest.Mocked<typeof audioEngine>;
    mockedAudio.isReady.mockReturnValue(true);

    const store = useBeatStore.getState();
    const addNoteSpy = jest.spyOn(store, 'addNote');
    store.startRecording();
    expect(useBeatStore.getState().isRecording).toBe(true);

    render(<KeyboardGuide />);

    fireEvent.keyDown(window, { key: 'a' });

    expect(mockedAudio.playSound).toHaveBeenCalledWith('kick');
    expect(addNoteSpy).toHaveBeenCalled();

    await waitFor(() => {
      const notes = useBeatStore.getState().recording.notes;
      expect(notes).toHaveLength(1);
      expect(notes[0].sound).toBe('kick');
      expect(notes[0].time).toBeGreaterThanOrEqual(0);
    });
  });
});
