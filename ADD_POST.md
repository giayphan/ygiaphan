# วิธีเพิ่มโพสต์ใหม่

ใช้เวลา ~2 นาที — ไม่ต้อง build/compile อะไรทั้งสิ้น

## ขั้นตอน 3 step

### 1. สร้างไฟล์ใหม่ใน `content/posts/<slug>.js`

ก๊อปไฟล์เก่า (เช่น `greetings.js`) มาแก้ — แทนที่ `slug` ทุกที่เป็นชื่อใหม่

ตัวอย่าง `content/posts/numbers.js`:

```js
window.YP_POSTS = window.YP_POSTS || {};
window.YP_POSTS["numbers"] = {
  slug: "numbers",
  date: "2026-05-14",
  categories: ["คำศัพท์"],          // หมวดหมู่ — ใช้ "คำศัพท์", "ไวยากรณ์", "บทสนทนา", "วัฒนธรรม", "การออกเสียง" หรือสร้างใหม่
  icon: "🔢",                       // อิโมจิหน้าการ์ด
  cover: "",                       // path รูป cover (optional) เช่น "assets/img/posts/numbers.jpg"
  video: "",                       // YouTube embed URL (optional) เช่น "https://www.youtube.com/embed/XXXX"

  title_vi: "Số đếm 1-10 trong tiếng Thái",
  title_th: "นับเลข 1-10 ภาษาเวียดนาม",
  desc_vi: "Học cách đếm số cơ bản",
  desc_th: "เรียนนับเลขพื้นฐาน",

  body_vi: `## Số đếm cơ bản

| Số | Tiếng Thái | Phiên âm |
|---|---|---|
| 1 | หนึ่ง | nèng |
| 2 | สอง  | sɔ̌ɔŋ |

> Mẹo nhớ…`,

  body_th: `## นับเลขพื้นฐาน

| เลข | เวียดนาม | คำอ่าน |
|---|---|---|
| 1 | một  | โหมด |
| 2 | hai  | ฮาย |

> เคล็ดลับ…`
};
```

### 2. เพิ่ม slug ใน `content/posts/_list.js`

```js
window.YP_POST_LIST = [
  "numbers",        // ← เพิ่มที่บนสุด ให้แสดงเป็นโพสต์ล่าสุด
  "greetings",
  "six-tones",
  "ordering-food"
];
```

### 3. เพิ่ม `<script>` tag ในทุก HTML ที่แสดงโพสต์

ในไฟล์ `index.html`, `post.html`, `category.html` — เพิ่มบรรทัด:

```html
<script src="content/posts/numbers.js"></script>
```

ใส่ไว้ในกลุ่ม `<script src="content/posts/...">` อื่นๆ ลำดับใดก็ได้

**เสร็จแล้ว** — เปิดเว็บ reload จะเห็นโพสต์ใหม่ทันที

---

## Field reference

| Field | จำเป็น | คำอธิบาย |
|---|---|---|
| `slug` | ✓ | ชื่อเฉพาะของโพสต์ (URL-safe) ต้องตรงกับชื่อไฟล์ |
| `date` | ✓ | รูปแบบ `YYYY-MM-DD` |
| `categories` | ✓ | array หมวดหมู่ — โพสต์เดียวมีหลายหมวดได้ |
| `icon` | ✓ | emoji แสดงเมื่อไม่มี cover |
| `cover` | – | URL/path รูปหน้าปก |
| `video` | – | URL ฝัง YouTube (`/embed/...`) จะแสดงท้ายโพสต์ |
| `title_vi` / `title_th` | ✓ | หัวข้อ 2 ภาษา |
| `desc_vi` / `desc_th` | – | คำอธิบายสั้น (สำหรับ SEO) |
| `body_vi` / `body_th` | ✓ | เนื้อหา Markdown 2 ภาษา ใช้ template literal `` ` `` |

## Markdown ที่รองรับ

- หัวข้อ: `## H2`, `### H3`
- ตัวหนา: `**bold**`
- โค้ด inline: `` `code` ``
- โค้ดบล็อก: ครอบ ``` ``` ```
- รายการ: `- item` หรือ `1. item`
- ตาราง: `| col | col |` + แถวคั่น `|---|---|`
- คำพูด: `> quote`
- ลิงก์: `[text](url)`
- รูป: `![alt](url)`

## เพิ่ม category ใหม่

ใช้ชื่อใหม่ใน `categories` ของโพสต์ — หน้า category จะ list อัตโนมัติ

ถ้าอยากให้สีต่างจากเดิม เพิ่มใน `assets/css/main.css`:

```css
.tag--ชื่อหมวดใหม่{background:#xxx;color:#yyy}
```

## แก้ data อื่น ๆ

- เมนู: `content/nav.js`
- คอร์ส: `content/courses.js`
- Slide banner: `content/slides.js`
- ข้อมูลเว็บ (title, email, social): `content/site.js`
- คำแปลในเว็บ: `content/i18n/vi.js` (เวียดนาม) และ `content/i18n/th.js` (ไทย)

แก้แล้ว reload browser เห็นทันที ไม่ต้อง build
