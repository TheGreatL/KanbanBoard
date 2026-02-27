import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should show error for invalid login', async ({ page }) => {
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Expect a toast or error message
    // Based on AuthForm.tsx, it uses useToast
    const toast = page.locator('text=Login Failed');
    await expect(toast).toBeVisible();
  });

  test('should validate registration fields', async ({ page }) => {
    await page.click('button:has-text("Don\'t have an account")');
    
    // Attempt empty submit
    await page.click('button[type="submit"]');
    
    // HTML5 validation usually takes care of this, but let's check if we have custom ones
    // For now, let's verify required attributes are present
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('required', '');
    
    const usernameInput = page.locator('input[placeholder="johndoe"]');
    await expect(usernameInput).toHaveAttribute('required', '');
  });

  test('should successfully toggle between login and signup', async ({ page }) => {
    const signupBtn = page.getByRole('button', { name: /Don't have an account/i });
    await signupBtn.click();
    await expect(page.locator('h2')).toContainText(/Create an account/i);
    
    const loginBtn = page.getByRole('button', { name: /Already have an account/i });
    await loginBtn.click();
    await expect(page.locator('h2')).toContainText(/Welcome back/i);
  });
});
