# Import dictionary → Google Sheet

## วิธีที่ 1: รัน setup() ใน GAS
1. เปิด Apps Script project → Run `setup()` → จะสร้าง sheet ชื่อ `dictionary` พร้อม header: `id, vi, th, pv, pt, cat, ex_vi, ex_th`

## วิธีที่ 2: import ข้อมูลจาก dictionary.js เดิม
รันใน DevTools console บนหน้าเว็บ (หลังโหลด `content/dictionary.js`):

```js
const rows = window.YP_DICT.map(w => [w.id,w.vi,w.th,w.pv||'',w.pt||'',w.cat,w.ex_vi||'',w.ex_th||'']);
const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
console.log(csv);
copy(csv);   // คัดลอกอัตโนมัติ (Chrome DevTools)
```

วาง CSV ลง Sheet `dictionary` (เริ่ม cell A2 — เหลือแถวแรกเป็น header)

## ทดสอบ
เปิด `<API_URL>?action=dict` → ได้ JSON array
หน้า dictionary.html จะโหลดจาก Sheet ก่อน, fallback `content/dictionary.js` ถ้า API ปิดหรือ error
