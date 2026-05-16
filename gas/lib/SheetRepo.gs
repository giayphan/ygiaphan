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
  if (!sh){ sh = ss.insertSheet(name); sh.appendRow(headers); return; }
  if (sh.getLastRow() === 0){ sh.appendRow(headers); return; }
  // ensure each header is at its correct column index
  const ncols = Math.max(sh.getLastColumn(), headers.length);
  const row = sh.getRange(1, 1, 1, ncols).getValues()[0];
  let changed = false;
  headers.forEach((h, i) => {
    if (String(row[i]||'') !== h){ row[i] = h; changed = true; }
  });
  if (changed) sh.getRange(1, 1, 1, ncols).setValues([row]);
}
