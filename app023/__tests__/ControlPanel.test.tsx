import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';

import ControlPanel from '@/app/components/ControlPanel';
import { useBeatStore } from '@/store/useBeatStore';

const mockInit = jest.fn().mockResolvedValue(undefined);
const mockPlayRecording = jest.fn().mockResolvedValue(undefined);
const mockStopPlayback = jest.fn();

jest.mock('@/lib/audioEngine', () => ({
  audioEngine: {
    init: (...args: unknown[]) => mockInit(...args),
    playRecording: (...args: unknown[]) => mockPlayRecording(...args),
    stopPlayback: (...args: unknown[]) => mockStopPlayback(...args),
  },
}));

const addMockNote = () => {
  const store = useBeatStore.getState();
  store.startRecording();
  store.addNote({ id: 'n1', time: 0, sound: 'kick', velocity: 0.8 });
  store.stopRecording(0.5);
};

describe('ControlPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBeatStore.setState((state) => ({
      ...state,
      recording: {
        ...state.recording,
        notes: [],
        duration: 0,
        bpm: 120,
      },
      isRecording: false,
      isPlaying: false,
    }));
  });

  it('toggles recording when Record button is clicked', async () => {
    render(<ControlPanel />);
    const recordButton = screen.getByRole('button', { name: /^record$/i });
    await act(async () => {
      fireEvent.click(recordButton);
    });
    await waitFor(() => expect(useBeatStore.getState().isRecording).toBe(true));
    await act(async () => {
      fireEvent.click(recordButton);
    });
    await waitFor(() => expect(useBeatStore.getState().isRecording).toBe(false));
  });

  it('plays back notes when Play is clicked', async () => {
    addMockNote();
    render(<ControlPanel />);
    const playButton = screen.getByRole('button', { name: /play/i });
    await act(async () => {
      fireEvent.click(playButton);
    });
    await waitFor(() => expect(mockPlayRecording).toHaveBeenCalled());
  });
});
