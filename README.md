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

## หมายเหตุ

- API ใช้ `Content-Type: text/plain` เพื่อเลี่ยง CORS preflight ของ Apps Script
- Sheet `posts` คอลัมน์: slug, date, categories, icon, cover, video, title_vi, title_th, desc_vi, desc_th, body_vi, body_th, published
- Sheet `comments` คอลัมน์: ts, slug, name, msg, ip
- Comment ใช้ honeypot + math captcha + min-fill-time (กัน bot)
