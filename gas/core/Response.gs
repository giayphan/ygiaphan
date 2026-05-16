// Standard JSON response envelope
// ป้องกัน sensitive response ถูก cache โดย CDN/proxy
function json_(o){
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
