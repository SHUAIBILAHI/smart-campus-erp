const me = JSON.parse(sessionStorage.getItem('u') || 'null');
if (!me) location = 'index.html';
const $ = id => document.getElementById(id);
const api = (p, m = 'GET', b) => fetch('/api' + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined })
  .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw d; return d; });
const logout = () => { sessionStorage.clear(); location = 'index.html'; };
const table = (heads, rows) => `<div class="tbl"><table><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr>${rows.join('') || `<tr><td colspan="${heads.length}">No data available</td></tr>`}</table></div>`;
const badge = s => `<span class="badge ${s}">${s}</span>`;

// ---------- Views ----------
async function dashboard() {
  const s = await api('/stats');
  let extra = '';
  if (me.role === 'STUDENT') {
    const a = await api('/attendance?student=' + me.username);
    const pct = a.length ? Math.round(a.filter(x => x.present).length * 100 / a.length) : 0;
    const f = (await api('/fees?student=' + me.username)).filter(x => !x.paid).length;
    return `<div class="grid"><div class="stat"><b>${pct}%</b><small>My Attendance</small></div><div class="stat"><b>${f}</b><small>Pending Fees</small></div></div>
    <div class="card"><h3>Welcome, ${me.name}</h3><p>Department: ${me.department}</p></div>`;
  }
  return `<div class="grid">${Object.entries(s).map(([k, v]) => `<div class="stat"><b>${v}</b><small>${k}</small></div>`).join('')}</div>
  <div class="card"><h3>Welcome, ${me.name}</h3><p>You are using the <b>${me.role}</b> panel.</p></div>`;
}

async function departments() {
  const d = await api('/departments');
  return `${me.role == 'ADMIN' ? `<div class="card"><h3>Add Department</h3><div class="row"><input id="dn" placeholder="Department name"><button onclick="addDept()">Add</button></div></div>` : ''}
  <div class="card">${table(['ID', 'Name', 'Action'], d.map(x => `<tr><td>${x.id}</td><td>${x.name}</td><td>${me.role == 'ADMIN' ? `<button class="sm red" onclick="delDept(${x.id})">Delete</button>` : ''}</td></tr>`))}</div>`;
}
async function addDept() { if (!$('dn').value) return; await api('/departments', 'POST', { name: $('dn').value }); go(cur); }
async function delDept(id) { await api('/departments/' + id, 'DELETE'); go(cur); }

function usersView(roles, canAdd0) {
  return async () => {
    const canAdd = canAdd0 && me.role == 'ADMIN';
    const d = await api('/departments');
    let all = [];
    for (const r of roles) all = all.concat(await api('/users?role=' + r));
    const form = canAdd ? `<div class="card"><h3>Add User</h3><div class="row">
      <input id="un" placeholder="Name"><input id="uu" placeholder="Username"><input id="up" placeholder="Password">
      <select id="ur">${roles.map(r => `<option>${r}</option>`).join('')}</select>
      <select id="ud">${d.map(x => `<option>${x.name}</option>`).join('')}</select><button onclick="addUser()">Add</button></div><div class="err" id="ue"></div></div>` : '';
    return form + `<div class="card">${table(['Name', 'Username', 'Role', 'Department', ...(canAdd ? ['Action'] : [])],
      all.map(u => `<tr><td>${u.name}</td><td>${u.username}</td><td>${u.role}</td><td>${u.department}</td>${canAdd ? `<td><button class="sm red" onclick="delUser(${u.id})">Delete</button></td>` : ''}</tr>`))}</div>`;
  };
}
async function addUser() {
  try { await api('/users', 'POST', { name: $('un').value, username: $('uu').value, password: $('up').value, role: $('ur').value, department: $('ud').value }); go(cur); }
  catch (e) { $('ue').textContent = e.error || 'Error'; }
}
async function delUser(id) { await api('/users/' + id, 'DELETE'); go(cur); }

async function markAttendance() {
  const st = await api('/users?role=STUDENT');
  return `<div class="card"><h3>Mark Attendance</h3><div class="row"><input id="as" placeholder="Subject"><input id="ad" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
  ${table(['Student', 'Present'], st.map(s => `<tr><td>${s.name}</td><td><input type="checkbox" class="chk" data-u="${s.username}" data-n="${s.name}" checked style="width:auto;margin:0"></td></tr>`))}
  <br><button onclick="saveAtt()">Save Attendance</button> <span id="am"></span></div>`;
}
async function saveAtt() {
  if (!$('as').value) return alert('Please enter a subject');
  const list = [...document.querySelectorAll('.chk')].map(c => ({ studentUsername: c.dataset.u, studentName: c.dataset.n, subject: $('as').value, date: $('ad').value, present: c.checked }));
  await api('/attendance', 'POST', list); $('am').textContent = '✅ Saved!';
}
async function myAttendance() {
  const a = await api('/attendance?student=' + me.username);
  const pct = a.length ? Math.round(a.filter(x => x.present).length * 100 / a.length) : 0;
  return `<div class="grid"><div class="stat"><b>${pct}%</b><small>Overall Attendance</small></div></div>
  <div class="card">${table(['Date', 'Subject', 'Status'], a.map(x => `<tr><td>${x.date}</td><td>${x.subject}</td><td>${badge(x.present ? 'APPROVED' : 'REJECTED').replace('APPROVED', 'Present').replace('REJECTED', 'Absent')}</td></tr>`))}</div>`;
}

async function applyLeave() {
  const l = await api('/leaves?applicant=' + me.username);
  const to = me.role === 'HOD' ? 'Administration' : 'HOD';
  return `<div class="card"><h3>Apply for Leave (${to} Approval)</h3><div class="row"><input id="lf" type="date"><input id="lt" type="date"><input id="lr" placeholder="Reason"><button onclick="sendLeave()">Submit</button></div></div>
  <div class="card"><h3>My Leave Requests</h3>${table(['From', 'To', 'Reason', 'Status'], l.map(x => `<tr><td>${x.fromDate}</td><td>${x.toDate}</td><td>${x.reason}</td><td>${badge(x.status)}</td></tr>`))}</div>`;
}
async function sendLeave() {
  if (!$('lf').value || !$('lr').value) return alert('Please enter the date and reason');
  await api('/leaves', 'POST', { applicant: me.username, applicantName: me.name, applicantRole: me.role, fromDate: $('lf').value, toDate: $('lt').value || $('lf').value, reason: $('lr').value });
  go(cur);
}
async function leaveApprovals(f) {
  const l = (await api('/leaves?approverRole=' + me.role)).filter(x => !f || x.applicantRole == f);
  return `<div class="card"><h3>Leave Requests</h3>${table(['Name', 'Role', 'From', 'To', 'Reason', 'Status', 'Action'], l.map(x => `<tr><td>${x.applicantName}</td><td>${x.applicantRole}</td><td>${x.fromDate}</td><td>${x.toDate}</td><td>${x.reason}</td><td>${badge(x.status)}</td>
  <td>${x.status === 'PENDING' ? `<button class="sm green" onclick="decide(${x.id},'APPROVED')">Approve</button> <button class="sm red" onclick="decide(${x.id},'REJECTED')">Reject</button>` : '-'}</td></tr>`))}</div>`;
}
async function decide(id, s) { await api(`/leaves/${id}/${s}`, 'PUT'); go(cur); }

async function feesAccounts() {
  const f = await api('/fees');
  return `<div class="card"><h3>Add Fee</h3><div class="row"><input id="fu" placeholder="Student username (e.g. stu1)"><input id="ft" placeholder="Title (Tuition Fee)"><input id="fa" type="number" placeholder="Amount"><button onclick="addFee()">Add</button></div></div>
  <div class="card">${table(['Student', 'Title', 'Amount', 'Status', 'Action'], f.map(x => `<tr><td>${x.studentName || x.studentUsername}</td><td>${x.title}</td><td>₹${x.amount}</td><td>${badge(x.paid ? 'APPROVED' : 'PENDING').replace('APPROVED', 'Paid').replace('PENDING', 'Due')}</td><td>${x.paid ? '-' : `<button class="sm green" onclick="payFee(${x.id},'Fees')">Mark Paid</button>`}</td></tr>`))}</div>`;
}
async function addFee() { await api('/fees', 'POST', { studentUsername: $('fu').value, title: $('ft').value, amount: +$('fa').value }); go(cur); }
async function payFee(id, back) { await api(`/fees/${id}/pay`, 'PUT'); go(cur); }
async function myFees() {
  const f = await api('/fees?student=' + me.username);
  return `<div class="card">${table(['Title', 'Amount', 'Status', 'Action'], f.map(x => `<tr><td>${x.title}</td><td>₹${x.amount}</td><td>${x.paid ? 'Paid' : 'Due'}</td><td>${x.paid ? '-' : `<button class="sm" onclick="payFee(${x.id},'My Fees')">Pay Now</button>`}</td></tr>`))}</div>`;
}

// ================= MODULE SYSTEM =================
const ALL = ['ADMIN','HOD','FACULTY','STUDENT','ACCOUNTS','LIBRARIAN','WARDEN','TRANSPORT_MGR','STORE_MGR','CANTEEN_MGR','SPORTS_COORD','EVENT_COORD','SECURITY','ALUMNI_COORD'];
const STAFF = ALL.slice(5);
const VIEWS = {}, MOD = {}, MENU = {};
let cur = 'Dashboard';
const A = (title, key) => VIEWS[title] = () => modView(key);
function M(key, title, fields, o = {}) {
  MOD[key] = { key, title, add: o.add || ['ADMIN'], all: o.all || ['ADMIN'], appr: o.appr || [],
    fields: fields.split(',').map(f => { let [n, t = 'text'] = f.split(':'), opt = null; if (t.startsWith('s=')) { opt = t.slice(2).split('/'); t = 'select'; } return { n, k: n.toLowerCase().replace(/\W+/g, '_'), t, opt }; }) };
  A(title, key);
}
async function modView(key) {
  const d = MOD[key];
  const rs = (await api('/records?module=' + key)).map(r => ({ ...r, d: JSON.parse(r.data || '{}') })).reverse()
    .filter(r => d.all.includes(me.role) || r.owner == me.username || r.d.student == me.username || r.d.to == me.username);
  const input = f => f.t == 'select' ? `<select id="f_${f.k}">${f.opt.map(o => `<option>${o}</option>`).join('')}</select>`
    : f.t == 'textarea' ? `<textarea id="f_${f.k}" rows="2"></textarea>`
    : `<input id="f_${f.k}" type="${f.t}" ${f.k == 'student' && me.role == 'STUDENT' ? `value="${me.username}" readonly` : ''}>`;
  const form = d.add.includes(me.role) ? `<div class="card"><h3>Add New</h3><div class="row">${d.fields.map(f => `<div><label>${f.n}</label>${input(f)}</div>`).join('')}<div><button onclick="addRec('${key}')">Save</button></div></div></div>` : '';
  const heads = ['Date', ...d.fields.map(f => f.n), 'By', ...(d.appr.length ? ['Status'] : []), 'Action'];
  const rows = rs.map(r => `<tr><td>${(r.createdAt || '').slice(0, 16).replace('T', ' ')}</td>${d.fields.map(f => `<td>${r.d[f.k] ?? ''}</td>`).join('')}<td>${r.ownerName || ''}</td>${d.appr.length ? `<td>${badge(r.status)}</td>` : ''}<td>${d.appr.includes(me.role) && r.status == 'PENDING' ? `<button class="sm green" onclick="recSt(${r.id},'APPROVED')">✔</button> <button class="sm red" onclick="recSt(${r.id},'REJECTED')">✖</button> ` : ''}${me.role == 'ADMIN' || r.owner == me.username ? `<button class="sm red" onclick="recDel(${r.id})">Delete</button>` : ''}</td></tr>`);
  return form + `<div class="card"><input placeholder="🔍 Search / Filter..." onkeyup="flt(this)">${table(heads, rows)}</div>`;
}
async function addRec(key) {
  const d = MOD[key], o = {}; for (const f of d.fields) o[f.k] = $('f_' + f.k).value;
  if (!Object.values(o)[0]) return alert('Please fill in the first field');
  await api('/records', 'POST', { module: key, owner: me.username, ownerName: me.name, ownerRole: me.role, data: JSON.stringify(o) }); go(cur);
}
const recSt = async (id, s) => { await api(`/records/${id}/status/${s}`, 'PUT'); go(cur); };
const recDel = async id => { if (confirm('Delete this record?')) { await api('/records/' + id, 'DELETE'); go(cur); } };
const flt = i => { const q = i.value.toLowerCase(); i.parentElement.querySelectorAll('tr').forEach((r, x) => { if (x) r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'; }); };

// ================= MODULE DEFINITIONS =================
const HA = ['HOD', 'ADMIN'], FHA = ['FACULTY', 'HOD', 'ADMIN'], AA = ['ACCOUNTS', 'ADMIN'];
// Administration & Accounts
M('Admission', 'Admission Management', 'Applicant Name,Course,Phone,Percentage:number', { appr: ['ADMIN'] });
M('Scholarship', 'Scholarship Management', 'Student,Scholarship Name,Amount:number,Reason', { add: ['ADMIN', 'ACCOUNTS', 'STUDENT'], all: AA, appr: ['ADMIN'] });
A('Scholarship Accounts', 'Scholarship'); A('Scholarship Application', 'Scholarship');
M('Expense', 'Expense Management', 'Title,Amount:number,Category:s=Maintenance/Events/Utilities/Supplies/Other,Date:date', { add: AA, all: AA });
M('Document', 'Document Management', 'Title,Type:s=Policy/Circular/Certificate/Other,Link or Details');
M('Audit', 'Audit Logs', 'Action', { add: [], all: ['ADMIN'] }); A('Activity History', 'Audit');
M('EmpSalary', 'Employee Salary Management', 'Employee Username,Month,Amount:number,Status:s=Paid/Pending', { add: AA, all: AA });
M('FacSalary', 'Faculty Salary Records', 'Employee Username,Month,Amount:number,Status:s=Paid/Pending', { add: AA, all: AA });
M('Budget', 'Department Budget Records', 'Department,Year,Allocated:number,Spent:number', { add: ['ACCOUNTS', 'ADMIN', 'HOD'], all: ['ACCOUNTS', 'ADMIN', 'HOD'] }); A('Department Budget', 'Budget');
// HOD
M('Subject', 'Subject Allocation', 'Subject,Faculty Username,Department,Semester', { add: HA, all: ALL }); A('My Subjects', 'Subject');
M('Workload', 'Faculty Workload Management', 'Faculty Username,Hours per Week:number,Subjects', { add: ['HOD'], all: HA });
M('FacAtt', 'Faculty Attendance', 'Faculty Username,Date:date,Status:s=Present/Absent/On Leave', { add: ['HOD'], all: HA });
M('Marks', 'Marks Management', 'Student,Subject,Exam:s=Internal/Midterm/Final,Marks:number,Total:number', { add: FHA, all: FHA });
A('Internal Marks Management', 'Marks'); A('Results & Marksheet', 'Marks');
// Placement
M('Job', 'Job Opportunities', 'Company,Role,Package,Last Date:date,Details', { add: HA, all: ALL });
M('Internship', 'Internship Opportunities', 'Company,Role,Stipend,Duration,Last Date:date', { add: HA, all: ALL });
M('Drive', 'Placement Drives', 'Company,Date:date,Venue,Eligibility', { add: HA, all: ALL });
M('Resume', 'Resume Management', 'Student,Skills,Resume Link,CGPA:number', { add: ['STUDENT', 'HOD'], all: HA });
M('Interview', 'Interview Schedule', 'Student,Company,Date:date,Time,Mode:s=Online/Offline', { add: HA, all: HA });
M('PlaceRec', 'Placement Records', 'Student,Company,Package,Year', { add: HA, all: ALL });
// Faculty
M('Class', 'My Classes', 'Class,Subject,Day,Time,Room', { add: FHA, all: ALL }); A('My Timetable', 'Class');
M('Material', 'Study Materials', 'Subject,Title,Link or Details', { add: ['FACULTY', 'HOD'], all: ALL });
M('Assignment', 'Assignment Management', 'Subject,Title,Description:textarea,Due Date:date', { add: ['FACULTY'], all: ALL }); A('Assignments', 'Assignment');
M('Homework', 'Homework Management', 'Subject,Title,Description:textarea,Due Date:date', { add: ['FACULTY'], all: ALL }); A('Homework', 'Homework');
M('Paper', 'Question Paper Management', 'Subject,Exam,Year,Link or Details', { add: ['FACULTY', 'HOD'], all: FHA });
M('Submission', 'Assignment Submission', 'Assignment Title,Answer or Link,Student', { add: ['STUDENT'], all: FHA, appr: ['FACULTY'] });
M('Test', 'Online Test Creation', 'Subject,Question,A,B,C,D,Correct:s=A/B/C/D', { add: ['FACULTY'], all: FHA });
M('TestResult', 'Test Results', 'Student,Score:number,Total:number', { add: [], all: FHA });
// Student
M('Complaint', 'Complaint & Feedback', 'Type:s=Complaint/Feedback/Grievance,Subject,Details:textarea', { add: ALL, all: ['ADMIN'], appr: ['ADMIN'] }); A('Grievance Management', 'Complaint');
M('Cert', 'Digital Certificates', 'Student,Certificate Type:s=Bonafide/Character/Transfer/Marksheet Copy,Purpose', { add: ['STUDENT', 'ADMIN'], all: ['ADMIN'], appr: ['ADMIN'] });
// Common
M('Notice', 'Notifications', 'Title,Message:textarea,Audience', { add: ['ADMIN', 'HOD', 'FACULTY'], all: ALL });
M('Msg', 'Messages', 'To,Message:textarea', { add: ALL, all: [] });
// Campus
M('Library', 'Library Management', 'Book Title,Author,Student,Issue Date:date,Return Date:date', { add: ['HOD', 'LIBRARIAN', 'ADMIN'], all: ['HOD', 'LIBRARIAN', 'ADMIN'] });
M('Hostel', 'Hostel Management', 'Student,Room No,Block,Fee Status:s=Paid/Due,Check-in:date', { add: ['WARDEN', 'ADMIN'], all: ['WARDEN', 'ADMIN'] });
M('Transport', 'Transport Management', 'Route,Vehicle No,Driver,Timing,Seats:number', { add: ['TRANSPORT_MGR', 'ADMIN'], all: ALL });
M('Inventory', 'Inventory Management', 'Item,Quantity:number,Location,Condition:s=New/Good/Needs Repair', { add: ['STORE_MGR', 'ADMIN'], all: ['STORE_MGR', 'ADMIN'] });
M('Canteen', 'Canteen Management', 'Item,Price:number,Available:s=Yes/No', { add: ['CANTEEN_MGR', 'ADMIN'], all: ALL });
M('Sports', 'Sports Management', 'Sport,Event,Date:date,Venue,Coordinator', { add: ['SPORTS_COORD', 'ADMIN'], all: ALL });
M('Event', 'Event & Club Management', 'Event Name,Club,Date:date,Venue,Description:textarea', { add: ['EVENT_COORD', 'ADMIN'], all: ALL });
M('LostFound', 'Lost & Found', 'Item,Type:s=Lost/Found,Place,Contact', { add: ALL, all: ALL });
M('Nav', 'Campus Navigation', 'Place,Building,Floor,Directions', { add: ['ADMIN'], all: ALL });
M('Visitor', 'Visitor Management', 'Visitor Name,Phone,Meeting With,Purpose,Time In', { add: ['SECURITY', 'ADMIN'], all: ['SECURITY', 'ADMIN'] });
M('Alumni', 'Alumni Management', 'Name,Batch,Company,Email,Contribution', { add: ['ALUMNI_COORD', 'ADMIN'], all: ['ALUMNI_COORD', 'ADMIN'] });
M('Research', 'Research & Project Management', 'Title,Faculty Username,Students,Status:s=Ongoing/Completed,Details:textarea', { add: ['HOD'], all: FHA });

// ================= SPECIAL VIEWS =================
Object.assign(VIEWS, {
  'Dashboard': dashboard,
  'Department Management': departments,
  'HOD Management': usersView(['HOD'], true),
  'Faculty Management': usersView(['FACULTY'], true),
  'Student Management': usersView(['STUDENT'], true),
  'Employee Management': usersView(['ACCOUNTS', ...STAFF], true),
  'Student List': usersView(['STUDENT'], false),
  'Fee Management': feesAccounts, 'Student Fee Management': feesAccounts,
  'Fee Details & Payment': myFees,
  'HOD Leave Approval': () => leaveApprovals('HOD'),
  'Faculty Leave Approval': () => leaveApprovals('FACULTY'),
  'Student Leave Approval': () => leaveApprovals('STUDENT'),
  'Apply for Leave': applyLeave,
  'Student Attendance': markAttendance,
  'My Attendance': myAttendance
});
const feeList = kind => async () => {
  const f = (await api('/fees')).filter(x => kind == 'due' ? !x.paid : x.paid), tot = f.reduce((s, x) => s + x.amount, 0);
  return `<div class="grid"><div class="stat"><b>₹${tot}</b><small>${kind == 'due' ? 'Total Due' : 'Total Collected'}</small></div></div><div class="card">${table(['Student', 'Title', 'Amount', ...(kind == 'paid' ? ['Receipt'] : [])], f.map(x => `<tr><td>${x.studentName || x.studentUsername}</td><td>${x.title}</td><td>₹${x.amount}</td>${kind == 'paid' ? `<td><button class="sm" onclick="receipt(${x.id})">Print</button></td>` : ''}</tr>`))}</div>`;
};
async function receipt(id) {
  const x = (await api('/fees')).find(f => f.id == id), w = window.open('', '_blank');
  w.document.write(`<div style="font-family:sans-serif;max-width:420px;margin:30px auto;border:2px solid #1e3a8a;padding:24px"><h2>🎓 Smart Campus - Payment Receipt</h2><p>Receipt No: ${x.id}</p><p>Student: ${x.studentName || x.studentUsername}</p><p>Fee: ${x.title}</p><h3>Amount Paid: ₹${x.amount}</h3><p>Status: PAID</p></div>`); w.print();
}
VIEWS['Fee Collection Records'] = VIEWS['Online Fee Payment Records'] = VIEWS['Payment Receipts'] = feeList('paid');
VIEWS['Fee Due & Pending Reports'] = feeList('due');
VIEWS['Financial Reports'] = VIEWS['Income & Expenditure Reports'] = async () => {
  const [f, ex, s1, s2] = await Promise.all([api('/fees'), ...['Expense', 'EmpSalary', 'FacSalary'].map(k => api('/records?module=' + k))]);
  const sum = a => a.reduce((s, r) => s + (+JSON.parse(r.data).amount || 0), 0);
  const inc = f.filter(x => x.paid).reduce((s, x) => s + x.amount, 0), due = f.filter(x => !x.paid).reduce((s, x) => s + x.amount, 0), exp = sum(ex), sal = sum(s1) + sum(s2);
  const st = (v, l) => `<div class="stat"><b>₹${v}</b><small>${l}</small></div>`;
  return `<div class="grid">${st(inc, 'Fee Income')}${st(due, 'Fees Pending')}${st(exp, 'Expenses')}${st(sal, 'Salaries')}${st(inc - exp - sal, 'Net Balance')}</div>`;
};

// ---- Student stats / analytics / prediction ----
async function stuStats() {
  const [st, at, mk] = await Promise.all([api('/users?role=STUDENT'), api('/attendance/all'), api('/records?module=Marks')]);
  const m = mk.map(r => JSON.parse(r.data));
  return st.map(s => {
    const a = at.filter(x => x.studentUsername == s.username), ap = a.length ? Math.round(a.filter(x => x.present).length * 100 / a.length) : null;
    const ms = m.filter(x => x.student == s.username && +x.total > 0), mp = ms.length ? Math.round(ms.reduce((t, x) => t + x.marks * 100 / x.total, 0) / ms.length) : null;
    const sc = ap != null && mp != null ? Math.round(.4 * ap + .6 * mp) : (ap ?? mp);
    return { s, ap, mp, sc, label: sc == null ? 'No data' : sc >= 75 ? 'Good' : sc >= 50 ? 'Average' : 'At Risk' };
  });
}
const bar = v => `<div style="background:#e2e8f0;border-radius:99px;min-width:100px"><div style="width:${Math.max(v, 8)}%;background:${v >= 75 ? '#16a34a' : v >= 50 ? '#f59e0b' : '#dc2626'};color:#fff;font-size:11px;padding:2px 8px;border-radius:99px">${v}%</div></div>`;
VIEWS['Student Attendance Overview'] = async () => `<div class="card">${table(['Student', 'Department', 'Attendance'], (await stuStats()).map(x => `<tr><td>${x.s.name}</td><td>${x.s.department}</td><td>${x.ap == null ? '-' : bar(x.ap)}</td></tr>`))}</div>`;
const perf = pred => async () => {
  let r = await stuStats(); if (me.role == 'STUDENT') r = r.filter(x => x.s.username == me.username);
  return `<div class="card">${pred ? '<p>Prediction = 40% attendance + 60% marks (simple formula).</p><br>' : ''}${table(['Student', 'Attendance', 'Marks', 'Score', pred ? 'Predicted Result' : 'Status'], r.map(x => `<tr><td>${x.s.name}</td><td>${x.ap ?? '-'}${x.ap == null ? '' : '%'}</td><td>${x.mp ?? '-'}${x.mp == null ? '' : '%'}</td><td>${x.sc ?? '-'}</td><td>${x.label == 'Good' ? (pred ? 'Likely Pass (Good)' : 'Good') : x.label == 'Average' ? (pred ? 'Likely Pass (Average)' : 'Average') : x.label == 'At Risk' ? (pred ? '⚠️ May Fail - needs attention' : 'At Risk') : 'No data'}</td></tr>`))}</div>`;
};
VIEWS['Student Performance Analytics'] = perf(false); VIEWS['Student Performance Prediction'] = perf(true);
VIEWS['Department Performance Reports'] = async () => {
  const r = (await stuStats()).filter(x => x.sc != null), avg = r.length ? Math.round(r.reduce((t, x) => t + x.sc, 0) / r.length) : 0, c = l => r.filter(x => x.label == l).length;
  return `<div class="grid"><div class="stat"><b>${avg}</b><small>Average Score</small></div><div class="stat"><b>${c('Good')}</b><small>Good</small></div><div class="stat"><b>${c('At Risk')}</b><small>At Risk</small></div></div>` + await perf(false)();
};
VIEWS['Reports & Analytics'] = async () => {
  const s = await api('/stats'), mx = Math.max(...Object.values(s), 1);
  return `<div class="card"><h3>Campus Overview</h3>${Object.entries(s).map(([k, v]) => `<p>${k}: <b>${v}</b></p><div style="background:var(--p);height:10px;border-radius:5px;width:${v * 100 / mx}%;min-width:4px"></div>`).join('')}</div><h3>Student Performance</h3>` + await perf(false)();
};

// ---- Online exam ----
VIEWS['Online Examination'] = async () => {
  const [t, res] = await Promise.all([api('/records?module=Test'), api('/records?module=TestResult')]);
  window._q = t.map(r => JSON.parse(r.data));
  const mine = res.filter(r => r.owner == me.username).map(r => JSON.parse(r.data));
  return `<div class="card"><h3>Online Test</h3>${_q.length ? _q.map((x, i) => `<p><b>Q${i + 1}. ${x.question}</b> <small>(${x.subject})</small></p>${['a', 'b', 'c', 'd'].map(o => `<label style="display:block;font-size:14px;color:inherit"><input type="radio" name="q${i}" value="${o.toUpperCase()}" style="width:auto;margin:0 8px 0 0">${x[o]}</label>`).join('')}`).join('<br>') + '<br><button onclick="submitTest()">Submit Test</button>' : 'No tests available right now'}</div><div class="card"><h3>My Past Results</h3>${table(['Score', 'Total'], mine.map(m => `<tr><td>${m.score}</td><td>${m.total}</td></tr>`))}</div>`;
};
async function submitTest() {
  let s = 0; _q.forEach((x, i) => { const c = document.querySelector(`input[name=q${i}]:checked`); if (c && c.value == x.correct) s++; });
  await api('/records', 'POST', { module: 'TestResult', owner: me.username, ownerName: me.name, ownerRole: me.role, data: JSON.stringify({ student: me.username, score: s, total: _q.length }) });
  alert(`Your score: ${s}/${_q.length}`); go(cur);
}

// ---- QR / code attendance ----
VIEWS['QR Code Attendance'] = () => `<div class="card"><h3>Generate Attendance Code</h3><div class="row"><input id="qs" placeholder="Subject"><button onclick="qrNew()">Generate Code</button></div><h1 id="qc" style="letter-spacing:8px;margin-top:16px"></h1><small>The code is valid for 10 minutes. Students enter it under 'Scan QR / Enter Code'.</small></div>`;
async function qrNew() { $('qc').textContent = (await api('/qr/new', 'POST', { subject: $('qs').value })).code; }
VIEWS['Scan QR / Enter Code'] = () => `<div class="card"><h3>Attendance Code</h3><div class="row"><input id="qk" placeholder="6-digit code"><button onclick="qrMark()">Mark Present</button></div><div id="qm" style="margin-top:10px"></div></div>`;
async function qrMark() { try { await api('/qr/mark', 'POST', { code: $('qk').value, username: me.username }); $('qm').innerHTML = '✅ Attendance marked successfully'; } catch (e) { $('qm').innerHTML = '❌ ' + (e.error || 'Error'); } }

// ---- Profile / ID / Security / Permissions ----
VIEWS['Digital Student ID Card'] = () => `<div class="idcard"><h3>🎓 Smart Campus</h3><div class="av">${me.name[0]}</div><h2>${me.name}</h2><p>${me.role} • ${me.department}</p><p>ID: ${me.username.toUpperCase()}</p><div class="bars">${[...me.username].map(c => `<i style="height:${20 + c.charCodeAt(0) % 25}px"></i>`).join('')}</div></div><br><button onclick="window.print()">🖨️ Print</button>`;
VIEWS['My Profile'] = () => `<div class="card"><h3>${me.name}</h3><p>Username: ${me.username}<br>Role: ${me.role}<br>Department: ${me.department}</p></div><div class="card"><h3>Change Password</h3><div class="row"><input id="np" type="password" placeholder="New password"><button onclick="chPw()">Update</button></div></div>`;
async function chPw() { if (!$('np').value) return; await api(`/users/${me.id}/password`, 'PUT', { password: $('np').value }); alert('Password updated successfully'); $('np').value = ''; }
VIEWS['Security Management'] = async () => `<div class="card"><h3>Reset User Password</h3><div class="row"><select id="su">${(await api('/users')).map(x => `<option value="${x.id}">${x.username} (${x.role})</option>`).join('')}</select><input id="sp" placeholder="New password"><button onclick="resetPw()">Reset</button></div></div><div class="card"><p>View login and activity details in 'Audit Logs'.</p></div>`;
async function resetPw() { if (!$('sp').value) return; await api(`/users/${$('su').value}/password`, 'PUT', { password: $('sp').value }); alert('Password reset successfully'); }
VIEWS['Role & Permission Management'] = () => `<div class="card">${table(['Role', 'Accessible Modules'], ALL.map(r => `<tr><td><b>${r}</b></td><td>${MENU[r].filter(x => x[0] != '#').join(', ')}</td></tr>`))}</div>`;

// ---- Smart features ----
VIEWS['Smart Search'] = () => `<div class="card"><div class="row"><input id="sq" placeholder="Student, faculty, notice, event, job..." onkeydown="if(event.key=='Enter')doSearch()"><button onclick="doSearch()">Search</button></div></div><div id="sr"></div>`;
async function doSearch() { const r = await api('/search?q=' + encodeURIComponent($('sq').value)); $('sr').innerHTML = `<div class="card">${table(['Type', 'Result'], r.map(x => `<tr><td>${x.type}</td><td>${x.text}</td></tr>`))}</div>`; }
VIEWS['AI College Assistant'] = () => `<div class="card"><div id="chat" class="chat"><div class="bot">Hello ${me.name}! Ask me about attendance, fees, leave, exams or placements 🙂</div></div><div class="row" style="margin-top:10px"><input id="cm" placeholder="Type your question..." onkeydown="if(event.key=='Enter')sendChat()"><button onclick="sendChat()">Send</button></div></div>`;
async function sendChat() {
  const m = $('cm').value; if (!m) return; const c = $('chat'); c.innerHTML += `<div class="me">${m}</div>`; $('cm').value = '';
  const r = await api('/chat', 'POST', { username: me.username, message: m }); c.innerHTML += `<div class="bot">${r.reply}</div>`; c.scrollTop = c.scrollHeight;
}
VIEWS['AI Question Generator'] = () => `<div class="card"><div class="row"><input id="qt" placeholder="Topic (e.g. Normalization)"><input id="qn" type="number" value="5"><button onclick="genQ()">Generate</button></div></div><div id="qo"></div>`;
function genQ() {
  const t = $('qt').value || 'Topic', T = [`Define ${t} with a suitable example.`, `Explain the need and importance of ${t}.`, `List the advantages and disadvantages of ${t}.`, `Differentiate ${t} from a related concept.`, `Draw a neat diagram to explain ${t}.`, `Write a short note on ${t}.`, `Explain the working of ${t} step by step.`, `What are the real-life applications of ${t}?`];
  const n = Math.min(+$('qn').value || 5, T.length);
  $('qo').innerHTML = `<div class="card"><h3>Question Paper: ${t}</h3>${T.slice(0, n).map((q, i) => `<p>Q${i + 1}. ${q}</p>`).join('')}<br><small>This is a template-based generator. It can be connected to an AI API later.</small></div>`;
}
async function notices() {
  const n = (await api('/records?module=Notice')).slice(-3).reverse();
  return `<div class="card"><h3>📢 Latest Notices</h3>${n.map(x => { const d = JSON.parse(x.data); return `<p><b>${d.title}</b> — ${d.message}</p>`; }).join('') || 'No notices'}</div>`;
}

// ================= ROLE MENUS =================
const CAMPUS = ['Library Management', 'Hostel Management', 'Transport Management', 'Inventory Management', 'Canteen Management', 'Sports Management', 'Event & Club Management', 'Lost & Found', 'Campus Navigation', 'Visitor Management', 'Alumni Management', 'Grievance Management', 'Research & Project Management'];
const COMMON = ['#Smart & Common', 'Notifications', 'Messages', 'AI College Assistant', 'Smart Search', 'Lost & Found', 'Campus Navigation', 'My Profile', 'Activity History'];
MENU.ADMIN = ['#Overview', 'Dashboard', 'Reports & Analytics', '#People & Departments', 'Department Management', 'HOD Management', 'Faculty Management', 'Student Management', 'Employee Management',
  '#Administration', 'Admission Management', 'Fee Management', 'Scholarship Management', 'Expense Management', 'Document Management', 'HOD Leave Approval', 'Role & Permission Management', 'Audit Logs', 'Security Management',
  '#Campus Management', ...CAMPUS.filter(c => c != 'Lost & Found' && c != 'Campus Navigation'), 'Lost & Found', 'Campus Navigation',
  '#Smart', 'Notifications', 'Messages', 'AI College Assistant', 'AI Question Generator', 'Student Performance Prediction', 'Smart Search', 'My Profile'];
MENU.ACCOUNTS = ['Dashboard', 'Student Fee Management', 'Fee Collection Records', 'Online Fee Payment Records', 'Employee Salary Management', 'Faculty Salary Records', 'Expense Management', 'Department Budget Records', 'Scholarship Accounts', 'Fee Due & Pending Reports', 'Payment Receipts', 'Financial Reports', 'Income & Expenditure Reports', ...COMMON];
MENU.HOD = ['#Department', 'Dashboard', 'Department Management', 'Faculty Management', 'Student Management', 'Subject Allocation', 'Faculty Workload Management', 'Faculty Attendance', 'Student Attendance Overview', 'Internal Marks Management', 'Faculty Leave Approval', 'Student Leave Approval', 'Apply for Leave', 'Department Budget', 'Department Performance Reports', 'Student Performance Prediction', 'AI Question Generator',
  '#Placement & Training', 'Job Opportunities', 'Internship Opportunities', 'Placement Drives', 'Resume Management', 'Interview Schedule', 'Placement Records', '#Campus', 'Library Management', 'Research & Project Management', ...COMMON];
MENU.FACULTY = ['Dashboard', 'My Classes', 'My Subjects', 'Student List', 'Student Attendance', 'QR Code Attendance', 'Study Materials', 'Assignment Management', 'Homework Management', 'Online Test Creation', 'Test Results', 'Question Paper Management', 'Marks Management', 'Student Performance Analytics', 'Student Performance Prediction', 'AI Question Generator', 'Apply for Leave', ...COMMON];
MENU.STUDENT = ['Dashboard', 'Digital Student ID Card', 'My Attendance', 'Scan QR / Enter Code', 'My Timetable', 'My Subjects', 'Study Materials', 'Assignments', 'Homework', 'Assignment Submission', 'Online Examination', 'Results & Marksheet', 'Student Performance Prediction', 'Fee Details & Payment', 'Scholarship Application', 'Apply for Leave', 'Digital Certificates', 'Complaint & Feedback',
  '#Placement', 'Job Opportunities', 'Internship Opportunities', 'Placement Drives', 'Resume Management', 'Placement Records', '#Campus', 'Library Management', 'Hostel Management', 'Transport Management', 'Canteen Management', 'Sports Management', 'Event & Club Management', ...COMMON];
const OWN = { LIBRARIAN: 'Library Management', WARDEN: 'Hostel Management', TRANSPORT_MGR: 'Transport Management', STORE_MGR: 'Inventory Management', CANTEEN_MGR: 'Canteen Management', SPORTS_COORD: 'Sports Management', EVENT_COORD: 'Event & Club Management', SECURITY: 'Visitor Management', ALUMNI_COORD: 'Alumni Management' };
STAFF.forEach(r => MENU[r] = ['Dashboard', OWN[r], 'Transport Management', 'Event & Club Management', ...COMMON]);
['Employee Salary Management'].forEach(t => A(t, 'EmpSalary'));

// ================= NAVIGATION =================
async function go(name) {
  cur = name; $('title').textContent = name;
  document.querySelectorAll('#menu a').forEach(a => a.classList.toggle('on', a.dataset.t == name));
  try { let h = await VIEWS[name](); if (name == 'Dashboard') h += await notices(); $('view').innerHTML = h; }
  catch (e) { $('view').innerHTML = '<div class="card">Error: ' + (e.error || e.message || 'failed to load') + '</div>'; }
}
$('who').textContent = `${me.name} (${me.role})`;
$('menu').innerHTML = MENU[me.role].map(t => t[0] == '#' ? `<div class="grp">${t.slice(1)}</div>` : `<a data-t="${t}" onclick="go(this.dataset.t)">${t}</a>`).join('');
go('Dashboard');
