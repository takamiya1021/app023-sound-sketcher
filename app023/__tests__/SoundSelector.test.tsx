import { fireEvent, render, screen } from '@testing-library/react';

import SoundSelector from '@/app/components/SoundSelector';
import { useBeatStore } from '@/store/useBeatStore';

describe('SoundSelector', () => {
  beforeEach(() => {
    useBeatStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        keyMapping: { ...state.settings.keyMapping },
      },
    }));
  });

  it('updates key mapping when selection changes', () => {
    render(<SoundSelector />);
    const select = screen.getByLabelText(/Select sound for a/i);
    fireEvent.change(select, { target: { value: 'snare' } });
    expect(useBeatStore.getState().settings.keyMapping.a).toBe('snare');
  });
});
