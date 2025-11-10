/**
 * WAVファイルインポートのテスト
 */

import { importWAVFile } from '@/lib/importUtils';

// AudioContext のモック
const mockAudioContext = () => {
  return {
    decodeAudioData: jest.fn(),
  };
};

// FileReader のモック（ArrayBuffer用）
const mockFileReaderForArrayBuffer = () => {
  const reader = {
    readAsArrayBuffer: jest.fn(),
    result: null as ArrayBuffer | null,
    onload: null as ((event: ProgressEvent<FileReader>) => void) | null,
    onerror: null as ((event: ProgressEvent<FileReader>) => void) | null,
  };

  reader.readAsArrayBuffer.mockImplementation(() => {
    setTimeout(() => {
      if (reader.onload) {
        reader.onload({ target: reader } as ProgressEvent<FileReader>);
      }
    }, 0);
  });

  return reader;
};

describe('importWAVFile', () => {
  let originalAudioContext: typeof window.AudioContext;

  beforeAll(() => {
    originalAudioContext = window.AudioContext;
  });

  afterAll(() => {
    window.AudioContext = originalAudioContext;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('正常なWAVファイルをデコードできる', async () => {
    // モックAudioBuffer
    const mockBuffer = {
      duration: 1.0,
      length: 44100,
      numberOfChannels: 2,
      sampleRate: 44100,
    } as AudioBuffer;

    // AudioContext モック
    const audioContext = mockAudioContext();
    audioContext.decodeAudioData.mockResolvedValue(mockBuffer);
    window.AudioContext = jest.fn(() => audioContext) as unknown as typeof AudioContext;

    // FileReader モック
    const arrayBuffer = new ArrayBuffer(1024);
    const reader = mockFileReaderForArrayBuffer();
    reader.result = arrayBuffer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.FileReader = jest.fn(() => reader) as any;

    // テスト実行
    const file = new File([arrayBuffer], 'test.wav', { type: 'audio/wav' });
    const buffer = await importWAVFile(file);

    expect(buffer).toBe(mockBuffer);
    expect(audioContext.decodeAudioData).toHaveBeenCalledWith(arrayBuffer);
  });

  it('audio/x-wav MIMEタイプも受け入れる', async () => {
    const mockBuffer = {} as AudioBuffer;
    const audioContext = mockAudioContext();
    audioContext.decodeAudioData.mockResolvedValue(mockBuffer);
    window.AudioContext = jest.fn(() => audioContext) as unknown as typeof AudioContext;

    const arrayBuffer = new ArrayBuffer(1024);
    const reader = mockFileReaderForArrayBuffer();
    reader.result = arrayBuffer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.FileReader = jest.fn(() => reader) as any;

    const file = new File([arrayBuffer], 'test.wav', { type: 'audio/x-wav' });
    const buffer = await importWAVFile(file);

    expect(buffer).toBe(mockBuffer);
  });

  it('audio/wave MIMEタイプも受け入れる', async () => {
    const mockBuffer = {} as AudioBuffer;
    const audioContext = mockAudioContext();
    audioContext.decodeAudioData.mockResolvedValue(mockBuffer);
    window.AudioContext = jest.fn(() => audioContext) as unknown as typeof AudioContext;

    const arrayBuffer = new ArrayBuffer(1024);
    const reader = mockFileReaderForArrayBuffer();
    reader.result = arrayBuffer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.FileReader = jest.fn(() => reader) as any;

    const file = new File([arrayBuffer], 'test.wav', { type: 'audio/wave' });
    const buffer = await importWAVFile(file);

    expect(buffer).toBe(mockBuffer);
  });

  it('不正なMIMEタイプでエラーをスローする', async () => {
    const file = new File(['dummy'], 'test.mp3', { type: 'audio/mp3' });

    await expect(importWAVFile(file)).rejects.toThrow(
      'WAVファイルのみ対応しています'
    );
  });

  it('ファイルサイズが5MBを超える場合エラーをスローする', async () => {
    // 6MB のファイル
    const largeBuffer = new ArrayBuffer(6 * 1024 * 1024);
    const file = new File([largeBuffer], 'large.wav', { type: 'audio/wav' });

    await expect(importWAVFile(file)).rejects.toThrow(
      'ファイルサイズは5MB以下である必要があります'
    );
  });

  it('デコードに失敗した場合エラーをスローする', async () => {
    const audioContext = mockAudioContext();
    audioContext.decodeAudioData.mockRejectedValue(
      new Error('Invalid audio data')
    );
    window.AudioContext = jest.fn(() => audioContext) as unknown as typeof AudioContext;

    const arrayBuffer = new ArrayBuffer(1024);
    const reader = mockFileReaderForArrayBuffer();
    reader.result = arrayBuffer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.FileReader = jest.fn(() => reader) as any;

    const file = new File([arrayBuffer], 'broken.wav', { type: 'audio/wav' });

    await expect(importWAVFile(file)).rejects.toThrow(
      'WAVファイルのデコードに失敗しました'
    );
  });

  it('FileReader読み込みに失敗した場合エラーをスローする', async () => {
    const reader = mockFileReaderForArrayBuffer();
    reader.readAsArrayBuffer.mockImplementation(() => {
      setTimeout(() => {
        if (reader.onerror) {
          reader.onerror({} as ProgressEvent<FileReader>);
        }
      }, 0);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.FileReader = jest.fn(() => reader) as any;

    const file = new File(['dummy'], 'test.wav', { type: 'audio/wav' });

    await expect(importWAVFile(file)).rejects.toThrow(
      'ファイルの読み込み中にエラーが発生しました'
    );
  });
});
