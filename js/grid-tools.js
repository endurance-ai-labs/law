/* ============================================================
   GridTools — site standard for LARGE information tables.
   1. Collapse any column (checklist menu) or row (hover minus).
   2. Print / PDF in institutional letterhead format.
   3. Export a REAL .xlsx (styled, print-ready, investor-ready:
      letterhead rows, navy header band, formatted numbers, column
      widths, frozen header, landscape fit-to-width print setup,
      confidential footer). Zero post-export edits needed.

   Usage: GridTools.attach(wrapEl, { title, subtitle, filename })
   The wrap must contain a <table> (thead/tbody[/tfoot]). Export and
   print read the DOM at click time, so live filters/edits are
   respected, and hidden columns/rows are excluded (WYSIWYG).
   ============================================================ */
(function () {
  var FIRM = 'WHITMORE VANCE LLP';
  var FIRM_SUB = 'Real Estate Private Equity';
  var NAVY = '1B3E63', BLUE = '2766D6';

  // ---------- tiny CRC32 (for the zip) ----------
  var CRC_T = (function () {
    var t = [], c, n, k;
    for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
    return t;
  })();
  function crc32(u8) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function strU8(s) { return new TextEncoder().encode(s); }

  // ---------- minimal ZIP (stored, no compression) ----------
  function buildZip(files) { // files: [{name, data(Uint8Array)}]
    var chunks = [], central = [], offset = 0;
    function u16(v) { return new Uint8Array([v & 255, (v >> 8) & 255]); }
    function u32(v) { return new Uint8Array([v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255]); }
    files.forEach(function (f) {
      var nm = strU8(f.name), crc = crc32(f.data);
      var head = [0x50,0x4b,0x03,0x04, 20,0, 0,0, 0,0, 0,0, 0,0];
      var lh = new Uint8Array(30 + nm.length);
      lh.set(head, 0);
      lh.set(u32(crc), 14); lh.set(u32(f.data.length), 18); lh.set(u32(f.data.length), 22);
      lh.set(u16(nm.length), 26); lh.set(u16(0), 28); lh.set(nm, 30);
      chunks.push(lh, f.data);
      var ch = new Uint8Array(46 + nm.length);
      ch.set([0x50,0x4b,0x01,0x02, 20,0, 20,0, 0,0, 0,0, 0,0, 0,0], 0);
      ch.set(u32(crc), 16); ch.set(u32(f.data.length), 20); ch.set(u32(f.data.length), 24);
      ch.set(u16(nm.length), 28);
      ch.set(u32(offset), 42); ch.set(nm, 46);
      central.push(ch);
      offset += lh.length + f.data.length;
    });
    var cdSize = central.reduce(function (a, c) { return a + c.length; }, 0);
    var end = new Uint8Array(22);
    end.set([0x50,0x4b,0x05,0x06, 0,0, 0,0], 0);
    end.set(u16(files.length), 8); end.set(u16(files.length), 10);
    end.set(u32(cdSize), 12); end.set(u32(offset), 16);
    var all = chunks.concat(central, [end]);
    var total = all.reduce(function (a, c) { return a + c.length; }, 0);
    var out = new Uint8Array(total), pos = 0;
    all.forEach(function (c) { out.set(c, pos); pos += c.length; });
    return out;
  }

  var XE = function (s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };

  // ---------- cell parsing: display text -> typed value + format ----------
  // fmt ids map to styles.xml: 0 text, 1 money0, 2 money2, 3 pct, 4 num, 5 x(dscr)
  function parseCell(txt) {
    var t = txt.replace(/\s+/g, ' ').trim().replace(/[↗⏷▲▼]/g, '').trim();
    if (t === '' || t === '—' || t === '–') return { v: '', type: 's', fmt: 0 };
    var neg = /^\(.*\)$/.test(t);
    var core = neg ? t.slice(1, -1) : t;
    var isMoney = /^\$/.test(core);
    core = core.replace(/^\$/, '');
    if (/^-?[\d,]+(\.\d+)?%$/.test(core)) {
      var pv = parseFloat(core.replace(/,/g, '')) / 100;
      return { v: neg ? -pv : pv, type: 'n', fmt: 3 };
    }
    if (/^-?[\d,]+(\.\d+)?x$/i.test(core)) {
      var xv = parseFloat(core.replace(/,/g, ''));
      return { v: neg ? -xv : xv, type: 'n', fmt: 5 };
    }
    if (/^-?[\d,]+(\.\d+)?$/.test(core)) {
      var nv = parseFloat(core.replace(/,/g, ''));
      if (neg) nv = -nv;
      if (isMoney) return { v: nv, type: 'n', fmt: /\.\d{2}$/.test(core) ? 2 : 1 };
      return { v: nv, type: 'n', fmt: 4 };
    }
    return { v: t, type: 's', fmt: 0 };
  }

  // ---------- read the table DOM (visible cells only) ----------
  function readTable(tbl) {
    var out = { head: [], body: [], foot: [] };
    var hidCols = [];
    var hrow = tbl.tHead && tbl.tHead.rows[0];
    if (!hrow) return out;
    Array.prototype.forEach.call(hrow.cells, function (th, i) {
      if (th.style.display === 'none' || th.classList.contains('gt-colhide')) { hidCols.push(i); return; }
      out.head.push(th.textContent.replace(/\s+/g, ' ').replace(/[⏷▲▼]/g, '').trim());
    });
    function rows(sec, dst) {
      if (!sec) return;
      Array.prototype.forEach.call(sec.rows, function (tr) {
        if (tr.style.display === 'none' || tr.classList.contains('gt-rowhide') || tr.classList.contains('gt-rowfhide')) return;
        if (tr.querySelector('td[colspan],th[colspan]')) return;   // section-header rows: skip in export
        var r = [];
        Array.prototype.forEach.call(tr.cells, function (td, i) {
          if (hidCols.indexOf(i) >= 0 || td.style.display === 'none' || td.classList.contains('gt-colhide')) return;
          r.push(td.textContent.replace(/\s+/g, ' ').trim());
        });
        if (r.length) dst.push(r);
      });
    }
    rows(tbl.tBodies[0], out.body);
    rows(tbl.tFoot, out.foot);
    return out;
  }

  // ---------- XLSX ----------
  function colLetter(n) { var s = ''; n++; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; }

  function xlsx(data, meta) {
    var asOf = meta.asOf || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    var nCols = data.head.length;
    var sst = [], sstMap = {};
    function s(str) { if (sstMap[str] === undefined) { sstMap[str] = sst.length; sst.push(str); } return sstMap[str]; }

    // styles: 0 default | 1 firm | 2 firmsub | 3 title | 4 asof | 5 header |
    // 6..10 body text/money0/money2/pct/num/x -> (6=text,7=money0,8=money2,9=pct,10=num,11=x)
    // 12..17 totals versions (bold + top border)
    var fmtToBody = { 0: 6, 1: 7, 2: 8, 3: 9, 4: 10, 5: 11 };
    var fmtToFoot = { 0: 12, 1: 13, 2: 14, 3: 15, 4: 16, 5: 17 };

    var rowsXml = [];
    var R = 1;
    function row(cells, ht) {
      var xml = '<row r="' + R + '"' + (ht ? ' ht="' + ht + '" customHeight="1"' : '') + '>';
      cells.forEach(function (c, i) {
        if (c === null) return;
        var ref = colLetter(i) + R;
        if (c.type === 'n') xml += '<c r="' + ref + '" s="' + c.s + '"><v>' + c.v + '</v></c>';
        else if (c.v !== '') xml += '<c r="' + ref + '" s="' + c.s + '" t="s"><v>' + s(String(c.v)) + '</v></c>';
        else xml += '<c r="' + ref + '" s="' + c.s + '"/>';
      });
      xml += '</row>'; rowsXml.push(xml); R++;
    }
    // letterhead
    row([{ v: FIRM, type: 's', s: 1 }], 22);
    row([{ v: meta.title + (meta.subtitle ? ' — ' + meta.subtitle : ''), type: 's', s: 3 }], 18);
    row([{ v: 'As of ' + asOf + ' · ' + FIRM_SUB + ' · Confidential — prepared for investor use', type: 's', s: 4 }], 14);
    row([{ v: '', type: 's', s: 0 }]);
    var headerRowIdx = R;
    row(data.head.map(function (h) { return { v: h, type: 's', s: 5 }; }), 26);
    var widths = data.head.map(function (h) { return Math.max(10, h.length + 2); });
    function dataRow(cells, foot) {
      var xs = cells.map(function (txt, i) {
        var p = parseCell(txt);
        if (i < widths.length) widths[i] = Math.min(42, Math.max(widths[i], String(txt).length + 2));
        return { v: p.v, type: p.type, s: (foot ? fmtToFoot : fmtToBody)[p.fmt] };
      });
      while (xs.length < nCols) xs.push({ v: '', type: 's', s: foot ? 12 : 6 });
      row(xs, foot ? 20 : undefined);
    }
    data.body.forEach(function (r) { dataRow(r, false); });
    data.foot.forEach(function (r) { dataRow(r, true); });

    var sheet =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0" showGridLines="false">' +
      '<pane ySplit="' + headerRowIdx + '" topLeftCell="A' + (headerRowIdx + 1) + '" activePane="bottomLeft" state="frozen"/>' +
      '</sheetView></sheetViews>' +
      '<cols>' + widths.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('') + '</cols>' +
      '<sheetData>' + rowsXml.join('') + '</sheetData>' +
      '<printOptions horizontalCentered="true"/>' +
      '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.55" header="0.25" footer="0.25"/>' +
      '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="1"/>' +
      '<headerFooter><oddFooter>&amp;L&amp;8' + XE(FIRM) + ' — Confidential&amp;R&amp;8Page &amp;P of &amp;N</oddFooter></headerFooter>' +
      '</worksheet>';

    var styles =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="5">' +
      '<numFmt numFmtId="164" formatCode="$#,##0_);($#,##0)"/>' +
      '<numFmt numFmtId="165" formatCode="$#,##0.00_);($#,##0.00)"/>' +
      '<numFmt numFmtId="166" formatCode="0.0%"/>' +
      '<numFmt numFmtId="167" formatCode="#,##0_);(#,##0)"/>' +
      '<numFmt numFmtId="168" formatCode="0.00&quot;x&quot;"/>' +
      '</numFmts>' +
      '<fonts count="6">' +
      '<font><sz val="10"/><name val="Calibri"/></font>' +                                             /* 0 body */
      '<font><b/><sz val="15"/><color rgb="FF' + NAVY + '"/><name val="Calibri"/></font>' +            /* 1 firm */
      '<font><b/><sz val="11"/><color rgb="FF' + NAVY + '"/><name val="Calibri"/></font>' +            /* 2 title */
      '<font><sz val="9"/><color rgb="FF737C8A"/><name val="Calibri"/></font>' +                       /* 3 asof */
      '<font><b/><sz val="9"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +                   /* 4 header */
      '<font><b/><sz val="10"/><color rgb="FF' + NAVY + '"/><name val="Calibri"/></font>' +            /* 5 totals */
      '</fonts>' +
      '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF' + NAVY + '"/></patternFill></fill>' +  /* 2 header */
      '<fill><patternFill patternType="solid"><fgColor rgb="FFEFF4FC"/></patternFill></fill>' +        /* 3 totals */
      '</fills>' +
      '<borders count="4"><border/><border><bottom style="thin"><color rgb="FFD8DDE5"/></bottom></border>' +
      '<border><top style="medium"><color rgb="FF' + BLUE + '"/></top></border>' +
      '<border><bottom style="medium"><color rgb="FF' + NAVY + '"/></bottom></border></borders>' +
      '<cellStyleXfs count="1"><xf/></cellStyleXfs>' +
      '<cellXfs count="18">' +
      '<xf/>' +                                                                                        /* 0 */
      '<xf fontId="1" applyFont="1"/>' +                                                               /* 1 firm */
      '<xf fontId="3" applyFont="1"/>' +                                                               /* 2 firmsub (unused) */
      '<xf fontId="2" applyFont="1"/>' +                                                               /* 3 title */
      '<xf fontId="3" applyFont="1"/>' +                                                               /* 4 asof */
      '<xf fontId="4" fillId="2" borderId="3" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' + /* 5 header */
      '<xf fontId="0" borderId="1" applyBorder="1"/>' +                                                /* 6 text */
      '<xf fontId="0" numFmtId="164" borderId="1" applyNumberFormat="1" applyBorder="1"/>' +           /* 7 money0 */
      '<xf fontId="0" numFmtId="165" borderId="1" applyNumberFormat="1" applyBorder="1"/>' +           /* 8 money2 */
      '<xf fontId="0" numFmtId="166" borderId="1" applyNumberFormat="1" applyBorder="1"/>' +           /* 9 pct */
      '<xf fontId="0" numFmtId="167" borderId="1" applyNumberFormat="1" applyBorder="1"/>' +           /* 10 num */
      '<xf fontId="0" numFmtId="168" borderId="1" applyNumberFormat="1" applyBorder="1"/>' +           /* 11 x */
      '<xf fontId="5" fillId="3" borderId="2" applyFont="1" applyFill="1" applyBorder="1"/>' +         /* 12 foot text */
      '<xf fontId="5" fillId="3" borderId="2" numFmtId="164" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
      '<xf fontId="5" fillId="3" borderId="2" numFmtId="165" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
      '<xf fontId="5" fillId="3" borderId="2" numFmtId="166" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
      '<xf fontId="5" fillId="3" borderId="2" numFmtId="167" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
      '<xf fontId="5" fillId="3" borderId="2" numFmtId="168" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
      '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

    var sstXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + sst.length + '" uniqueCount="' + sst.length + '">' +
      sst.map(function (t) { return '<si><t xml:space="preserve">' + XE(t) + '</t></si>'; }).join('') + '</sst>';

    var files = [
      { name: '[Content_Types].xml', data: strU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>') },
      { name: '_rels/.rels', data: strU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
      { name: 'xl/workbook.xml', data: strU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + XE((meta.sheetName || meta.title || 'Report').slice(0, 30)) + '" sheetId="1" r:id="rId1"/></sheets></workbook>') },
      { name: 'xl/_rels/workbook.xml.rels', data: strU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>') },
      { name: 'xl/styles.xml', data: strU8(styles) },
      { name: 'xl/sharedStrings.xml', data: strU8(sstXml) },
      { name: 'xl/worksheets/sheet1.xml', data: strU8(sheet) },
    ];
    return buildZip(files);
  }

  function download(u8, filename) {
    var blob = new Blob([u8], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }

  // ---------- institutional print window ----------
  function printDoc(data, meta) {
    var asOf = meta.asOf || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    var w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to print.'); return; }
    var thead = '<tr>' + data.head.map(function (h) { return '<th>' + XE(h) + '</th>'; }).join('') + '</tr>';
    function cls(txt) { var p = parseCell(txt); return p.type === 'n' || txt.trim() === '—' ? ' class="r"' : ''; }
    var tbody = data.body.map(function (r) { return '<tr>' + r.map(function (c) { return '<td' + cls(c) + '>' + XE(c) + '</td>'; }).join('') + '</tr>'; }).join('');
    var tfoot = data.foot.map(function (r) { return '<tr class="tot">' + r.map(function (c) { return '<td' + cls(c) + '>' + XE(c) + '</td>'; }).join('') + '</tr>'; }).join('');
    w.document.write('<!doctype html><html><head><title>' + XE(meta.title) + '</title><style>' +
      '@page{size:landscape;margin:12mm 10mm;}' +
      'body{font-family:Inter,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#14181f;margin:0;padding:24px 26px;}' +
      '.lh{border-bottom:3px solid #1b3e63;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end;}' +
      '.lh .f{font-size:17px;font-weight:800;letter-spacing:.02em;color:#1b3e63;}' +
      '.lh .fs{font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:#737c8a;margin-top:2px;}' +
      '.lh .t{text-align:right;}.lh .tt{font-size:13px;font-weight:700;color:#14181f;}' +
      '.lh .ta{font-size:9.5px;color:#737c8a;margin-top:2px;}' +
      'table{border-collapse:collapse;width:100%;font-size:8.5px;}' +
      'thead th{background:#1b3e63;color:#fff;font-size:7.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:6px 6px;text-align:left;-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
      'tbody td{padding:4px 6px;border-bottom:1px solid #e3e6ec;font-variant-numeric:tabular-nums;white-space:nowrap;}' +
      'tbody tr:nth-child(even) td{background:#f6f8fb;-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
      'td.r,th.r{text-align:right;}' +
      'tr.tot td{font-weight:800;color:#1b3e63;background:#eff4fc;border-top:2px solid #2766d6;border-bottom:none;padding:7px 6px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
      '.ft{margin-top:14px;font-size:8px;color:#8a93a1;display:flex;justify-content:space-between;}' +
      'thead{display:table-header-group;}tr{page-break-inside:avoid;}' +
      '</style></head><body>' +
      '<div class="lh"><div><div class="f">' + FIRM + '</div><div class="fs">' + FIRM_SUB + '</div></div>' +
      '<div class="t"><div class="tt">' + XE(meta.title) + (meta.subtitle ? ' — ' + XE(meta.subtitle) : '') + '</div><div class="ta">As of ' + XE(asOf) + ' · Confidential — prepared for investor use</div></div></div>' +
      '<table><thead>' + thead + '</thead><tbody>' + tbody + (tfoot ? '</tbody><tbody>' + tfoot : '') + '</tbody></table>' +
      '<div class="ft"><span>' + FIRM + ' — Confidential</span><span>Generated ' + XE(asOf) + '</span></div>' +
      '</body></html>');
    w.document.close();
    w.focus();
    setTimeout(function () { w.print(); }, 350);
  }

  // ---------- UI: toolbar + column menu + row hide ----------
  var CSS_DONE = false;
  function ensureCss() {
    if (CSS_DONE) return; CSS_DONE = true;
    var st = document.createElement('style');
    st.textContent =
      '.gt-bar{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin:0 0 10px;flex-wrap:wrap;}' +
      '.gt-btn{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;padding:6px 12px;border-radius:6px;cursor:pointer;border:1px solid var(--color-border);background:var(--color-bg-2);color:var(--color-cloud-whisper);font-family:var(--font-sans);}' +
      '.gt-btn:hover{border-color:var(--color-blue);color:var(--color-blue);}' +
      '.gt-btn.primary{background:var(--color-blue);border-color:var(--color-blue);color:#fff;}' +
      '.gt-btn.primary:hover{filter:brightness(1.08);color:#fff;}' +
      '.gt-chip{font-family:var(--font-mono);font-size:10px;color:var(--color-amber);background:var(--color-amber-bg);border-radius:4px;padding:3px 8px;cursor:pointer;}' +
      '.gt-menu{position:fixed;z-index:6000;width:230px;max-height:340px;overflow-y:auto;background:var(--color-bg-1,#fff);border:1px solid var(--color-border);border-radius:8px;box-shadow:0 12px 34px rgba(15,22,38,0.24);padding:8px;}' +
      '.gt-menu label{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--color-cloud-whisper);padding:4px 6px;border-radius:4px;cursor:pointer;font-family:var(--font-sans);}' +
      '.gt-menu label:hover{background:var(--color-bg-3);}' +
      '.gt-menu .gt-menu-hd{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--color-text-muted);padding:4px 6px 6px;}' +
      '.gt-rowx{position:absolute;left:2px;width:14px;height:14px;line-height:12px;text-align:center;border-radius:3px;background:var(--color-red-bg);color:var(--color-red);font-size:10px;font-weight:800;cursor:pointer;opacity:0;transition:opacity .1s;user-select:none;}' +
      'tr:hover .gt-rowx{opacity:1;}' +
      '.gt-colhide{display:none !important;}' +
      '.gt-rowhide{display:none !important;}' +
      '.gt-rowfhide{display:none !important;}' +
      'th.gt-fth{cursor:pointer;}th.gt-fth:hover{text-decoration:underline;}' +
      'th.gt-fth.gt-factive{box-shadow:inset 0 -3px 0 var(--color-blue);}' +
      '.gt-pop{position:fixed;z-index:6000;width:250px;background:var(--color-bg-1,#fff);border:1px solid var(--color-border);border-radius:8px;box-shadow:0 12px 34px rgba(15,22,38,0.24);padding:10px;font-family:var(--font-sans);}' +
      '.gt-pop-hd{font-size:12px;font-weight:800;color:var(--color-cloud-whisper);padding:2px 2px 8px;border-bottom:1px solid var(--color-border-soft);margin-bottom:8px;}' +
      '.gt-pop-sort{display:flex;gap:6px;margin-bottom:8px;}' +
      '.gt-pop-sort button{flex:1;font-size:11px;font-weight:600;padding:6px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-bg-2);color:var(--color-cloud-whisper);cursor:pointer;}' +
      '.gt-pop-sort button:hover{border-color:var(--color-blue);color:var(--color-blue);}' +
      '.gt-pop-stats{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;}' +
      '.gt-pop-stats span{font-family:var(--font-mono);font-size:9.5px;color:var(--color-text-muted);background:var(--color-bg-3);border:1px solid var(--color-border-soft);border-radius:4px;padding:2px 6px;}' +
      '.gt-pop-range{display:flex;align-items:center;gap:6px;margin-bottom:8px;}' +
      '.gt-pop-range input{width:100%;border:1px solid var(--color-border);border-radius:6px;background:var(--color-bg-3);color:var(--color-cloud-whisper);font-family:var(--font-mono);font-size:12px;padding:5px 7px;}' +
      '.gt-pop-search{width:100%;border:1px solid var(--color-border);border-radius:6px;background:var(--color-bg-3);color:var(--color-cloud-whisper);font-size:12px;padding:6px 8px;margin-bottom:8px;box-sizing:border-box;}' +
      '.gt-pop-checks{max-height:180px;overflow-y:auto;border:1px solid var(--color-border-soft);border-radius:6px;padding:4px;margin-bottom:9px;}' +
      '.gt-pop-checks label{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--color-cloud-whisper);padding:3px 5px;border-radius:4px;cursor:pointer;font-variant-numeric:tabular-nums;}' +
      '.gt-pop-checks label:hover{background:var(--color-bg-3);}' +
      '.gt-pop-ft{display:flex;gap:6px;}' +
      '.gt-pop-ft button{flex:1;font-size:11.5px;font-weight:700;padding:7px;border-radius:6px;cursor:pointer;border:1px solid var(--color-border);}' +
      '.gt-pop-clear{background:var(--color-bg-2);color:var(--color-text-muted);}' +
      '.gt-pop-apply{background:var(--color-blue);color:#fff;border-color:var(--color-blue) !important;}';
    document.head.appendChild(st);
  }

  function attach(wrap, meta) {
    ensureCss();
    if (wrap.__gt) return wrap.__gt;          // idempotent — safe on re-render loops
    var tbl = wrap.querySelector('table'); if (!tbl) return null;
    var state = { hiddenCols: new Set(), hiddenRows: 0 };

    var bar = document.createElement('div');
    bar.className = 'gt-bar no-print';
    bar.innerHTML =
      '<span class="gt-chip" style="display:none;"></span>' +
      '<button class="gt-btn gt-cols">▦ Columns</button>' +
      '<button class="gt-btn gt-xls">⤓ Excel</button>' +
      '<button class="gt-btn primary gt-prt">⎙ Print / PDF</button>';
    wrap.parentNode.insertBefore(bar, wrap);
    var chip = bar.querySelector('.gt-chip');

    function curTable() { return wrap.querySelector('table') || tbl; }

    function applyCols() {
      var t = curTable();
      ['tHead', 'tFoot'].forEach(function (secName) {
        var sec = t[secName]; if (!sec) return;
        Array.prototype.forEach.call(sec.rows, function (tr) {
          Array.prototype.forEach.call(tr.cells, function (c, i) { c.classList.toggle('gt-colhide', state.hiddenCols.has(i)); });
        });
      });
      Array.prototype.forEach.call(t.tBodies, function (tb) {
        Array.prototype.forEach.call(tb.rows, function (tr) {
          if (tr.querySelector('td[colspan]')) return;
          Array.prototype.forEach.call(tr.cells, function (c, i) { c.classList.toggle('gt-colhide', state.hiddenCols.has(i)); });
        });
      });
      updChip();
    }
    function updChip() {
      var n = state.hiddenCols.size, r = state.hiddenRows, fo = state.filteredOut || 0;
      if (!n && !r && !fo) { chip.style.display = 'none'; return; }
      chip.style.display = '';
      var bits = [];
      if (n) bits.push(n + ' col' + (n > 1 ? 's' : ''));
      if (r) bits.push(r + ' row' + (r > 1 ? 's' : ''));
      if (fo) bits.push(fo + ' filtered');
      chip.textContent = bits.join(' · ') + ' — reset';
    }
    chip.addEventListener('click', function () {
      state.hiddenCols.clear(); state.hiddenRows = 0; state.filteredOut = 0;
      for (var k in filters) delete filters[k];
      var t = curTable();
      t.querySelectorAll('.gt-colhide').forEach(function (c) { c.classList.remove('gt-colhide'); });
      t.querySelectorAll('.gt-rowhide').forEach(function (r) { r.classList.remove('gt-rowhide'); });
      t.querySelectorAll('.gt-rowfhide').forEach(function (r) { r.classList.remove('gt-rowfhide'); });
      t.querySelectorAll('th.gt-factive').forEach(function (h) { h.classList.remove('gt-factive'); });
      updChip();
    });

    // column menu
    bar.querySelector('.gt-cols').addEventListener('click', function (e) {
      var old = document.querySelector('.gt-menu'); if (old) { old.remove(); return; }
      var t = curTable(), hrow = t.tHead && t.tHead.rows[0]; if (!hrow) return;
      var menu = document.createElement('div');
      menu.className = 'gt-menu';
      menu.innerHTML = '<div class="gt-menu-hd">Show / hide columns</div>' +
        Array.prototype.map.call(hrow.cells, function (th, i) {
          var nm = th.textContent.replace(/\s+/g, ' ').replace(/[⏷▲▼]/g, '').trim() || ('Column ' + (i + 1));
          return '<label><input type="checkbox" data-ci="' + i + '"' + (state.hiddenCols.has(i) ? '' : ' checked') + '> ' + nm + '</label>';
        }).join('');
      document.body.appendChild(menu);
      var r = e.target.getBoundingClientRect();
      var left = Math.min(r.left, window.innerWidth - 240);
      menu.style.left = Math.max(8, left) + 'px'; menu.style.top = (r.bottom + 4) + 'px';
      menu.addEventListener('change', function (ev) {
        var ci = +ev.target.dataset.ci;
        if (ev.target.checked) state.hiddenCols.delete(ci); else state.hiddenCols.add(ci);
        applyCols();
      });
      setTimeout(function () {
        document.addEventListener('mousedown', function close(ev) {
          if (!menu.contains(ev.target) && !bar.contains(ev.target)) { menu.remove(); document.removeEventListener('mousedown', close); }
        });
      }, 0);
    });

    // row hide: hover minus on first cell of body rows
    wrap.addEventListener('mouseover', function (e) {
      var tr = e.target.closest('tbody tr'); if (!tr || tr.querySelector('.gt-rowx') || tr.querySelector('td[colspan]')) return;
      var td = tr.cells[0]; if (!td) return;
      if (getComputedStyle(td).position === 'static') td.style.position = 'relative';
      var x = document.createElement('span');
      x.className = 'gt-rowx no-print'; x.textContent = '–'; x.title = 'Hide row';
      x.addEventListener('click', function (ev) { ev.stopPropagation(); ev.preventDefault(); tr.classList.add('gt-rowhide'); state.hiddenRows++; updChip(); });
      td.appendChild(x);
    });

    // ---------- Excel-grade per-column filters (generic, DOM-driven) ----------
    // Same experience as the Portfolio Snapshot: click a header -> sort, live
    // min/avg/max/sum stats, min-max range, searchable value checklist.
    var filters = {};                       // ci -> {min,max,selected:Set,search}
    function bodyRows(t) {
      var out = [];
      Array.prototype.forEach.call(t.tBodies, function (tb) {
        Array.prototype.forEach.call(tb.rows, function (tr) {
          if (!tr.querySelector('td[colspan]')) out.push(tr);
        });
      });
      return out;
    }
    function cellVal(tr, ci) {
      var td = tr.cells[ci]; if (!td) return { v: '', type: 's' };
      var inp = td.querySelector('input');
      return parseCell(inp ? inp.value : td.textContent);
    }
    function applyFilters() {
      var t = curTable(), n = 0;
      bodyRows(t).forEach(function (tr) {
        var show = true;
        for (var ci in filters) {
          var f = filters[ci], p = cellVal(tr, +ci);
          if (f.min != null && !(p.type === 'n' && p.v >= f.min)) { show = false; break; }
          if (f.max != null && !(p.type === 'n' && p.v <= f.max)) { show = false; break; }
          var disp = String(p.type === 'n' ? p.v : p.v).toLowerCase();
          if (f.search && disp.indexOf(f.search) < 0) { show = false; break; }
          if (f.selected && f.selected.size && !f.selected.has(String(p.v))) { show = false; break; }
        }
        tr.classList.toggle('gt-rowfhide', !show);
        if (!show) n++;
      });
      var hrow = t.tHead && t.tHead.rows[0];
      if (hrow) Array.prototype.forEach.call(hrow.cells, function (th, i) { th.classList.toggle('gt-factive', !!filters[i]); });
      state.filteredOut = n; updChip();
    }
    function sortBody(ci, dir) {
      var t = curTable();
      Array.prototype.forEach.call(t.tBodies, function (tb) {
        var rows = Array.prototype.filter.call(tb.rows, function (tr) { return !tr.querySelector('td[colspan]'); });
        rows.sort(function (a, b) {
          var x = cellVal(a, ci), y = cellVal(b, ci);
          if (x.type === 'n' && y.type === 'n') return (x.v - y.v) * dir;
          return String(x.v).localeCompare(String(y.v)) * dir;
        });
        rows.forEach(function (r) { tb.appendChild(r); });
      });
    }
    function openFilterPop(ci, th) {
      var old = document.querySelector('.gt-pop'); if (old) old.remove();
      var t = curTable();
      var vals = [], nums = [];
      bodyRows(t).forEach(function (tr) {
        var p = cellVal(tr, ci);
        if (p.type === 'n') nums.push(p.v);
        vals.push({ key: String(p.v), label: (tr.cells[ci] ? tr.cells[ci].textContent.trim() : String(p.v)) || '—' });
      });
      var uniq = {}; vals.forEach(function (v) { uniq[v.key] = v.label; });
      var keys = Object.keys(uniq).sort(function (a, b) {
        var na = parseFloat(a), nb = parseFloat(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      });
      var isNum = nums.length >= vals.length / 2;
      var f = filters[ci] || { min: null, max: null, selected: new Set(), search: '' };
      var stats = '';
      if (nums.length) {
        var mn = Math.min.apply(null, nums), mx = Math.max.apply(null, nums), av = nums.reduce(function(a,b){return a+b;},0)/nums.length, sm = nums.reduce(function(a,b){return a+b;},0);
        var fmtc = function (v) { return Math.abs(v) >= 1e6 ? (v/1e6).toFixed(1)+'M' : Math.abs(v) >= 1e3 ? (v/1e3).toFixed(1)+'k' : (Math.round(v*100)/100); };
        stats = '<div class="gt-pop-stats"><span>min ' + fmtc(mn) + '</span><span>avg ' + fmtc(av) + '</span><span>max ' + fmtc(mx) + '</span><span>Σ ' + fmtc(sm) + '</span></div>';
      }
      var name = th.textContent.replace(/\s+/g, ' ').replace(/[⏷▲▼]/g, '').trim();
      var pop = document.createElement('div');
      pop.className = 'gt-pop';
      pop.innerHTML = '<div class="gt-pop-hd">' + name + '</div>' +
        '<div class="gt-pop-sort"><button data-s="1">↑ ' + (isNum ? 'Low → High' : 'A → Z') + '</button><button data-s="-1">↓ ' + (isNum ? 'High → Low' : 'Z → A') + '</button></div>' +
        stats +
        (isNum ? '<div class="gt-pop-range"><input class="gt-min" type="number" placeholder="min" value="' + (f.min != null ? f.min : '') + '"><span style="font-size:10px;color:var(--color-text-muted)">to</span><input class="gt-max" type="number" placeholder="max" value="' + (f.max != null ? f.max : '') + '"></div>' : '') +
        '<input class="gt-pop-search" type="search" placeholder="Search values…" value="' + (f.search || '') + '">' +
        '<div class="gt-pop-checks">' + keys.map(function (k) {
          var checked = (!f.selected.size || f.selected.has(k)) ? ' checked' : '';
          return '<label><input type="checkbox" value="' + k.replace(/"/g, '&quot;') + '"' + checked + '> <span>' + uniq[k] + '</span></label>';
        }).join('') + '</div>' +
        '<div class="gt-pop-ft"><button class="gt-pop-clear">Clear</button><button class="gt-pop-apply">Apply</button></div>';
      document.body.appendChild(pop);
      var r = th.getBoundingClientRect();
      pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 260)) + 'px';
      pop.style.top = Math.min(r.bottom + 4, window.innerHeight - 380) + 'px';
      pop.querySelector('.gt-pop-search').addEventListener('input', function () {
        var s = this.value.toLowerCase();
        pop.querySelectorAll('.gt-pop-checks label').forEach(function (l) { l.style.display = l.textContent.toLowerCase().indexOf(s) >= 0 ? '' : 'none'; });
      });
      pop.querySelectorAll('[data-s]').forEach(function (b) { b.addEventListener('click', function () { sortBody(ci, +b.dataset.s); pop.remove(); }); });
      pop.querySelector('.gt-pop-clear').addEventListener('click', function () { delete filters[ci]; applyFilters(); pop.remove(); });
      pop.querySelector('.gt-pop-apply').addEventListener('click', function () {
        var nf = { min: null, max: null, selected: new Set(), search: pop.querySelector('.gt-pop-search').value.trim().toLowerCase() };
        var mnI = pop.querySelector('.gt-min'), mxI = pop.querySelector('.gt-max');
        if (mnI && mnI.value !== '') nf.min = +mnI.value;
        if (mxI && mxI.value !== '') nf.max = +mxI.value;
        var boxes = Array.prototype.filter.call(pop.querySelectorAll('.gt-pop-checks input'), function (x) { return x.checked; });
        if (boxes.length && boxes.length < keys.length) boxes.forEach(function (x) { nf.selected.add(x.value); });
        if (nf.min == null && nf.max == null && !nf.search && !nf.selected.size) delete filters[ci]; else filters[ci] = nf;
        applyFilters(); pop.remove();
      });
      setTimeout(function () {
        document.addEventListener('mousedown', function close(ev) {
          if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('mousedown', close); }
        });
      }, 0);
    }
    if (meta.filters !== false) {
      var hrow0 = tbl.tHead && tbl.tHead.rows[0];
      if (hrow0 && !hrow0.querySelector('.snap-th')) {
        wrap.addEventListener('click', function (e) {
          var th = e.target.closest('thead th'); if (!th || th.classList.contains('snap-th')) return;
          openFilterPop(th.cellIndex, th);
        });
        Array.prototype.forEach.call(hrow0.cells, function (th) { th.classList.add('gt-fth'); th.title = 'Click: sort · filter'; });
      }
    }

    function grab() { return readTable(curTable()); }
    bar.querySelector('.gt-xls').addEventListener('click', function () {
      var fn = (meta.filename || meta.title || 'export').replace(/[^\w\- ]+/g, '').replace(/ +/g, ' ').trim() + '.xlsx';
      download(xlsx(grab(), meta), fn);
    });
    bar.querySelector('.gt-prt').addEventListener('click', function () { printDoc(grab(), meta); });

    var api = { export: function () { return xlsx(grab(), meta); }, print: function () { printDoc(grab(), meta); }, state: state };
    wrap.__gt = api;
    return api;
  }

  window.GridTools = { attach: attach, _xlsx: xlsx, _read: readTable };
})();
