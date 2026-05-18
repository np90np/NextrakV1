const { authorize } = require('../_auth');
const db = require('../_db');

module.exports = async (req, res) => {
  if (!(await authorize(req, res))) return;

  try {
    if (req.method === 'GET') {
      const { employee_id, date_from, date_to, status, week_start_date } = req.query;
      const conditions = [];
      const params = [];

      if (employee_id) {
        params.push(employee_id);
        conditions.push(`t.employee_id = $${params.length}`);
      }
      if (date_from) {
        params.push(date_from);
        conditions.push(`t.week_start_date >= $${params.length}`);
      }
      if (date_to) {
        params.push(date_to);
        conditions.push(`t.week_start_date <= $${params.length}`);
      }
      if (status && status !== 'all') {
        params.push(status);
        conditions.push(`t.status = $${params.length}`);
      }
      if (week_start_date) {
        params.push(week_start_date);
        conditions.push(`t.week_start_date = $${params.length}`);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `SELECT t.*, json_build_object('id', e.id, 'first_name', e.first_name, 'last_name', e.last_name, 'position', e.position) AS employee FROM timesheets t LEFT JOIN employees e ON e.id = t.employee_id ${where} ORDER BY t.week_start_date DESC`;
      const result = await db.query(sql, params);
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const b = req.body;
      const insertSql = `INSERT INTO timesheets (employee_id, week_start_date, status, total_hours) VALUES ($1,$2,$3,$4) RETURNING *`;
      const params = [b.employee_id, b.week_start_date, b.status || 'draft', b.total_hours || 0];
      const result = await db.query(insertSql, params);
      return res.status(201).json(result.rows[0]);
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('timesheets index error', err);
    res.status(500).json({ error: String(err) });
  }
};
