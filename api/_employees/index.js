const { authorize } = require('../_auth');
const db = require('../_db');

module.exports = async (req, res) => {
  if (!(await authorize(req, res))) return;

  try {
    if (req.method === 'GET') {
      const q = req.query.q || '';
      const sql = q
        ? `SELECT id, first_name, last_name, email, phone, role, position, hourly_rate, employment_type, start_date, is_active, emergency_contact_name, emergency_contact_phone FROM employees WHERE LOWER(first_name||' '||last_name||' '||email||' '||position) LIKE $1 ORDER BY first_name` 
        : `SELECT id, first_name, last_name, email, phone, role, position, hourly_rate, employment_type, start_date, is_active, emergency_contact_name, emergency_contact_phone FROM employees ORDER BY first_name`;
      const params = q ? [`%${q.toLowerCase()}%`] : [];
      const result = await db.query(sql, params);
      res.status(200).json(result.rows);
      return;
    }

    if (req.method === 'POST') {
      const body = req.body;
      const insertSql = `INSERT INTO employees (first_name, last_name, email, phone, role, position, hourly_rate, employment_type, start_date, is_active, emergency_contact_name, emergency_contact_phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`;
      const params = [
        body.first_name,
        body.last_name,
        body.email,
        body.phone,
        body.role,
        body.position,
        body.hourly_rate || 0,
        body.employment_type,
        body.start_date,
        body.is_active === undefined ? true : body.is_active,
        body.emergency_contact_name,
        body.emergency_contact_phone,
      ];
      const result = await db.query(insertSql, params);
      res.status(201).json(result.rows[0]);
      return;
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('employees index error', err);
    res.status(500).json({ error: String(err) });
  }
};
