const { authorize } = require('./_auth');
const db = require('./_db');

module.exports = async (req, res) => {
  if (!(await authorize(req, res))) return;

  const { id, resource } = req.query;

  try {
    // /api/projects/costs → resource=costs
    if (resource === 'costs') {
      const idsParam = req.query.ids || req.query.projectIds || '';
      const ids = idsParam.split(',').filter(Boolean);
      if (ids.length === 0) return res.status(200).json({});

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
      return res.status(200).json(map);
    }

    if (id) {
      if (req.method === 'GET') {
        const result = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(result.rows[0]);
      }
      if (req.method === 'PUT') {
        const b = req.body;
        const result = await db.query(
          `UPDATE projects SET name=$1, description=$2, client_name=$3, client_email=$4, client_phone=$5, address=$6, city=$7, state=$8, postcode=$9, cost_code=$10, status=$11, budget=$12, contract_value=$13, start_date=$14, end_date=$15, manager_id=$16 WHERE id=$17 RETURNING *`,
          [b.name, b.description, b.client_name, b.client_email, b.client_phone, b.address, b.city, b.state, b.postcode, b.cost_code, b.status, b.budget || 0, b.contract_value || 0, b.start_date, b.end_date, b.manager_id, id]
        );
        return res.status(200).json(result.rows[0]);
      }
      if (req.method === 'DELETE') {
        await db.query('DELETE FROM projects WHERE id = $1', [id]);
        return res.status(204).send('');
      }
    } else {
      if (req.method === 'GET') {
        const q = req.query.q || '';
        const sql = q
          ? `SELECT * FROM projects WHERE LOWER(name||' '||client_name||' '||city) LIKE $1 ORDER BY created_at DESC`
          : `SELECT * FROM projects ORDER BY created_at DESC`;
        const params = q ? [`%${q.toLowerCase()}%`] : [];
        const result = await db.query(sql, params);
        return res.status(200).json(result.rows);
      }
      if (req.method === 'POST') {
        const b = req.body;
        const result = await db.query(
          `INSERT INTO projects (name, description, client_name, client_email, client_phone, address, city, state, postcode, cost_code, status, budget, contract_value, start_date, end_date, manager_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
          [b.name, b.description, b.client_name, b.client_email, b.client_phone, b.address, b.city, b.state, b.postcode, b.cost_code, b.status, b.budget || 0, b.contract_value || 0, b.start_date, b.end_date, b.manager_id]
        );
        return res.status(201).json(result.rows[0]);
      }
    }
    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('projects error', err);
    res.status(500).json({ error: String(err) });
  }
};
