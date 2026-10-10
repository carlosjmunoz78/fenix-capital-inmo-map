import { expect, test } from '@playwright/test';

test('opening an owner decision link never submits a decision', async ({ page }) => {
  const gatewayRequests: Array<{ method: string; url: string }> = [];
  page.on('request', (request) => {
    if (request.url().includes('/functions/v1/cerebro-owner-decision-gateway-v0')) {
      gatewayRequests.push({ method: request.method(), url: request.url() });
    }
  });

  await page.goto('/cerebro/tests/owner-decision-harness.html?approval_id=APR-20990101-ABCDEF12&intent=AUTORIZO');
  await expect(page.locator('[data-owner-decision-harness="ready"]')).toBeVisible();
  await page.waitForTimeout(1200);

  expect(gatewayRequests).toEqual([]);
});
