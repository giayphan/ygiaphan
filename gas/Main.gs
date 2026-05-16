/**
 * ygiaphan — Google Apps Script API v2
 *
 * Setup (ทำครั้งเดียว):
 *  1. Project Settings → Script Properties → เพิ่ม:
 *       SHEET_ID   = <id ของ Google Sheet>
 *       ADMIN_KEY  = <รหัสผ่าน admin ที่ต้องการ>
 *       ADMIN_EMAIL = <อีเมล admin>
 *       SITE_URL   = https://yourname.github.io/ygiaphan
 *       FB_APP_ID  = <Facebook App ID (ถ้าใช้)>
 *  2. Run setup() ครั้งเดียว (สร้าง sheet tabs)
 *  3. Deploy → New deployment → Web app
 *       Execute as: Me  |  Access: Anyone
 *  4. Copy /exec URL → ใส่ใน content/config.js
 */

function authorizeMail(){
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'ygiaphan auth test', 'permissions granted ✓');
}

function setup(){
  const ss = SpreadsheetApp.openById(SHEET_ID);
  ensureSheet_(ss, SH.posts, ['slug','date','categories','icon','cover','video',
    'title_vi','title_th','desc_vi','desc_th','body_vi','body_th','published','members_only']);
  ensureSheet_(ss, SH.comments, ['ts','slug','name','msg','user_id','approved','parent_ts']);
  ensureSheet_(ss, SH.users, ['user_id','email','name','provider','fb_id','avatar','created_at','last_login']);
  ensureSheet_(ss, SH.sessions, ['token','user_id','created_at','expires_at']);
  ensureSheet_(ss, SH.orders, ['order_id','user_id','email','item_id','item_title','amount','currency','status','slip_url','created_at','paid_at','note']);
  ensureSheet_(ss, SH.donations, ['ts','name','amount','channel','note']);
  ensureSheet_(ss, SH.magic, ['token','email','created_at','expires_at','used']);
  ensureSheet_(ss, SH.courses, ['id','price','currency','title_vi','title_th','desc_vi','desc_th','active']);
  ensureSheet_(ss, SH.bookmarks, ['user_id','slug','created_at']);
  ensureSheet_(ss, SH.vocab, ['user_id','vi','th','slug','box','due_at','created_at']);
  ensureSheet_(ss, SH.quiz_log, ['user_id','slug','score','total','ts']);
  ensureSheet_(ss, SH.dictionary, ['id','vi','th','pv','pt','cat','ex_vi','ex_th']);
  ensureSheet_(ss, SH.admin_sessions, ['token','fingerprint','created_at','expires_at','last_seen']);
  ensureSheet_(ss, SH.admin_log, ['ts','action','target','fingerprint','ok','detail']);
  ensureSheet_(ss, SH.admin_fails, ['ts','fingerprint','reason']);
}

/* ===== Router ===== */
function doGet(e){
  try { return doGet_inner_(e); }
  catch(err){ return json_({error:'server error'}); }
}

function doGet_inner_(e){
  const a = (e.parameter.action||'posts').toLowerCase();
  if (e.parameter.p) {
    let b = {};
    try { b = JSON.parse(b64decode_(e.parameter.p)); } catch(_) {}
    return doPostBody_(b);
  }
  if (a === 'magic_verify') return htmlMagicVerify_(e.parameter.token);
  if (a === 'posts')      return json_(listPosts_(e.parameter.token));
  if (a === 'comments')   return json_(listComments_(e.parameter.slug||''));
  if (a === 'courses')    return json_(listCourses_());
  if (a === 'me')         return json_(getMe_(e.parameter.token));
  if (a === 'thanks_list') return json_(thanksList_());
  if (a === 'dict')       return json_(listDict_());
  return json_({error:'unknown action'});
}

function listDict_(){
  const sh = ss_().getSheetByName(SH.dictionary);
  if (!sh) return [];
  return rowsAsObjects_(sh).filter(w => w.id && (w.vi || w.th));
}

function setupDictionary(){
  ensureSheet_(SpreadsheetApp.openById(SHEET_ID), SH.dictionary, ['id','vi','th','pv','pt','cat','ex_vi','ex_th']);
  return 'ok';
}

// seed คำศัพท์ทั้งหมด (run ครั้งเดียวหลัง setupDictionary)
function seedDictionary(){
  const sh = sheet_(SH.dictionary) || (setupDictionary(), sheet_(SH.dictionary));
  if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow()-1);
  const rows = DICT_SEED_.map(w => [w.id,w.vi,w.th,w.pv||'',w.pt||'',w.cat,w.ex_vi||'',w.ex_th||'']);
  sh.getRange(2,1,rows.length,8).setValues(rows);
  return 'seeded '+rows.length+' rows';
}

const DICT_SEED_ = [
  {id:1,vi:'xin chào',th:'สวัสดี',pv:'ซิน เจ้าว',pt:'sà-wàt-dii',cat:'greetings',ex_vi:'Xin chào! Bạn khỏe không?',ex_th:'สวัสดีครับ! คุณเป็นอย่างไรบ้าง?'},
  {id:2,vi:'tạm biệt',th:'ลาก่อน',pv:'ต่าม เบี๊ยต',pt:'laa-gòn',cat:'greetings',ex_vi:'Tạm biệt, hẹn gặp lại!',ex_th:'ลาก่อน แล้วพบกันใหม่นะ!'},
  {id:3,vi:'cảm ơn',th:'ขอบคุณ',pv:'กาม เอิน',pt:'khòp-khun',cat:'greetings',ex_vi:'Cảm ơn bạn rất nhiều.',ex_th:'ขอบคุณมากนะครับ'},
  {id:4,vi:'xin lỗi',th:'ขอโทษ',pv:'ซิน ลอ้ย',pt:'khǒo-thôot',cat:'greetings',ex_vi:'Xin lỗi, tôi đến muộn.',ex_th:'ขอโทษนะ ฉันมาสาย'},
  {id:5,vi:'không có gì',th:'ไม่เป็นไร',pv:'ขง โก้ ยี',pt:'mâi-bpen-rai',cat:'greetings',ex_vi:'Không có gì, đừng lo.',ex_th:'ไม่เป็นไร ไม่ต้องกังวล'},
  {id:6,vi:'vâng',th:'ครับ/ค่ะ (ใช่)',pv:'วัง',pt:'khráp/khâ',cat:'greetings',ex_vi:'Vâng, tôi hiểu rồi.',ex_th:'ครับ เข้าใจแล้ว'},
  {id:7,vi:'không',th:'ไม่/ไม่ใช่',pv:'ขง',pt:'mâi',cat:'greetings',ex_vi:'Không, tôi không biết.',ex_th:'ไม่ ฉันไม่รู้'},
  {id:8,vi:'bạn khỏe không?',th:'คุณสบายดีไหม?',pv:'บ่าน เค่อ ขง',pt:'khun sà-baai-dii mǎi',cat:'greetings',ex_vi:'Bạn khỏe không? — Khỏe, cảm ơn!',ex_th:'คุณสบายดีไหม? — สบายดีครับ ขอบคุณ!'},
  {id:9,vi:'tôi khỏe',th:'ฉันสบายดี',pv:'โตย เค่อ',pt:'chǎn sà-baai-dii',cat:'greetings',ex_vi:'Tôi khỏe, cảm ơn bạn.',ex_th:'ฉันสบายดีครับ ขอบคุณ'},
  {id:10,vi:'gặp lại sau',th:'แล้วพบกันใหม่',pv:'กัป ล่าย ซ้าว',pt:'láew phóp-gan-mài',cat:'greetings',ex_vi:'Gặp lại sau nhé!',ex_th:'แล้วพบกันใหม่นะ!'},
  {id:11,vi:'chào buổi sáng',th:'อรุณสวัสดิ์',pv:'เจ้าว บว้อย ซ้าง',pt:'a-run sà-wàt',cat:'greetings',ex_vi:'Chào buổi sáng! Ngủ ngon không?',ex_th:'อรุณสวัสดิ์! หลับสบายไหม?'},
  {id:12,vi:'chào buổi tối',th:'ราตรีสวัสดิ์',pv:'เจ้าว บว้อย โต้ย',pt:'raa-trii sà-wàt',cat:'greetings',ex_vi:'Chào buổi tối, ngủ ngon nhé!',ex_th:'ราตรีสวัสดิ์ ฝันดีนะ!'},
  {id:20,vi:'không',th:'ศูนย์ (0)',pv:'ขง',pt:'sǔun',cat:'numbers',ex_vi:'Số không.',ex_th:'เลขศูนย์'},
  {id:21,vi:'một',th:'หนึ่ง (1)',pv:'หม็อต',pt:'nùeng',cat:'numbers',ex_vi:'Một người.',ex_th:'หนึ่งคน'},
  {id:22,vi:'hai',th:'สอง (2)',pv:'ไฮ',pt:'sǒong',cat:'numbers',ex_vi:'Hai cái.',ex_th:'สองอัน'},
  {id:23,vi:'ba',th:'สาม (3)',pv:'บา',pt:'sǎam',cat:'numbers',ex_vi:'Ba ngày.',ex_th:'สามวัน'},
  {id:24,vi:'bốn',th:'สี่ (4)',pv:'บ้อน',pt:'sìi',cat:'numbers',ex_vi:'Bốn người.',ex_th:'สี่คน'},
  {id:25,vi:'năm',th:'ห้า (5)',pv:'นัม',pt:'hâa',cat:'numbers',ex_vi:'Năm nghìn đồng.',ex_th:'ห้าพันดอง'},
  {id:26,vi:'sáu',th:'หก (6)',pv:'ซ้าว',pt:'hòk',cat:'numbers',ex_vi:'Sáu giờ.',ex_th:'หกโมง'},
  {id:27,vi:'bảy',th:'เจ็ด (7)',pv:'บ้าย',pt:'jèt',cat:'numbers',ex_vi:'Bảy ngày một tuần.',ex_th:'เจ็ดวันหนึ่งสัปดาห์'},
  {id:28,vi:'tám',th:'แปด (8)',pv:'ต้าม',pt:'bpàet',cat:'numbers',ex_vi:'Tám giờ sáng.',ex_th:'แปดโมงเช้า'},
  {id:29,vi:'chín',th:'เก้า (9)',pv:'จิ๊น',pt:'gâo',cat:'numbers',ex_vi:'Chín người.',ex_th:'เก้าคน'},
  {id:30,vi:'mười',th:'สิบ (10)',pv:'เหมื่อย',pt:'sìp',cat:'numbers',ex_vi:'Mười phút.',ex_th:'สิบนาที'},
  {id:31,vi:'một trăm',th:'ร้อย (100)',pv:'หม็อต ต้รัม',pt:'rói',cat:'numbers',ex_vi:'Một trăm baht.',ex_th:'ร้อยบาท'},
  {id:32,vi:'một nghìn',th:'พัน (1000)',pv:'หม็อต หงิ่น',pt:'phan',cat:'numbers',ex_vi:'Một nghìn đồng.',ex_th:'หนึ่งพันดอง'},
  {id:40,vi:'đỏ',th:'แดง',pv:'โด้',pt:'daeng',cat:'colors',ex_vi:'Áo đỏ đẹp quá!',ex_th:'เสื้อแดงสวยมาก!'},
  {id:41,vi:'xanh lam',th:'น้ำเงิน',pv:'ซาน ลาม',pt:'náam-ngoen',cat:'colors',ex_vi:'Trời xanh lam.',ex_th:'ท้องฟ้าสีน้ำเงิน'},
  {id:42,vi:'xanh lá',th:'เขียว',pv:'ซาน ล้า',pt:'khǐao',cat:'colors',ex_vi:'Cây xanh lá.',ex_th:'ต้นไม้สีเขียว'},
  {id:43,vi:'vàng',th:'เหลือง',pv:'วั่ง',pt:'lǔeang',cat:'colors',ex_vi:'Hoa vàng đẹp.',ex_th:'ดอกไม้สีเหลืองสวย'},
  {id:44,vi:'trắng',th:'ขาว',pv:'ต้รัง',pt:'khǎao',cat:'colors',ex_vi:'Áo trắng.',ex_th:'เสื้อขาว'},
  {id:45,vi:'đen',th:'ดำ',pv:'เด็น',pt:'dam',cat:'colors',ex_vi:'Mèo đen.',ex_th:'แมวดำ'},
  {id:46,vi:'hồng',th:'ชมพู',pv:'โหง่ม',pt:'chom-phuu',cat:'colors',ex_vi:'Hoa hồng.',ex_th:'ดอกไม้สีชมพู'},
  {id:47,vi:'tím',th:'ม่วง',pv:'ติ๊ม',pt:'mûang',cat:'colors',ex_vi:'Màu tím đẹp.',ex_th:'สีม่วงสวย'},
  {id:48,vi:'cam',th:'ส้ม',pv:'กาม',pt:'sôm',cat:'colors',ex_vi:'Quả cam.',ex_th:'ผลส้ม'},
  {id:49,vi:'nâu',th:'น้ำตาล',pv:'เนิว',pt:'náam-taan',cat:'colors',ex_vi:'Tóc nâu.',ex_th:'ผมสีน้ำตาล'},
  {id:50,vi:'thứ hai',th:'วันจันทร์',pv:'ถือ ไฮ',pt:'wan-jan',cat:'days',ex_vi:'Thứ hai đi làm.',ex_th:'วันจันทร์ไปทำงาน'},
  {id:51,vi:'thứ ba',th:'วันอังคาร',pv:'ถือ บา',pt:'wan-ang-khaan',cat:'days',ex_vi:'Thứ ba học tiếng Thái.',ex_th:'วันอังคารเรียนภาษาไทย'},
  {id:52,vi:'thứ tư',th:'วันพุธ',pv:'ถือ ตือ',pt:'wan-phút',cat:'days',ex_vi:'Thứ tư họp.',ex_th:'วันพุธประชุม'},
  {id:53,vi:'thứ năm',th:'วันพฤหัสฯ',pv:'ถือ นัม',pt:'wan-phá-rúe-hàt',cat:'days',ex_vi:'Thứ năm nghỉ.',ex_th:'วันพฤหัสหยุด'},
  {id:54,vi:'thứ sáu',th:'วันศุกร์',pv:'ถือ ซ้าว',pt:'wan-sùk',cat:'days',ex_vi:'Thứ sáu vui nhất!',ex_th:'วันศุกร์สนุกที่สุด!'},
  {id:55,vi:'thứ bảy',th:'วันเสาร์',pv:'ถือ บ้าย',pt:'wan-sǎo',cat:'days',ex_vi:'Thứ bảy đi chơi.',ex_th:'วันเสาร์ออกไปเที่ยว'},
  {id:56,vi:'chủ nhật',th:'วันอาทิตย์',pv:'จู่ เญิต',pt:'wan-aa-thít',cat:'days',ex_vi:'Chủ nhật nghỉ ngơi.',ex_th:'วันอาทิตย์พักผ่อน'},
  {id:57,vi:'hôm nay',th:'วันนี้',pv:'โหม นาย',pt:'wan-níi',cat:'days',ex_vi:'Hôm nay trời đẹp.',ex_th:'วันนี้อากาศดี'},
  {id:58,vi:'ngày mai',th:'พรุ่งนี้',pv:'หงาย มาย',pt:'phrûng-níi',cat:'days',ex_vi:'Ngày mai gặp nhau nhé.',ex_th:'พรุ่งนี้เจอกันนะ'},
  {id:59,vi:'hôm qua',th:'เมื่อวาน',pv:'โหม กว้า',pt:'mûea-waan',cat:'days',ex_vi:'Hôm qua tôi mệt.',ex_th:'เมื่อวานฉันเหนื่อย'},
  {id:60,vi:'bố / ba',th:'พ่อ',pv:'บ้อ / บา',pt:'phôo',cat:'family',ex_vi:'Bố tôi là bác sĩ.',ex_th:'พ่อฉันเป็นหมอ'},
  {id:61,vi:'mẹ',th:'แม่',pv:'เม้',pt:'mâe',cat:'family',ex_vi:'Mẹ nấu ăn ngon.',ex_th:'แม่ทำอาหารอร่อย'},
  {id:62,vi:'anh',th:'พี่ชาย',pv:'อาน',pt:'phîi-chaai',cat:'family',ex_vi:'Anh tôi cao.',ex_th:'พี่ชายฉันสูง'},
  {id:63,vi:'chị',th:'พี่สาว',pv:'จี๋',pt:'phîi-sǎao',cat:'family',ex_vi:'Chị đẹp lắm.',ex_th:'พี่สาวสวยมาก'},
  {id:64,vi:'em',th:'น้อง',pv:'เอม',pt:'nóong',cat:'family',ex_vi:'Em tôi học giỏi.',ex_th:'น้องฉันเรียนเก่ง'},
  {id:65,vi:'ông',th:'ปู่/ตา',pv:'โอง',pt:'bpùu/dtaa',cat:'family',ex_vi:'Ông tôi 70 tuổi.',ex_th:'ปู่ฉันอายุ 70 ปี'},
  {id:66,vi:'bà',th:'ย่า/ยาย',pv:'บ่า',pt:'yâa/yaai',cat:'family',ex_vi:'Bà nấu chè ngon.',ex_th:'ยายทำขนมหวานอร่อย'},
  {id:67,vi:'con',th:'ลูก',pv:'กน',pt:'lûuk',cat:'family',ex_vi:'Con tôi 5 tuổi.',ex_th:'ลูกฉันอายุ 5 ขวบ'},
  {id:68,vi:'chồng',th:'สามี',pv:'จ้อง',pt:'sǎa-mii',cat:'family',ex_vi:'Chồng tôi làm bếp.',ex_th:'สามีฉันทำอาหาร'},
  {id:69,vi:'vợ',th:'ภรรยา',pv:'หวือ',pt:'phan-rá-yaa',cat:'family',ex_vi:'Vợ tôi đẹp.',ex_th:'ภรรยาฉันสวย'},
  {id:70,vi:'đầu',th:'หัว',pv:'เดิ่ว',pt:'hǔa',cat:'body',ex_vi:'Đầu tôi đau.',ex_th:'หัวของฉันปวด'},
  {id:71,vi:'mắt',th:'ตา',pv:'หมัต',pt:'taa',cat:'body',ex_vi:'Mắt bạn đẹp.',ex_th:'ตาคุณสวย'},
  {id:72,vi:'mũi',th:'จมูก',pv:'หมุ้ย',pt:'jà-mùuk',cat:'body',ex_vi:'Mũi cao.',ex_th:'จมูกสูง'},
  {id:73,vi:'miệng',th:'ปาก',pv:'เหมี่ยง',pt:'bpàak',cat:'body',ex_vi:'Miệng to.',ex_th:'ปากกว้าง'},
  {id:74,vi:'tai',th:'หู',pv:'ไต',pt:'hǔu',cat:'body',ex_vi:'Tai tôi đau.',ex_th:'หูของฉันเจ็บ'},
  {id:75,vi:'tay',th:'มือ/แขน',pv:'ตาย',pt:'muue',cat:'body',ex_vi:'Tay phải.',ex_th:'มือขวา'},
  {id:76,vi:'chân',th:'ขา/เท้า',pv:'เจิน',pt:'khǎa',cat:'body',ex_vi:'Chân tôi mỏi.',ex_th:'ขาฉันล้า'},
  {id:77,vi:'bụng',th:'ท้อง',pv:'บุ้ง',pt:'tóong',cat:'body',ex_vi:'Bụng đói.',ex_th:'ท้องหิว'},
  {id:78,vi:'lưng',th:'หลัง',pv:'เหลือง',pt:'lǎng',cat:'body',ex_vi:'Lưng đau.',ex_th:'หลังปวด'},
  {id:79,vi:'tim',th:'หัวใจ',pv:'ติม',pt:'hǔa-jai',cat:'body',ex_vi:'Tim tôi đập nhanh.',ex_th:'หัวใจฉันเต้นเร็ว'},
  {id:80,vi:'xe buýt',th:'รถเมล์',pv:'เซ บุ้ย',pt:'rót-mee',cat:'transport',ex_vi:'Đi xe buýt số 8.',ex_th:'นั่งรถเมล์สาย 8'},
  {id:81,vi:'taxi',th:'แท็กซี่',pv:'แท็กซี่',pt:'rót-táek-sîi',cat:'transport',ex_vi:'Gọi taxi đi.',ex_th:'เรียกแท็กซี่ไป'},
  {id:82,vi:'xe máy',th:'มอเตอร์ไซค์',pv:'เซ ม้าย',pt:'moo-dtəə-sai',cat:'transport',ex_vi:'Đi xe máy nhanh.',ex_th:'ขี่มอเตอร์ไซค์เร็ว'},
  {id:83,vi:'máy bay',th:'เครื่องบิน',pv:'ม้าย บาย',pt:'khrûeang-bin',cat:'transport',ex_vi:'Đi máy bay 2 tiếng.',ex_th:'นั่งเครื่องบิน 2 ชั่วโมง'},
  {id:84,vi:'tàu hỏa',th:'รถไฟ',pv:'เต่า ฮว้า',pt:'rót-fai',cat:'transport',ex_vi:'Tàu hỏa đến Đà Nẵng.',ex_th:'รถไฟไปดานัง'},
  {id:85,vi:'xe ôm',th:'จักรยานยนต์รับจ้าง',pv:'เซ โอม',pt:'rót-ráp-jâang',cat:'transport',ex_vi:'Đi xe ôm cho nhanh.',ex_th:'ขี่รถรับจ้างให้เร็ว'},
  {id:86,vi:'bến xe',th:'สถานีรถ',pv:'เบ๊น เซ',pt:'sà-thǎa-nii-rót',cat:'transport',ex_vi:'Bến xe Miền Đông.',ex_th:'สถานีรถ Miền Đông'},
  {id:87,vi:'sân bay',th:'สนามบิน',pv:'เซิน บาย',pt:'sà-nǎam-bin',cat:'transport',ex_vi:'Sân bay Tân Sơn Nhất.',ex_th:'สนามบิน Tân Sơn Nhất'},
  {id:88,vi:'vé',th:'ตั๋ว',pv:'เว้',pt:'dtǔa',cat:'transport',ex_vi:'Mua vé tàu.',ex_th:'ซื้อตั๋วรถไฟ'},
  {id:89,vi:'bao nhiêu tiền?',th:'เท่าไหร่?',pv:'บาว เหนียว เตี้ยน',pt:'thâo-rài',cat:'transport',ex_vi:'Đi bao nhiêu tiền?',ex_th:'ไปเท่าไหร่?'},
  {id:90,vi:'mưa',th:'ฝน',pv:'เหมือ',pt:'fǒn',cat:'weather',ex_vi:'Trời mưa to.',ex_th:'ฝนตกหนัก'},
  {id:91,vi:'nắng',th:'แดด/แดดออก',pv:'นั้ง',pt:'dàet',cat:'weather',ex_vi:'Trời nắng đẹp.',ex_th:'แดดออกสวยงาม'},
  {id:92,vi:'nóng',th:'ร้อน',pv:'น้อง',pt:'róon',cat:'weather',ex_vi:'Hôm nay nóng lắm.',ex_th:'วันนี้ร้อนมาก'},
  {id:93,vi:'lạnh',th:'หนาว',pv:'ล่าน',pt:'nǎao',cat:'weather',ex_vi:'Hà Nội lạnh lắm.',ex_th:'ฮานอยหนาวมาก'},
  {id:94,vi:'gió',th:'ลม',pv:'ยีโอ',pt:'lom',cat:'weather',ex_vi:'Gió thổi mạnh.',ex_th:'ลมพัดแรง'},
  {id:95,vi:'bão',th:'พายุ',pv:'บ้าว',pt:'phaa-yú',cat:'weather',ex_vi:'Bão lớn đến rồi.',ex_th:'พายุใหญ่มาแล้ว'},
  {id:96,vi:'ẩm',th:'ชื้น',pv:'อึม',pt:'chúuen',cat:'weather',ex_vi:'Thời tiết ẩm.',ex_th:'อากาศชื้น'},
  {id:97,vi:'mát',th:'เย็น/เย็นสบาย',pv:'ม้าต',pt:'yen',cat:'weather',ex_vi:'Buổi tối mát.',ex_th:'ตอนเย็นอากาศเย็น'},
  {id:100,vi:'cơm',th:'ข้าว',pv:'กอม',pt:'khâao',cat:'food',ex_vi:'Cơm trắng.',ex_th:'ข้าวสวย'},
  {id:101,vi:'phở',th:'เฝอ (ก๋วยเตี๋ยวเวียดนาม)',pv:'เฝอ',pt:'fǒo',cat:'food',ex_vi:'Phở bò ngon lắm.',ex_th:'เฝอเนื้ออร่อยมาก'},
  {id:102,vi:'bánh mì',th:'ขนมปัง/บั๊งมี่',pv:'บ๊าน มี่',pt:'khà-nǒm-bpang',cat:'food',ex_vi:'Bánh mì thịt.',ex_th:'บั๊งมี่หมู'},
  {id:103,vi:'nước',th:'น้ำ',pv:'เหนือก',pt:'náam',cat:'food',ex_vi:'Cho tôi xin nước.',ex_th:'ขอน้ำหน่อย'},
  {id:104,vi:'cà phê',th:'กาแฟ',pv:'กา เฟ้',pt:'gaa-fae',cat:'food',ex_vi:'Cà phê đen.',ex_th:'กาแฟดำ'},
  {id:105,vi:'bia',th:'เบียร์',pv:'เบีย',pt:'bia',cat:'food',ex_vi:'Một cốc bia.',ex_th:'เบียร์หนึ่งแก้ว'},
  {id:106,vi:'thịt gà',th:'ไก่',pv:'ถิด ก่า',pt:'gài',cat:'food',ex_vi:'Cơm thịt gà.',ex_th:'ข้าวไก่'},
  {id:107,vi:'thịt heo',th:'หมู',pv:'ถิด เฮ่ว',pt:'mǔu',cat:'food',ex_vi:'Thịt heo quay.',ex_th:'หมูหัน'},
  {id:108,vi:'cá',th:'ปลา',pv:'ก้า',pt:'bplaa',cat:'food',ex_vi:'Cá hấp.',ex_th:'ปลานึ่ง'},
  {id:109,vi:'rau',th:'ผัก',pv:'ร้าว',pt:'phàk',cat:'food',ex_vi:'Rau muống xào.',ex_th:'ผักบุ้งผัด'},
  {id:110,vi:'trứng',th:'ไข่',pv:'ต้รึง',pt:'khài',cat:'food',ex_vi:'Trứng chiên.',ex_th:'ไข่ดาว'},
  {id:111,vi:'ngon',th:'อร่อย',pv:'หงอน',pt:'à-ròi',cat:'food',ex_vi:'Món này ngon quá!',ex_th:'เมนูนี้อร่อยมาก!'},
  {id:112,vi:'không cay',th:'ไม่เผ็ด',pv:'ขง กาย',pt:'mâi-phèt',cat:'food',ex_vi:'Cho không cay nhé.',ex_th:'ขอไม่เผ็ดนะ'},
  {id:113,vi:'tính tiền',th:'คิดเงิน/เช็คบิล',pv:'ติน เตี้ยน',pt:'chék-bin',cat:'food',ex_vi:'Cho tính tiền nhé.',ex_th:'ขอเช็คบิลด้วย'},
  {id:120,vi:'tôi không hiểu',th:'ฉันไม่เข้าใจ',pv:'โตย ขง เฮียว',pt:'chǎn mâi khâo-jai',cat:'phrases',ex_vi:'Xin lỗi, tôi không hiểu.',ex_th:'ขอโทษ ฉันไม่เข้าใจ'},
  {id:121,vi:'nói lại được không?',th:'พูดอีกครั้งได้ไหม?',pv:'นอ้ย ล่าย เด๊ก ขง',pt:'phûut iik khráng dâi mǎi',cat:'phrases',ex_vi:'Nói chậm lại được không?',ex_th:'พูดช้าๆ ได้ไหม?'},
  {id:122,vi:'tôi tên là...',th:'ฉันชื่อ...',pv:'โตย เต้น ล่า',pt:'chǎn chûue',cat:'phrases',ex_vi:'Tôi tên là Nam.',ex_th:'ฉันชื่อนาม'},
  {id:123,vi:'bạn tên gì?',th:'คุณชื่ออะไร?',pv:'บ่าน เต้น ยี',pt:'khun chûue à-rai',cat:'phrases',ex_vi:'Bạn tên gì? — Tôi tên Mai.',ex_th:'คุณชื่ออะไร? — ฉันชื่อไหม'},
  {id:124,vi:'bao nhiêu tuổi?',th:'อายุเท่าไหร่?',pv:'บาว เหนียว ตว้อย',pt:'aa-yú thâo-rài',cat:'phrases',ex_vi:'Bạn bao nhiêu tuổi?',ex_th:'คุณอายุเท่าไหร่?'},
  {id:125,vi:'tôi đến từ...',th:'ฉันมาจาก...',pv:'โตย เด๊น ตือ',pt:'chǎn maa-jàak',cat:'phrases',ex_vi:'Tôi đến từ Thái Lan.',ex_th:'ฉันมาจากประเทศไทย'},
  {id:126,vi:'ở đâu?',th:'อยู่ที่ไหน?',pv:'เออ เดิ่ว',pt:'yùu-thîi-nǎi',cat:'phrases',ex_vi:'Nhà vệ sinh ở đâu?',ex_th:'ห้องน้ำอยู่ที่ไหน?'},
  {id:127,vi:'thích',th:'ชอบ',pv:'ถิก',pt:'chôop',cat:'phrases',ex_vi:'Tôi thích ăn phở.',ex_th:'ฉันชอบกินเฝอ'},
  {id:128,vi:'yêu',th:'รัก',pv:'เยิว',pt:'rák',cat:'phrases',ex_vi:'Tôi yêu bạn.',ex_th:'ฉันรักคุณ'},
  {id:129,vi:'đẹp quá!',th:'สวยมาก!/เก่งมาก!',pv:'เด๊บ กว้า',pt:'sǔay mâak',cat:'phrases',ex_vi:'Phong cảnh đẹp quá!',ex_th:'วิวสวยมากเลย!'},
  {id:130,vi:'giúp tôi với',th:'ช่วยฉันด้วย',pv:'ยิ๊ว โตย หวย',pt:'chûay chǎn dûay',cat:'phrases',ex_vi:'Giúp tôi với, tôi bị lạc.',ex_th:'ช่วยฉันด้วย ฉันหลงทาง'},
  {id:131,vi:'có',th:'มี',pv:'โก้',pt:'mii',cat:'phrases',ex_vi:'Có phòng trống không?',ex_th:'มีห้องว่างไหม?'},
  {id:132,vi:'không có',th:'ไม่มี',pv:'ขง โก้',pt:'mâi-mii',cat:'phrases',ex_vi:'Không có phòng.',ex_th:'ไม่มีห้อง'}
];

function doPost(e){
  let b = {};
  try {
    if (e && e.parameter && e.parameter.payload) b = JSON.parse(e.parameter.payload);
    else if (e && e.postData && e.postData.contents) b = JSON.parse(e.postData.contents);
  } catch(_) {}
  return doPostBody_(b);
}

function doPostBody_(b){
  try {
    const a = (b.action||'').toLowerCase();
    if (a === 'comment')          return json_(addComment_(b));
    if (a === 'post')             return json_(adminUpsertPost_(b));
    if (a === 'delete')           return json_(adminDeletePost_(b));
    if (a === 'admin_listall')    return json_(adminListAll_(b));
    if (a === 'admin_delcomment') return json_(adminDelComment_(b));
    if (a === 'admin_approve')    return json_(adminApprove_(b));
    if (a === 'magic_send')       return json_(magicSend_(b));
    if (a === 'magic_verify')     return json_(magicVerifyApi_(b));
    if (a === 'fb_login')         return json_(fbLogin_(b));
    if (a === 'google_login')     return json_(googleLogin_(b));
    if (a === 'bookmark_toggle')  return json_(bookmarkToggle_(b));
    if (a === 'bookmark_list')    return json_(bookmarkList_(b));
    if (a === 'my_orders')        return json_(myOrders_(b));
    if (a === 'vocab_save')       return json_(vocabSave_(b));
    if (a === 'vocab_review')     return json_(vocabReview_(b));
    if (a === 'vocab_due')        return json_(vocabDue_(b));
    if (a === 'quiz_submit')      return json_(quizSubmit_(b));
    if (a === 'leaderboard')      return json_(leaderboard_(b));
    if (a === 'thanks_list')      return json_(thanksList_());
    if (a === 'logout')           return json_(logout_(b));
    if (a === 'order_create')     return json_(orderCreate_(b));
    if (a === 'order_slip')       return json_(orderSubmitSlip_(b));
    if (a === 'order_status')     return json_(adminOrderStatus_(b));
    if (a === 'donate_log')       return json_(donateLog_(b));
    if (a === 'admin_login')      return json_(adminLogin_(b));
    if (a === 'admin_login_otp')  return json_(adminLoginOtp_(b));
    if (a === 'admin_google')     return json_(adminGoogleLogin_(b));
    if (a === 'admin_logout')     return json_(adminLogoutCall_(b));
    if (a === 'admin_check')      return json_({ok: !!requireAdmin_(b)});
    if (a === 'admin_stats')      return json_(adminStats_(b));
    if (a === 'admin_pending')    return json_(adminPendingComments_(b));
    return json_({error:'unknown action: ' + a});
  } catch(e){
    return json_({error: 'server: ' + (e.message||e), stack: String(e.stack||'').slice(0,500)});
  }
}
