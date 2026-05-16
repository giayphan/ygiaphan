// Sheet name constants + app-wide settings
// Secrets (SHEET_ID, ADMIN_KEY, ADMIN_EMAIL, SITE_URL) ใส่ใน
// Project Settings → Script Properties แทนการ hardcode

const SHEET_ID  = PropertiesService.getScriptProperties().getProperty('SHEET_ID')  || 'PUT_YOUR_SHEET_ID_HERE';
const ADMIN_KEY = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY') || 'change-me-please';
const ADMIN_EMAIL = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || 'giayphan@gmail.com';
const SITE_URL  = PropertiesService.getScriptProperties().getProperty('SITE_URL')  || 'https://yourname.github.io/ygiaphan';
const FB_APP_ID = PropertiesService.getScriptProperties().getProperty('FB_APP_ID') || '';

const MAGIC_TTL_MIN   = 15;
const SESSION_TTL_DAYS = 30;
const ADMIN_TTL_MIN   = 60;
const ADMIN_MAX_FAILS = 5;
const ADMIN_LOCK_MIN  = 60;
const ADMIN_2FA       = true;

const USER_OTP_MAX_PER_EMAIL_HOUR = 5;
const USER_OTP_MAX_VERIFY_FAILS   = 5;
const USER_OTP_LOCK_MIN           = 30;
const DONATE_MAX_PER_FP_HOUR      = 3;

// Sheet name map
const SH = {
  posts:'posts', comments:'comments', users:'users',
  sessions:'sessions', orders:'orders', donations:'donations',
  magic:'magic_tokens', courses:'courses', bookmarks:'bookmarks',
  vocab:'user_vocab', quiz_log:'quiz_log',
  admin_sessions:'admin_sessions', admin_log:'admin_log', admin_fails:'admin_fails'
};

// Post fields ที่ public เห็นได้ — กัน column ลับหลุดออกมา
const PUBLIC_POST_FIELDS = ['slug','date','categories','icon','cover','video',
  'title_vi','title_th','desc_vi','desc_th','body_vi','body_th','published','members_only'];
