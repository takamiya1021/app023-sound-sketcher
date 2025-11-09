import { BeatNote } from '@/types';

export const exportJSON = (notes: BeatNote[]): string =>
  JSON.stringify(
    notes.map((note) => ({
      time: Number(note.time.toFixed(4)),
      sound: note.sound,
      velocity: Number(note.velocity.toFixed(3)),
    })),
    null,
    2
  );

export const exportCSV = (notes: BeatNote[]): string => {
  const header = 'time,sound,velocity';
  const rows = notes.map(
    (note) => `${note.time.toFixed(4)},${note.sound},${note.velocity.toFixed(3)}`
  );
  return [header, ...rows].join('\n');
};

export const downloadTextFile = (
  filename: string,
  content: string,
  mime: string = 'text/plain'
) => {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
