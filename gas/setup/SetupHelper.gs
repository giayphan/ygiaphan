// ฟังก์ชันตั้ง Script Properties — เรียกผ่าน clasp run หรือรันมือใน GAS editor
// ใช้แค่ครั้งเดียว (หรือทุกครั้งที่เปลี่ยน config)

function setProperties(props) {
  const sp = PropertiesService.getScriptProperties();
  sp.setProperties(props, false); // false = ไม่ลบ property เดิมที่ไม่ได้ส่งมา
  return { ok: true, keys: Object.keys(props) };
}

// ใช้ใน GAS editor: แก้ค่า แล้ว Run → setPropertiesManual
function setPropertiesManual() {
  return setProperties({
    SHEET_ID:    'PUT_YOUR_SHEET_ID_HERE',
    ADMIN_KEY:   'change-me-please',
    ADMIN_EMAIL: 'your@email.com',
    SITE_URL:    'https://yourname.github.io/ygiaphan',
    FB_APP_ID:   ''
  });
}

// ตรวจสอบว่า properties ตั้งครบไหม
function checkProperties() {
  const sp = PropertiesService.getScriptProperties();
  const required = ['SHEET_ID', 'ADMIN_KEY', 'ADMIN_EMAIL', 'SITE_URL'];
  const missing = required.filter(k => !sp.getProperty(k) || sp.getProperty(k).startsWith('PUT_YOUR') || sp.getProperty(k).startsWith('change-me'));
  return { ok: missing.length === 0, missing };
}
