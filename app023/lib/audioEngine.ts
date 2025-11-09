import * as Tone from 'tone';

import {
  BeatNote,
  SoundType,
  SOUND_TYPES,
  DEFAULT_BPM,
  DEFAULT_VELOCITY,
} from '@/types';

export interface AudioEngine {
  init: () => Promise<void>;
  isReady: () => boolean;
  playSound: (sound: SoundType, time?: number) => void;
  setBpm: (bpm: number) => void;
  startMetronome: () => void;
  stopMetronome: () => void;
  playRecording: (notes: BeatNote[], bpm: number, onProgress?: (seconds: number) => void) => Promise<void> | void;
  stopPlayback: () => void;
  setVolume: (volume: number) => void;
}

type ToneModule = typeof Tone;

type ToneSampler = InstanceType<typeof Tone.Sampler>;
type TransportEventId = number;

const SAMPLE_BASE_URL = '/sounds/';

const SOUND_SAMPLE_FILES: Record<SoundType, string> = {
  kick: 'kick.wav',
  snare: 'snare.wav',
  'hihat-closed': 'hihat-closed.wav',
  'hihat-open': 'hihat-open.wav',
  clap: 'clap.wav',
  tom: 'tom.wav',
  cymbal: 'cymbal.wav',
  rim: 'rim.wav',
};

const SOUND_NOTE_MAP: Record<SoundType, string> = {
  kick: 'C1',
  snare: 'D1',
  'hihat-closed': 'E1',
  'hihat-open': 'F1',
  clap: 'G1',
  tom: 'A1',
  cymbal: 'B1',
  rim: 'C2',
};

const buildSamplerUrls = (): Record<string, string> => {
  const urls: Record<string, string> = {};
  for (const sound of SOUND_TYPES) {
    urls[SOUND_NOTE_MAP[sound]] = SOUND_SAMPLE_FILES[sound];
  }
  return urls;
};

const clampBpm = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_BPM;
  }
  return Math.min(240, Math.max(60, value));
};

const ensureContext = async (tone: ToneModule) => {
  if (tone.context && tone.context.state !== 'running') {
    await tone.context.resume();
  }
};

const ensureAudioSupport = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const hasAudioContext =
    typeof (window as typeof window & { webkitAudioContext?: AudioContext })?.AudioContext ===
      'function' ||
    typeof (window as typeof window & { webkitAudioContext?: AudioContext })?.webkitAudioContext ===
      'function';

  if (!hasAudioContext) {
    throw new Error('Web Audio API is not supported in this browser');
  }
};

const safeAssign = <T extends object, K extends keyof T>(object: T, key: K, value: T[K]) => {
  if (!object) return;
  try {
    object[key] = value;
  } catch (error) {
    console.warn(`Unable to set ${String(key)} on Audio context`, error);
  }
};

const configureLowLatency = (tone: ToneModule) => {
  const context = tone.context as typeof tone.context & {
    latencyHint?: string;
    lookAhead?: number;
    updateInterval?: number;
  };
  if (context) {
    if ('latencyHint' in context) {
      safeAssign(context, 'latencyHint', 'interactive' as any);
    }
    if ('lookAhead' in context) {
      safeAssign(context, 'lookAhead', 0.01 as any);
    }
    if ('updateInterval' in context) {
      safeAssign(context, 'updateInterval', 0.01 as any);
    }
  }

  const transport = tone.Transport as typeof tone.Transport & {
    lookAhead?: number;
    updateInterval?: number;
  };
  if ('lookAhead' in transport) {
    safeAssign(transport, 'lookAhead', 0.01 as any);
  }
  if ('updateInterval' in transport) {
    safeAssign(transport, 'updateInterval', 0.01 as any);
  }
};

export const createAudioEngine = (tone: ToneModule = Tone): AudioEngine => {
  let initialized = false;
  let initializing: Promise<void> | null = null;
  let sampler: ToneSampler | null = null;
  let samplerReady = false;
  let samplerLoading: Promise<void> | null = null;
  let currentBpm = DEFAULT_BPM;
  let metronomeEventId: TransportEventId | null = null;
  let playbackCompletion: (() => void) | null = null;
  let progressEventId: TransportEventId | null = null;

  const ensureSampler = async () => {
    if (sampler && samplerReady) {
      return sampler;
    }

  if (!samplerLoading) {
      samplerLoading = new Promise<void>((resolve, reject) => {
        const options = {
          urls: buildSamplerUrls(),
          baseUrl: SAMPLE_BASE_URL,
          onload: () => {
            samplerReady = true;
            resolve();
          },
          onerror: (error: Error) => {
            samplerReady = false;
            sampler = null;
            reject(
              new Error(
                `Failed to load drum samples${error?.message ? `: ${error.message}` : ''}`
              )
            );
          },
        };
        const instance = new tone.Sampler(options);
        sampler = instance.toDestination();
      });
    }

    try {
      await samplerLoading;
    } finally {
      samplerLoading = null;
    }

    if (!sampler || !samplerReady) {
      throw new Error('Failed to initialize audio sampler');
    }

    return sampler;
  };

  const scheduleNotes = (noteSampler: ToneSampler, notes: BeatNote[]) => {
    notes.forEach((note) => {
      const mappedNote = SOUND_NOTE_MAP[note.sound] ?? SOUND_NOTE_MAP.kick;
      tone.Transport.schedule((time: number) => {
        noteSampler.triggerAttackRelease(mappedNote, '16n', time, note.velocity ?? DEFAULT_VELOCITY);
      }, Math.max(0, note.time));
    });
  };

  const init = async () => {
    if (initialized) {
      return;
    }

    if (!initializing) {
      initializing = (async () => {
        try {
          ensureAudioSupport();
          await tone.start();
          await ensureContext(tone);
          configureLowLatency(tone);
          await ensureSampler();
          tone.Transport.bpm.value = currentBpm;
          initialized = true;
        } finally {
          initializing = null;
        }
      })();
    }

    const current = initializing;
    if (current) {
      await current;
    }
  };

  const noop = () => {};

  return {
    init,
    isReady: () => initialized,
    playSound: (sound: SoundType, time?: number) => {
      if (!sampler || !samplerReady) {
        return;
      }
      const note = SOUND_NOTE_MAP[sound];
      if (!note) {
        return;
      }
      const when = typeof time === 'number' ? time : tone.now();
      sampler.triggerAttackRelease(note, '16n', when, DEFAULT_VELOCITY);
    },
    setBpm: (bpm: number) => {
      const clamped = clampBpm(bpm);
      currentBpm = clamped;
      tone.Transport.bpm.value = clamped;
    },
    startMetronome: () => {
      if (!sampler || !samplerReady) {
        return;
      }
      if (metronomeEventId !== null) {
        return;
      }
      if (typeof tone.Transport.scheduleRepeat !== 'function') {
        return;
      }
      const metronomeSampler = sampler;
      metronomeEventId = tone.Transport.scheduleRepeat(
        (time: number) => {
          const note = SOUND_NOTE_MAP['hihat-closed'];
          metronomeSampler?.triggerAttackRelease(note, '16n', time, DEFAULT_VELOCITY);
        },
        '4n'
      );
      tone.Transport.start();
    },
    stopMetronome: () => {
      if (metronomeEventId === null) {
        return;
      }
      if (typeof tone.Transport.clear === 'function') {
        tone.Transport.clear(metronomeEventId as number);
      } else {
        tone.Transport.cancel(0);
      }
      metronomeEventId = null;
      tone.Transport.stop();
    },
    playRecording: async (notes: BeatNote[], bpm: number, onProgress?: (seconds: number) => void) => {
      if (!notes.length) {
        return;
      }
      const samplerInstance = await ensureSampler();
      tone.Transport.stop();
      tone.Transport.cancel(0);
      if (progressEventId !== null) {
        tone.Transport.clear(progressEventId);
        progressEventId = null;
      }
      if (playbackCompletion) {
        playbackCompletion();
        playbackCompletion = null;
      }
      tone.Transport.bpm.value = clampBpm(bpm);
      scheduleNotes(samplerInstance, notes);
      const endTime = Math.max(...notes.map((note) => note.time)) + 0.5;
      return new Promise<void>((resolve) => {
        playbackCompletion = () => {
          if (progressEventId !== null) {
            tone.Transport.clear(progressEventId);
            progressEventId = null;
          }
          resolve();
          playbackCompletion = null;
        };
        if (onProgress) {
          progressEventId = tone.Transport.scheduleRepeat(() => {
            onProgress(Math.min(tone.Transport.seconds, endTime));
          }, 0.03);
        }
        tone.Transport.scheduleOnce(() => {
          const cleanup = playbackCompletion;
          tone.Transport.stop();
          tone.Transport.cancel(0);
          if (progressEventId !== null) {
            tone.Transport.clear(progressEventId);
            progressEventId = null;
          }
          if (cleanup) {
            cleanup();
          }
        }, endTime);
        tone.Transport.start('+0.05');
      });
    },
    stopPlayback: () => {
      tone.Transport.stop();
      tone.Transport.cancel(0);
      if (progressEventId !== null) {
        tone.Transport.clear(progressEventId);
        progressEventId = null;
      }
      if (playbackCompletion) {
        const cleanup = playbackCompletion;
        playbackCompletion = null;
        cleanup();
      }
    },
    setVolume: noop,
  };
};

export const audioEngine = createAudioEngine();
