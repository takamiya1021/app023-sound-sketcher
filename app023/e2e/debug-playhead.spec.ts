import { test, expect } from '@playwright/test';

test('録音時のプレイヘッド動作確認', async ({ page }) => {
  const consoleLogs: string[] = [];

  // コンソールログをキャプチャ
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
  });

  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1000);

  // 初期状態のプレイヘッド位置
  const initialLeft = await page.locator('[data-testid="timeline-playhead"]').evaluate(el => {
    return window.getComputedStyle(el).left;
  });

  console.log('=== 録音開始前 ===');
  console.log('プレイヘッド位置:', initialLeft);

  // 録音開始ボタンをクリック
  await page.click('button[aria-label="Record"]');

  // 録音中であることを確認
  const isRecording1 = await page.evaluate(() => {
    const recordBtn = document.querySelector('button[aria-label="Record"]');
    return recordBtn?.textContent?.includes('録音停止') || false;
  });
  console.log('\n=== 録音開始直後 ===');
  console.log('録音中:', isRecording1);

  // 100ms待ってから1つ目のキーを押す
  await page.waitForTimeout(100);
  await page.keyboard.press('a'); // kick at ~0.1s
  console.log('キー押下: a (kick)');

  // ノート確認1
  await page.waitForTimeout(50);
  const notes1 = await page.locator('[data-testid^="timeline-note-"]').count();
  console.log('ノート数:', notes1);

  // 200ms待ってから2つ目のキーを押す
  await page.waitForTimeout(200);
  await page.keyboard.press('s'); // snare at ~0.35s
  console.log('キー押下: s (snare)');

  // ノート確認2
  await page.waitForTimeout(50);
  const notes2 = await page.locator('[data-testid^="timeline-note-"]').count();
  console.log('ノート数:', notes2);

  // 300ms待ってから3つ目のキーを押す
  await page.waitForTimeout(300);
  await page.keyboard.press('d'); // hihat-closed at ~0.7s
  console.log('キー押下: d (hihat-closed)');

  // ノート確認3
  await page.waitForTimeout(50);
  const notes3 = await page.locator('[data-testid^="timeline-note-"]').count();
  console.log('ノート数:', notes3);

  // さらに200ms待つ
  await page.waitForTimeout(200);

  // 録音中の状態を詳細確認
  const recordingData = await page.evaluate(() => {
    const container = document.querySelector('[role="table"]') as HTMLElement;
    const playhead = container.querySelector('[data-testid="timeline-playhead"]') as HTMLElement;
    const notes = container.querySelectorAll('[data-testid^="timeline-note-"]');
    const recordBtn = document.querySelector('button[aria-label="Record"]');

    const noteDetails = Array.from(notes).map(note => {
      const el = note as HTMLElement;
      const rect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(el);

      return {
        id: el.getAttribute('data-testid'),
        left: computedStyle.left,
        top: computedStyle.top,
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        backgroundColor: computedStyle.backgroundColor,
        width: computedStyle.width,
        height: computedStyle.height,
        isInViewport: rect.right > containerRect.left && rect.left < containerRect.right,
        ariaLabel: el.getAttribute('aria-label')
      };
    });

    return {
      isRecording: recordBtn?.textContent?.includes('録音停止') || false,
      playheadLeft: window.getComputedStyle(playhead).left,
      scrollLeft: container.scrollLeft,
      scrollWidth: container.scrollWidth,
      clientWidth: container.clientWidth,
      containerLeft: container.getBoundingClientRect().left,
      noteCount: notes.length,
      noteDetails
    };
  });

  console.log('\n=== 録音中の状態（最終確認） ===');
  console.log('録音中:', recordingData.isRecording);
  console.log('プレイヘッド位置:', recordingData.playheadLeft);
  console.log('タイムラインスクロール:', recordingData.scrollLeft);
  console.log('スクロール可能幅:', recordingData.scrollWidth - recordingData.clientWidth);
  console.log('ノート数:', recordingData.noteCount);
  console.log('\nノート詳細:');
  recordingData.noteDetails.forEach((note, i) => {
    console.log(`  ${i + 1}. ${note.ariaLabel}`);
    console.log(`      ID: ${note.id}`);
    console.log(`      位置: left=${note.left}, top=${note.top}`);
    console.log(`      サイズ: ${note.width} x ${note.height}`);
    console.log(`      表示: display=${note.display}, visibility=${note.visibility}, opacity=${note.opacity}`);
    console.log(`      背景色: ${note.backgroundColor}`);
    console.log(`      ビューポート内: ${note.isInViewport}`);
  });

  // コンソールログを出力
  console.log('\n=== コンソールログ ===');
  const relevantLogs = consoleLogs.filter(log =>
    log.includes('[Timeline') || log.includes('[KeyboardController')
  );
  relevantLogs.slice(0, 50).forEach((log, i) => {
    console.log(`${i + 1}:`, log);
  });

  // スクリーンショットを撮影
  await page.screenshot({ path: 'e2e/screenshots/recording-with-notes.png', fullPage: true });
  console.log('\nスクリーンショット保存: e2e/screenshots/recording-with-notes.png');

  console.log('\n=== 最終判定 ===');
  console.log('初期位置:', initialLeft);
  console.log('録音後プレイヘッド:', recordingData.playheadLeft);

  // 録音中かどうか
  if (!recordingData.isRecording) {
    console.log('❌ 録音が停止している');
  } else {
    console.log('✅ 録音中');
  }

  // プレイヘッドが動いているか
  if (initialLeft === recordingData.playheadLeft) {
    console.log('❌ プレイヘッドが動いていない');
  } else {
    console.log('✅ プレイヘッドが動いている');
  }

  // スクロール状態
  if (recordingData.scrollLeft === 0) {
    console.log('✅ タイムラインスクロール = 0（固定）');
  } else {
    console.log(`❌ タイムラインがスクロールしている (${recordingData.scrollLeft}px)`);
  }

  // ノート数
  if (recordingData.noteCount === 3) {
    console.log(`✅ ノートが正しく追加されている (${recordingData.noteCount}個)`);
  } else {
    console.log(`❌ ノート数が期待と異なる (期待: 3個, 実際: ${recordingData.noteCount}個)`);
  }

  // ノートが視覚的に表示されているか
  const allVisible = recordingData.noteDetails.every(note =>
    note.display !== 'none' &&
    note.visibility !== 'hidden' &&
    parseFloat(note.opacity) > 0 &&
    note.isInViewport
  );

  if (allVisible && recordingData.noteDetails.length === 3) {
    console.log('✅ すべてのノートがビューポート内に表示されている');
  } else {
    console.log('❌ 一部のノートが表示されていない');
    recordingData.noteDetails.forEach((note, i) => {
      if (!note.isInViewport || note.display === 'none' || note.visibility === 'hidden' || parseFloat(note.opacity) === 0) {
        console.log(`   - ノート${i + 1}: 表示問題あり`);
      }
    });
  }

  // アサーション
  expect(recordingData.isRecording).toBe(true);
  expect(recordingData.noteCount).toBe(3);
  expect(recordingData.scrollLeft).toBe(0);
  expect(allVisible).toBe(true);
});
