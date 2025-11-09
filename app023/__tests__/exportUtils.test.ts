import { exportCSV, exportJSON } from '@/lib/exportUtils';

describe('exportUtils', () => {
  const notes = [
    { id: '1', time: 0, sound: 'kick', velocity: 0.8 },
    { id: '2', time: 0.5, sound: 'snare', velocity: 0.9 },
  ];

  it('converts notes to formatted JSON', () => {
    const json = exportJSON(notes as any);
    expect(json).toContain('"kick"');
    expect(json).toContain('"snare"');
  });

  it('converts notes to CSV rows', () => {
    const csv = exportCSV(notes as any);
    const rows = csv.split('\n');
    expect(rows[0]).toBe('time,sound,velocity');
    expect(rows).toHaveLength(3);
  });
});
