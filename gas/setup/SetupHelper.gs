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

// แก้ header row ของทุก sheet ให้ครบตาม schema
// รันครั้งเดียวใน GAS editor เพื่อแก้ปัญหา missing/wrong columns
function fixSheetHeaders() {
  const ss = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('SHEET_ID')
  );
  const schemas = {
    'comments':  ['ts','slug','name','msg','user_id','approved','parent_ts'],
    'posts':     ['slug','date','categories','icon','cover','video','title_vi','title_th','desc_vi','desc_th','body_vi','body_th','published','members_only'],
    'users':     ['user_id','email','name','provider','fb_id','avatar','created_at','last_login'],
    'sessions':  ['token','user_id','created_at','expires_at'],
    'orders':    ['order_id','user_id','email','item_id','item_title','amount','currency','status','slip_url','created_at','paid_at','note'],
    'donations': ['ts','name','amount','channel','note'],
    'magic':     ['token','email','created_at','expires_at','used'],
    'vocab':     ['user_id','vi','th','slug','box','due_at','created_at'],
    'quiz_log':  ['user_id','slug','score','total','ts'],
    'bookmarks': ['user_id','slug','created_at'],
  };
  const results = [];
  Object.entries(schemas).forEach(([name, headers]) => {
    const sh = ss.getSheetByName(name);
    if (!sh) { results.push(name + ': sheet not found'); return; }
    const ncols = Math.max(sh.getLastColumn(), headers.length);
    const row = sh.getRange(1, 1, 1, ncols).getValues()[0];
    const before = row.slice(0, headers.length).join(',');
    headers.forEach((h, i) => { if (String(row[i]||'') !== h) row[i] = h; });
    sh.getRange(1, 1, 1, ncols).setValues([row]);
    const after = sh.getRange(1, 1, 1, headers.length).getValues()[0].join(',');
    results.push(name + ': ' + (before === after ? 'ok' : 'fixed → ' + after));
  });
  Logger.log(results.join('\n'));
  return results;
}

// ตรวจสอบว่า properties ตั้งครบไหม
function checkProperties() {
  const sp = PropertiesService.getScriptProperties();
  const required = ['SHEET_ID', 'ADMIN_KEY', 'ADMIN_EMAIL', 'SITE_URL'];
  const missing = required.filter(k => !sp.getProperty(k) || sp.getProperty(k).startsWith('PUT_YOUR') || sp.getProperty(k).startsWith('change-me'));
  return { ok: missing.length === 0, missing };
}
