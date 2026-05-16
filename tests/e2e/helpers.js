// @ts-check
const { expect } = require('@playwright/test');

const PAGES = [
  { path: '/index.html',        name: 'home' },
  { path: '/about.html',        name: 'about' },
  { path: '/contact.html',      name: 'contact' },
  { path: '/courses.html',      name: 'courses' },
  { path: '/dictionary.html',   name: 'dictionary' },
  { path: '/category.html?cat=basic', name: 'category' },
  { path: '/login.html',        name: 'login' },
  { path: '/me.html',           name: 'me' },
  { path: '/post.html?slug=hello', name: 'post' },
  { path: '/data-deletion.html',name: 'data-deletion' },
];

const MIN_TAP = 40;   // 44 ideal, allow 40 for icon buttons (small icons)
const MIN_FONT = 12;  // 14 ideal, allow 12 for meta/tag text

async function expectNoHorizontalScroll(page) {
  const overflow = await page.evaluate(() => ({
    docW: document.documentElement.scrollWidth,
    viewW: document.documentElement.clientWidth,
  }));
  expect(overflow.docW, `horizontal scroll: doc=${overflow.docW} view=${overflow.viewW}`)
    .toBeLessThanOrEqual(overflow.viewW + 1);
}

async function findSmallTapTargets(page) {
  return page.evaluate((min) => {
    const sel = 'a, button, [role="button"], input[type="submit"], input[type="button"]';
    const out = [];
    document.querySelectorAll(sel).forEach(el => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || r.width === 0 || r.height === 0) return;
      if (el.closest('[hidden]') || el.hasAttribute('hidden')) return;
      if (r.width < min || r.height < min) {
        out.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          cls: el.className && String(el.className).slice(0, 60),
          text: (el.textContent || '').trim().slice(0, 40),
          w: Math.round(r.width), h: Math.round(r.height),
        });
      }
    });
    return out;
  }, MIN_TAP);
}

async function findSmallFonts(page) {
  return page.evaluate((min) => {
    const out = [];
    document.querySelectorAll('body *').forEach(el => {
      if (!el.textContent || !el.textContent.trim()) return;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      const fs = parseFloat(style.fontSize);
      if (fs && fs < min) {
        // ignore icon-only / single-char meta
        const txt = (el.innerText || '').trim();
        if (txt.length < 2) return;
        out.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className || '').slice(0, 40),
          fs, text: txt.slice(0, 40),
        });
      }
    });
    return out.slice(0, 20);
  }, MIN_FONT);
}

module.exports = { PAGES, MIN_TAP, MIN_FONT, expectNoHorizontalScroll, findSmallTapTargets, findSmallFonts };
