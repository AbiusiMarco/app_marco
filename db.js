// db.js - versione PostgreSQL
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // molti provider (Render incluso) richiedono SSL
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
});

// crea la tabella se non esiste
async function initDb() {
  const sql = `
    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,      -- formato YYYY-MM-DD
      time TEXT NOT NULL,      -- HH:MM
      league TEXT,
      country TEXT,
      home TEXT,
      away TEXT,
      odd1 REAL,
      oddX REAL,
      odd2 REAL
    );
  `;
  await pool.query(sql);
}

// converte "dd/mm/yyyy" -> "yyyy-mm-dd"
function dateITtoISO(d) {
  if (!d) return null;
  const parts = d.split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm}-${dd}`;
}

// svuota la tabella e inserisce tutte le partite del palinsesto
async function replaceAllMatches(matches) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM matches');

    const insertSql = `
      INSERT INTO matches
      (date, time, league, country, home, away, odd1, oddX, odd2)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `;

    for (const m of matches) {
      const isoDate = dateITtoISO(m.date);
      if (!isoDate) continue;

      await client.query(insertSql, [
        isoDate,
        m.time || '',
        m.league || '',
        m.country || '',
        m.home || '',
        m.away || '',
        m.odd1 != null ? Number(m.odd1) : null,
        m.oddX != null ? Number(m.oddX) : null,
        m.odd2 != null ? Number(m.odd2) : null,
      ]);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// legge le partite con data >= fromDateISO (YYYY-MM-DD)
async function getMatchesFromDate(fromDateISO) {
  const sql = `
    SELECT id, date, time, league, country, home, away, odd1, oddX, odd2
    FROM matches
    WHERE date >= $1
    ORDER BY date ASC, time ASC
  `;
  const res = await pool.query(sql, [fromDateISO]);
  return res.rows;
}

module.exports = {
  initDb,
  replaceAllMatches,
  getMatchesFromDate,
  dateITtoISO,
};
