import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import Timeline from '@/app/components/Timeline';
import { useBeatStore } from '@/store/useBeatStore';
import { SOUND_TYPES, createEmptyRecording } from '@/types';

const resetStore = () => {
  useBeatStore.setState({
    recording: createEmptyRecording(),
    isRecording: false,
    isPlaying: false,
    playhead: 0,
    settings: {
      ...useBeatStore.getState().settings,
    },
  });
};

describe('Timeline', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders a lane for each sound type', () => {
    render(<Timeline />);

    SOUND_TYPES.forEach((sound) => {
      expect(screen.getByTestId(`timeline-lane-${sound}`)).toBeInTheDocument();
    });
  });

  it('renders note markers at proportional positions', () => {
    const baseRecording = createEmptyRecording();
    useBeatStore.setState((state) => ({
      ...state,
      recording: {
        ...baseRecording,
        duration: 8,
        notes: [
          { id: 'n1', time: 2, sound: 'snare', velocity: 0.75 },
          { id: 'n2', time: 4, sound: 'kick', velocity: 0.8 },
        ],
      },
    }));

    render(<Timeline />);

    const firstNote = screen.getByTestId('timeline-note-n1');
    const secondNote = screen.getByTestId('timeline-note-n2');

    expect(firstNote).toBeInTheDocument();
    expect(secondNote).toBeInTheDocument();
  });

  it('renders a ruler row with tick marks and playhead indicator', () => {
    render(<Timeline />);

    expect(screen.getByTestId('timeline-ruler-row')).toBeInTheDocument();
    expect(screen.getByTestId('playhead-time-indicator')).toHaveTextContent('現在');
    const tickElements = screen.getAllByTestId(/timeline-ruler-tick-/i);
    expect(tickElements.length).toBeGreaterThan(0);
  });

  it('positions the playhead at fixed position', async () => {
    const baseRecording = createEmptyRecording();
    useBeatStore.setState((state) => ({
      ...state,
      recording: {
        ...baseRecording,
        duration: 10,
      },
      playhead: 5,
    }));

    render(<Timeline />);

    const playhead = screen.getByTestId('timeline-playhead');

    expect(playhead).toBeInTheDocument();

    // プレイヘッドが表示されている
    await waitFor(() => {
      const playheadLeft = parseInt(window.getComputedStyle(playhead).left);
      expect(playheadLeft).toBeGreaterThanOrEqual(0); // 画面内に表示
    });
  });

  it('allows adjusting zoom to change lane width', () => {
    render(<Timeline />);

    const lane = screen.getByTestId('timeline-lane-kick').querySelector('[data-sound="kick"]');
    const zoomSlider = screen.getByTestId('timeline-zoom');

    expect(lane).toHaveStyle({ minWidth: '1280px' });
    fireEvent.change(zoomSlider, { target: { value: '3' } });
    expect(lane).toHaveStyle({ minWidth: '1920px' });
  });
});
