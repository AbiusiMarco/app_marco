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
      oddx REAL,
      odd2 REAL,
      delta_bv REAL            -- |odd1 - odd2|
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
      (date, time, league, country, home, away, odd1, oddx, odd2, delta_bv)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `;

    for (const m of matches) {
      const isoDate = dateITtoISO(m.date);
      if (!isoDate) continue;

      const odd1 = m.odd1 != null ? Number(m.odd1) : null;
      const oddx = m.oddX != null ? Number(m.oddX) : null;
      const odd2 = m.odd2 != null ? Number(m.odd2) : null;

      // calcola delta_bv = |odd1 - odd2| se entrambe presenti
      const deltaBV =
        odd1 != null && odd2 != null ? Math.abs(odd1 - odd2) : null;

      await client.query(insertSql, [
        isoDate,
        m.time || '',
        m.league || '',
        m.country || '',
        m.home || '',
        m.away || '',
        odd1,
        oddx,
        odd2,
        deltaBV,
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

/**
 * Legge le partite con filtri opzionali:
 *  - fromDateISO: data minima (YYYY-MM-DD)
 *  - country: nazione (es. 'Italy')
 *  - league: campionato
 *  - recommended: se true applica il filtro "partite consigliate"
 *      delta_bv <= 1.8 AND (oddx <= odd1 OR oddx <= odd2)
 */
async function getMatches(filters) {
  const { fromDateISO, country, league, recommended } = filters;

  const conditions = [];
  const params = [];
  let i = 1;

  if (fromDateISO) {
    conditions.push(`date >= $${i++}`);
    params.push(fromDateISO);
  }

  if (country) {
    conditions.push(`country = $${i++}`);
    params.push(country);
  }

  if (league) {
    conditions.push(`league = $${i++}`);
    params.push(league);
  }

  if (recommended) {
    conditions.push(`delta_bv <= 1.8 AND (oddx <= odd1 OR oddx <= odd2)`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT id, date, time, league, country, home, away, odd1, oddx, odd2, delta_bv
    FROM matches
    ${whereClause}
    ORDER BY date ASC, time ASC
  `;

  const res = await pool.query(sql, params);
  return res.rows;
}

module.exports = {
  initDb,
  replaceAllMatches,
  getMatches,
  dateITtoISO,
};
