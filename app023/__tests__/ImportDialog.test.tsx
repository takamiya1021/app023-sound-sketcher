import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';

import ImportDialog from '@/app/components/ImportDialog';
import { useBeatStore } from '@/store/useBeatStore';
import * as importUtils from '@/lib/importUtils';

// importUtils のモック
jest.mock('@/lib/importUtils');

describe('ImportDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBeatStore.setState((state) => ({
      ...state,
      recording: {
        ...state.recording,
        notes: [],
        duration: 0,
        bpm: 120,
      },
    }));
  });

  it('インポートボタンが表示される', () => {
    render(<ImportDialog />);

    expect(screen.getByText(/JSONから読み込み/i)).toBeInTheDocument();
    expect(screen.getByText(/CSVから読み込み/i)).toBeInTheDocument();
  });

  it('JSONファイルを選択するとインポート処理が実行される', async () => {
    const mockNotes = [
      { id: '1', time: 0, sound: 'kick' as const, velocity: 0.8 },
      { id: '2', time: 0.5, sound: 'snare' as const, velocity: 0.9 },
    ];

    (importUtils.importJSON as jest.Mock).mockResolvedValue(mockNotes);

    render(<ImportDialog />);

    const jsonButton = screen.getByText(/JSONから読み込み/i);
    await act(async () => {
      fireEvent.click(jsonButton);
    });

    // ファイル選択input を見つける
    const fileInput = screen.getByTestId('json-file-input');

    // ファイル選択をシミュレート
    const file = new File(
      [JSON.stringify([{ time: 0, sound: 'kick', velocity: 0.8 }])],
      'test.json',
      { type: 'application/json' }
    );

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // インポート関数が呼ばれたことを確認
    await waitFor(() => {
      expect(importUtils.importJSON).toHaveBeenCalledWith(file);
    });

    // storeが更新されたことを確認
    await waitFor(() => {
      const notes = useBeatStore.getState().recording.notes;
      expect(notes).toHaveLength(2);
      expect(notes[0].sound).toBe('kick');
    });
  });

  it('CSVファイルを選択するとインポート処理が実行される', async () => {
    const mockNotes = [
      { id: '1', time: 0, sound: 'kick' as const, velocity: 0.8 },
    ];

    (importUtils.importCSV as jest.Mock).mockResolvedValue(mockNotes);

    render(<ImportDialog />);

    const csvButton = screen.getByText(/CSVから読み込み/i);
    await act(async () => {
      fireEvent.click(csvButton);
    });

    const fileInput = screen.getByTestId('csv-file-input');

    const file = new File(
      ['time,sound,velocity\n0,kick,0.8'],
      'test.csv',
      { type: 'text/csv' }
    );

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(importUtils.importCSV).toHaveBeenCalledWith(file);
    });

    await waitFor(() => {
      const notes = useBeatStore.getState().recording.notes;
      expect(notes).toHaveLength(1);
    });
  });

  it('インポートエラー時にエラーメッセージが表示される', async () => {
    (importUtils.importJSON as jest.Mock).mockRejectedValue(
      new Error('JSON形式が不正です')
    );

    render(<ImportDialog />);

    const jsonButton = screen.getByText(/JSONから読み込み/i);
    await act(async () => {
      fireEvent.click(jsonButton);
    });

    const fileInput = screen.getByTestId('json-file-input');
    const file = new File(['invalid'], 'test.json', { type: 'application/json' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/JSON形式が不正です/i)).toBeInTheDocument();
    });
  });

  it('インポート成功時に成功メッセージが表示される', async () => {
    const mockNotes = [
      { id: '1', time: 0, sound: 'kick' as const, velocity: 0.8 },
    ];

    (importUtils.importJSON as jest.Mock).mockResolvedValue(mockNotes);

    render(<ImportDialog />);

    const jsonButton = screen.getByText(/JSONから読み込み/i);
    await act(async () => {
      fireEvent.click(jsonButton);
    });

    const fileInput = screen.getByTestId('json-file-input');
    const file = new File(
      [JSON.stringify([{ time: 0, sound: 'kick', velocity: 0.8 }])],
      'test.json',
      { type: 'application/json' }
    );

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/インポートしました/i)).toBeInTheDocument();
    });
  });
});
