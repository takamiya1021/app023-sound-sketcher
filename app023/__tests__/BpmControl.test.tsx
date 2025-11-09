import { fireEvent, render, screen } from '@testing-library/react';

import BpmControl from '@/app/components/BpmControl';
import { useBeatStore } from '@/store/useBeatStore';

describe('BpmControl', () => {
  beforeEach(() => {
    useBeatStore.setState((state) => ({
      ...state,
      recording: {
        ...state.recording,
        bpm: 120,
      },
    }));
  });

  it('updates BPM when value is valid', () => {
    render(<BpmControl />);

    const input = screen.getByLabelText(/set bpm/i);
    fireEvent.change(input, { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: '反映' }));

    expect(useBeatStore.getState().recording.bpm).toBe(150);
    expect(screen.queryByTestId('bpm-error')).not.toBeInTheDocument();
  });

  it('shows an error when BPM is out of range', () => {
    render(<BpmControl />);

    const input = screen.getByLabelText(/set bpm/i);
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: '反映' }));

    expect(useBeatStore.getState().recording.bpm).toBe(120);
    expect(screen.getByTestId('bpm-error')).toHaveTextContent('BPMは60〜240の範囲で入力してください');
  });
});
