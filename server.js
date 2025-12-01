// server.js
const express = require('express');
const path = require('path');
const {
  initDb,
  replaceAllMatches,
  getMatchesFromDate,
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'supersegreto123';

app.use(express.json());

// statici per gli utenti (index.html, js, css)
app.use(express.static(path.join(__dirname, 'public')));

// pagina admin upload (cartella /admin)
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// (opzionale) queste URL caricano comunque index.html
app.get(['/palinsesto', '/analysis', '/studio'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// inizializza il DB
initDb()
  .then(() => {
    console.log('DB inizializzato');
  })
  .catch(err => {
    console.error('Errore init DB:', err);
  });

/* ===== API ADMIN: upload palinsesto ===== */

app.post('/api/admin/upload-palinsesto', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const data = req.body;
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'Il body deve essere un array JSON di partite' });
  }

  try {
    await replaceAllMatches(data);
    res.json({ ok: true, inserted: data.length });
  } catch (err) {
    console.error('Errore salvataggio palinsesto:', err);
    res.status(500).json({ error: 'Errore nel salvataggio nel database' });
  }
});

/* ===== API UTENTE: leggere partite da oggi in poi ===== */

function todayISO() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isoToIT(iso) {
  if (!iso) return '';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

app.get('/api/matches', async (req, res) => {
  const from = req.query.from || todayISO();

  try {
    const rows = await getMatchesFromDate(from);
    const result = rows.map(r => ({
      id: r.id,
      date: isoToIT(r.date.toISOString().slice(0, 10)),
      time: r.time,
      league: r.league,
      country: r.country,
      home: r.home,
      away: r.away,
      odd1: r.odd1,
      oddX: r.oddX,
      odd2: r.odd2,
      delta_bv: r.delta_bv ?? null
    }));
    res.json(result);
  } catch (err) {
    console.error('Errore lettura matches:', err);
    res.status(500).json({ error: 'Errore nella lettura dal database' });
  }
});

app.listen(PORT, () => {
  console.log(`Server in ascolto su http://localhost:${PORT}`);
});
