# Mobile E2E Tests

Playwright tests สำหรับ UX/UI บน mobile viewport (iPhone 12 + Pixel 5)

## รัน local

```bash
npm install
npx playwright install chromium
npm run test:mobile
```

## เปิด HTML report

```bash
npx playwright show-report tests/e2e/report
```

## เช็คอะไรบ้าง (ทุกหน้า × ทุก device)

- viewport meta `width=device-width`
- ไม่มี horizontal scroll (`scrollWidth ≤ clientWidth`)
- tap target ≥ 40px (a, button, [role=button], submit)
- font ≥ 12px สำหรับ text ที่มีเนื้อหา
- ไม่มี uncaught JS error

## หน้าที่ test

ดู `helpers.js → PAGES`. แก้ list ที่นั่นถ้ามี route เพิ่ม

## CI

ตอนนี้ run local เท่านั้น — ไม่มี GitHub Actions workflow
