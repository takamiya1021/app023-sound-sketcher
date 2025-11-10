import { importJSON, importCSV } from '@/lib/importUtils';

// FileReader のモック
const mockFileReader = () => {
  const reader = {
    readAsText: jest.fn(),
    result: null as string | null,
    onload: null as ((event: ProgressEvent<FileReader>) => void) | null,
    onerror: null as ((event: ProgressEvent<FileReader>) => void) | null,
  };

  // readAsText が呼ばれたら、onload を非同期で実行
  reader.readAsText.mockImplementation(() => {
    setTimeout(() => {
      if (reader.onload) {
        reader.onload({ target: reader } as ProgressEvent<FileReader>);
      }
    }, 0);
  });

  return reader;
};

describe('importUtils', () => {
  describe('importJSON', () => {
    it('正常なJSONファイルをインポートできる', async () => {
      const jsonContent = JSON.stringify([
        { time: 0.0, sound: 'kick', velocity: 0.8 },
        { time: 0.5, sound: 'snare', velocity: 0.9 },
        { time: 1.0, sound: 'hihat-closed', velocity: 0.6 },
      ]);

      const reader = mockFileReader();
      reader.result = jsonContent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([jsonContent], 'test.json', {
        type: 'application/json',
      });

      const notes = await importJSON(file);

      expect(notes).toHaveLength(3);
      expect(notes[0]).toMatchObject({
        time: 0.0,
        sound: 'kick',
        velocity: 0.8,
      });
      expect(notes[0]).toHaveProperty('id');
    });

    it('velocity省略時にデフォルト値0.8を使用する', async () => {
      const jsonContent = JSON.stringify([
        { time: 0.0, sound: 'kick' }, // velocity省略
      ]);

      const reader = mockFileReader();
      reader.result = jsonContent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([jsonContent], 'test.json', {
        type: 'application/json',
      });

      const notes = await importJSON(file);

      expect(notes[0].velocity).toBe(0.8);
    });

    it('不正なJSON形式でエラーをスローする', async () => {
      const invalidJSON = 'not a json';

      const reader = mockFileReader();
      reader.result = invalidJSON;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([invalidJSON], 'test.json', {
        type: 'application/json',
      });

      await expect(importJSON(file)).rejects.toThrow('JSON形式が不正です');
    });

    it('必須フィールド(time)が欠損している場合エラーをスローする', async () => {
      const jsonContent = JSON.stringify([
        { sound: 'kick', velocity: 0.8 }, // time欠損
      ]);

      const reader = mockFileReader();
      reader.result = jsonContent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([jsonContent], 'test.json', {
        type: 'application/json',
      });

      await expect(importJSON(file)).rejects.toThrow(
        '必須フィールドが欠損しています'
      );
    });

    it('必須フィールド(sound)が欠損している場合エラーをスローする', async () => {
      const jsonContent = JSON.stringify([
        { time: 0.0, velocity: 0.8 }, // sound欠損
      ]);

      const reader = mockFileReader();
      reader.result = jsonContent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([jsonContent], 'test.json', {
        type: 'application/json',
      });

      await expect(importJSON(file)).rejects.toThrow(
        '必須フィールドが欠損しています'
      );
    });

    it('timeが負の値の場合エラーをスローする', async () => {
      const jsonContent = JSON.stringify([
        { time: -1.0, sound: 'kick', velocity: 0.8 },
      ]);

      const reader = mockFileReader();
      reader.result = jsonContent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([jsonContent], 'test.json', {
        type: 'application/json',
      });

      await expect(importJSON(file)).rejects.toThrow(
        'timeは0以上の数値である必要があります'
      );
    });

    it('soundが不正な値の場合エラーをスローする', async () => {
      const jsonContent = JSON.stringify([
        { time: 0.0, sound: 'invalid-sound', velocity: 0.8 },
      ]);

      const reader = mockFileReader();
      reader.result = jsonContent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([jsonContent], 'test.json', {
        type: 'application/json',
      });

      await expect(importJSON(file)).rejects.toThrow('soundが不正な値です');
    });

    it('velocityが範囲外（0.0未満）の場合エラーをスローする', async () => {
      const jsonContent = JSON.stringify([
        { time: 0.0, sound: 'kick', velocity: -0.1 },
      ]);

      const reader = mockFileReader();
      reader.result = jsonContent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([jsonContent], 'test.json', {
        type: 'application/json',
      });

      await expect(importJSON(file)).rejects.toThrow(
        'velocityは0.0〜1.0の範囲である必要があります'
      );
    });

    it('velocityが範囲外（1.0超過）の場合エラーをスローする', async () => {
      const jsonContent = JSON.stringify([
        { time: 0.0, sound: 'kick', velocity: 1.1 },
      ]);

      const reader = mockFileReader();
      reader.result = jsonContent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([jsonContent], 'test.json', {
        type: 'application/json',
      });

      await expect(importJSON(file)).rejects.toThrow(
        'velocityは0.0〜1.0の範囲である必要があります'
      );
    });
  });

  describe('importCSV', () => {
    it('正常なCSVファイルをインポートできる', async () => {
      const csvContent = `time,sound,velocity
0.0,kick,0.8
0.5,snare,0.9
1.0,hihat-closed,0.6`;

      const reader = mockFileReader();
      reader.result = csvContent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const notes = await importCSV(file);

      expect(notes).toHaveLength(3);
      expect(notes[0]).toMatchObject({
        time: 0.0,
        sound: 'kick',
        velocity: 0.8,
      });
      expect(notes[0]).toHaveProperty('id');
    });

    it('velocity省略時にデフォルト値0.8を使用する', async () => {
      const csvContent = `time,sound
0.0,kick`;

      const reader = mockFileReader();
      reader.result = csvContent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const notes = await importCSV(file);

      expect(notes[0].velocity).toBe(0.8);
    });

    it('ヘッダー行のみの場合空配列を返す', async () => {
      const csvContent = `time,sound,velocity`;

      const reader = mockFileReader();
      reader.result = csvContent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const notes = await importCSV(file);

      expect(notes).toHaveLength(0);
    });

    it('必須カラム(time)が欠損している場合エラーをスローする', async () => {
      const csvContent = `sound,velocity
kick,0.8`;

      const reader = mockFileReader();
      reader.result = csvContent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      await expect(importCSV(file)).rejects.toThrow(
        '必須カラムが欠損しています'
      );
    });

    it('必須カラム(sound)が欠損している場合エラーをスローする', async () => {
      const csvContent = `time,velocity
0.0,0.8`;

      const reader = mockFileReader();
      reader.result = csvContent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      await expect(importCSV(file)).rejects.toThrow(
        '必須カラムが欠損しています'
      );
    });

    it('データ行でtimeが空の場合エラーをスローする', async () => {
      const csvContent = `time,sound,velocity
,kick,0.8`;

      const reader = mockFileReader();
      reader.result = csvContent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      await expect(importCSV(file)).rejects.toThrow(
        '必須フィールドが欠損しています'
      );
    });

    it('データ行でsoundが空の場合エラーをスローする', async () => {
      const csvContent = `time,sound,velocity
0.0,,0.8`;

      const reader = mockFileReader();
      reader.result = csvContent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      await expect(importCSV(file)).rejects.toThrow(
        '必須フィールドが欠損しています'
      );
    });

    it('timeが数値でない場合エラーをスローする', async () => {
      const csvContent = `time,sound,velocity
abc,kick,0.8`;

      const reader = mockFileReader();
      reader.result = csvContent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      await expect(importCSV(file)).rejects.toThrow(
        'timeは0以上の数値である必要があります'
      );
    });

    it('velocityが数値でない場合エラーをスローする', async () => {
      const csvContent = `time,sound,velocity
0.0,kick,abc`;

      const reader = mockFileReader();
      reader.result = csvContent;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = jest.fn(() => reader) as any;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      await expect(importCSV(file)).rejects.toThrow(
        'velocityは0.0〜1.0の範囲である必要があります'
      );
    });
  });
});
