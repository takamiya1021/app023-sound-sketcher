const start = jest.fn(async () => {});

const context = {
  state: 'suspended' as AudioContextState,
  resume: jest.fn(async () => {
    context.state = 'running';
  }),
  latencyHint: 'balanced',
  lookAhead: 0.1,
  updateInterval: 0.1,
};

const Transport = {
  bpm: {
    value: 120,
    set: jest.fn(),
  },
  start: jest.fn(),
  stop: jest.fn(),
  position: 0,
  lookAhead: 0.1,
  updateInterval: 0.1,
  schedule: jest.fn(),
  scheduleRepeat: jest.fn((callback?: (...args: unknown[]) => void) => {
    return 'metronome-event';
  }),
  cancel: jest.fn(),
  clear: jest.fn(),
};

const Sampler = jest.fn((options?: { onload?: () => void }) => {
  options?.onload?.();
  return {
    triggerAttackRelease: jest.fn(),
    releaseAll: jest.fn(),
    toDestination: jest.fn().mockReturnThis(),
  };
});

const now = jest.fn(() => 0);

const getDestination = jest.fn(() => ({}));

const Audio = {
  start,
  context,
  Transport,
  Sampler,
  now,
  getDestination,
};

export default Audio;
export { start, context, Transport, Sampler, now, getDestination };
