import '@testing-library/jest-dom';

class AudioParamMock {
  value = 1;
  setValueAtTime = jest.fn();
  linearRampToValueAtTime = jest.fn();
  exponentialRampToValueAtTime = jest.fn();
  cancelScheduledValues = jest.fn();
}

class AudioNodeMock {
  connect = jest.fn().mockReturnThis();
  disconnect = jest.fn();
  start = jest.fn();
  stop = jest.fn();
  buffer: unknown = null;
  gain = new AudioParamMock();
}

class AudioContextMock {
  currentTime = 0;
  destination = new AudioNodeMock();
  createBuffer = jest.fn().mockReturnValue({});
  createBufferSource = jest.fn().mockReturnValue(new AudioNodeMock());
  createGain = jest.fn().mockReturnValue(new AudioNodeMock());
  decodeAudioData = jest.fn().mockResolvedValue({});
  resume = jest.fn().mockResolvedValue(undefined);
  suspend = jest.fn().mockResolvedValue(undefined);
  close = jest.fn().mockResolvedValue(undefined);
}

Object.defineProperty(globalThis, 'AudioContext', {
  writable: true,
  value: AudioContextMock,
});

Object.defineProperty(globalThis, 'webkitAudioContext', {
  writable: true,
  value: AudioContextMock,
});

Object.defineProperty(globalThis, 'AudioBuffer', {
  writable: true,
  value: class AudioBufferMock {},
});
