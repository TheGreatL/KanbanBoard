import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show auth page when not logged in', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/auth/);
    await expect(page.locator('h2')).toContainText(/Welcome back|Create an account/);
  });

  test('should have proper autocomplete attributes', async ({ page }) => {
    await page.goto('/auth');
    
    // Check login state
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    
    // Switch to signup
    await page.click('button:has-text("Sign up")');
    await expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
  });
});
