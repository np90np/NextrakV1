const { authorize } = require('../_auth');
const db = require('../_db');

module.exports = async (req, res) => {
  if (!(await authorize(req, res))) return;

  try {
    const idsParam = req.query.ids || req.query.projectIds || '';
    const ids = idsParam.split(',').filter(Boolean);
    if (ids.length === 0) return res.status(200).json({});

    // Timesheet labor cost: sum(hours * employee.hourly_rate)
    const timesheetSql = `
      SELECT te.project_id, COALESCE(SUM((te.hours::numeric) * COALESCE(e.hourly_rate,0)),0) AS timesheet_cost
      FROM timesheet_entries te
      JOIN timesheets t ON t.id = te.timesheet_id
      JOIN employees e ON e.id = t.employee_id
      WHERE te.project_id = ANY($1::uuid[])
      GROUP BY te.project_id`;

    const expenseSql = `
      SELECT project_id, COALESCE(SUM(amount),0) AS expense_cost
      FROM daily_expenses
      WHERE project_id = ANY($1::uuid[])
      GROUP BY project_id`;

    const [tsRes, expRes] = await Promise.all([
      db.query(timesheetSql, [ids]),
      db.query(expenseSql, [ids]),
    ]);

    const map = {};
    for (const r of tsRes.rows) map[r.project_id] = { timesheetCost: Number(r.timesheet_cost || 0), expenseCost: 0 };
    for (const r of expRes.rows) {
      map[r.project_id] = map[r.project_id] || { timesheetCost: 0, expenseCost: 0 };
      map[r.project_id].expenseCost = Number(r.expense_cost || 0);
    }

    res.status(200).json(map);
  } catch (err) {
    console.error('projects costs error', err);
    res.status(500).json({ error: String(err) });
  }
};
