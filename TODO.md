# ygiaphan — TODO

> เว็บเรียนภาษาเวียดนาม-ไทย (bilingual learning platform)  
> Stack: Vanilla JS + GitHub Pages + Google Apps Script + Google Sheets

---

## สถานะปัจจุบัน

| ส่วน | สถานะ |
|---|---|
| Frontend (HTML/CSS/JS) | ✅ ทำงานได้ |
| Backend (GAS) | ✅ ทำงานได้ |
| Auth (Magic Link, FB, Google) | ✅ ทำงานได้ |
| PWA (manifest, sw.js) | ✅ ทำงานได้ |
| Content (posts) | ✅ 10 posts (greetings, six-tones, ordering-food, numbers, days-of-week, colors, family, body-parts, transportation, weather) |
| Vocab SRS (full) | ✅ save/due/review/list/delete + phonetic + library view + box stats |
| TTS (cross-platform) | ✅ `tts.js` Google Translate audio + browser fallback |
| Lang direction (target/native) | ✅ flashcard/vocab card swap ตาม UI lang |
| i18n coverage | ✅ nav/vocab/quiz/dict/donate/login/me/post ใช้ keys ครบ |
| Config (production) | ✅ config.example.js + .gitignore อัปเดตแล้ว |
| File structure | ✅ app.js แยกเป็น pwa/i18n/ui/card · Code.gs แยกตาม domain |
| GitHub Actions | ✅ deploy-pages + ci + deploy-gas |
| Tests | ✅ 30/30 unit tests pass |
| Admin email hardcode | ✅ ย้ายไป server-side (is_admin จาก GAS) |

---

## Phase 1 — Config & Security (ทำก่อน เพราะ HIGH severity)

### 1.1 แยก config จาก code
- [ ] สร้าง `content/config.example.js` — template พร้อม placeholder ชัดเจน
- [ ] เพิ่ม `content/config.js` เข้า `.gitignore` (กันไม่ให้ secret ขึ้น git)
- [ ] ย้าย `GOOGLE_CLIENT_ID`, `FB_APP_ID`, `API_URL`, `DONATE.*` ออกจาก committed file
- [ ] แทนที่ hardcoded `ADMIN_EMAILS = ['giayphan@gmail.com']` ใน `app.js` ด้วย API call ไปถาม GAS
- [ ] แทนที่ PromptPay placeholder `0812345678` ด้วยค่าจริง (ใน config ที่ gitignored)

### 1.2 GAS — ย้าย secrets เข้า PropertiesService
- [ ] ย้าย `SHEET_ID` → `PropertiesService.getScriptProperties().getProperty('SHEET_ID')`
- [ ] ย้าย `ADMIN_KEY` → PropertiesService
- [ ] ย้าย `SITE_URL` → PropertiesService
- [ ] สร้าง `gas/Config.gs` เป็น wrapper อ่าน properties ทั้งหมด
- [ ] ลบ `SHEET_ID="PUT_YOUR_SHEET_ID_HERE"` และ `ADMIN_KEY="change-me-please"` ออกจาก source

### 1.3 Cleanup ไฟล์หลุด
- [ ] ลบ `cc1d86c5-aa9b-4cd9-9cc4-471c2efacb14.jpg` (ไฟล์หลุดที่ root)

---

## Phase 2 — แยกไฟล์ Frontend

> ข้อจำกัด: ไม่มี bundler → ใช้ ES modules (`type="module"`) แทน

### 2.1 แยก `assets/js/app.js` (381 บรรทัด) → หลายไฟล์

```
assets/js/
├── main.js          ← bootstrap เท่านั้น (import + DOMContentLoaded)
├── pwa.js           ← SW registration, install prompt, update toast
├── i18n.js          ← ภาษา/แปล, detectLocale, language switcher
├── ui/
│   ├── header.js    ← injectHeader(), nav highlighting
│   ├── footer.js    ← injectFooter()
│   └── card.js      ← renderPostCard()
├── features/
│   ├── search.js    ← modal search, in-memory index, scoring
│   └── likes.js     ← like/view counter (localStorage)
└── auth/
    ├── session.js   ← token read/write, currentUser()
    └── guards.js    ← isAdmin() → fetch จาก API ไม่ hardcode
```

- [ ] สร้าง `assets/js/utils/dom.js` — qs(), qsa(), on(), createEl()
- [ ] สร้าง `assets/js/utils/storage.js` — localStorage/sessionStorage wrapper
- [ ] แยก PWA logic → `assets/js/pwa.js`
- [ ] แยก i18n → `assets/js/i18n.js` + `assets/js/detectLocale.js`
- [ ] แยก header/footer inject → `assets/js/ui/header.js`, `footer.js`
- [ ] แยก card render → `assets/js/ui/card.js`
- [ ] แยก search → `assets/js/features/search.js`
- [ ] แยก likes/views → `assets/js/features/likes.js`
- [ ] แยก session/auth → `assets/js/auth/session.js`, `guards.js`
- [ ] เปลี่ยน `<script src="app.js">` ทุกหน้า → `<script type="module" src="/assets/js/main.js">`
- [ ] ลบ `app.js` เดิมหลัง migrate เสร็จ

### 2.2 แยก `assets/js/api.js` (55 บรรทัด) — ยังโอเค แค่ refactor
- [ ] เพิ่ม retry logic + error envelope ใน `api.js`
- [ ] แยก endpoint constants ออกเป็น `assets/js/api/endpoints.js`

### 2.3 CSS
- [ ] สร้าง `assets/css/tokens.css` — CSS variables (colors, spacing, font-size)
- [ ] แยก `main.css` → `base.css`, `components/card.css`, `components/header.css`

---

## Phase 3 — แยกไฟล์ Backend (GAS)

> ใช้ [clasp](https://github.com/google/clasp) เพื่อ multi-file GAS

### 3.1 Setup clasp
- [ ] `npm install -g @google/clasp`
- [ ] `clasp login`
- [ ] สร้าง `gas/.clasp.example.json` (committed)
- [ ] สร้าง `gas/.clasp.json` (gitignored) พร้อม `scriptId` จริง
- [ ] สร้าง `gas/appsscript.json`

### 3.2 แยก `gas/Code.gs` (942 บรรทัด) → หลายไฟล์

```
gas/
├── Main.gs              ← doGet, doPost (delegate เท่านั้น)
├── core/
│   ├── Router.gs        ← dispatch by ?action=
│   ├── Response.gs      ← ok(data), err(code, msg)
│   └── RateLimit.gs     ← CacheService-backed throttler
├── config/
│   ├── Config.gs        ← อ่าน PropertiesService
│   └── Constants.gs     ← sheet names, status enums
├── lib/
│   ├── SheetRepo.gs     ← generic CRUD บน Spreadsheet
│   ├── Crypto.gs        ← timing-safe compare, token gen
│   └── Mail.gs          ← sendMagicLink()
├── auth/
│   ├── Session.gs       ← createSession, validateSession
│   ├── MagicLink.gs     ← send + verify OTP
│   ├── OAuthGoogle.gs   ← verifyGoogleToken
│   ├── OAuthFacebook.gs ← verifyFbToken
│   └── AdminRepo.gs     ← getAdminList() จาก Sheet (ไม่ hardcode)
└── domain/
    ├── posts/           ← PostsController.gs, PostsRepo.gs
    ├── comments/        ← CommentsController.gs, CommentsRepo.gs
    ├── orders/          ← OrdersController.gs, OrdersRepo.gs
    ├── vocab/           ← VocabController.gs, VocabRepo.gs
    ├── srs/             ← SrsController.gs, SrsService.gs (SM-2)
    ├── donations/       ← DonationsController.gs
    └── admin/           ← AdminController.gs
```

- [ ] สร้าง `gas/core/Router.gs` + ย้าย dispatch logic
- [ ] สร้าง `gas/core/Response.gs` + standardize response envelope
- [ ] สร้าง `gas/lib/SheetRepo.gs` + refactor sheet access
- [ ] แยก Auth handlers (MagicLink, Google, Facebook, Session)
- [ ] แยก domain แต่ละส่วน (Posts → Comments → Orders → Vocab → SRS → Admin)
- [ ] `clasp push` ทดสอบแต่ละ domain หลัง migrate
- [ ] ลบ `Code.gs` หลัง migrate เสร็จ

---

## Phase 4 — Infrastructure & CI/CD

### 4.1 GitHub Actions
- [ ] สร้าง `.github/workflows/deploy-pages.yml` — deploy GitHub Pages บน push to `main`
- [ ] สร้าง `.github/workflows/ci.yml` — lint HTML, check broken links
- [ ] สร้าง `.github/workflows/deploy-gas.yml` — `clasp push` เมื่อ `gas/**` เปลี่ยน (ใช้ secret `CLASPRC_JSON`)
- [ ] เพิ่ม GitHub Secrets: `CLASPRC_JSON`

### 4.2 .gitignore
- [ ] เพิ่ม `content/config.js`
- [ ] เพิ่ม `gas/.clasp.json`
- [ ] เพิ่ม `node_modules/`

---

## Phase 5 — Content & UX

### 5.1 เพิ่ม posts
- [x] ตัวเลข 0-10
- [x] วันในสัปดาห์
- [x] สีพื้นฐาน
- [x] ครอบครัว
- [x] ร่างกาย, การเดินทาง, สภาพอากาศ
- [ ] เพิ่ม `::: vocab` block ใน 9 posts ที่เหลือ (auto-extract จากตารางทำงานแล้ว แต่ ph อาจไม่ครบ)
- [ ] ภาษาไทยสำหรับชาวเวียดนาม (ชุดแรก)
- [ ] สระในภาษาไทยสำหรับชาวเวียดนาม

### 5.2 ปรับ UX
- [ ] เพิ่ม `offline.html` — หน้า fallback เมื่อไม่มีเน็ต
- [ ] เพิ่ม `404.html`
- [ ] เพิ่ม `sitemap.xml`
- [x] ปรับ `robots.txt` — block /me.html, /data-deletion.html

---

## Phase 5.5 — Vocab/SRS/TTS (เพิ่งทำเสร็จ)

- [x] Backend: `vocab_list`, `vocab_delete` + column `ph`
- [x] vocabSave รับ ph + auto-add column ถ้าไม่มี + backfill
- [x] vocabDue/Review: รองรับ Date object จาก Sheets + force number format
- [x] me.html: Library view + box stats (สี 0-5) + 🔊 + 🗑 + keyboard (Space/1/2) + shuffle
- [x] post.html: ปุ่ม 🔊 อ่านบทความ (skip code/table/vocab/quiz blocks, chunked sentences)
- [x] `assets/js/tts.js` — shared Google Translate audio + browser fallback + onfinish callback
- [x] กฎ target = opposite ของ UI lang ใน flashcard/vocab card/library/TTS
- [x] dict.js normalize regex fix (`̀-ͯ` for VN diacritics)
- [x] i18n: เพิ่ม ~80 keys ทั้ง th/vi + wire ใน ui/learn/dict/post/me/login/about/dictionary
- [x] ทุก HTML ใช้ `<html>` ลอย → JS set lang runtime

ที่ยังเหลือ:
- [ ] TTS: ปุ่ม play/pause ในระหว่างอ่านบทความ (highlight ประโยคปัจจุบัน)
- [ ] vocab: import จาก dict ★ → SRS (ปัจจุบันแยกระบบ)
- [ ] vocab: 2-way recall (สลับ target ↔ native ทุก review)
- [ ] vocab: undo จริง (ตอนนี้ refresh page)
- [ ] admin.html: i18n (low priority, admin-only)

---

## Phase 6 — Testing

- [ ] สร้าง `tests/unit/srs.test.js` — ทดสอบ SM-2/Leitner algorithm
- [ ] สร้าง `tests/unit/i18n.test.js` — ทดสอบ translation lookup
- [ ] สร้าง `tests/unit/validation.test.js` — ทดสอบ input validation
- [ ] สร้าง `tests/e2e/smoke.spec.js` — Playwright: login → read post → add vocab
- [ ] ตั้ง `vitest` (no build, browser mode) หรือ `node --test`

---

## Architecture Overview

```
Browser (GitHub Pages)          Backend (Google Apps Script)
┌─────────────────────┐         ┌──────────────────────────┐
│ HTML pages          │         │ Main.gs (doGet/doPost)   │
│ └─ main.js (ESM)   │         │ └─ Router.gs             │
│    ├─ pwa.js        │         │    ├─ domain/posts/      │
│    ├─ i18n.js       │──HTTP──▶│    ├─ domain/comments/   │
│    ├─ api/*.js      │         │    ├─ domain/vocab/      │
│    ├─ ui/*.js       │         │    ├─ auth/              │
│    └─ features/*.js │         │    └─ lib/SheetRepo.gs   │
└─────────────────────┘         └──────────┬───────────────┘
                                            │
                                 ┌──────────▼───────────────┐
                                 │ Google Sheets (Database) │
                                 │ posts, users, sessions,  │
                                 │ vocab, orders, donations │
                                 └──────────────────────────┘
```

**Key decisions:**
- ไม่ใช้ bundler → ES modules (`type="module"`) แทน
- GAS ไม่มี ES modules → ใช้ namespace objects (`const PostsRepo = {}`)
- `sw.js` ต้องอยู่ที่ root เสมอ (scope = `/`)
- Admin list → ย้ายออกจาก hardcode ใน JS → fetch จาก GAS

---

## ลำดับความสำคัญ

```
🔴 Phase 1 — Security/Config  (ทำก่อน)
🟠 Phase 2 — Frontend split   (ทำต่อ)
🟡 Phase 3 — Backend split    (ทำหลัง)
🟢 Phase 4 — CI/CD            (ทำพร้อม Phase 3)
🔵 Phase 5 — Content          (ทำตลอด)
⚪ Phase 6 — Tests             (ทำสุดท้าย)
```
