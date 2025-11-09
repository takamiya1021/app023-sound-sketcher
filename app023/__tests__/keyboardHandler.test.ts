import { SOUND_KEY_MAP, SoundType } from '@/types';

describe('keyboardHandler', () => {
  const dispatchKeyDown = (key: string, repeat = false) => {
    const event = new KeyboardEvent('keydown', { key, repeat });
    window.dispatchEvent(event);
    return event;
  };

  afterEach(() => {
    jest.resetModules();
  });

  it('invokes callback with mapped sound types and ignores unmapped keys', async () => {
    const { createKeyboardHandler } = await import('@/lib/keyboardHandler');
    const handler = createKeyboardHandler();
    const callback = jest.fn();

    const dispose = handler.register(callback);
    dispatchKeyDown('a');
    dispatchKeyDown('z');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({
      key: 'a',
      sound: SOUND_KEY_MAP.a,
    });

    dispose();
  });

  it('stops listening once disposed', async () => {
    const { createKeyboardHandler } = await import('@/lib/keyboardHandler');
    const handler = createKeyboardHandler();
    const callback = jest.fn();

    const dispose = handler.register(callback);
    dispose();

    dispatchKeyDown('a');
    expect(callback).not.toHaveBeenCalled();
  });

  it('ignores repeated keydown events', async () => {
    const { createKeyboardHandler } = await import('@/lib/keyboardHandler');
    const handler = createKeyboardHandler();
    const callback = jest.fn();

    handler.register(callback);

    dispatchKeyDown('s');
    dispatchKeyDown('s', true);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({
      key: 's',
      sound: SOUND_KEY_MAP.s,
    });
  });

  it('respects custom key mapping updates', async () => {
    const { createKeyboardHandler } = await import('@/lib/keyboardHandler');
    const handler = createKeyboardHandler();
    const callback = jest.fn();

    handler.setKeyMapping({ x: 'kick' as SoundType });
    handler.register(callback);

    dispatchKeyDown('x');
    expect(callback).toHaveBeenCalledWith({ key: 'x', sound: 'kick' });

    callback.mockClear();
    dispatchKeyDown('a');
    expect(callback).not.toHaveBeenCalled();
  });
});
