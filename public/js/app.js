// public/js/app.js

/* ===== NAVIGAZIONE ===== */
function hideAllScreens() {
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('analysisScreen').style.display = 'none';
  document.getElementById('palinsestoScreen').style.display = 'none';
  document.getElementById('studioScreen').style.display = 'none';
}

function showHome() {
  hideAllScreens();
  document.getElementById('homeScreen').style.display = '';
}

function showAnalysis() {
  hideAllScreens();
  document.getElementById('analysisScreen').style.display = '';
}

function showPalinsesto() {
  hideAllScreens();
  document.getElementById('palinsestoScreen').style.display = '';
  applyPalinsestoFilters(); // usa i dati già caricati
}

function showStudio() {
  hideAllScreens();
  document.getElementById('studioScreen').style.display = '';
  renderStudioPartite();
}

/* ===== UTILITA' ===== */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseNumber(str) {
  if (!str) return NaN;
  return parseFloat(String(str).replace(',', '.'));
}

function poisson(k, lambda) {
  if (lambda <= 0) return 0;
  let result = Math.exp(-lambda);
  if (k === 0) return result;
  for (let i = 1; i <= k; i++) {
    result *= lambda / i;
  }
  return result;
}

function formatPercent(x) {
  if (!Number.isFinite(x)) return "-";
  return (x * 100).toFixed(2).replace('.', ',');
}

function formatPercentAlready(x) {
  if (!Number.isFinite(x)) return "-";
  return x.toFixed(2).replace('.', ',');
}

function formatOdd(x) {
  if (!Number.isFinite(x) || x <= 0) return "-";
  return x.toFixed(2).replace('.', ',');
}

/* ===== STUDIO PARTITE (localStorage) ===== */

let studioPartite = [];

function caricaStudioPartite() {
  try {
    const data = localStorage.getItem('studioPartite');
    if (data) {
      studioPartite = JSON.parse(data) || [];
    }
  } catch (e) {
    studioPartite = [];
  }
}

function salvaStudioPartite() {
  try {
    localStorage.setItem('studioPartite', JSON.stringify(studioPartite));
  } catch (e) {}
}

function valutaEsito(item) {
  if (!item || !item.result || !item.pronostico) return 'unknown';

  const res = item.result.trim().toUpperCase();
  let pronRaw = (item.pronostico || '').toUpperCase();

  const mPron = pronRaw.match(/(1X|X2|12|1|X|2)/);
  if (!mPron) return 'unknown';
  const pron = mPron[1];

  const m = res.match(/^(\d+)\s*[-:]\s*(\d+)$/);
  if (!m) return 'unknown';

  const gh = parseInt(m[1], 10);
  const ga = parseInt(m[2], 10);
  let esito;
  if (gh > ga) esito = '1';
  else if (gh < ga) esito = '2';
  else esito = 'X';

  let correct = false;
  if (pron === '1' || pron === 'X' || pron === '2') {
    correct = (pron === esito);
  } else if (pron === '1X') {
    correct = (esito === '1' || esito === 'X');
  } else if (pron === 'X2') {
    correct = (esito === 'X' || esito === '2');
  } else if (pron === '12') {
    correct = (esito === '1' || esito === '2');
  } else {
    return 'unknown';
  }

  return correct ? 'correct' : 'wrong';
}

function renderStudioPartite() {
  const cont = document.getElementById('studioPartite');
  if (!cont) return;

  if (!studioPartite.length) {
    cont.innerHTML = '<p class="small">Nessuna partita salvata.</p>';
    return;
  }

  let html = '<ul>';
  studioPartite.forEach((item, index) => {
    const safePartita = escapeHtml(item.partita || '');
    const safePron = escapeHtml(item.pronostico || '');
    const note = item.note || '';
    const result = item.result || '';

    const noteText = note ? ' - Nota: ' + escapeHtml(note) : '';
    const resultText = result ? ' - Risultato: ' + escapeHtml(result) : '';

    const status = valutaEsito(item);
    const statusClass = status === 'correct' ? 'correct' : (status === 'wrong' ? 'wrong' : '');

    const noteControls = `
      <span class="small">Nota:</span>
      <input
        type="text"
        id="note-${index}"
        placeholder="Aggiungi nota"
        value="${escapeAttr(note)}"
        oninput="onNoteChange(${index}, this.value)"
      />
      <button
        type="button"
        id="saveNote-${index}"
        class="btn-secondary"
        style="display:none"
        onclick="salvaNota(${index})"
      >
        Salva nota
      </button>
    `;

    html += `
      <li class="match-row ${statusClass}">
        <div class="match-header">
          <span class="match-label">
            ${safePartita}: <strong>${safePron}</strong>${noteText}${resultText}
          </span>
        </div>
        <div class="match-actions">
          ${noteControls}
          <span class="small">Risultato:</span>
          <input
            type="text"
            id="result-${index}"
            placeholder="Es: 2-1"
            value="${escapeAttr(result)}"
            oninput="onResultChange(${index}, this.value)"
          />
          <button
            type="button"
            id="saveResult-${index}"
            class="btn-secondary"
            style="display:none"
            onclick="salvaRisultato(${index})"
          >
            Salva risultato
          </button>
          <button type="button" class="btn-delete" onclick="eliminaPartita(${index})">
            Elimina
          </button>
        </div>
      </li>
    `;
  });
  html += '</ul>';
  cont.innerHTML = html;
}

function onNoteChange(index, value) {
  const btn = document.getElementById('saveNote-' + index);
  if (btn) btn.style.display = value.trim() ? 'inline-block' : 'none';
}

function salvaNota(index) {
  const input = document.getElementById('note-' + index);
  if (!input || !studioPartite[index]) return;
  studioPartite[index].note = input.value.trim();
  salvaStudioPartite();
  renderStudioPartite();
}

function onResultChange(index, value) {
  const btn = document.getElementById('saveResult-' + index);
  if (btn) btn.style.display = value.trim() ? 'inline-block' : 'none';
}

function salvaRisultato(index) {
  const input = document.getElementById('result-' + index);
  if (!input || !studioPartite[index]) return;
  studioPartite[index].result = input.value.trim();
  salvaStudioPartite();
  renderStudioPartite();
}

function eliminaPartita(index) {
  if (index < 0 || index >= studioPartite.length) return;
  studioPartite.splice(index, 1);
  salvaStudioPartite();
  renderStudioPartite();
}

function salvaPronostico() {
  const teamHome = document.getElementById('teamHome').value.trim();
  const teamAway = document.getElementById('teamAway').value.trim();
  const manualPrediction = document.getElementById('manualPrediction').value.trim();
  const msg = document.getElementById('manualMessage');

  msg.textContent = '';
  msg.className = 'small';

  if (!teamHome || !teamAway || !manualPrediction) {
    msg.textContent = 'Inserisci il nome di entrambe le squadre e il pronostico.';
    msg.classList.add('text-error');
    return;
  }

  const partita = `${teamHome} - ${teamAway}`;
  studioPartite.push({
    partita,
    pronostico: manualPrediction,
    note: '',
    result: '',
    timestamp: Date.now()
  });
  salvaStudioPartite();

  msg.textContent = 'Pronostico salvato in "Studio Partite".';
  msg.classList.add('text-success');
}

/* ===== PALINSESTO (SOLO LETTURA DB) ===== */

let palinsestoAll = [];
let palinsestoFiltered = [];

function dateITtoISO(d) {
  if (!d) return "";
  const parts = d.split("/");
  if (parts.length !== 3) return "";
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeDateForSort(d) {
  return dateITtoISO(d) || d;
}

async function loadPalinsestoFromServer() {
  const emptyMsg = document.getElementById("palinsestoEmpty");
  emptyMsg.textContent = "Caricamento palinsesto in corso...";

  try {
    const res = await fetch('/api/matches');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Formato JSON non valido');
    palinsestoAll = data;
    document.getElementById("totalMatches").textContent = palinsestoAll.length;
    populatePalinsestoFilterOptions();
    applyPalinsestoFilters();
  } catch (e) {
    console.error(e);
    emptyMsg.textContent = "Impossibile caricare il palinsesto. Nessuna partita trovata.";
  }
}

function populatePalinsestoFilterOptions() {
  const countrySelect = document.getElementById("filterCountry");
  const leagueSelect = document.getElementById("filterLeague");
  const dateInput = document.getElementById("filterDate");

  while (countrySelect.options.length > 1) countrySelect.remove(1);
  while (leagueSelect.options.length > 1) leagueSelect.remove(1);
  dateInput.value = "";

  const countries = Array.from(new Set(
    palinsestoAll.map(m => m.country).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, "it"));

  const leagues = Array.from(new Set(
    palinsestoAll.map(m => m.league).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, "it"));

  for (const c of countries) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    countrySelect.appendChild(opt);
  }

  for (const l of leagues) {
    const opt = document.createElement("option");
    opt.value = l;
    opt.textContent = l;
    leagueSelect.appendChild(opt);
  }
}

function applyPalinsestoFilters() {
  const dateFilterISO = document.getElementById("filterDate").value;
  const countryFilter = document.getElementById("filterCountry").value;
  const leagueFilter = document.getElementById("filterLeague").value;
  const recommendedChecked = document.getElementById("recommendedCheckbox")
    ? document.getElementById("recommendedCheckbox").checked
    : false;

  palinsestoFiltered = palinsestoAll.filter(m => {
    // filtro DATA
    if (dateFilterISO) {
      const matchISO = dateITtoISO(m.date);
      if (matchISO !== dateFilterISO) return false;
    }

    // filtro NAZIONE
    if (countryFilter && m.country !== countryFilter) return false;

    // filtro CAMPIONATO
    if (leagueFilter && m.league !== leagueFilter) return false;

    // filtro PARTITE CONSIGLIATE
    if (recommendedChecked) {
      const odd1 = typeof m.odd1 === 'number' ? m.odd1 : null;
      const oddX = typeof m.oddX === 'number' ? m.oddX : null;
      const odd2 = typeof m.odd2 === 'number' ? m.odd2 : null;
      const delta = typeof m.delta_bv === 'number' ? m.delta_bv : null;

      // se manca qualcuno dei dati necessari, scartiamo
      if (delta == null || oddX == null || (odd1 == null && odd2 == null)) {
        return false;
      }

      // tua logica: delta_bv <= 1.8 AND (oddx <= odd1 OR oddx <= odd2)
      const condDelta = delta <= 1.8;
      const condX =
        (odd1 != null && oddX <= odd1) ||
        (odd2 != null && oddX <= odd2);

      if (!(condDelta && condX)) {
        return false;
      }
    }

    return true;
  });

  document.getElementById("filteredMatches").textContent = palinsestoFiltered.length;
  renderPalinsestoTable();
}

function renderPalinsestoTable() {
  const tbody = document.getElementById("palinsestoTableBody");
  const emptyMsg = document.getElementById("palinsestoEmpty");
  const wrap = document.getElementById("palinsestoTableWrapper");
  tbody.innerHTML = "";

  if (!palinsestoAll.length) {
    emptyMsg.style.display = "";
    wrap.style.display = "none";
    return;
  }

  if (!palinsestoFiltered.length) {
    emptyMsg.textContent = "Nessuna partita trovata con i filtri selezionati.";
    emptyMsg.style.display = "";
    wrap.style.display = "none";
    return;
  }

  emptyMsg.style.display = "none";
  wrap.style.display = "";

  const sorted = palinsestoFiltered.slice().sort((a, b) => {
    const da = normalizeDateForSort(a.date);
    const db = normalizeDateForSort(b.date);
    if (da === db) {
      return (a.time || "").localeCompare(b.time || "");
    }
    return da.localeCompare(db);
  });

  sorted.forEach(m => {
    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.textContent = m.date || "";
    tr.appendChild(tdDate);

    const tdTime = document.createElement("td");
    tdTime.textContent = m.time || "";
    tr.appendChild(tdTime);

    const tdCountry = document.createElement("td");
    tdCountry.textContent = m.country || "";
    tr.appendChild(tdCountry);

    const tdLeague = document.createElement("td");
    tdLeague.textContent = m.league || "";
    tr.appendChild(tdLeague);

    const tdMatch = document.createElement("td");
    tdMatch.textContent = `${m.home} - ${m.away}`;
    tr.appendChild(tdMatch);

    const td1 = document.createElement("td");
    td1.textContent = (m.odd1 != null) ? m.odd1.toFixed(2).replace(".", ",") : "";
    tr.appendChild(td1);

    const tdX = document.createElement("td");
    tdX.textContent = (m.oddX != null) ? m.oddX.toFixed(2).replace(".", ",") : "";
    tr.appendChild(tdX);

    const td2 = document.createElement("td");
    td2.textContent = (m.odd2 != null) ? m.odd2.toFixed(2).replace(".", ",") : "";
    tr.appendChild(td2);

    const tdAction = document.createElement("td");
    tdAction.style.textAlign = "right";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-secondary";
    btn.textContent = "Analizza";
    btn.onclick = () => apriInAnalysisFromPalinsesto(m);
    tdAction.appendChild(btn);
    tr.appendChild(tdAction);

    tbody.appendChild(tr);
  });
}

function apriInAnalysisFromPalinsesto(m) {
  document.getElementById('teamHome').value = m.home || '';
  document.getElementById('teamAway').value = m.away || '';
  if (m.odd1 != null) document.getElementById('odd1').value = m.odd1.toFixed(2).replace('.', ',');
  if (m.oddX != null) document.getElementById('oddX').value = m.oddX.toFixed(2).replace('.', ',');
  if (m.odd2 != null) document.getElementById('odd2').value = m.odd2.toFixed(2).replace('.', ',');
  showAnalysis();
}

/* ===== ANALISI POISSON + BVS ===== */

function calcola() {
  const odd1 = parseNumber(document.getElementById('odd1').value);
  const oddX = parseNumber(document.getElementById('oddX').value);
  const odd2 = parseNumber(document.getElementById('odd2').value);

  const homeGF = parseNumber(document.getElementById('homeGF').value);
  const homeGA = parseNumber(document.getElementById('homeGA').value);
  const homeGames = parseNumber(document.getElementById('homeGames').value);

  const awayGF = parseNumber(document.getElementById('awayGF').value);
  const awayGA = parseNumber(document.getElementById('awayGA').value);
  const awayGames = parseNumber(document.getElementById('awayGames').value);

  const out = document.getElementById('risultati');
  out.innerHTML = '';

  if (
    !isFinite(odd1) || !isFinite(oddX) || !isFinite(odd2) ||
    !isFinite(homeGF) || !isFinite(homeGA) || !isFinite(homeGames) ||
    !isFinite(awayGF) || !isFinite(awayGA) || !isFinite(awayGames) ||
    homeGames <= 0 || awayGames <= 0
  ) {
    out.innerHTML = '<div class="card"><strong>Errore:</strong> controlla che tutti i campi siano compilati correttamente.</div>';
    return;
  }

  const r1 = 1 / odd1;
  const rX = 1 / oddX;
  const r2 = 1 / odd2;
  const sumR = r1 + rX + r2;
  const p1Real = r1 / sumR;
  const pXReal = rX / sumR;
  const p2Real = r2 / sumR;

  const lambdaHome = (homeGF / homeGames + awayGA / awayGames) / 2;
  const lambdaAway = (awayGF / awayGames + homeGA / homeGames) / 2;

  const maxGoals = 6;
  let p1 = 0, pDraw = 0, p2 = 0;
  let pBTTS = 0;
  const lines = [0.5, 1.5, 2.5, 3.5];
  const pOver = [0, 0, 0, 0];
  const pUnder = [0, 0, 0, 0];
  let total = 0;

  for (let i = 0; i <= maxGoals; i++) {
    const pHome = poisson(i, lambdaHome);
    for (let j = 0; j <= maxGoals; j++) {
      const pAway = poisson(j, lambdaAway);
      const p = pHome * pAway;
      total += p;

      if (i > j) p1 += p;
      else if (i === j) pDraw += p;
      else p2 += p;

      if (i > 0 && j > 0) pBTTS += p;

      const sumGoals = i + j;
      for (let idx = 0; idx < lines.length; idx++) {
        if (sumGoals > lines[idx]) pOver[idx] += p;
        else pUnder[idx] += p;
      }
    }
  }

  if (total > 0) {
    p1   /= total;
    pDraw /= total;
    p2   /= total;
    pBTTS /= total;
    for (let idx = 0; idx < lines.length; idx++) {
      pOver[idx]  /= total;
      pUnder[idx] /= total;
    }
  }

  const pNoBTTS = 1 - pBTTS;
  const qBTTS = pBTTS > 0 ? 1 / pBTTS : NaN;
  const qNoBTTS = pNoBTTS > 0 ? 1 / pNoBTTS : NaN;

  const dc1X = p1 + pDraw;
  const dc12 = p1 + p2;
  const dcX2 = pDraw + p2;

  const qDC1X = dc1X > 0 ? 1 / dc1X : NaN;
  const qDC12 = dc12 > 0 ? 1 / dc12 : NaN;
  const qDCX2 = dcX2 > 0 ? 1 / dcX2 : NaN;

  const AT9 = (homeGF + awayGA) / homeGames;
  const AV9 = (awayGF + homeGA) / awayGames;
  const AT11 = 95 / (AT9 + AV9);
  const AT13 = AT11 * AT9;
  const AV13 = AT11 * AV9;
  const AW13 = 100 / oddX + 6;
  const AT15 = 106 / (AT13 + AV13 + AW13);

  const perc1BVS = AT13 * AT15;
  const percXBVS = AW13 * AT15;
  const perc2BVS = AV13 * AT15;

  const q1BVS = 100 / perc1BVS;
  const qXBVS = 100 / percXBVS;
  const q2BVS = 100 / perc2BVS;

  let html = '';

  html += `
    <div class="card">
      <h2>Percentuali Quote Reali</h2>
      <table>
        <tr><th>Esito</th><th>Probabilità</th><th>Quote reali</th></tr>
        <tr><td>1</td><td>${formatPercent(p1Real)} %</td><td>${formatOdd(odd1)}</td></tr>
        <tr><td>X</td><td>${formatPercent(pXReal)} %</td><td>${formatOdd(oddX)}</td></tr>
        <tr><td>2</td><td>${formatPercent(p2Real)} %</td><td>${formatOdd(odd2)}</td></tr>
      </table>
    </div>
  `;

  html += `
    <div class="card">
      <h2>Percentuali Quote Teoriche (BVS)</h2>
      <table>
        <tr><th>Esito</th><th>Probabilità</th><th>Quote Teoriche</th></tr>
        <tr><td>1</td><td>${formatPercentAlready(perc1BVS)} %</td><td>${formatOdd(q1BVS)}</td></tr>
        <tr><td>X</td><td>${formatPercentAlready(percXBVS)} %</td><td>${formatOdd(qXBVS)}</td></tr>
        <tr><td>2</td><td>${formatPercentAlready(perc2BVS)} %</td><td>${formatOdd(q2BVS)}</td></tr>
      </table>
    </div>
  `;

  html += `
    <div class="card">
      <h2>Doppia Chance</h2>
      <table>
        <tr><th>Esito</th><th>Probabilità</th><th>Quota teorica</th></tr>
        <tr><td>1X</td><td>${formatPercent(dc1X)} %</td><td>${formatOdd(qDC1X)}</td></tr>
        <tr><td>12</td><td>${formatPercent(dc12)} %</td><td>${formatOdd(qDC12)}</td></tr>
        <tr><td>X2</td><td>${formatPercent(dcX2)} %</td><td>${formatOdd(qDCX2)}</td></tr>
      </table>
    </div>
  `;

  html += `
    <div class="card">
      <h2>Gol / No Gol</h2>
      <table>
        <tr><th>Esito</th><th>Probabilità</th><th>Quota teorica</th></tr>
        <tr><td>Gol (GG)</td><td>${formatPercent(pBTTS)} %</td><td>${formatOdd(qBTTS)}</td></tr>
        <tr><td>No Gol (NG)</td><td>${formatPercent(pNoBTTS)} %</td><td>${formatOdd(qNoBTTS)}</td></tr>
      </table>
    </div>
  `;

  html += `
    <div class="card">
      <h2>Over / Under</h2>
      <table>
        <tr><th>Linea</th><th>Esito</th><th>Probabilità</th><th>Quota teorica</th></tr>
  `;
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const pov = pOver[idx];
    const pund = pUnder[idx];
    const qov = pov > 0 ? 1 / pov : NaN;
    const qun = pund > 0 ? 1 / pund : NaN;
    html += `
      <tr>
        <td rowspan="2">${line.toFixed(1)}</td>
        <td>Over</td>
        <td>${formatPercent(pov)} %</td>
        <td>${formatOdd(qov)}</td>
      </tr>
      <tr>
        <td>Under</td>
        <td>${formatPercent(pund)} %</td>
        <td>${formatOdd(qun)}</td>
      </tr>
    `;
  }
  html += `</table></div>`;

  out.innerHTML = html;
}

/* ===== INIT ===== */

document.addEventListener('DOMContentLoaded', () => {
  caricaStudioPartite();
  loadPalinsestoFromServer(); // chiama /api/matches (da oggi in avanti)
  showHome();
  document.getElementById("filteredMatches").textContent = "0";
});
