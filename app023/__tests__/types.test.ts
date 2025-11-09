import {
  SOUND_TYPES,
  SOUND_KEY_MAP,
 DEFAULT_BPM,
  isSoundType,
} from '@/types';

describe('domain types', () => {
  it('provides all canonical sound types', () => {
    expect(SOUND_TYPES).toEqual([
      'kick',
      'snare',
      'hihat-closed',
      'hihat-open',
      'clap',
      'tom',
      'cymbal',
      'rim',
    ]);
  });

  it('exposes default bpm to bootstrap recordings', () => {
    expect(DEFAULT_BPM).toBeGreaterThanOrEqual(60);
    expect(DEFAULT_BPM).toBeLessThanOrEqual(240);
  });

  it('maps keyboard keys to sound types', () => {
    expect(SOUND_KEY_MAP.a).toBe('kick');
    expect(SOUND_KEY_MAP.s).toBe('snare');
    expect(Object.keys(SOUND_KEY_MAP)).toContain('l');
  });

  it('verifies sound identifiers', () => {
    expect(isSoundType('kick')).toBe(true);
    expect(isSoundType('unknown')).toBe(false);
  });
});
