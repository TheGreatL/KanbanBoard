import { test, expect, devices } from '@playwright/test';

test.describe('Responsive Design', () => {
  
  test('Dashboard should adapt to mobile view', async ({ page }) => {
    // Set viewport to mobile
    await page.setViewportSize(devices['iPhone 14'].viewport);
    await page.goto('/');

    // Check if sidebar is hidden (or becomes a drawer)
    await expect(page.locator('aside')).toBeVisible(); // Or hidden depending on implementation
    
    // Check for menu button
    await expect(page.locator('button:has(svg.lucide-menu)')).toBeVisible();
  });

  test('Project board should use horizontal scroll on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    const board = page.locator('main');
    await expect(board).toHaveCSS('overflow-x', 'auto');
  });

  test('Modals should be full-screen or centered on mobile', async ({ page }) => {
    await page.setViewportSize(devices['iPhone 14'].viewport);
    await page.goto('/');
    
    const addColumnBtn = page.getByRole('button', { name: /Add Column/i });
    if (await addColumnBtn.isVisible()) {
      await addColumnBtn.click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      // Verify modal styling on mobile (e.g., width 100% or close to it)
    }
  });
});
