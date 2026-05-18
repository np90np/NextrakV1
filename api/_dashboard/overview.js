const { authorize } = require('../_auth');
const db = require('../_db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  if (!(await authorize(req, res))) return;

  try {
    const today = (req.query && req.query.today) || new Date().toISOString().slice(0, 10);

    const [empRes, projRes, tsRes, reportRes, recentProjRes, pendingTsRes] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS count FROM employees WHERE is_active = true'),
      db.query("SELECT COUNT(*)::int AS count FROM projects WHERE status = 'active'"),
      db.query("SELECT COUNT(*)::int AS count FROM timesheets WHERE status = 'submitted'"),
      db.query('SELECT COUNT(*)::int AS count FROM daily_reports WHERE report_date = $1', [today]),
      db.query('SELECT id, name, client_name, city, status, budget FROM projects ORDER BY created_at DESC LIMIT 5'),
      db.query("SELECT t.id, t.employee_id, t.created_at, e.first_name, e.last_name FROM timesheets t LEFT JOIN employees e ON e.id = t.employee_id WHERE t.status = 'submitted' ORDER BY t.created_at DESC LIMIT 5"),
    ]);

    const stats = {
      totalEmployees: empRes.rows[0]?.count ?? 0,
      activeProjects: projRes.rows[0]?.count ?? 0,
      pendingTimesheets: tsRes.rows[0]?.count ?? 0,
      todayReports: reportRes.rows[0]?.count ?? 0,
    };

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ stats, recentProjects: recentProjRes.rows || [], pendingTimesheets: pendingTsRes.rows || [] });
  } catch (err) {
    console.error('dashboard overview error', err);
    res.status(500).json({ error: String(err) });
  }
};
