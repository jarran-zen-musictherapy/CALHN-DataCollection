{
  const $ = id => document.getElementById(id);
  const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const HEAD = ['Patient Name','Patient ID','Site','Year','Month','Gender','Age','Ethnic Background','Primary Language','Session in Primary Language?','Ward','Person Referring','Source of Referral','Session Type','No. Sessions','Anxiety Mgmt','Pain Mgmt','Relaxation','Reality Orient.','Socio-emotional','Palliative/EOL','Legacy Creation','Speech/Comms','NMT/Gait','Cognitive','Delirium','Procedural','Other Reason','CALD','ATSI','Vulnerable'];
  const WKEY = 'calhn-mt-sahr-wardmap';   // stores service-name → ward choices only (no patient data)
  let books = [], result = null, wardMap = {};
  try { wardMap = JSON.parse(localStorage.getItem(WKEY) || '{}'); } catch { wardMap = {}; }

  const showErr = m => { $('err').textContent = m; $('err').classList.toggle('hidden', !m); };
  const toast = m => { $('toast').textContent = m; setTimeout(() => $('toast').textContent = '', 3000); };

  async function readFiles(list) {
    showErr('');
    for (const f of list) {
      try {
        const buf = await f.arrayBuffer();
        books.push([f.name, XLSX.read(buf, {type: 'array', cellDates: false})]);
      } catch (e) { showErr(f.name + ': could not be read as a spreadsheet.'); }
    }
    $('files').textContent = books.length ? 'Loaded: ' + books.map(b => b[0]).join(', ') : '';
    run();
  }

  async function run() {
    const pass = $('pass').value;
    if (!books.length) return;
    if (pass.length < 8) { showErr('Enter the team key (at least 8 characters) to create Patient IDs.'); return; }
    showErr('');
    try { result = await Core.process(books, {pass, wardMap}); }
    catch (e) { result = null; showErr(e.message); $('outCard').classList.add('hidden'); return; }
    render();
  }

  function render() {
    const r = result;
    $('wardCard').classList.remove('hidden');
    $('wards').innerHTML = r.svcs.map(([svc, n], i) => {
      const cur = wardMap[svc] || Core.guessWard(svc);
      return `<tr><td>${esc(svc)}</td><td class="num">${n}</td><td><select data-svc="${i}" aria-label="Ward for ${esc(svc)}">${Core.WARDS.map(w => `<option${w === cur ? ' selected' : ''}>${esc(w)}</option>`).join('')}</select></td></tr>`;
    }).join('');
    $('wards').querySelectorAll('select').forEach(s => s.addEventListener('change', () => {
      wardMap[r.svcs[+s.dataset.svc][0]] = s.value;
      try { localStorage.setItem(WKEY, JSON.stringify(wardMap)); } catch {}
      run();
    }));

    const fmt = d => d ? d.toLocaleDateString('en-AU', {day: 'numeric', month: 'short', year: '2-digit'}) : '–';
    const stat = (n, l) => `<div class="stat"><div class="n">${esc(n)}</div><div class="l">${esc(l)}</div></div>`;
    $('stats').innerHTML = stat(r.oos, 'Occasions of Service') + stat(r.patients, 'Unique patients') + stat(r.nNew + ' / ' + r.nRev, 'New / Review (SAHR)') + stat(r.rows.length, 'Rows for data sheet') + stat(fmt(r.first) + ' – ' + fmt(r.last), 'Service dates');

    const ok = !r.leaks.length && !r.collisions;
    $('check').innerHTML = ok
      ? `<div class="check ok">Privacy check passed: no names or URNs found in the output (${r.raw} source rows from ${r.files} file${r.files > 1 ? 's' : ''}).</div>`
      : `<div class="check bad">Output blocked. ${r.leaks.length ? r.leaks.length + ' identifying value(s) appeared in the output.' : ''} ${r.collisions ? r.collisions + ' Patient ID collision(s) — try again or contact the tool owner.' : ''}</div>`;
    $('copy').disabled = $('csv').disabled = !ok;

    const ex = Object.entries(r.excluded);
    $('excl').innerHTML = ex.length ? ex.map(([k, n]) => `<tr><td>${esc(k)}</td><td class="num">${n}</td></tr>`).join('') : '<tr><td>None</td></tr>';
    $('byWard').innerHTML = r.wards.map(([w, n]) => `<tr><td>${esc(w)}</td><td class="num">${n}</td></tr>`).join('') + r.types.map(([t, n]) => `<tr><td><i>${esc(t)}</i></td><td class="num">${n}</td></tr>`).join('');
    $('preview').innerHTML = ok ? r.rows.map(a => `<tr><td>${esc(a[1])}</td><td>${esc(a[2])}</td><td>${a[3]}</td><td>${a[4]}</td><td>${esc(a[10])}</td><td>${a[13]}</td><td class="num">${a[14]}</td></tr>`).join('') : '';
    $('outCard').classList.remove('hidden');
  }

  async function copyRows() {
    if (!result || result.leaks.length) return;
    try { await navigator.clipboard.writeText(result.tsv); toast('Copied ' + result.rows.length + ' rows'); }
    catch {
      const t = document.createElement('textarea'); t.value = result.tsv; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); toast('Copied ' + result.rows.length + ' rows'); } catch { toast('Copy blocked by browser'); }
      t.remove();
    }
  }
  function downloadCsv() {
    if (!result || result.leaks.length) return;
    const q = v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v;
    const csv = [HEAD, ...result.rows].map(r => r.map(q).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], {type: 'text/csv'}));
    const a = Object.assign(document.createElement('a'), {href: url, download: 'MT_DataSheet_rows_deidentified.csv'});
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function clearAll() {
    books = []; result = null; $('pass').value = ''; $('file').value = '';
    ['files', 'stats', 'check', 'excl', 'byWard', 'preview', 'wards'].forEach(id => $(id).innerHTML = '');
    $('outCard').classList.add('hidden'); $('wardCard').classList.add('hidden'); showErr('');
  }

  $('drop').addEventListener('click', () => $('file').click());
  $('drop').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file').click(); } });
  $('file').addEventListener('change', e => readFiles([...e.target.files]));
  ['dragenter', 'dragover'].forEach(t => $('drop').addEventListener(t, e => { e.preventDefault(); $('drop').classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => $('drop').addEventListener(t, e => { e.preventDefault(); $('drop').classList.remove('over'); }));
  $('drop').addEventListener('drop', e => readFiles([...e.dataTransfer.files]));
  $('pass').addEventListener('change', run);
  $('show').addEventListener('click', () => { const p = $('pass'); p.type = p.type === 'password' ? 'text' : 'password'; $('show').textContent = p.type === 'password' ? 'Show' : 'Hide'; });
  $('copy').addEventListener('click', copyRows);
  $('csv').addEventListener('click', downloadCsv);
  $('clear').addEventListener('click', clearAll);
  window.addEventListener('pagehide', clearAll);
}
