// @ts-check
const { test, expect } = require('@playwright/test');
const { PAGES, expectNoHorizontalScroll, findSmallTapTargets, findSmallFonts } = require('./helpers');

for (const p of PAGES) {
  test.describe(`mobile ${p.name} (${p.path})`, () => {
    test.beforeEach(async ({ page }) => {
      const errs = [];
      page.on('pageerror', e => errs.push(e.message));
      // suppress expected API 404s in some envs but keep js errors
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);
      page['_pageErrors'] = errs;
    });

    test('viewport meta present', async ({ page }) => {
      const content = await page.getAttribute('meta[name="viewport"]', 'content');
      expect(content).toContain('width=device-width');
    });

    test('no horizontal scroll', async ({ page }) => {
      await expectNoHorizontalScroll(page);
    });

    test('tap targets ≥ 40px', async ({ page }) => {
      const small = await findSmallTapTargets(page);
      if (small.length) {
        console.log(`[${p.name}] small tap targets:\n` + JSON.stringify(small, null, 2));
      }
      expect(small, `small tap targets found on ${p.name}`).toEqual([]);
    });

    test('no visible text smaller than 12px', async ({ page }) => {
      const small = await findSmallFonts(page);
      if (small.length) {
        console.log(`[${p.name}] small fonts:\n` + JSON.stringify(small, null, 2));
      }
      expect(small, `small fonts found on ${p.name}`).toEqual([]);
    });

    test('no uncaught JS errors', async ({ page }) => {
      const errs = page['_pageErrors'] || [];
      expect(errs, `js errors on ${p.name}`).toEqual([]);
    });
  });
}
