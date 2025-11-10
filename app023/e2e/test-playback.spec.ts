import { test } from '@playwright/test';

test('再生機能の動作確認', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1000);

  console.log('=== 録音開始 ===');
  await page.click('button[aria-label="Record"]');
  await page.waitForTimeout(100);

  // 3つの音を録音
  await page.keyboard.press('a'); // kick at ~0.1s
  await page.waitForTimeout(200);
  await page.keyboard.press('s'); // snare at ~0.3s
  await page.waitForTimeout(200);
  await page.keyboard.press('d'); // hihat at ~0.5s
  await page.waitForTimeout(100);

  // 録音停止
  console.log('=== 録音停止 ===');
  await page.click('button[aria-label="Record"]');
  await page.waitForTimeout(500);

  // 録音後のスクリーンショット
  await page.screenshot({ path: 'e2e/screenshots/after-recording.png', fullPage: true });

  // 再生開始
  console.log('=== 再生開始 ===');
  await page.click('button[aria-label="Play"]');
  await page.waitForTimeout(100);

  // 再生中のプレイヘッド位置とスクロール状態を確認
  const playbackData = await page.evaluate(() => {
    const container = document.querySelector('[role="table"]') as HTMLElement;
    const playhead = container.querySelector('[data-testid="timeline-playhead"]') as HTMLElement;

    return {
      playheadLeft: window.getComputedStyle(playhead).left,
      scrollLeft: container.scrollLeft,
      scrollWidth: container.scrollWidth,
      clientWidth: container.clientWidth
    };
  });

  console.log('\n=== 再生開始直後 ===');
  console.log('プレイヘッド位置:', playbackData.playheadLeft);
  console.log('スクロール位置:', playbackData.scrollLeft);

  // 300ms待つ（再生が進む）
  await page.waitForTimeout(300);

  const playbackData2 = await page.evaluate(() => {
    const container = document.querySelector('[role="table"]') as HTMLElement;
    const playhead = container.querySelector('[data-testid="timeline-playhead"]') as HTMLElement;

    return {
      playheadLeft: window.getComputedStyle(playhead).left,
      scrollLeft: container.scrollLeft
    };
  });

  console.log('\n=== 再生中（300ms後） ===');
  console.log('プレイヘッド位置:', playbackData2.playheadLeft);
  console.log('スクロール位置:', playbackData2.scrollLeft);

  // 再生中のスクリーンショット
  await page.screenshot({ path: 'e2e/screenshots/during-playback.png', fullPage: true });

  // 判定
  console.log('\n=== 判定 ===');
  const playheadMoved = playbackData.playheadLeft !== playbackData2.playheadLeft;

  if (playheadMoved) {
    console.log('✅ プレイヘッドが動いている');
  } else {
    console.log('❌ プレイヘッドが動いていない');
    console.log('   初期:', playbackData.playheadLeft);
    console.log('   300ms後:', playbackData2.playheadLeft);
  }

  if (playbackData2.scrollLeft === 0) {
    console.log('⚠️  スクロールが0（固定されている可能性）');
  } else {
    console.log('✅ スクロールが動いている');
  }
});
