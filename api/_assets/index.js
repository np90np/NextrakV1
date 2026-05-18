const { authorize } = require('../_auth');
const db = require('../_db');

module.exports = async (req, res) => {
  if (!(await authorize(req, res))) return;

  try {
    if (req.method === 'GET') {
      const result = await db.query(`
        SELECT a.*,
          CASE WHEN a.assigned_project_id IS NOT NULL THEN json_build_object('name', p.name) ELSE NULL END AS project,
          CASE WHEN a.assigned_employee_id IS NOT NULL THEN json_build_object('first_name', e.first_name, 'last_name', e.last_name) ELSE NULL END AS employee
        FROM assets a
        LEFT JOIN projects p ON p.id = a.assigned_project_id
        LEFT JOIN employees e ON e.id = a.assigned_employee_id
        ORDER BY a.name
      `);
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const b = req.body;
      const result = await db.query(
        `INSERT INTO assets (name, asset_type, serial_number, registration, purchase_date, purchase_price, current_value, condition, status, assigned_project_id, assigned_employee_id, location, last_service_date, next_service_date, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [b.name, b.asset_type, b.serial_number || '', b.registration || '', b.purchase_date || null, b.purchase_price || 0, b.current_value || 0, b.condition, b.status, b.assigned_project_id || null, b.assigned_employee_id || null, b.location || '', b.last_service_date || null, b.next_service_date || null, b.notes || '']
      );
      return res.status(201).json(result.rows[0]);
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('assets index error', err);
    res.status(500).json({ error: String(err) });
  }
};
