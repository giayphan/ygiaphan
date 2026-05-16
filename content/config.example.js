// ygiaphan — config template
// คัดลอกไฟล์นี้แล้วแก้ค่าให้ครบก่อน deploy
// ไม่ต้อง commit ค่าจริงลง public repo
window.YP_CONFIG = {
  // URL ของ Apps Script Web App (ลงท้ายด้วย /exec)
  // ได้จาก: script.google.com → Deploy → New deployment → Web app
  API_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",

  // false = ใช้โหมด static (posts จาก content/posts/*.js ไม่ต้อง GAS)
  USE_API: false,

  // Google Sign-In Client ID (เว้นว่าง = ปิดฟีเจอร์นี้)
  // ได้จาก: console.cloud.google.com → APIs & Services → Credentials
  GOOGLE_CLIENT_ID: "",

  // ช่องทาง donate (เว้นว่าง = ซ่อน)
  DONATE: {
    promptpay: "",                            // เบอร์โทร หรือ เลขบัตร PromptPay
    promptpay_qr: "assets/img/promptpay.png", // (optional) รูป QR code
    paypal: ""                                // https://paypal.me/yourname
  }
};
