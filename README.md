# ygiaphan

Static site + Google Apps Script backend (posts + comments เก็บใน Google Sheet)

## 1) Backend (Google Apps Script)

1. สร้าง Google Sheet เปล่า → copy ID จาก URL (`docs.google.com/spreadsheets/d/<ID>/edit`)
2. Extensions → Apps Script → ลบโค้ดเดิม → วางเนื้อหาจาก `gas/Code.gs`
3. แก้ `SHEET_ID` และ `ADMIN_KEY`
4. Run → `setup` หนึ่งครั้ง (สร้าง sheet headers)
5. Deploy → New deployment → Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy URL ที่ลงท้ายด้วย `/exec`

## 2) Frontend config

แก้ `content/config.js`:

```js
window.YP_CONFIG = {
  API_URL: "https://script.google.com/macros/s/.../exec",
  USE_API: true
};
```

ถ้า `USE_API: false` → ใช้ posts จาก `content/posts/*.js` (โหมด static เดิม)

## 3) เพิ่ม/แก้ post

เปิด `admin.html` → ใส่ admin key (เก็บใน localStorage) → กรอกฟอร์ม → Save

## 4) Deploy ขึ้น GitHub

```bash
git init
git remote add origin https://github.com/<user>/<repo>.git
git add . && git commit -m "init"
git push -u origin main
```

GitHub repo → Settings → Pages → Source: **GitHub Actions** (workflow ที่ `.github/workflows/pages.yml` deploy ให้อัตโนมัติ)

## โครงสร้างไฟล์ที่เพิ่ม

```
gas/Code.gs              ← Apps Script (paste ไปวางที่ script.google.com)
content/config.js        ← URL + USE_API toggle
admin.html               ← หน้าจัดการ post
assets/js/api.js         ← API client
.github/workflows/pages.yml
```

## 🔥 แก้ปัญหา `error: unauthorized`

1. แก้ `ADMIN_KEY` ใน `gas/Code.gs`
2. กด save ใน editor
3. **สำคัญ:** Deploy → Manage deployments → ไอคอน ⚙️ ดินสอ → **Version: New version** → Deploy
   (ถ้าไม่กด New version → Web app ยังใช้โค้ดเก่า)
4. กลับมาที่ `admin.html` กรอก key ใหม่

## หน้าใหม่ที่เพิ่ม

- `/admin.html` — จัดการ posts, comments, orders, users, donations
- `/login.html` — สมัคร/เข้าสู่ระบบ (Magic Link + Facebook + Google)
- `/about.html` — donate section (PromptPay 🇹🇭 + MoMo 🇻🇳 + VietQR 🇻🇳 + PayPal 🌐)
- `/me.html` — โปรไฟล์ + Bookmarks + Orders + 🎴 ทบทวนศัพท์ (SRS Leitner 6 กล่อง + คลังศัพท์)
- `/dictionary.html` — พจนานุกรม ไทย↔เวียดนาม + flashcard mode

## Features

- **🌐 Bilingual UI** — สลับ VI/TH ได้ทันที (target language = ตรงข้ามกับ UI lang)
- **🎴 SRS Vocab Review** — Leitner 6 กล่อง, save จาก post, library view, keyboard shortcuts
- **🔊 Cross-platform TTS** — เสียงเดียวกันทุก platform (Google Translate audio) + fallback browser TTS
- **📚 อ่านบทความออกเสียง** — ปุ่ม 🔊 ในแต่ละ post อ่านทีละประโยค
- **📱 PWA** — ติดตั้งบนมือถือได้, offline support

## ตั้งค่า Facebook Login (optional)

1. https://developers.facebook.com/apps → Create App → Consumer
2. Add product: **Facebook Login** → Settings
3. Valid OAuth Redirect URIs: `https://<your-domain>` + `https://localhost`
4. App ID → ใส่ใน `content/config.js` → `FB_APP_ID`
5. ต้อง verify domain ใน FB app + เปิด App Mode: Live

## ตั้งค่า Magic Link

- `SITE_URL` ใน `gas/Code.gs` ต้องเป็น URL จริงของ GitHub Pages เช่น `https://user.github.io/repo`
- Apps Script ใช้ `MailApp.sendEmail` ส่งผ่าน Gmail ของ owner (quota 100/วัน free)
- ถ้าต้องการ scale → ใช้ Brevo / SendGrid (เพิ่ม UrlFetchApp call)

## ตั้งค่าขายคอร์ส

1. ไปที่ Google Sheet → tab `courses` → เพิ่ม row:
   - `id` (เช่น `basic-thai`), `price` (เช่น `590`), `currency` `THB`, `title_vi`/`title_th`, `desc_vi`/`desc_th`, `active` `TRUE`
2. หน้าเว็บจะเรียก `?action=courses`
3. User คลิกซื้อ → `order_create` → ได้ `order_id` → สแกน PromptPay QR → upload slip URL → admin ยืนยัน

## หมายเหตุ

- API ใช้ `Content-Type: text/plain` เพื่อเลี่ยง CORS preflight ของ Apps Script
- Sheets ทั้งหมด: posts, comments, users, sessions, orders, donations, magic_tokens, courses
- Comment ใช้ honeypot + math captcha + min-fill-time (กัน bot)
- Session token เก็บใน localStorage (`yp:session`), หมดอายุ 30 วัน
- Magic token TTL 15 นาที ใช้ครั้งเดียว
- `members_only=TRUE` ใน post → body จะถูกซ่อนถ้ายังไม่ login
