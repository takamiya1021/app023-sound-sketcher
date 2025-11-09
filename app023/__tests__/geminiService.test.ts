import { BeatNote } from '@/types';

describe('geminiService', () => {
  const mockNotes: BeatNote[] = [
    { id: 'n1', time: 0, sound: 'kick', velocity: 0.8 },
    { id: 'n2', time: 0.5, sound: 'snare', velocity: 0.9 },
  ];

  beforeEach(() => {
    localStorage.clear();
    ;(global.fetch as unknown) = undefined;
    jest.resetModules();
  });

  it('throws a clear error when API key is missing', async () => {
    const { geminiService } = await import('@/lib/geminiService');
    await expect(geminiService.analyzeBeat(mockNotes)).rejects.toThrow('API key');
  });

  it('persists API key via setApiKey and reuses it automatically', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    genre: 'hiphop',
                    summary: 'Solid groove',
                    suggestions: ['Add swing'],
                    nextPattern: mockNotes,
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const { geminiService } = await import('@/lib/geminiService');
    geminiService.setApiKey('test-key');

    const result = await geminiService.analyzeBeat(mockNotes, {
      bpm: 120,
      style: 'boom-bap',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, requestInit] = mockFetch.mock.calls[0];
    expect(url).toContain('gemini-2.0-flash-exp:generateContent');
    expect(requestInit?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': 'test-key',
    });
    const body = JSON.parse(requestInit?.body as string);
    expect(body.contents[0].parts[0].text).toContain('boom-bap');
    expect(result.genre).toBe('hiphop');
    expect(result.nextPattern).toHaveLength(mockNotes.length);
  });

  it('throws a descriptive error when Gemini responds with failure', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const { geminiService } = await import('@/lib/geminiService');
    geminiService.setApiKey('bad-key');

    await expect(geminiService.analyzeBeat(mockNotes)).rejects.toThrow('認証エラー');
  });

  it('rejects when setApiKey receives an empty string', async () => {
    const { geminiService } = await import('@/lib/geminiService');
    expect(() => geminiService.setApiKey('  ')).toThrow('API key cannot be empty');
  });

  it('wraps network failures with a helpful message', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('network down'));
    global.fetch = mockFetch as unknown as typeof fetch;

    const { geminiService } = await import('@/lib/geminiService');
    geminiService.setApiKey('test-key');

    await expect(geminiService.analyzeBeat(mockNotes)).rejects.toThrow('Gemini APIリクエストに失敗しました');
  });

  it('exposes a helper to retrieve only the next pattern', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    genre: 'house',
                    summary: 'Upbeat loop',
                    suggestions: [],
                    nextPattern: mockNotes,
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const { geminiService } = await import('@/lib/geminiService');
    geminiService.setApiKey('test-key');

    const pattern = await geminiService.suggestNextPattern(mockNotes);

    expect(pattern).toHaveLength(mockNotes.length);
    expect(pattern[0].sound).toBe('kick');
  });
});
