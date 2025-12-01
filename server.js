// server.js
const express = require('express');
const path = require('path');
const { initDb, replaceAllMatches, getMatches } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'supersegreto123';

app.use(express.json());

// statici per utenti
app.use(express.static(path.join(__dirname, 'public')));
// pagina admin upload
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// inizializza il DB (crea tabella se non esiste)
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

/* ===== API UTENTE: leggere partite ===== */

// data di oggi in formato YYYY-MM-DD
function todayISO() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// converte "YYYY-MM-DD" -> "DD/MM/YYYY"
function isoToIT(iso) {
  if (!iso) return '';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

app.get('/api/matches', async (req, res) => {
  const from = req.query.from || todayISO();
  const country = req.query.country || null;
  const league = req.query.league || null;
  const recommended = req.query.recommended === 'true'; // checkbox "partite consigliate"

  try {
    const rows = await getMatches({
      fromDateISO: from,
      country,
      league,
      recommended,
    });

    const result = rows.map(r => {
      // node-postgres per DATE di solito restituisce una stringa "YYYY-MM-DD"
      const isoDate =
        r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date);

      return {
        id: r.id,
        date: isoToIT(isoDate),
        time: r.time,
        league: r.league,
        country: r.country,
        home: r.home,
        away: r.away,
        odd1: r.odd1,
        oddX: r.oddx,       // attenzione: in Postgres il campo è "oddx"
        odd2: r.odd2,
        delta_bv: r.delta_bv,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Errore lettura matches:', err);
    res.status(500).json({ error: 'Errore nella lettura dal database' });
  }
});

app.listen(PORT, () => {
  console.log(`Server in ascolto su http://localhost:${PORT}`);
});
