import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import AIBeatSuggestion from '@/app/components/AIBeatSuggestion';
import { useBeatStore } from '@/store/useBeatStore';
import { BeatNote } from '@/types';

const mockAnalysis = {
  genre: 'hiphop',
  summary: 'Groovy beat',
  suggestions: ['Add swing'],
  nextPattern: [
    { id: 'g1', time: 0, sound: 'kick', velocity: 0.8 } as BeatNote,
  ],
};

const analyzeBeat = jest.fn();
const setApiKey = jest.fn();
const getApiKey = jest.fn().mockReturnValue('');
const suggestNextPattern = jest.fn();

jest.mock('@/lib/geminiService', () => ({
  geminiService: {
    analyzeBeat: (...args: unknown[]) => analyzeBeat(...(args as [])),
    setApiKey: (...args: unknown[]) => setApiKey(...(args as [])),
    getApiKey: () => getApiKey(),
    suggestNextPattern: (...args: unknown[]) => suggestNextPattern(...(args as [])),
  },
}));

describe('AIBeatSuggestion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    analyzeBeat.mockReset();
    analyzeBeat.mockResolvedValue(mockAnalysis);
    suggestNextPattern.mockResolvedValue(mockAnalysis.nextPattern);
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: () => 'mock-id',
      },
      configurable: true,
    });
    useBeatStore.setState((state) => ({
      ...state,
      recording: {
        ...state.recording,
        bpm: 120,
        duration: 1,
        notes: [
          { id: 'n1', time: 0, sound: 'kick', velocity: 0.8 },
          { id: 'n2', time: 0.5, sound: 'snare', velocity: 0.9 },
        ],
      },
    }));
  });

  it('saves API key when requested', () => {
    render(<AIBeatSuggestion />);

    const input = screen.getByPlaceholderText('sk-...');
    fireEvent.change(input, { target: { value: 'secret-key' } });
    fireEvent.click(screen.getByRole('button', { name: /save api key/i }));

    expect(setApiKey).toHaveBeenCalledWith('secret-key');
    expect(screen.getByTestId('ai-message')).toHaveTextContent('APIキーを保存しました');
  });

  it('shows analysis results and applies pattern', async () => {
    render(<AIBeatSuggestion />);

    fireEvent.click(screen.getByRole('button', { name: /analyze beat/i }));

    await waitFor(() => {
      expect(analyzeBeat).toHaveBeenCalled();
      expect(screen.getByTestId('ai-analysis')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /apply pattern/i }));

    const notes = useBeatStore.getState().recording.notes;
    expect(notes.length).toBeGreaterThan(2);
  });
});
