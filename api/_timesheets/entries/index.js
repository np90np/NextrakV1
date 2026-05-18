const { authorize } = require('../../_auth');
const db = require('../../_db');

module.exports = async (req, res) => {
  if (!(await authorize(req, res))) return;

  try {
    if (req.method === 'GET') {
      const { timesheet_id: timesheetId, project_id: projectId, work_date: workDate } = req.query;
      if (timesheetId) {
        const result = await db.query('SELECT te.*, json_build_object(\'id\', p.id, \'name\', p.name, \'cost_code\', p.cost_code) AS project FROM timesheet_entries te LEFT JOIN projects p ON p.id = te.project_id WHERE te.timesheet_id = $1 ORDER BY te.work_date', [timesheetId]);
        return res.status(200).json(result.rows);
      }
      if (projectId && workDate) {
        const result = await db.query('SELECT te.*, json_build_object(\'id\', p.id, \'name\', p.name) AS project FROM timesheet_entries te LEFT JOIN projects p ON p.id = te.project_id WHERE te.project_id = $1 AND te.work_date = $2 ORDER BY te.hours DESC', [projectId, workDate]);
        return res.status(200).json(result.rows);
      }
      return res.status(400).json({ error: 'timesheet_id or project_id + work_date required' });
    }

    if (req.method === 'POST') {
      const b = req.body;
      const insertSql = `INSERT INTO timesheet_entries (timesheet_id, project_id, work_date, hours, work_type, description, start_time, end_time, break_minutes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`;
      const params = [b.timesheet_id, b.project_id || null, b.work_date, b.hours || 0, b.work_type || 'ordinary', b.description || null, b.start_time || null, b.end_time || null, b.break_minutes || 0];
      const result = await db.query(insertSql, params);
      // update timesheet total_hours
      const totalRes = await db.query('SELECT COALESCE(SUM(hours),0) AS total FROM timesheet_entries WHERE timesheet_id = $1', [b.timesheet_id]);
      await db.query('UPDATE timesheets SET total_hours = $1 WHERE id = $2', [Number(totalRes.rows[0].total || 0), b.timesheet_id]);
      return res.status(201).json(result.rows[0]);
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('timesheet entries error', err);
    res.status(500).json({ error: String(err) });
  }
};
