import * as Tone from 'tone';

import { DEFAULT_BPM, DEFAULT_VELOCITY } from '@/types';

jest.mock('tone');

describe('audioEngine init', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Tone.context.state as AudioContextState) = 'suspended';
    Tone.Transport.bpm.value = 120;
    (Tone.context as unknown as { latencyHint: string }).latencyHint = 'balanced';
    (Tone.context as unknown as { lookAhead: number }).lookAhead = 0.1;
    (Tone.context as unknown as { updateInterval: number }).updateInterval = 0.1;
    (Tone.Transport as unknown as { lookAhead: number }).lookAhead = 0.1;
    (Tone.Transport as unknown as { updateInterval: number }).updateInterval = 0.1;
  });

  it('starts Tone once and resumes context when suspended', async () => {
    const { createAudioEngine } = await import('@/lib/audioEngine');
    const engine = createAudioEngine();

    await engine.init();

    expect(Tone.start).toHaveBeenCalledTimes(1);
    expect(Tone.context.resume).toHaveBeenCalledTimes(1);

    await engine.init();

    expect(Tone.start).toHaveBeenCalledTimes(1);
    expect(Tone.context.resume).toHaveBeenCalledTimes(1);
  });

  it('preloads drum samples during initialization', async () => {
    const samplerMock = Tone.Sampler as unknown as jest.Mock;
    const { createAudioEngine } = await import('@/lib/audioEngine');
    const engine = createAudioEngine();

    await engine.init();

    expect(samplerMock).toHaveBeenCalledTimes(1);
    const [options] = samplerMock.mock.calls[0];
    expect(options).toMatchObject({
      baseUrl: '/sounds/',
    });
    expect(Object.values(options.urls)).toEqual(
      expect.arrayContaining([
        'kick.wav',
        'snare.wav',
        'hihat-closed.wav',
        'hihat-open.wav',
      ])
    );
    expect(engine.isReady()).toBe(true);
  });

  it('throws helpful error when sample loading fails', async () => {
    const originalSampler = (Tone.Sampler as unknown as jest.Mock).getMockImplementation();
    (Tone.Sampler as unknown as jest.Mock).mockImplementationOnce((options?: any) => {
      options?.onerror?.(new Error('boom'));
      return originalSampler ? originalSampler(options) : { toDestination: jest.fn().mockReturnThis() };
    });
    const { createAudioEngine } = await import('@/lib/audioEngine');
    const engine = createAudioEngine();

    await expect(engine.init()).rejects.toThrow('Failed to load drum samples');
  });

  it('throws when Web Audio API is unavailable in the browser', async () => {
    const originalAudioContext = (window as any).AudioContext;
    const originalWebkit = (window as any).webkitAudioContext;
    const originalGlobalAudio = (globalThis as any).AudioContext;
    (window as any).AudioContext = undefined;
    (window as any).webkitAudioContext = undefined;
    (globalThis as any).AudioContext = undefined;
    const { createAudioEngine } = await import('@/lib/audioEngine');
    const engine = createAudioEngine();

    await expect(engine.init()).rejects.toThrow('Web Audio API is not supported');

    (window as any).AudioContext = originalAudioContext;
    (window as any).webkitAudioContext = originalWebkit;
    (globalThis as any).AudioContext = originalGlobalAudio;
  });

  it('applies low latency configuration to Tone context and transport', async () => {
    const { createAudioEngine } = await import('@/lib/audioEngine');
    const engine = createAudioEngine();

    await engine.init();

    expect((Tone.context as unknown as { latencyHint: string }).latencyHint).toBe(
      'interactive'
    );
    expect((Tone.context as unknown as { lookAhead: number }).lookAhead).toBeCloseTo(
      0.01
    );
    expect((Tone.context as unknown as { updateInterval: number }).updateInterval).toBeCloseTo(
      0.01
    );
    expect((Tone.Transport as unknown as { lookAhead: number }).lookAhead).toBeCloseTo(
      0.01
    );
    expect((Tone.Transport as unknown as { updateInterval: number }).updateInterval).toBeCloseTo(
      0.01
    );
    expect(engine.isReady()).toBe(true);
  });

  it('triggers sampler playback for individual sounds', async () => {
    const samplerMock = Tone.Sampler as unknown as jest.Mock;
    const { createAudioEngine } = await import('@/lib/audioEngine');
    const engine = createAudioEngine();

    await engine.init();

    const samplerInstance = samplerMock.mock.results[0]
      .value as {
      triggerAttackRelease: jest.Mock;
    };

    samplerInstance.triggerAttackRelease.mockClear();
    engine.playSound('kick');

    expect(samplerInstance.triggerAttackRelease).toHaveBeenCalledTimes(1);
    let [note, duration, timeArg, velocity] =
      samplerInstance.triggerAttackRelease.mock.calls[0];
    expect(note).toBe('C1');
    expect(duration).toBe('16n');
    expect(timeArg).toBe(0);
    expect(velocity).toBeCloseTo(DEFAULT_VELOCITY);

    samplerInstance.triggerAttackRelease.mockClear();
    engine.playSound('snare', 1.25);

    [note, duration, timeArg, velocity] =
      samplerInstance.triggerAttackRelease.mock.calls[0];
    expect(note).toBe('D1');
    expect(duration).toBe('16n');
    expect(timeArg).toBe(1.25);
    expect(velocity).toBeCloseTo(DEFAULT_VELOCITY);
  });

  it('updates Tone.Transport BPM with clamping', async () => {
    const { createAudioEngine } = await import('@/lib/audioEngine');
    const engine = createAudioEngine();

    await engine.init();

    engine.setBpm(142);
    expect(Tone.Transport.bpm.value).toBe(142);

    engine.setBpm(20);
    expect(Tone.Transport.bpm.value).toBe(60);

    engine.setBpm(999);
    expect(Tone.Transport.bpm.value).toBe(240);

    engine.setBpm(Number.NaN);
    expect(Tone.Transport.bpm.value).toBe(DEFAULT_BPM);
  });

  it('starts and stops a metronome click via Transport scheduling', async () => {
    const samplerMock = Tone.Sampler as unknown as jest.Mock;
    const { createAudioEngine } = await import('@/lib/audioEngine');
    const engine = createAudioEngine();

    await engine.init();

    engine.startMetronome();
    expect(Tone.Transport.scheduleRepeat).toHaveBeenCalledTimes(1);
    expect(Tone.Transport.start).toHaveBeenCalledTimes(1);

    const tickCallback = Tone.Transport.scheduleRepeat.mock.calls[0][0] as (
      time: number
    ) => void;
    const samplerInstance = samplerMock.mock.results[0]
      .value as {
      triggerAttackRelease: jest.Mock;
    };
    samplerInstance.triggerAttackRelease.mockClear();

    tickCallback(2.5);
    const [note, duration, timeArg, velocity] =
      samplerInstance.triggerAttackRelease.mock.calls[0];
    expect(note).toBe('E1');
    expect(duration).toBe('16n');
    expect(timeArg).toBe(2.5);
    expect(velocity).toBeCloseTo(DEFAULT_VELOCITY);

    engine.startMetronome();
    expect(Tone.Transport.scheduleRepeat).toHaveBeenCalledTimes(1);

    const eventId = Tone.Transport.scheduleRepeat.mock.results[0].value;
    engine.stopMetronome();
    expect(Tone.Transport.clear).toHaveBeenCalledWith(eventId);
    expect(Tone.Transport.stop).toHaveBeenCalledTimes(1);

    Tone.Transport.scheduleRepeat.mockClear();
    Tone.Transport.start.mockClear();
    Tone.Transport.clear.mockClear();
    Tone.Transport.stop.mockClear();

    engine.startMetronome();
    expect(Tone.Transport.scheduleRepeat).toHaveBeenCalledTimes(1);

    engine.stopMetronome();
  });
});
