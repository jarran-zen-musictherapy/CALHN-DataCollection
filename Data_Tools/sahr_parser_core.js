// SAHR Allied Health activity -> CALHN MT Master Data Sheet (cols A–AE), de-identified.
// Shared by the browser page and the node test. Needs global XLSX and crypto.subtle.
const Core = (() => {
  const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const WARDS = ['General Medicine','Geriatrics','Stroke / Neurology','Cardiology','Oncology / Haematology','Palliative Care','Renal','Thoracic / Respiratory','Plastic / Burns','Trauma / Surgical','ICU','Adult Mental Health','Geriatric Mental Health','MH Consultation Liaison','Mental Health - Short Stay','Mental Health - Rehab','Rehabilitation','Other'];
  const SITES = [[/\bqeh\b|queen eliz/i,'The Queen Elizabeth Hospital'],[/\brah\b|royal adel/i,'Royal Adelaide Hospital'],[/glenside/i,'Glenside'],[/repat|hampstead/i,'Repat']];
  const WARD_RULES = [
    [/psychogeri|older persons? mental|\bopmh/i,'Geriatric Mental Health'],
    [/consult.*liaison|\bc-?l\b/i,'MH Consultation Liaison'],
    [/short stay/i,'Mental Health - Short Stay'],
    [/(mh|mental).*rehab|rehab.*(mh|mental)/i,'Mental Health - Rehab'],
    [/\bmh\b|mental|psych/i,'Adult Mental Health'],
    [/palliat/i,'Palliative Care'],
    [/karra|tarnma|stroke|neuro/i,'Stroke / Neurology'],
    [/rehab/i,'Rehabilitation'],
    [/geriatric|\bgem\b|aged care/i,'Geriatrics'],
    [/general med/i,'General Medicine'],
    [/cardi/i,'Cardiology'],[/oncol|haemat/i,'Oncology / Haematology'],[/renal/i,'Renal'],
    [/thoracic|respir/i,'Thoracic / Respiratory'],[/burns|plastic/i,'Plastic / Burns'],
    [/trauma|surg/i,'Trauma / Surgical'],[/\bicu\b|intensive/i,'ICU'],
  ];
  const guessWard = svc => (WARD_RULES.find(([re]) => re.test(svc)) || [,'Other'])[1];
  const mapSite = s => (SITES.find(([re]) => re.test(s)) || [,''])[1];

  const NEED = {date:'service date', urn:'client urn', site:'site', svc:'clinical service name', att:'attendance type', mode:'delivery mode', type:'contact type'};
  const OPT = {name:'client name', clin:'clinician', prof:'profession', unit:'clinical unit'};

  // Find the activity table anywhere in the workbook (header row containing "Client URN").
  function findTable(wb) {
    for (const sn of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], {header:1, raw:true, defval:''});
      for (let r = 0; r < Math.min(rows.length, 40); r++) {
        const h = rows[r].map(norm);
        if (h.includes('client urn')) {
          const col = {};
          for (const [k, v] of Object.entries({...NEED, ...OPT})) col[k] = h.indexOf(v);
          const missing = Object.keys(NEED).filter(k => col[k] < 0).map(k => NEED[k]);
          return {sheet: sn, col, rows: rows.slice(r + 1), missing};
        }
      }
    }
    return null;
  }

  function toDate(v) {
    if (typeof v === 'number') { const d = XLSX.SSF.parse_date_code(v); return d ? new Date(d.y, d.m - 1, d.d) : null; }
    const m = String(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) return new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], m[2] - 1, +m[1]);
    const d = new Date(v); return isNaN(d) ? null : d;
  }

  const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  async function makeHasher(pass) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('calhn-mt|' + pass), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
    const cache = new Map();
    return async urn => {
      if (cache.has(urn)) return cache.get(urn);
      const b = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(urn)));
      let n = 0n; for (let i = 0; i < 5; i++) n = (n << 8n) | BigInt(b[i]);
      let s = ''; for (let i = 0; i < 7; i++) { s = B32[Number(n & 31n)] + s; n >>= 5n; }
      const id = 'PT-' + s; cache.set(urn, id); return id;
    };
  }

  async function process(wbs, {pass, wardMap = {}}) {
    const tables = [].concat(wbs).map(([fname, wb]) => {
      const t = findTable(wb);
      if (!t) throw new Error(fname + ': no activity table found (expected a header row containing "Client URN").');
      if (t.missing.length) throw new Error(fname + ': activity table is missing ' + t.missing.join(', '));
      return t;
    });
    const hash = await makeHasher(pass);
    const ex = {}, skip = (why) => ex[why] = (ex[why] || 0) + 1;
    const groups = new Map(), secrets = new Set(), svcs = new Map(), clin = new Set();
    let raw = 0, oos = 0, nNew = 0, nRev = 0, first, last;
    for (const t of tables) { const c = t.col; for (const r of t.rows) {
      const urn = String(r[c.urn]).trim();
      if (!r.some(v => String(v).trim())) continue;
      raw++;
      if (!urn) { skip('No patient (non-patient activity)'); continue; }
      secrets.add(urn); if (c.name >= 0 && String(r[c.name]).trim()) secrets.add(String(r[c.name]).trim());
      const mode = norm(r[c.mode]), att = norm(r[c.att]);
      if (mode !== 'in person') { skip('Delivery mode: ' + (r[c.mode] || 'blank')); continue; }
      if (att !== 'new' && att !== 'review') { skip('Attendance: ' + (r[c.att] || 'blank')); continue; }
      const d = toDate(r[c.date]); if (!d) { skip('Unreadable service date'); continue; }
      oos++; att === 'new' ? nNew++ : nRev++;
      if (!first || d < first) first = d; if (!last || d > last) last = d;
      if (c.clin >= 0) clin.add(String(r[c.clin]).trim());
      const svc = String(r[c.svc]).trim() || '(blank)';
      const ward = wardMap[svc] || guessWard(svc);
      svcs.set(svc, (svcs.get(svc) || 0) + 1);
      const id = await hash(urn);
      const site = mapSite(r[c.site]), type = norm(r[c.type]) === 'group' ? 'Group' : '1:1';
      const y = d.getFullYear(), mo = MONTHS[d.getMonth()];
      const k = [id, site, y, mo, ward, type].join('|');
      const g = groups.get(k) || {id, site, y, mo, ward, type, n: 0, d, urn};
      g.n++; if (d < g.d) g.d = d; groups.set(k, g);
    } }
    const out = [...groups.values()].sort((a, b) => a.d - b.d || a.id.localeCompare(b.id));
    // ID collision guard (two URNs -> same code)
    const byId = new Map(); let collisions = 0;
    for (const g of out) { const u = byId.get(g.id); if (u && u !== g.urn) collisions++; byId.set(g.id, g.urn); }
    for (const g of out) delete g.urn; // drop the URN from memory once collisions are checked
    const rows = out.map(g => { const a = Array(31).fill(''); a[1] = g.id; a[2] = g.site; a[3] = g.y; a[4] = g.mo; a[10] = g.ward; a[13] = g.type; a[14] = g.n; return a; });
    const tsv = rows.map(r => r.join('\t')).join('\n');
    // Privacy self-check: no URN or name (or name part ≥4 letters) may appear in output.
    const parts = new Set(); for (const s of secrets) { parts.add(s.toUpperCase()); for (const p of s.toUpperCase().split(/[\s,]+/)) if (p.length >= 4) parts.add(p); }
    let up = tsv.toUpperCase(); for (const f of [...SITES.map(x => x[1]), ...WARDS]) up = up.split(f.toUpperCase()).join(''); const leaks = [...parts].filter(p => up.includes(p));
    return {files: tables.length,  raw, oos, nNew, nRev, excluded: ex, rows, tsv, leaks, collisions,
      patients: new Set(out.map(g => g.id)).size, svcs: [...svcs], clinicians: [...clin], first, last,
      wards: tally(out, 'ward'), types: tally(out, 'type'), months: tally(out, g => g.mo + ' ' + g.y)};
  }
  function tally(arr, f) { const m = new Map(); for (const g of arr) { const k = typeof f === 'function' ? f(g) : g[f]; m.set(k, (m.get(k) || 0) + g.n); } return [...m]; }

  return {process, guessWard, WARDS, MONTHS};
})();
if (typeof module !== 'undefined') module.exports = Core;
