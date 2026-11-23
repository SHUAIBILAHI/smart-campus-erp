// Department scoping: HOD and Faculty only see data of their own department
(function () {
  const me = JSON.parse(sessionStorage.getItem('u') || 'null');
  if (!me || !['HOD', 'FACULTY'].includes(me.role)) return;
  const dept = me.department, orig = window.fetch.bind(window);
  const get = async u => (await orig(u)).json();
  const reply = (data, r) => new Response(JSON.stringify(data), { status: r.status, headers: { 'Content-Type': 'application/json' } });
  const KEYS = ['student', 'faculty_username', 'employee_username'];
  window.fetch = async (url, opts) => {
    const r = await orig(url, opts);
    if ((opts && opts.method && opts.method !== 'GET') || !r.ok || typeof url !== 'string' || !url.startsWith('/api/')) return r;
    try {
      const path = url.slice(5).split('?')[0], data = await r.clone().json();
      const users = await get('/api/users'), inDept = new Set(users.filter(u => u.department === dept).map(u => u.username));
      switch (path) {
        case 'users': return reply(data.filter(u => u.department === dept), r);
        case 'departments': return reply(data.filter(d => d.name === dept), r);
        case 'attendance/all': return reply(data.filter(a => inDept.has(a.studentUsername)), r);
        case 'leaves': return reply(data.filter(l => inDept.has(l.applicant)), r);
        case 'fees': return reply(data.filter(f => inDept.has(f.studentUsername)), r);
        case 'records': return reply(data.filter(x => { const d = JSON.parse(x.data || '{}'), k = KEYS.find(k => d[k]); return !k || inDept.has(d[k]); }), r);
        case 'stats': {
          const L = await get('/api/leaves?approverRole=HOD'), F = await get('/api/fees'), dep = users.filter(u => u.department === dept);
          return reply({ Students: dep.filter(u => u.role === 'STUDENT').length, Faculty: dep.filter(u => u.role === 'FACULTY').length, Departments: 1,
            'Pending Leaves': L.filter(l => l.status === 'PENDING' && inDept.has(l.applicant)).length, 'Fees Due': F.filter(f => !f.paid && inDept.has(f.studentUsername)).length }, r);
        }
      }
    } catch (e) { }
    return r;
  };
})();
