const { authorize } = require('./_auth');
const db = require('./_db');

module.exports = async (req, res) => {
  if (!(await authorize(req, res))) return;

  const { id } = req.query;

  try {
    if (id) {
      if (req.method === 'GET') {
        const ts = await db.query('SELECT * FROM timesheets WHERE id = $1', [id]);
        if (ts.rowCount === 0) return res.status(404).json({ error: 'Not found' });
        const entries = await db.query(
          `SELECT te.*, json_build_object('id', p.id, 'name', p.name) AS project FROM timesheet_entries te LEFT JOIN projects p ON p.id = te.project_id WHERE te.timesheet_id = $1 ORDER BY te.work_date`,
          [id]
        );
        return res.status(200).json({ timesheet: ts.rows[0], entries: entries.rows });
      }
      if (req.method === 'PUT') {
        const b = req.body;
        const result = await db.query(
          `UPDATE timesheets SET status=$1, total_hours=$2, approved_at=$3, rejection_reason=$4 WHERE id=$5 RETURNING *`,
          [b.status || 'draft', b.total_hours || 0, b.approved_at || null, b.rejection_reason || null, id]
        );
        return res.status(200).json(result.rows[0]);
      }
      if (req.method === 'DELETE') {
        await db.query('DELETE FROM timesheets WHERE id = $1', [id]);
        return res.status(204).send('');
      }
    } else {
      if (req.method === 'GET') {
        const { employee_id, date_from, date_to, status, week_start_date } = req.query;
        const conditions = [];
        const params = [];

        if (employee_id) { params.push(employee_id); conditions.push(`t.employee_id = $${params.length}`); }
        if (date_from) { params.push(date_from); conditions.push(`t.week_start_date >= $${params.length}`); }
        if (date_to) { params.push(date_to); conditions.push(`t.week_start_date <= $${params.length}`); }
        if (status && status !== 'all') { params.push(status); conditions.push(`t.status = $${params.length}`); }
        if (week_start_date) { params.push(week_start_date); conditions.push(`t.week_start_date = $${params.length}`); }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = `SELECT t.*, json_build_object('id', e.id, 'first_name', e.first_name, 'last_name', e.last_name, 'position', e.position) AS employee FROM timesheets t LEFT JOIN employees e ON e.id = t.employee_id ${where} ORDER BY t.week_start_date DESC`;
        const result = await db.query(sql, params);
        return res.status(200).json(result.rows);
      }
      if (req.method === 'POST') {
        const b = req.body;
        const result = await db.query(
          `INSERT INTO timesheets (employee_id, week_start_date, status, total_hours) VALUES ($1,$2,$3,$4) RETURNING *`,
          [b.employee_id, b.week_start_date, b.status || 'draft', b.total_hours || 0]
        );
        return res.status(201).json(result.rows[0]);
      }
    }
    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('timesheets error', err);
    res.status(500).json({ error: String(err) });
  }
};
