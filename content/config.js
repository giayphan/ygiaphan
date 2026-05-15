// ygiaphan — แก้ค่าเดียวจบ
window.YP_CONFIG = {
  // URL ของ Apps Script Web App (ลงท้ายด้วย /exec)
  API_URL: "https://script.google.com/macros/s/AKfycbxz-2eilxmG2I7v-Yjqhx9-Dp8ZtmKoWh6mOnK-7I8ZIef8wZAyNv3aVv0jZ3SquUYB/exec",
  // ถ้า API_URL ว่าง → ใช้ posts จาก content/posts/*.js (โหมด static เดิม)
  USE_API: true,
  // Google Sign-In (เว้นว่าง = ปิด)
  GOOGLE_CLIENT_ID: "988617561301-ei26l4a5o1sguse1vkkfs5ankfrrcshk.apps.googleusercontent.com",
  // ช่องทาง donate
  DONATE: {
    promptpay: "0812345678",                  // เบอร์/เลขบัตร PromptPay
    promptpay_qr: "assets/img/promptpay.png", // (optional) รูป QR static
    paypal: "https://paypal.me/yourname"
  }
};
