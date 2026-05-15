// เมนูบนสุด — แต่ละรายการมี vi/th
window.YP_NAV = [
  { vi: "Trang chủ", th: "หน้าแรก", url: "index.html" },
  { vi: "Khóa học", th: "คอร์ส", children: [
    { vi: "Tất cả",      th: "ภาพรวม",      url: "courses.html" },
    { vi: "Video",       th: "วิดีโอ",       url: "courses.html#video" },
    { vi: "Cá nhân",     th: "สอนส่วนตัว",   url: "courses.html#private" },
    { vi: "Nhóm",        th: "สอนแบบกลุ่ม",  url: "courses.html#group" }
  ]},
  { vi: "Chủ đề",    th: "หมวด",     url: "category.html" },
  { vi: "Giới thiệu", th: "เกี่ยวกับ", url: "about.html" },
  { vi: "Liên hệ",   th: "ติดต่อ",    url: "contact.html" },
  { vi: "Tôi",       th: "โปรไฟล์",   url: "me.html" }
];
