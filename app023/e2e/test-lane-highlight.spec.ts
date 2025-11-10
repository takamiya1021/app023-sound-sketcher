import { test, expect } from '@playwright/test';

test('レーンハイライトの継続確認', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // 録音開始
  await page.click('button[aria-label="Record"]');
  await page.waitForTimeout(100);

  // キー入力（3回）
  await page.keyboard.press('a'); // Kick
  await page.waitForTimeout(500);
  await page.keyboard.press('s'); // Snare
  await page.waitForTimeout(500);
  await page.keyboard.press('a'); // Kick
  await page.waitForTimeout(500);

  // 録音停止
  await page.click('button[aria-label="Record"]');
  await page.waitForTimeout(200);

  // 再生開始
  await page.click('button[aria-label="Play"]');

  // スクリーンショット撮影
  await page.waitForTimeout(100);
  await page.screenshot({ path: 'app023/e2e/screenshots/lane-highlight-1-start.png' });
  console.log('=== 再生開始直後 ===');

  // 位置情報を取得
  const positions = await page.evaluate(() => {
    const playhead = document.querySelector('[data-testid="timeline-playhead"]') as HTMLElement;
    const firstNote = document.querySelector('[data-testid^="timeline-note-"]') as HTMLElement;
    const container = document.querySelector('[role="table"]') as HTMLElement;
    const trackArea = document.querySelector('[role="gridcell"]') as HTMLElement;

    const playheadRect = playhead.getBoundingClientRect();
    const noteRect = firstNote?.getBoundingClientRect();

    return {
      playheadLeft: playhead.style.left,
      playheadComputed: window.getComputedStyle(playhead).left,
      firstNoteLeft: firstNote?.style.left || 'none',
      firstNoteComputed: firstNote ? window.getComputedStyle(firstNote).left : 'none',
      scrollLeft: container.scrollLeft,
      trackAreaOffsetLeft: trackArea?.offsetLeft || 0,
      playheadScreenX: playheadRect.left,
      noteScreenX: noteRect?.left || 0,
      diff: noteRect && playheadRect ? noteRect.left - playheadRect.left : 0,
    };
  });
  console.log('Playhead style.left:', positions.playheadLeft);
  console.log('Playhead computed left:', positions.playheadComputed);
  console.log('First note style.left:', positions.firstNoteLeft);
  console.log('First note computed left:', positions.firstNoteComputed);
  console.log('Container scrollLeft:', positions.scrollLeft);
  console.log('TrackArea offsetLeft:', positions.trackAreaOffsetLeft);
  console.log('Playhead screen X:', positions.playheadScreenX);
  console.log('Note screen X:', positions.noteScreenX);
  console.log('Difference (note - playhead):', positions.diff, 'px');

  const kickLane = page.locator('[data-testid="timeline-lane-kick"]');
  const snareLane = page.locator('[data-testid="timeline-lane-snare"]');
  const kickTrack = page.locator('[data-testid="timeline-lane-kick"] [data-sound="kick"]');
  const snareTrack = page.locator('[data-testid="timeline-lane-snare"] [data-sound="snare"]');

  const isTrackHighlighted = async (locator: ReturnType<typeof page.locator>) => {
    const flag = await locator.getAttribute('data-highlighted');
    return flag === 'true';
  };

  const kickClass1 = await kickLane.getAttribute('class');
  console.log('Kick レーンクラス（開始直後）:', kickClass1);
  expect(await isTrackHighlighted(kickTrack)).toBe(true);

  // ノート位置まで待機（約200ms）
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'app023/e2e/screenshots/lane-highlight-2-at-note.png' });
  console.log('\n=== ノート付近（200ms後） ===');

  const positionsAtNote = await page.evaluate(() => {
    const playhead = document.querySelector('[data-testid="timeline-playhead"]') as HTMLElement;
    const firstNote = document.querySelector('[data-testid^="timeline-note-"]') as HTMLElement;
    const container = document.querySelector('[role="table"]') as HTMLElement;
    const trackArea = document.querySelector('[role="gridcell"]') as HTMLElement;
    const playheadRect = playhead.getBoundingClientRect();
    const noteRect = firstNote?.getBoundingClientRect();

    return {
      playheadStyleLeft: playhead.style.left,
      noteStyleLeft: firstNote?.style.left || 'none',
      scrollLeft: container.scrollLeft,
      trackAreaOffsetLeft: trackArea?.offsetLeft || 0,
      playheadScreenX: playheadRect.left,
      noteScreenX: noteRect?.left || 0,
      diff: noteRect && playheadRect ? noteRect.left - playheadRect.left : 0,
    };
  });
  console.log('Playhead style.left:', positionsAtNote.playheadStyleLeft);
  console.log('Note style.left:', positionsAtNote.noteStyleLeft);
  console.log('Container scrollLeft:', positionsAtNote.scrollLeft);
  console.log('TrackArea offsetLeft:', positionsAtNote.trackAreaOffsetLeft);
  console.log('Playhead screen X:', positionsAtNote.playheadScreenX);
  console.log('Note screen X:', positionsAtNote.noteScreenX);
  console.log('Difference (note - playhead):', positionsAtNote.diff, 'px');

  // 時間経過（1秒後）
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'app023/e2e/screenshots/lane-highlight-3-1sec.png' });
  console.log('\n=== 1秒後 ===');

  const kickClass2 = await kickLane.getAttribute('class');
  const snareClass2 = await snareLane.getAttribute('class');
  console.log('Kick レーンクラス:', kickClass2);
  console.log('Snare レーンクラス:', snareClass2);
  const highlightedAfter1s = await Promise.all([isTrackHighlighted(kickTrack), isTrackHighlighted(snareTrack)]);
  expect(highlightedAfter1s.some(Boolean)).toBe(true);

  // 時間経過（2秒後）
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'app023/e2e/screenshots/lane-highlight-3-2sec.png' });
  console.log('\n=== 2秒後 ===');

  const kickClass3 = await kickLane.getAttribute('class');
  const snareClass3 = await snareLane.getAttribute('class');
  console.log('Kick レーン クラス:', kickClass3);
  console.log('Snare レーン クラス:', snareClass3);
  const highlightedAfter2s = await Promise.all([isTrackHighlighted(kickTrack), isTrackHighlighted(snareTrack)]);
  expect(highlightedAfter2s.some(Boolean)).toBe(true);

  // ハイハットレーン（ノートなし）も確認
  const hihatLane = page.locator('[data-testid="timeline-lane-hihat-closed"]');
  const hihatClass = await hihatLane.getAttribute('class');
  console.log('HiHat レーンクラス:', hihatClass);
});
