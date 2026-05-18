const { authorize } = require('./_auth');
const db = require('./_db');

module.exports = async (req, res) => {
  if (!(await authorize(req, res))) return;

  const { id } = req.query;

  try {
    if (id) {
      if (req.method === 'GET') {
        const result = await db.query('SELECT * FROM employees WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(result.rows[0]);
      }
      if (req.method === 'PUT') {
        const b = req.body;
        const result = await db.query(
          `UPDATE employees SET first_name=$1, last_name=$2, email=$3, phone=$4, role=$5, position=$6, hourly_rate=$7, employment_type=$8, start_date=$9, is_active=$10, emergency_contact_name=$11, emergency_contact_phone=$12 WHERE id=$13 RETURNING *`,
          [b.first_name, b.last_name, b.email, b.phone, b.role, b.position, b.hourly_rate || 0, b.employment_type, b.start_date, b.is_active === undefined ? true : b.is_active, b.emergency_contact_name, b.emergency_contact_phone, id]
        );
        return res.status(200).json(result.rows[0]);
      }
      if (req.method === 'DELETE') {
        await db.query('DELETE FROM employees WHERE id = $1', [id]);
        return res.status(204).send('');
      }
    } else {
      if (req.method === 'GET') {
        const q = req.query.q || '';
        const sql = q
          ? `SELECT id, first_name, last_name, email, phone, role, position, hourly_rate, employment_type, start_date, is_active, emergency_contact_name, emergency_contact_phone FROM employees WHERE LOWER(first_name||' '||last_name||' '||email||' '||position) LIKE $1 ORDER BY first_name`
          : `SELECT id, first_name, last_name, email, phone, role, position, hourly_rate, employment_type, start_date, is_active, emergency_contact_name, emergency_contact_phone FROM employees ORDER BY first_name`;
        const params = q ? [`%${q.toLowerCase()}%`] : [];
        const result = await db.query(sql, params);
        return res.status(200).json(result.rows);
      }
      if (req.method === 'POST') {
        const body = req.body;
        const result = await db.query(
          `INSERT INTO employees (first_name, last_name, email, phone, role, position, hourly_rate, employment_type, start_date, is_active, emergency_contact_name, emergency_contact_phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
          [body.first_name, body.last_name, body.email, body.phone, body.role, body.position, body.hourly_rate || 0, body.employment_type, body.start_date, body.is_active === undefined ? true : body.is_active, body.emergency_contact_name, body.emergency_contact_phone]
        );
        return res.status(201).json(result.rows[0]);
      }
    }
    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('employees error', err);
    res.status(500).json({ error: String(err) });
  }
};
