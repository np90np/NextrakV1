const { authorize } = require('../_auth');
const db = require('../_db');

module.exports = async (req, res) => {
  if (!(await authorize(req, res))) return;

  try {
    if (req.method === 'GET') {
      const reportId = req.query.report_id;
      if (!reportId) return res.status(400).json({ error: 'report_id required' });
      const result = await db.query(
        `SELECT de.*,
          json_build_object('name', p.name) AS project,
          json_build_object('first_name', e.first_name, 'last_name', e.last_name) AS recorder
         FROM daily_expenses de
         LEFT JOIN projects p ON p.id = de.project_id
         LEFT JOIN employees e ON e.id = de.recorded_by
         WHERE de.daily_report_id = $1
         ORDER BY de.category`,
        [reportId]
      );
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const b = req.body;
      const result = await db.query(
        `INSERT INTO daily_expenses (daily_report_id, project_id, recorded_by, expense_date, category, description, amount, receipt_number, receipt_key, supplier, is_billable)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [b.daily_report_id, b.project_id, b.recorded_by, b.expense_date, b.category, b.description, b.amount || 0, b.receipt_number || null, b.receipt_key || null, b.supplier || null, b.is_billable !== false]
      );
      return res.status(201).json(result.rows[0]);
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('daily-expenses index error', err);
    res.status(500).json({ error: String(err) });
  }
};
