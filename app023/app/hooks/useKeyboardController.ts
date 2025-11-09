'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { audioEngine } from '@/lib/audioEngine';
import {
  keyboardHandler,
  KeyboardEventPayload,
} from '@/lib/keyboardHandler';
import { useBeatStore } from '@/store/useBeatStore';
import { BeatNote, DEFAULT_VELOCITY, SoundType } from '@/types';

type KeyMappingEntry = [string, SoundType];

const defaultLayoutOrder = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'];

const seconds = () =>
  (typeof performance !== 'undefined'
    ? performance.now()
    : Date.now()) / 1000;

const createNoteId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const clampNoteTime = (value: number) => Math.max(0, value);

const buildOrderedMapping = (
  mapping: Record<string, SoundType>
): KeyMappingEntry[] => {
  const normalized = Object.entries(mapping).map(
    ([key, sound]) => [key.toLowerCase(), sound] as KeyMappingEntry
  );
  const lookup = new Map(normalized);
  const seen = new Set<string>();
  const ordered: KeyMappingEntry[] = [];

  defaultLayoutOrder.forEach((key) => {
    if (lookup.has(key)) {
      ordered.push([key, lookup.get(key)!]);
      seen.add(key);
    }
  });

  normalized.forEach(([key, sound]) => {
    if (!seen.has(key)) {
      ordered.push([key, sound]);
      seen.add(key);
    }
  });

  return ordered;
};

export const useKeyboardController = () => {
  const keyMapping = useBeatStore((state) => state.settings.keyMapping);
  const isRecording = useBeatStore((state) => state.isRecording);
  const addNote = useBeatStore((state) => state.addNote);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const recordingStartRef = useRef<number | null>(null);
  const audioInitInProgress = useRef<Promise<void> | null>(null);

  useEffect(() => {
    keyboardHandler.setKeyMapping(keyMapping);
  }, [keyMapping]);

  useEffect(() => {
    if (isRecording) {
      recordingStartRef.current = seconds();
    } else {
      recordingStartRef.current = null;
    }
  }, [isRecording]);

  const triggerSound = useCallback((sound: SoundType) => {
    if (audioEngine.isReady()) {
      audioEngine.playSound(sound);
      return;
    }

    if (!audioInitInProgress.current) {
      audioInitInProgress.current = audioEngine
        .init()
        .catch((error) => {
          console.error('Failed to initialize audio engine', error);
        })
        .finally(() => {
          audioInitInProgress.current = null;
        });
    }

    audioInitInProgress.current
      ?.then(() => {
        audioEngine.playSound(sound);
      })
      .catch(() => {
        // エラーは既にログ済みなので握りつぶす
      });
  }, []);

  const handleKeyDown = useCallback(
    ({ key, sound }: KeyboardEventPayload) => {
      setActiveKeys((prev) => {
        if (prev.has(key)) {
          return prev;
        }
        const next = new Set(prev);
        next.add(key);
        return next;
      });

      triggerSound(sound);

      if (!isRecording) {
        return;
      }

      if (recordingStartRef.current === null) {
        recordingStartRef.current = seconds();
      }

      const note: BeatNote = {
        id: createNoteId(),
        sound,
        velocity: DEFAULT_VELOCITY,
        time: clampNoteTime(seconds() - (recordingStartRef.current ?? 0)),
      };

      addNote(note);
    },
    [addNote, isRecording, triggerSound]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const dispose = keyboardHandler.register(handleKeyDown);
    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      setActiveKeys((prev) => {
        if (!prev.has(key)) {
          return prev;
        }
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    };

    window.addEventListener('keyup', handleKeyUp);

    return () => {
      dispose();
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, keyMapping]);

  const orderedMapping = useMemo(
    () => buildOrderedMapping(keyMapping),
    [keyMapping]
  );

  return {
    activeKeys,
    mapping: orderedMapping,
  };
};
