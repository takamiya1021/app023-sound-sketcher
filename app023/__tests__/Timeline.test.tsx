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

  it('positions the playhead according to the current time', async () => {
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
    await waitFor(() => {
      expect(playhead).toHaveStyle({ left: '800px' });
    });
  });

  it('schedules playhead updates via requestAnimationFrame', async () => {
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame');
    render(<Timeline />);
    await waitFor(() => {
      expect(rafSpy).toHaveBeenCalled();
    });
    rafSpy.mockRestore();
  });

  it('keeps the recording playhead moving and only scrolls when it nears the viewport edge', () => {
    const baseRecording = createEmptyRecording();
    useBeatStore.setState((state) => ({
      ...state,
      recording: {
        ...baseRecording,
        duration: 12,
      },
      isRecording: true,
      playhead: 1,
    }));

    const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0 as unknown as DOMHighResTimeStamp);
      return 1;
    });
    const cafSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    render(<Timeline />);
    const container = screen.getByRole('table');
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'scrollWidth', { value: 3200, configurable: true });

    act(() => {
      useBeatStore.setState((state) => ({
        ...state,
        playhead: 2,
      }));
    });
    expect(container.scrollLeft).toBe(0);

    act(() => {
      useBeatStore.setState((state) => ({
        ...state,
        playhead: 8,
      }));
    });
    expect(container.scrollLeft).toBeCloseTo(600);

    rafSpy.mockRestore();
    cafSpy.mockRestore();
  });

  it('allows adjusting zoom to change lane width', () => {
    render(<Timeline />);

    const lane = screen.getByTestId('timeline-lane-kick').querySelector('[data-sound="kick"]');
    const zoomSlider = screen.getByTestId('timeline-zoom');

    expect(lane).toHaveStyle({ minWidth: '640px' });
    fireEvent.change(zoomSlider, { target: { value: '3' } });
    expect(lane).toHaveStyle({ minWidth: '1920px' });
  });
});
