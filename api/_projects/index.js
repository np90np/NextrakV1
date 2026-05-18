const { authorize } = require('../_auth');
const db = require('../_db');

module.exports = async (req, res) => {
  if (!(await authorize(req, res))) return;

  try {
    if (req.method === 'GET') {
      const q = req.query.q || '';
      const sql = q
        ? `SELECT * FROM projects WHERE LOWER(name||' '||client_name||' '||city) LIKE $1 ORDER BY created_at DESC`
        : `SELECT * FROM projects ORDER BY created_at DESC`;
      const params = q ? [`%${q.toLowerCase()}%`] : [];
      const result = await db.query(sql, params);
      res.status(200).json(result.rows);
      return;
    }

    if (req.method === 'POST') {
      const b = req.body;
      const insertSql = `INSERT INTO projects (name, description, client_name, client_email, client_phone, address, city, state, postcode, cost_code, status, budget, contract_value, start_date, end_date, manager_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`;
      const params = [
        b.name, b.description, b.client_name, b.client_email, b.client_phone, b.address, b.city, b.state, b.postcode, b.cost_code, b.status, b.budget || 0, b.contract_value || 0, b.start_date, b.end_date, b.manager_id,
      ];
      const result = await db.query(insertSql, params);
      res.status(201).json(result.rows[0]);
      return;
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('projects index error', err);
    res.status(500).json({ error: String(err) });
  }
};
