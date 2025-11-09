import { test, expect } from '@playwright/test';

test('録音と再生の完全な動作確認', async ({ page }) => {
  // ブラウザのconsole.logをキャプチャ
  page.on('console', msg => {
    if (msg.type() === 'log' && (msg.text().includes('[Store]') || msg.text().includes('[Ticker]') || msg.text().includes('[Timeline]'))) {
      console.log('Browser:', msg.text());
    }
  });

  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1000);

  console.log('=== 録音開始 ===');
  await page.click('button[aria-label="Record"]');
  await page.waitForTimeout(100);

  // 録音中のプレイヘッドとスクロールを確認
  const recording1 = await page.evaluate(() => {
    const container = document.querySelector('[role="table"]') as HTMLElement;
    const playhead = container.querySelector('[data-testid="timeline-playhead"]') as HTMLElement;
    return {
      playheadScreenLeft: playhead.getBoundingClientRect().left,
      scrollLeft: container.scrollLeft
    };
  });
  console.log('録音開始直後 - プレイヘッド:', recording1.playheadScreenLeft, 'スクロール:', recording1.scrollLeft);

  // 1つ目の音
  await page.keyboard.press('a'); // kick at ~0.1s
  await page.waitForTimeout(200);

  const recording2 = await page.evaluate(() => {
    const container = document.querySelector('[role="table"]') as HTMLElement;
    const playhead = container.querySelector('[data-testid="timeline-playhead"]') as HTMLElement;
    const notes = container.querySelectorAll('[data-testid^="timeline-note-"]');
    return {
      playheadScreenLeft: playhead.getBoundingClientRect().left,
      scrollLeft: container.scrollLeft,
      noteCount: notes.length
    };
  });
  console.log('キック入力後 - プレイヘッド:', recording2.playheadScreenLeft, 'スクロール:', recording2.scrollLeft, 'ノート数:', recording2.noteCount);

  // 2つ目の音
  await page.keyboard.press('s'); // snare at ~0.3s
  await page.waitForTimeout(200);

  const recording3 = await page.evaluate(() => {
    const container = document.querySelector('[role="table"]') as HTMLElement;
    const playhead = container.querySelector('[data-testid="timeline-playhead"]') as HTMLElement;
    const notes = container.querySelectorAll('[data-testid^="timeline-note-"]');
    return {
      playheadScreenLeft: playhead.getBoundingClientRect().left,
      scrollLeft: container.scrollLeft,
      noteCount: notes.length
    };
  });
  console.log('スネア入力後 - プレイヘッド:', recording3.playheadScreenLeft, 'スクロール:', recording3.scrollLeft, 'ノート数:', recording3.noteCount);

  // 3つ目の音
  await page.keyboard.press('d'); // hihat at ~0.5s
  await page.waitForTimeout(200);

  const recording4 = await page.evaluate(() => {
    const container = document.querySelector('[role="table"]') as HTMLElement;
    const playhead = container.querySelector('[data-testid="timeline-playhead"]') as HTMLElement;
    const notes = container.querySelectorAll('[data-testid^="timeline-note-"]');
    const noteDetails = Array.from(notes).map(note => {
      const el = note as HTMLElement;
      return {
        id: el.getAttribute('data-testid'),
        left: window.getComputedStyle(el).left,
        isInViewport: el.getBoundingClientRect().left > 0
      };
    });
    return {
      playheadScreenLeft: playhead.getBoundingClientRect().left,
      scrollLeft: container.scrollLeft,
      noteCount: notes.length,
      noteDetails
    };
  });
  console.log('ハイハット入力後 - プレイヘッド:', recording4.playheadScreenLeft, 'スクロール:', recording4.scrollLeft, 'ノート数:', recording4.noteCount);
  console.log('ノート位置:');
  recording4.noteDetails.forEach((note, i) => {
    console.log(`  ${i + 1}. ${note.id} - left: ${note.left}, viewport内: ${note.isInViewport}`);
  });

  // 録音中のスクリーンショット
  await page.screenshot({ path: 'e2e/screenshots/complete-recording.png', fullPage: true });

  // 録音停止
  console.log('\n=== 録音停止 ===');
  await page.click('button[aria-label="Record"]');
  await page.waitForTimeout(500);

  const afterStop = await page.evaluate(() => {
    const container = document.querySelector('[role="table"]') as HTMLElement;
    const playhead = container.querySelector('[data-testid="timeline-playhead"]') as HTMLElement;
    return {
      playheadScreenLeft: playhead.getBoundingClientRect().left,
      scrollLeft: container.scrollLeft
    };
  });
  console.log('録音停止後 - プレイヘッド:', afterStop.playheadScreenLeft, 'スクロール:', afterStop.scrollLeft);

  // 再生開始
  console.log('\n=== 再生開始 ===');

  // recording.duration を確認
  const recordingInfo = await page.evaluate(() => {
    const dls = Array.from(document.querySelectorAll('dl'));
    let duration = null;
    dls.forEach(dl => {
      const dts = Array.from(dl.querySelectorAll('dt'));
      const dds = Array.from(dl.querySelectorAll('dd'));
      dts.forEach((dt, index) => {
        if (dt.textContent?.includes('長さ') && dds[index]) {
          duration = dds[index].textContent;
        }
      });
    });
    return { duration };
  });
  console.log('Recording info:', recordingInfo);

  await page.click('button[aria-label="Play"]');
  await page.waitForTimeout(100);

  const playback1 = await page.evaluate(() => {
    const container = document.querySelector('[role="table"]') as HTMLElement;
    const playhead = container.querySelector('[data-testid="timeline-playhead"]') as HTMLElement;
    // @ts-ignore - Zustand store access for debugging
    const store = window.__BEAT_STORE__;
    const state = store ? store.getState() : null;
    return {
      playheadScreenLeft: playhead.getBoundingClientRect().left,
      scrollLeft: container.scrollLeft,
      statePlayhead: state ? state.playhead : null,
      stateIsPlaying: state ? state.isPlaying : null
    };
  });
  console.log('再生開始直後 - プレイヘッド:', playback1.playheadScreenLeft, 'スクロール:', playback1.scrollLeft, 'state.playhead:', playback1.statePlayhead, 'state.isPlaying:', playback1.stateIsPlaying);

  // 200ms後
  await page.waitForTimeout(200);

  const playback2 = await page.evaluate(() => {
    const container = document.querySelector('[role="table"]') as HTMLElement;
    const playhead = container.querySelector('[data-testid="timeline-playhead"]') as HTMLElement;
    return {
      playheadScreenLeft: playhead.getBoundingClientRect().left,
      scrollLeft: container.scrollLeft
    };
  });
  console.log('再生200ms後 - プレイヘッド:', playback2.playheadScreenLeft, 'スクロール:', playback2.scrollLeft);

  // 再生中のスクリーンショット
  await page.screenshot({ path: 'e2e/screenshots/complete-playback.png', fullPage: true });

  // 最終判定
  console.log('\n=== 最終判定 ===');

  // 録音時の判定
  const recordingPlayheadFixed = Math.abs(recording1.playheadScreenLeft - recording2.playheadScreenLeft) < 1 &&
                                  Math.abs(recording2.playheadScreenLeft - recording3.playheadScreenLeft) < 1 &&
                                  Math.abs(recording3.playheadScreenLeft - recording4.playheadScreenLeft) < 1;
  console.log('録音時プレイヘッド固定:', recordingPlayheadFixed ? '✅' : '❌');
  console.log('  開始:', recording1.playheadScreenLeft);
  console.log('  キック後:', recording2.playheadScreenLeft);
  console.log('  スネア後:', recording3.playheadScreenLeft);
  console.log('  ハイハット後:', recording4.playheadScreenLeft);

  const recordingScrolling = recording4.scrollLeft > recording1.scrollLeft;
  console.log('録音時タイムラインスクロール:', recordingScrolling ? '✅' : '❌');
  console.log('  開始:', recording1.scrollLeft);
  console.log('  ハイハット後:', recording4.scrollLeft);

  const allNotesVisible = recording4.noteDetails.every(note => note.isInViewport);
  console.log('録音時ノート表示:', allNotesVisible ? '✅' : '❌', `(${recording4.noteCount}個)`);

  // 再生時の判定
  const playbackPlayheadFixed = Math.abs(playback1.playheadScreenLeft - playback2.playheadScreenLeft) < 1;
  console.log('\n再生時プレイヘッド固定:', playbackPlayheadFixed ? '✅' : '❌');
  console.log('  開始:', playback1.playheadScreenLeft);
  console.log('  200ms後:', playback2.playheadScreenLeft);

  const playbackScrolling = playback2.scrollLeft > playback1.scrollLeft;
  console.log('再生時タイムラインスクロール:', playbackScrolling ? '✅' : '❌');
  console.log('  開始:', playback1.scrollLeft);
  console.log('  200ms後:', playback2.scrollLeft);

  // アサーション
  expect(recordingPlayheadFixed).toBe(true);
  expect(recordingScrolling).toBe(true);
  expect(recording4.noteCount).toBe(3);
  expect(allNotesVisible).toBe(true);
  expect(playbackPlayheadFixed).toBe(true);
  expect(playbackScrolling).toBe(true);
});
