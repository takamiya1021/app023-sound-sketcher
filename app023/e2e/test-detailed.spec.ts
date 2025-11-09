import { test, expect } from '@playwright/test';

test('超詳細な動作確認', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1000);

  console.log('=== 初期状態 ===');
  const initial = await page.evaluate(() => {
    const container = document.querySelector('[role="table"]') as HTMLElement;
    const playhead = container.querySelector('[data-testid="timeline-playhead"]') as HTMLElement;
    const trackArea = container.querySelector('[data-sound="kick"]') as HTMLElement;

    return {
      playheadLeft: window.getComputedStyle(playhead).left,
      scrollLeft: container.scrollLeft,
      trackAreaLeft: trackArea.offsetLeft,
      containerRect: container.getBoundingClientRect(),
      playheadRect: playhead.getBoundingClientRect()
    };
  });
  console.log('プレイヘッド left:', initial.playheadLeft);
  console.log('プレイヘッド画面上の位置:', initial.playheadRect.left);
  console.log('スクロール:', initial.scrollLeft);
  console.log('トラックエリア offsetLeft:', initial.trackAreaLeft);

  await page.screenshot({ path: 'e2e/screenshots/detail-0-initial.png' });

  console.log('\n=== 録音開始 ===');
  await page.click('button[aria-label="Record"]');
  await page.waitForTimeout(100);

  const rec1 = await page.evaluate(() => {
    const container = document.querySelector('[role="table"]') as HTMLElement;
    const playhead = container.querySelector('[data-testid="timeline-playhead"]') as HTMLElement;

    return {
      playheadLeft: window.getComputedStyle(playhead).left,
      playheadRect: playhead.getBoundingClientRect(),
      scrollLeft: container.scrollLeft
    };
  });
  console.log('録音開始直後 - プレイヘッド left:', rec1.playheadLeft, '画面位置:', rec1.playheadRect.left, 'スクロール:', rec1.scrollLeft);
  await page.screenshot({ path: 'e2e/screenshots/detail-1-rec-start.png' });

  // 100ms経過
  await page.waitForTimeout(100);
  const rec2 = await page.evaluate(() => {
    const container = document.querySelector('[role="table"]') as HTMLElement;
    const playhead = container.querySelector('[data-testid="timeline-playhead"]') as HTMLElement;

    return {
      playheadLeft: window.getComputedStyle(playhead).left,
      playheadRect: playhead.getBoundingClientRect(),
      scrollLeft: container.scrollLeft
    };
  });
  console.log('100ms経過 - プレイヘッド left:', rec2.playheadLeft, '画面位置:', rec2.playheadRect.left, 'スクロール:', rec2.scrollLeft);

  // キー入力
  await page.keyboard.press('a');
  console.log('キー入力: a (kick)');
  await page.waitForTimeout(50);

  const rec3 = await page.evaluate(() => {
    const container = document.querySelector('[role="table"]') as HTMLElement;
    const playhead = container.querySelector('[data-testid="timeline-playhead"]') as HTMLElement;
    const notes = container.querySelectorAll('[data-testid^="timeline-note-"]');
    const noteDetails = Array.from(notes).map(note => {
      const el = note as HTMLElement;
      const rect = el.getBoundingClientRect();
      return {
        id: el.getAttribute('data-testid'),
        styleLeft: window.getComputedStyle(el).left,
        screenLeft: rect.left,
        ariaLabel: el.getAttribute('aria-label')
      };
    });

    return {
      playheadLeft: window.getComputedStyle(playhead).left,
      playheadScreenLeft: playhead.getBoundingClientRect().left,
      scrollLeft: container.scrollLeft,
      noteCount: notes.length,
      noteDetails
    };
  });
  console.log('キック入力後 - プレイヘッド left:', rec3.playheadLeft, '画面位置:', rec3.playheadScreenLeft, 'スクロール:', rec3.scrollLeft);
  console.log('ノート数:', rec3.noteCount);
  rec3.noteDetails.forEach(note => {
    console.log(`  ${note.ariaLabel} - style.left: ${note.styleLeft}, 画面位置: ${note.screenLeft}`);
  });
  await page.screenshot({ path: 'e2e/screenshots/detail-2-after-kick.png' });

  // さらに200ms経過
  await page.waitForTimeout(200);
  await page.keyboard.press('s');
  console.log('\nキー入力: s (snare)');
  await page.waitForTimeout(100);

  const rec4 = await page.evaluate(() => {
    const container = document.querySelector('[role="table"]') as HTMLElement;
    const playhead = container.querySelector('[data-testid="timeline-playhead"]') as HTMLElement;
    const notes = container.querySelectorAll('[data-testid^="timeline-note-"]');
    const noteDetails = Array.from(notes).map(note => {
      const el = note as HTMLElement;
      const rect = el.getBoundingClientRect();
      return {
        ariaLabel: el.getAttribute('aria-label'),
        styleLeft: window.getComputedStyle(el).left,
        screenLeft: rect.left
      };
    });

    return {
      playheadLeft: window.getComputedStyle(playhead).left,
      playheadScreenLeft: playhead.getBoundingClientRect().left,
      scrollLeft: container.scrollLeft,
      noteDetails
    };
  });
  console.log('スネア入力後 - プレイヘッド left:', rec4.playheadLeft, '画面位置:', rec4.playheadScreenLeft, 'スクロール:', rec4.scrollLeft);
  rec4.noteDetails.forEach(note => {
    console.log(`  ${note.ariaLabel} - style.left: ${note.styleLeft}, 画面位置: ${note.screenLeft}`);
  });
  await page.screenshot({ path: 'e2e/screenshots/detail-3-after-snare.png' });

  console.log('\n=== 判定 ===');

  // プレイヘッドの画面上の位置が固定か（これが重要）
  const playheadScreenFixed = Math.abs(rec1.playheadRect.left - rec2.playheadRect.left) < 1 &&
                               Math.abs(rec2.playheadRect.left - rec3.playheadScreenLeft) < 1 &&
                               Math.abs(rec3.playheadScreenLeft - rec4.playheadScreenLeft) < 1;
  console.log('✅ プレイヘッド 画面位置 固定:', playheadScreenFixed ? '✅' : '❌');
  console.log(`   値: ${rec1.playheadRect.left} → ${rec2.playheadRect.left} → ${rec3.playheadScreenLeft} → ${rec4.playheadScreenLeft}`);

  // スクロールが増加しているか（タイムラインが流れている）
  const scrollIncreasing = rec4.scrollLeft > rec1.scrollLeft;
  console.log('✅ タイムラインスクロール（流れている）:', scrollIncreasing ? '✅' : '❌');
  console.log(`   値: ${rec1.scrollLeft} → ${rec2.scrollLeft} → ${rec3.scrollLeft} → ${rec4.scrollLeft}`);

  // ノートが画面に表示されているか
  const allNotesVisible = rec4.noteDetails.every(note => note.screenLeft > 0);
  console.log('✅ ノートすべて表示:', allNotesVisible ? '✅' : '❌');

  console.log('\n参考: プレイヘッド left プロパティ（スクロールに応じて変化するのが正常）');
  console.log(`   値: ${rec1.playheadLeft} → ${rec2.playheadLeft} → ${rec3.playheadLeft} → ${rec4.playheadLeft}`);

  expect(playheadScreenFixed).toBe(true);
  expect(scrollIncreasing).toBe(true);
  expect(allNotesVisible).toBe(true);
});
