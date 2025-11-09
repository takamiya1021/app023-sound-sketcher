import { test, expect } from '@playwright/test';

test.describe('Sound Sketcher E2E', () => {
  test('home hero renders primary sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /create beats/i })).toBeVisible();
    await expect(page.getByTestId('key-a')).toBeVisible();
    await expect(page.getByRole('heading', { name: /AI Suggestions/i })).toBeVisible();
  });

  test('keyboard key highlights on key press', async ({ page }) => {
    await page.goto('/');
    await page.click('body');
    await page.keyboard.down('a');
    await expect(page.getByTestId('key-a')).toHaveAttribute('data-active', 'true');
    await page.keyboard.up('a');
    await expect(page.getByTestId('key-a')).toHaveAttribute('data-active', 'false');
  });

  test('BPM control updates and validates input', async ({ page }) => {
    await page.goto('/');
    const bpmInput = page.getByLabel('Set BPM');
    await bpmInput.fill('150');
    await page.getByRole('button', { name: '反映' }).click();
    await expect(page.getByTestId('bpm-current')).toHaveText('150');

    await bpmInput.fill('20');
    await page.getByRole('button', { name: '反映' }).click();
    await expect(page.getByTestId('bpm-error')).toHaveText(/BPMは60〜240/);
  });

  test('AI suggestion card saves key', async ({ page }) => {
    await page.goto('/');

    const keyInput = page.getByPlaceholder('sk-...');
    await keyInput.fill('demo-key');
    await page.getByRole('button', { name: /save api key/i }).click();
    await expect(page.getByTestId('ai-message')).toHaveText(/APIキーを保存しました/i);
  });

  test('AI suggestion card surfaces missing key error', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /analyze beat/i }).click();
    await expect(page.getByTestId('ai-message')).toHaveText(/APIキーを設定してください/i);
  });
});
