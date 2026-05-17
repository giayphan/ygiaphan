# CLAUDE.md — ygiaphan

เว็บเรียนภาษาเวียดนาม-ไทย  
Stack: **Vanilla JS + GitHub Pages (frontend)** + **Google Apps Script (backend)** + **Google Sheets (database)**  
ไม่มี bundler — ใช้ `<script>` tags ธรรมดา (ES modules ยังไม่ได้ migrate)

---

## Architecture

```
Browser (GitHub Pages)              Backend (Google Apps Script)
HTML pages + <script> tags   HTTP   gas/Main.gs → doGet / doPost
assets/js/*.js            ──────▶  gas/domain/*Controller.gs
content/config.js                  gas/lib/SheetRepo.gs
                                          │
                                   Google Sheets (DB)
                                   posts · users · sessions
                                   vocab · orders · donations
                                   magic_tokens · courses · ...
```

**CORS workaround:** POST ใช้ `Content-Type: text/plain` เพื่อเลี่ยง preflight (GAS ข้อจำกัด)  
**Session:** token เก็บใน `localStorage('yp:session')` TTL 30 วัน  
**Admin auth:** 2FA (password + OTP email) + fingerprint, TTL 60 นาที  

---

## File Map

### Frontend — `assets/js/`

| ไฟล์ | หน้าที่ |
|------|---------|
| `api.js` | `window.YP_API` — HTTP client ทุก endpoint |
| `auth.js` | `window.YP_AUTH` — login/logout/token/currentUser |
| `ui.js` | inject header/footer, nav highlight |
| `card.js` | render post card HTML |
| `home.js` | หน้า index — load posts, search, slides |
| `post.js` | หน้า post — load content, comments, vocab save |
| `learn.js` | SRS vocab review (SM-2/Leitner) |
| `dict.js` | dictionary page — load + filter |
| `i18n.js` | `window.YP_I18N` — translate(), detectLocale() |
| `pwa.js` | SW register, install prompt, update toast |
| `marked.min.js` | Markdown renderer (vendor, อย่าแก้) |

### Frontend — Config & Content

| ไฟล์ | หน้าที่ |
|------|---------|
| `content/config.js` | `window.YP_CONFIG` — API_URL, USE_API, FB_APP_ID, DONATE (**gitignored, อย่า commit**) |
| `content/config.example.js` | template สำหรับ clone ใหม่ |
| `content/site.js` | ชื่อเว็บ, meta, social |
| `content/nav.js` | เมนู navigation |
| `content/slides.js` | hero slides หน้าแรก |
| `content/courses.js` | รายการคอร์ส (static fallback) |
| `content/dictionary.js` | dictionary data (static fallback) |
| `content/i18n/th.js` | UI strings ภาษาไทย |
| `content/i18n/vi.js` | UI strings ภาษาเวียดนาม |
| `content/posts/_list.js` | `window.YP_POST_LIST` — slug array |
| `content/posts/*.js` | post data แต่ละบทเรียน (static fallback) |

### Backend — `gas/`

| ไฟล์ | หน้าที่ |
|------|---------|
| `Main.gs` | `doGet()` / `doPost()` — entry point, delegate ทั้งหมด |
| `config/Constants.gs` | constants: `SHEET_ID`, `ADMIN_KEY`, `SH` (sheet name map), TTL configs |
| `core/Response.gs` | `json_()` wrapper |
| `core/RateLimit.gs` | CacheService-backed throttler |
| `lib/SheetRepo.gs` | generic CRUD: `rowsAsObjects_()`, `sheet_()`, `ensureSheet_()` |
| `lib/Crypto.gs` | token gen, timing-safe compare |
| `auth/Session.gs` | createSession, validateSession |
| `auth/MagicLink.gs` | send OTP email + verify |
| `auth/OAuth.gs` | Google + Facebook token verify |
| `auth/AdminAuth.gs` | admin login, OTP, fingerprint, lockout |
| `domain/posts/PostsController.gs` | list, upsert, delete posts |
| `domain/comments/CommentsController.gs` | add comment, approve, delete |
| `domain/orders/OrdersController.gs` | create order, submit slip, update status |
| `domain/vocab/VocabController.gs` | save vocab, due list, review (SRS) |
| `domain/donations/DonationsController.gs` | log donation, thanks list |
| `domain/admin/AdminController.gs` | admin stats, pending, listall |
| `setup/SetupHelper.gs` | `setup()` สร้าง sheet headers ครั้งเดียว |

### Pages (HTML)

| ไฟล์ | URL | หน้าที่ |
|------|-----|---------|
| `index.html` | `/` | หน้าแรก — posts grid + search |
| `post.html` | `/post.html?slug=X` | อ่านบทเรียน + comments + vocab |
| `dictionary.html` | `/dictionary.html` | พจนานุกรม Vi-Th |
| `courses.html` | `/courses.html` | รายการคอร์ส + ซื้อ |
| `category.html` | `/category.html?cat=X` | กรองตาม category |
| `login.html` | `/login.html` | Magic Link + Facebook + Google |
| `admin.html` | `/admin.html` | จัดการ posts/comments/orders/users |
| `me.html` | `/me.html` | โปรไฟล์ + bookmarks + orders |
| `about.html` | `/about.html` | เกี่ยวกับ + donate section |

---

## Google Sheets Schema

Sheet tabs (ตั้งโดย `setup()` ใน Main.gs):

```
posts          slug · date · categories · icon · cover · video
               title_vi/th · desc_vi/th · body_vi/th · published · members_only
comments       ts · slug · name · msg · user_id · approved · parent_ts
users          user_id · email · name · provider · fb_id · avatar · created_at · last_login
sessions       token · user_id · created_at · expires_at
orders         order_id · user_id · email · item_id · item_title · amount · currency
               status · slip_url · created_at · paid_at · note
donations      ts · name · amount · channel · note
magic_tokens   token · email · created_at · expires_at · used
courses        id · price · currency · title_vi/th · desc_vi/th · active
bookmarks      user_id · slug · created_at
user_vocab     user_id · vi · th · slug · box · due_at · created_at · ph
quiz_log       user_id · slug · score · total · ts
dictionary     id · vi · th · pv · pt · cat · ex_vi · ex_th
admin_sessions token · fingerprint · created_at · expires_at · last_seen
admin_log      ts · action · target · fingerprint · ok · detail
admin_fails    ts · fingerprint · reason
```

---

## GAS API Endpoints

**GET** `?action=<action>&token=<session>`

| action | returns |
|--------|---------|
| `posts` | list posts (published, body ซ่อนถ้า members_only + ไม่ login) |
| `comments&slug=X` | comments ของ post |
| `courses` | list courses |
| `me` | current user info |
| `dict` | dictionary rows |
| `thanks_list` | donors |
| `magic_verify&token=X` | verify magic link (redirect HTML) |

**POST** body JSON (`Content-Type: text/plain`):

| action | ต้องการ token? |
|--------|---------------|
| `comment` | no |
| `magic_send` | no |
| `fb_login` / `google_login` | no |
| `admin_login` / `admin_login_otp` | no |
| `bookmark_toggle` / `bookmark_list` | yes |
| `vocab_save` / `vocab_due` / `vocab_review` / `vocab_list` / `vocab_delete` | yes |
| `quiz_submit` / `leaderboard` | yes |
| `order_create` / `order_slip` / `my_orders` | yes |
| `donate_log` | no |
| `post` / `delete` (upsert post) | admin key |
| `admin_*` | admin session token |

---

## Key Conventions

- **USE_API toggle:** `content/config.js → USE_API: false` = โหมด static (ใช้ `content/posts/*.js`)
- **Merge strategy:** `api.js:loadPosts()` — API posts override local; local slugs ไม่มีใน API ก็ยังแสดง
- **members_only posts:** GAS ซ่อน body_vi/body_th ถ้า token ไม่ valid
- **Public post fields:** กำหนดใน `Constants.gs → PUBLIC_POST_FIELDS` (กัน column ลับหลุด)
- **Secrets:** ทุกอย่างใน GAS ใช้ `PropertiesService.getScriptProperties()` ไม่ hardcode
- **Deploy GAS:** ต้อง "New version" ทุกครั้ง — ไม่งั้น Web app ยังใช้โค้ดเก่า
- **i18n:** `window.YP_T['key']` (load จาก `content/i18n/th.js` หรือ `vi.js` ตาม `YP_LANG`)
- **Target/Native lang rule:** UI lang = ภาษาแม่ของผู้ใช้ (รู้แล้ว). **Target language = ตรงข้ามกับ UI lang** (กำลังเรียน).
  - VI UI → user เวียดนามเรียนไทย → target=th
  - TH UI → user ไทยเรียนเวียดนาม → target=vi
  - vocab card / flashcard: ด้านหน้า = target (โจทย์), ด้านหลัง = native (เฉลย)
  - field `ph` = phonetic ของ target เสมอ
  - ฐานข้อมูล `vi`/`th` = ภาษา literal (ไม่ใช่ role) — swap role ตอน render ตาม `YP_LANG`
- **`<html lang>`:** ทุก page เป็น `<html>` ลอย → JS set `document.documentElement.lang = window.YP_LANG` runtime

---

## CI/CD

| Workflow | Trigger | ทำอะไร |
|----------|---------|---------|
| `.github/workflows/pages.yml` | push to main | Deploy GitHub Pages |
| `.github/workflows/ci.yml` | push/PR | Lint + unit tests |
| `.github/workflows/deploy-gas.yml` | `gas/**` เปลี่ยน | `clasp push` (ต้องมี secret `CLASPRC_JSON`) |

---

## Pending Work (จาก TODO.md)

สถานะปัจจุบัน — ทำงานได้ครบ แต่มี tech debt:

**🔴 Security (ทำก่อน)**
- `content/config.js` ยังไม่ได้ใส่ใน `.gitignore` (มี real API_URL + Google Client ID)
- `ADMIN_EMAIL` fallback hardcode อยู่ใน `Constants.gs`

**🟠 Frontend refactor**
- `assets/js/*.js` ยังเป็น global scripts — ยังไม่ migrate เป็น ES modules
- ยังไม่มี `404.html`, `offline.html`, `sitemap.xml`

**🟡 Testing**
- `tests/unit/*.test.js` มีไฟล์แต่ยังไม่ครบ (srs, validation)
- ไม่มี E2E tests

---

## Setup ใหม่ (สรุปย่อ)

1. Copy `content/config.example.js` → `content/config.js` ใส่ `API_URL`
2. GAS: Project Settings → Script Properties → เพิ่ม `SHEET_ID`, `ADMIN_KEY`, `ADMIN_EMAIL`, `SITE_URL`
3. Run `setup()` ใน GAS editor (ครั้งเดียว)
4. Deploy GAS → New deployment → Web app (Execute as: Me, Access: Anyone)
5. Copy `/exec` URL → ใส่ใน `content/config.js → API_URL`
