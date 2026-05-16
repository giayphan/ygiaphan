// Generic Spreadsheet helpers shared across all domain modules

function ss_(){ return SpreadsheetApp.openById(SHEET_ID); }
function sheet_(n){ return ss_().getSheetByName(n); }

function rowsAsObjects_(sh){
  const r = sh.getDataRange().getValues();
  const h = r.shift();
  return r.map(row => Object.fromEntries(h.map((k,i)=>[k,row[i]])));
}

function findRow_(sh, key, val){
  const r = sh.getDataRange().getValues();
  const h = r.shift();
  const idx = r.findIndex(x => x[h.indexOf(key)] === val);
  return { idx: idx >= 0 ? idx+2 : -1, head: h };
}

function ensureSheet_(ss, name, headers){
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(headers);
}
