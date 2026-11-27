// ===== Auto User ID + Temporary Password feature =====
function usersView2(roles, canAdd0) {
  return async () => {
    const canAdd = canAdd0 && me.role == 'ADMIN';
    const d = await api('/departments');
    let all = [];
    for (const r of roles) all = all.concat(await api('/users?role=' + r));
    const form = canAdd ? `<div class="card"><h3>Add New User</h3>
      <p style="font-size:13px;color:#64748b;margin-bottom:10px">The User ID is generated automatically. Enter a temporary password below (leave blank to auto-generate). The user must change it at first login.</p>
      <div class="row">
        <div><label>Full Name</label><input id="un"></div>
        <div><label>Temporary Password</label><input id="up" placeholder="Blank = auto-generate"></div>
        <div><label>Role</label><select id="ur">${roles.map(r => `<option>${r}</option>`).join('')}</select></div>
        <div><label>Department</label><select id="ud">${d.map(x => `<option>${x.name}</option>`).join('')}</select></div>
        <div><button onclick="addUser()">Add User</button></div>
      </div>
      <div class="err" id="ue"></div><div id="ucred"></div></div>` : '';
    return form + `<div class="card"><input placeholder="🔍 Search / Filter..." onkeyup="flt(this)">${table(['User ID', 'Name', 'Role', 'Department', ...(canAdd ? ['Action'] : [])],
      all.map(u => `<tr><td><b>${u.username}</b></td><td>${u.name}</td><td>${u.role}</td><td>${u.department}</td>${canAdd ? `<td><button class="sm red" onclick="delUser(${u.id})">Delete</button></td>` : ''}</tr>`))}</div>`;
  };
}
VIEWS['HOD Management'] = usersView2(['HOD'], true);
VIEWS['Faculty Management'] = usersView2(['FACULTY'], true);
VIEWS['Student Management'] = usersView2(['STUDENT'], true);
VIEWS['Employee Management'] = usersView2(['ACCOUNTS', ...STAFF], true);

async function addUser() {
  try {
    const r = await api('/users/create', 'POST', { name: $('un').value, password: $('up').value, role: $('ur').value, department: $('ud').value });
    await go(cur);
    $('ucred').innerHTML = `<div class="card" style="background:#dcfce7;margin-top:12px"><b>✅ User created!</b><br>User ID: <b>${r.username}</b><br>Temporary Password: <b>${r.password}</b><br><small>Share these details with the user. They must change the password at first login. This will not be shown again.</small></div>`;
  } catch (e) { $('ue').textContent = e.error || 'Error'; }
}
async function resetPw() {
  if (!$('sp').value) return;
  await api(`/users/${$('su').value}/reset-password`, 'PUT', { password: $('sp').value });
  alert('Password reset. The user must set a new password at next login.');
}
async function chPw() {
  if (!$('np').value) return;
  try { await api(`/users/${me.id}/change-password`, 'PUT', { password: $('np').value }); alert('Password updated successfully'); $('np').value = ''; }
  catch (e) { alert(e.error || 'Error'); }
}

// ===== Pehle login par password change zaruri =====
async function forceChange() {
  const a = $('fp1').value, b = $('fp2').value;
  if (a.length < 6) { $('fe').textContent = 'Enter at least 6 characters'; return; }
  if (a !== b) { $('fe').textContent = 'The two passwords do not match'; return; }
  try {
    await api(`/users/${me.id}/change-password`, 'PUT', { password: a });
    me.mustChange = false; sessionStorage.setItem('u', JSON.stringify(me)); location.reload();
  } catch (e) { $('fe').textContent = e.error || 'Error'; }
}
if (me.mustChange) {
  const o = document.createElement('div');
  o.style.cssText = 'position:fixed;inset:0;z-index:9999;background:linear-gradient(135deg,#1e3a8a,#2563eb);display:grid;place-items:center;padding:16px';
  o.innerHTML = `<div class="login-box"><h1>🔒 Change Your Password</h1><p>You are using a temporary password. You must set a new password before continuing.</p><input id="fp1" type="password" placeholder="New password (min 6 characters)"><input id="fp2" type="password" placeholder="Confirm new password"><button class="full" onclick="forceChange()">Set Password</button><div class="err" id="fe"></div><p style="margin-top:12px;font-size:13px"><a href="#" onclick="logout()">Logout</a></p></div>`;
  document.body.appendChild(o);
}

// ===== Student Management: New Admission + Student Record boxes =====
document.head.insertAdjacentHTML('beforeend', '<style>.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-bottom:20px}.dtiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px}.tile{background:#fff;border-radius:12px;padding:24px;min-height:170px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:6px;cursor:pointer;font-size:18px;font-weight:600;box-shadow:0 1px 3px #0001;border:2px solid transparent}.tile span{font-size:34px}.tile small{color:#64748b;font-weight:400;font-size:13px}.tile:hover{border-color:#2563eb;background:#eff6ff}td a{color:#2563eb;font-weight:600;text-decoration:none}td a:hover{text-decoration:underline}.dl td:first-child{width:230px;color:#64748b}@media(max-width:760px){.tiles{grid-template-columns:1fr!important}}</style>');
const fmtYears = y => `${y} ${y == 1 ? 'Year' : 'Years'}`;
const bl = b => b == 'Unassigned' ? 'No Batch' : 'Batch ' + b;
const batchOf = s => s.academicSession ? s.academicSession.slice(0, 4) : (s.admissionDate ? s.admissionDate.slice(0, 4) : 'Unassigned');
const page = (crumb, back, body) => {
  $('title').textContent = 'Student Management › ' + crumb;
  $('view').innerHTML = `<button class="sm" style="margin-bottom:16px" onclick="${back}">← Back</button><div id="tilebody">${body}</div>`;
};
VIEWS['Student Management'] = async () => {
  const st = await api('/users?role=STUDENT'), adm = me.role == 'ADMIN';
  return `<div class="tiles">
    ${adm ? '<div class="tile" id="t_new" onclick="openTile(\'new\')"><span>➕</span>New Admission</div>' : ''}
    <div class="tile" id="t_rec" onclick="openTile('rec')"><span>📂</span>Student Record<small>${st.length} students</small></div>
    <div class="tile" id="t_mk" onclick="openTile('marks')"><span>📝</span>Marks Management</div>
  </div>`;
};

// ---- New Admission ----
async function openTile(w) {
  window._nav = null;
  if (w == 'new') { page('New Admission', "go('Student Management')", await newAdmissionForm()); courseChanged(); }
  else if (w == 'marks') await marksBatches();
  else { await loadRec(); page('Student Record', "go('Student Management')", recordBody()); }
}
async function newAdmissionForm() {
  const d = await api('/departments');
  window._deptObjs = d;
  return `<div class="card"><h3>New Admission</h3>
    <p style="font-size:13px;color:#64748b;margin-bottom:10px">A User ID is generated automatically. Enter a temporary password (leave blank to auto-generate). The student must change it at first login.</p>
    <div class="row">
      <div><label>Student Name</label><input id="un"></div>
      <div><label>Temporary Password</label><input id="up" placeholder="Blank = auto-generate"></div>
      <div><label>Course</label><select id="ud" onchange="courseChanged()">${d.map(x => `<option>${x.name}</option>`).join('')}</select></div>
      <div><label>Course Duration</label><input id="udur" readonly></div>
      <div><label>Admission Date</label><input id="uadm" type="date" value="${new Date().toISOString().slice(0, 10)}" onchange="updateSession()"></div>
      <div><label>Academic Session</label><input id="uses" readonly></div>
      <div><label>Semester</label><select id="usem"></select></div>
      <div><button onclick="addUser()">Admit Student</button></div>
    </div>
    <div class="err" id="ue"></div><div id="ucred"></div></div>`;
}
function acadSession(dateStr, years) {
  const y = +String(dateStr).slice(0, 4);
  if (!y || !(years > 0)) return '';
  return `${y}-${String(y + Math.ceil(years)).slice(-2)}`;
}
function updateSession() {
  const d = (window._deptObjs || []).find(x => x.name == $('ud').value);
  $('uses').value = d && d.durationYears ? acadSession($('uadm').value, d.durationYears) : 'Set the course duration first';
}
function courseChanged() {
  const d = (window._deptObjs || []).find(x => x.name == $('ud').value);
  $('udur').value = d && d.durationYears ? fmtYears(d.durationYears) : 'Not set (add it in Department Management)';
  const n = d && d.semesters ? d.semesters : 1;
  $('usem').innerHTML = Array.from({ length: n }, (_, i) => `<option value="${i + 1}">Semester ${i + 1} of ${n}</option>`).join('');
  updateSession();
}
async function addUser() {
  try {
    if (!$('ud').value) { $('ue').textContent = 'Please create a course in Department Management first'; return; }
    const body = { name: $('un').value, password: $('up').value, role: $('ur') ? $('ur').value : 'STUDENT', department: $('ud').value };
    if ($('uadm')) { body.admissionDate = $('uadm').value; body.semester = $('usem').value; body.academicSession = /^\d{4}-\d{2}$/.test($('uses').value) ? $('uses').value : ''; }
    const r = await api('/users/create', 'POST', body);
    if ($('tilebody')) { $('un').value = ''; $('up').value = ''; } else await go(cur);
    $('ucred').innerHTML = `<div class="card" style="background:#dcfce7;margin-top:12px"><b>✅ User created!</b><br>User ID: <b>${r.username}</b><br>Temporary Password: <b>${r.password}</b>${body.academicSession ? '<br>Academic Session: <b>' + body.academicSession + '</b>' : ''}${r.feeAmount ? '<br>Fee: <b>' + money(r.feeAmount) + '</b> — pay by <b>' + r.feeDue + '</b>' : (r.role == 'STUDENT' ? '<br><small>No fee was created because the course fee is not set in Department Management.</small>' : '')}<br><small>Share these details with the user. They must change the password at first login. This will not be shown again.</small></div>`;
  } catch (e) { $('ue').textContent = e.error || 'Error'; }
}

// ---- Student Record: Batch > Course > Semester > Students ----
async function loadRec() {
  const [d, st] = await Promise.all([api('/departments'), api('/users?role=STUDENT')]);
  window._stu = st; window._depts = d.map(x => x.name); window._deptObjs = d;
  window._batches = [...new Set(st.map(batchOf))].sort((a, b) => a == 'Unassigned' ? 1 : b == 'Unassigned' ? -1 : b - a);
}
function recordBody() {
  const st = window._stu;
  return `<div class="dtiles">${window._batches.map((b, i) => `<div class="tile" onclick="openBatch(${i})"><span>🎓</span>${bl(b)}<small>${st.filter(s => batchOf(s) == b).length} students</small></div>`).join('') || '<div class="card">No students admitted yet</div>'}</div>`;
}
const openBatch = i => openBatchK(window._batches[i]);
async function openBatchK(b) {
  await loadRec(); window._nav = { b };
  const st = window._stu.filter(s => batchOf(s) == b);
  page('Student Record › ' + bl(b), "openTile('rec')", `<div class="dtiles">${window._depts.map((d, c) => `<div class="tile" onclick="openCourse(${c})"><span>🏛️</span>${d}<small>${st.filter(s => s.department == d).length} students</small></div>`).join('') || '<div class="card">Please create a department in Department Management first</div>'}</div>`);
}
const openCourse = c => openCourseK(window._nav.b, window._depts[c]);
async function openCourseK(b, name) {
  await loadRec(); window._nav = { b, c: name };
  const d = window._deptObjs.find(x => x.name == name) || { semesters: 0 };
  const st = window._stu.filter(s => batchOf(s) == b && s.department == name);
  const n = d.semesters || Math.max(1, ...st.map(s => s.semester || 0));
  const tile = k => `<div class="tile" onclick="openSem(${k})"><span>📘</span>Semester ${k}<small>${st.filter(s => s.semester == k).length} students</small></div>`;
  let h = '';
  for (let y = 0; y < Math.ceil(n / 2); y++) {
    const sems = [2 * y + 1, 2 * y + 2].filter(k => k <= n);
    h += `<h3 style="margin:18px 0 10px">Year ${y + 1}</h3><div class="dtiles">${sems.map(k => tile(k)).join('')}</div>`;
  }
  const none = st.filter(s => !s.semester).length;
  if (none) h += `<h3 style="margin:18px 0 10px">Other</h3><div class="dtiles"><div class="tile" onclick="openSem(0)"><span>📄</span>Semester not set<small>${none} students</small></div></div>`;
  page(`Student Record › ${bl(b)} › ${name}`, "backTo('batch')", h);
}
const openSem = k => openSemK(window._nav.b, window._nav.c, k);
async function openSemK(b, name, k) {
  await loadRec(); window._nav = { b, c: name, s: k };
  const lbl = k ? `Semester ${k} (Year ${Math.ceil(k / 2)})` : 'Semester not set';
  const r = window._stu.filter(s => batchOf(s) == b && s.department == name && (k ? s.semester == k : !s.semester));
  page(`Student Record › ${bl(b)} › ${name} › ${k ? 'Semester ' + k : 'Semester not set'}`, "backTo('course')",
    `<div class="card"><h3>${name} — ${lbl} — ${r.length} Student(s)</h3><input placeholder="🔍 Search / Filter..." onkeyup="flt(this)">${table(['User ID', 'Name', 'Course', 'Academic Session', 'Semester', 'Admission Date'],
      r.map(u => `<tr><td><b>${u.username}</b></td><td><a href="#" onclick="openStudent(${u.id});return false">${u.name}</a></td><td>${u.department}</td><td>${u.academicSession || '-'}</td><td>${u.semester || '-'}</td><td>${u.admissionDate || '-'}</td></tr>`))}</div>`);
}
function backTo(l) { const n = window._nav; if (l == 'batch') openBatchK(n.b); else openCourseK(n.b, n.c); }
function reopen() {
  const n = window._nav;
  if (!n) openTile('rec'); else if (n.s != null) openSemK(n.b, n.c, n.s); else if (n.c != null) openCourseK(n.b, n.c); else openBatchK(n.b);
}
async function delUser(id) {
  if (!confirm('Delete this user?')) return;
  await api('/users/' + id, 'DELETE');
  if ($('tilebody')) reopen(); else go(cur);
}

// ---- Student profile page: Print / Edit / Delete ----
async function openStudent(id) {
  const p = await api('/students/' + id); window._prof = p;
  const row = (l, v) => `<tr><td>${l}</td><td>${v || '-'}</td></tr>`;
  const photo = p.photo ? `<img src="${p.photo}" style="width:140px;height:170px;object-fit:cover;border-radius:8px">` : `<div class="av" style="width:140px;height:170px;border-radius:8px;background:#e2e8f0;color:#475569;margin:0">${p.name[0]}</div>`;
  const adm = me.role == 'ADMIN';
  page(`Student Record › ${p.name}`, 'reopen()', `<div class="card"><div style="display:flex;gap:24px;flex-wrap:wrap;align-items:center">${photo}<div><h2>${p.name}</h2><p style="color:#64748b">${p.username} • ${p.department}</p></div></div>
    <h3 style="margin-top:20px">Academic Details</h3><table class="dl">${row('Course', p.department)}${row('Academic Session', p.academicSession)}${row('Batch', p.academicSession ? p.academicSession.slice(0, 4) : '')}${row('Current Semester', p.semester)}${row('Admission Date', p.admissionDate)}</table>
    <h3 style="margin-top:20px">Personal Details</h3><table class="dl">${row('Date of Birth', p.dob)}${row('Hostel Required', p.hostelRequired ? 'Yes' : 'No')}${row('Hostel Room No', p.roomNo)}${row('Father Name', p.fatherName)}${row('Mother Name', p.motherName)}${row('Student Mobile No', p.mobile)}${row('Email ID', p.email)}${row('Guardian Name', p.guardianName)}${row('Parents Mobile No', p.parentsMobile)}${row('Correspondence Address', p.addressCorrespondence)}${row('Permanent Address', p.addressPermanent)}</table>
    <div style="margin-top:24px;display:flex;gap:10px;flex-wrap:wrap"><button onclick="window.print()">🖨️ Print</button>${adm ? `<button class="green" onclick="editStudent()">✏️ Edit</button><button class="red" onclick="deleteStudent(${p.id})">🗑️ Delete</button>` : ''}</div></div>`);
}
function editStudent() {
  const p = window._prof, q = v => (v || '').replace(/"/g, '&quot;');
  const f = (id, label, val, type) => `<div><label>${label}</label><input id="${id}" type="${type || 'text'}" value="${q(val)}"></div>`;
  $('tilebody').innerHTML = `<div class="card"><h3>Complete Student Details — ${p.name}</h3><div class="row">
    ${f('pf_father', 'Father Name', p.fatherName)}${f('pf_mother', 'Mother Name', p.motherName)}${f('pf_mobile', 'Student Mobile No', p.mobile, 'tel')}${f('pf_email', 'Email ID', p.email, 'email')}
    ${f('pf_guardian', 'Guardian Name (optional)', p.guardianName)}${f('pf_pmobile', 'Parents Mobile No', p.parentsMobile, 'tel')}${f('pf_dob', 'Date of Birth', p.dob, 'date')}<div><label>Hostel Required</label><select id="pf_hostel"><option value="false">No</option><option value="true" ${p.hostelRequired ? 'selected' : ''}>Yes</option></select></div></div>
    <div class="row" style="margin-top:12px"><div><label>Correspondence Address</label><textarea id="pf_caddr" rows="3">${p.addressCorrespondence || ''}</textarea></div>
    <div><label>Permanent Address</label><textarea id="pf_paddr" rows="3">${p.addressPermanent || ''}</textarea><label style="margin-top:6px"><input type="checkbox" style="width:auto;margin:0 6px 0 0" onchange="sameAddr(this)">Same as correspondence address</label></div></div>
    <div style="margin-top:12px"><label>Photo (optional)</label><input id="pf_photo" type="file" accept="image/*"></div>
    <div class="err" id="pf_err"></div>
    <div style="margin-top:16px;display:flex;gap:10px"><button class="green" onclick="saveStudent()">Save</button><button onclick="openStudent(${p.id})">Cancel</button></div></div>`;
}
function sameAddr(c) { if (c.checked) $('pf_paddr').value = $('pf_caddr').value; }
function readPhoto(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => { const img = new Image(); img.onload = () => { const s = Math.min(1, 240 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.8)); }; img.onerror = () => rej(new Error('Invalid image file')); img.src = e.target.result; };
    r.onerror = () => rej(new Error('Could not read the file')); r.readAsDataURL(file);
  });
}
async function saveStudent() {
  const p = window._prof, v = id => $(id).value.trim();
  const b = { fatherName: v('pf_father'), motherName: v('pf_mother'), mobile: v('pf_mobile'), email: v('pf_email'), guardianName: v('pf_guardian'), parentsMobile: v('pf_pmobile'), addressCorrespondence: v('pf_caddr'), addressPermanent: v('pf_paddr'), dob: v('pf_dob'), hostelRequired: $('pf_hostel').value };
  const err = m => { $('pf_err').textContent = m; };
  if (!b.fatherName || !b.motherName) return err("Father's name and mother's name are required");
  if (!/^\d{10}$/.test(b.mobile) || !/^\d{10}$/.test(b.parentsMobile)) return err('Mobile numbers must be 10 digits');
  if (!/^\S+@\S+\.\S+$/.test(b.email)) return err('Enter a valid email ID');
  if (!b.addressCorrespondence || !b.addressPermanent) return err('Both addresses are required');
  if (!b.dob) return err('Date of birth is required');
  try { const f = $('pf_photo').files[0]; if (f) b.photo = await readPhoto(f); await api('/students/' + p.id, 'PUT', b); openStudent(p.id); }
  catch (e) { err(e.error || e.message || 'Could not save'); }
}
async function deleteStudent(id) {
  if (!confirm('Delete this student permanently?')) return;
  await api('/users/' + id, 'DELETE'); reopen();
}

// ===== Department Management: duration + semesters =====
VIEWS['Department Management'] = async () => {
  const d = await api('/departments'), adm = me.role == 'ADMIN';
  window._deptList = d;
  const form = adm ? `<div class="card"><h3>Add Department / Course</h3><div class="row">
    <div><label>Department / Course Name</label><input id="dn" placeholder="e.g. MCA"></div>
    <div><label>Duration (years)</label><input id="ddur" type="number" min="0.5" step="0.5" oninput="$('dsem').value = Math.round(this.value * 2) || ''"></div>
    <div><label>Total Semesters</label><input id="dsem" type="number" min="1"></div>
    <div><label>Fee per Year (₹)</label><input id="dfee" type="number" min="0"></div>
    <div><button onclick="addDept()">Add</button></div></div><div class="err" id="de"></div></div>` : '';
  return form + `<div class="card">${table(['ID', 'Department / Course', 'Duration', 'Total Semesters', 'Fee per Year', ...(adm ? ['Action'] : [])],
    d.map(x => `<tr><td>${x.id}</td><td>${x.name}</td><td id="dd_${x.id}">${x.durationYears ? fmtYears(x.durationYears) : '-'}</td><td id="ds_${x.id}">${x.semesters ?? '-'}</td><td id="df_${x.id}">${x.feePerYear ? money(x.feePerYear) : '-'}</td>${adm ? `<td id="da_${x.id}"><button class="sm" onclick="editDept(${x.id})">Edit</button> <button class="sm red" onclick="delDept(${x.id})">Delete</button></td>` : ''}</tr>`))}</div>`;
};
async function addDept() {
  const n = $('dn').value.trim(), y = +$('ddur').value, s = +$('dsem').value;
  if (!n) { $('de').textContent = 'Enter the department / course name'; return; }
  if (!(y > 0) || !(s > 0)) { $('de').textContent = 'Enter the duration and total semesters'; return; }
  await api('/departments', 'POST', { name: n, durationYears: y, semesters: s, feePerYear: +$('dfee').value || null });
  go(cur);
}
function editDept(id) {
  const d = window._deptList.find(x => x.id == id);
  $('dd_' + id).innerHTML = `<input id="ey_${id}" type="number" min="0.5" step="0.5" value="${d.durationYears ?? ''}" style="width:90px;margin:0" oninput="$('es_${id}').value = Math.round(this.value * 2) || ''">`;
  $('ds_' + id).innerHTML = `<input id="es_${id}" type="number" min="1" value="${d.semesters ?? ''}" style="width:90px;margin:0">`;
  $('df_' + id).innerHTML = `<input id="ef_${id}" type="number" min="0" value="${d.feePerYear ?? ''}" style="width:110px;margin:0">`;
  $('da_' + id).innerHTML = `<button class="sm green" onclick="saveDept(${id})">Save</button> <button class="sm" onclick="go(cur)">Cancel</button>`;
}
async function saveDept(id) {
  const d = window._deptList.find(x => x.id == id), y = +$('ey_' + id).value, s = +$('es_' + id).value;
  if (!(y > 0) || !(s > 0)) return alert('Enter valid duration and semesters');
  await api('/departments', 'POST', { id: d.id, name: d.name, durationYears: y, semesters: s, feePerYear: +$('ef_' + id).value || null });
  go(cur);
}
async function delDept(id) {
  if (!confirm('Delete this department?')) return;
  await api('/departments/' + id, 'DELETE'); go(cur);
}

// ===== Part 2 (Batch A): subjects, faculty, faculty attendance, hostel, ID card =====
document.head.insertAdjacentHTML('beforeend', '<style>.idcard{print-color-adjust:exact;-webkit-print-color-adjust:exact}.idcard td{border:0}</style>');
const enc = encodeURIComponent;
const sortBatches = a => a.sort((x, y) => x == 'Unassigned' ? 1 : y == 'Unassigned' ? -1 : y - x);
const subPage = (title, back, body) => { $('title').textContent = title; $('view').innerHTML = `<button class="sm" style="margin-bottom:16px" onclick="${back}">← Back</button><div id="subbody">${body}</div>`; };
const vb = s => `<span class="badge ${s}">${s == 'APPROVED' ? 'VERIFIED' : s}</span>`;
const myDept = async () => (await api('/departments')).find(x => x.name == me.department) || { name: me.department, semesters: 0 };

// ---- HOD: Subject Allocation (per semester, applies to all students of that semester) ----
VIEWS['Subject Allocation'] = async () => {
  const d = await myDept(), n = d.semesters || 0;
  if (!n) return '<div class="card">The total number of semesters is not set for your course. Ask the admin to set it in Department Management.</div>';
  const subs = await api('/subjects?course=' + enc(d.name)); window._subs = subs; window._sdept = d.name;
  let h = `<div class="card"><p>Course: <b>${d.name}</b>. Open a semester, fill in all its subjects and submit. They are allocated to every student of that semester.</p></div>`;
  for (let y = 0; y < Math.ceil(n / 2); y++) {
    const sems = [2 * y + 1, 2 * y + 2].filter(k => k <= n);
    h += `<h3 style="margin:18px 0 10px">Year ${y + 1}</h3><div class="dtiles">${sems.map(k => `<div class="tile" onclick="openSubSem(${k})"><span>📚</span>Semester ${k}<small>${subs.filter(s => s.semester == k).length} subjects</small></div>`).join('')}</div>`;
  }
  return h;
};
const subRow = v => `<div class="subrow" style="display:flex;gap:8px;margin-bottom:8px"><input class="subin" placeholder="Subject name" value="${(v || '').replace(/"/g, '&quot;')}" style="margin:0"><button class="sm red" onclick="this.parentElement.remove()">✖</button></div>`;
function openSubSem(k) {
  const cur = window._subs.filter(s => s.semester == k).map(s => s.name);
  subPage(`Subject Allocation › Semester ${k}`, "go('Subject Allocation')", `<div class="card"><h3>${window._sdept} — Semester ${k} (Year ${Math.ceil(k / 2)})</h3>
    <p style="color:#64748b;font-size:13px;margin-bottom:12px">Add every subject of this semester, then submit. All students of Semester ${k} will get these subjects.</p>
    <div id="subrows">${(cur.length ? cur : ['']).map(subRow).join('')}</div><button class="sm" onclick="addSubRow()">+ Add Subject</button>
    <div class="err" id="se"></div><div style="margin-top:16px"><button class="green" onclick="saveSubjects(${k})">Submit</button></div></div>`);
}
function addSubRow() { $('subrows').insertAdjacentHTML('beforeend', subRow('')); }
async function saveSubjects(k) {
  const names = [...document.querySelectorAll('.subin')].map(i => i.value.trim()).filter(Boolean);
  if (!names.length) { $('se').textContent = 'Add at least one subject'; return; }
  if (new Set(names.map(n => n.toLowerCase())).size != names.length) { $('se').textContent = 'Subject names must be different'; return; }
  await api('/subjects/bulk', 'POST', { course: window._sdept, semester: k, names });
  go('Subject Allocation');
}

// ---- HOD: Faculty Management (click a name to assign subjects) ----
const _facAdmin = VIEWS['Faculty Management'];
VIEWS['Faculty Management'] = async () => {
  if (me.role != 'HOD') return _facAdmin();
  const [f, subs] = await Promise.all([api('/users?role=FACULTY'), api('/subjects?course=' + enc(me.department))]);
  window._fac = f; window._subs = subs;
  return `<div class="card"><h3>Faculty — ${me.department}</h3><p style="color:#64748b;font-size:13px;margin-bottom:10px">Click a faculty name to assign the subjects they will teach.</p><input placeholder="🔍 Search / Filter..." onkeyup="flt(this)">${table(['Faculty ID', 'Name', 'Subjects Assigned'],
    f.map(u => `<tr><td><b>${u.username}</b></td><td><a href="#" onclick="openFaculty(${u.id});return false">${u.name}</a></td><td>${subs.filter(s => s.facultyUsername == u.username).length}</td></tr>`))}</div>`;
};
async function openFaculty(id) {
  const u = window._fac.find(x => x.id == id), subs = await api('/subjects?course=' + enc(me.department)); window._subs = subs;
  const mine = subs.filter(s => s.facultyUsername == u.username), free = subs.filter(s => s.facultyUsername != u.username);
  subPage(`Faculty Management › ${u.name}`, "go('Faculty Management')", `<div class="card"><h3>${u.name}</h3><p style="color:#64748b">${u.username} • ${u.department}</p></div>
    <div class="card"><h3>Assign a Subject</h3>${free.length ? `<div class="row"><div><label>Subject</label><select id="fsub">${free.map(s => `<option value="${s.id}">Semester ${s.semester} — ${s.name}${s.facultyName ? ' (now: ' + s.facultyName + ')' : ''}</option>`).join('')}</select></div><div><button onclick="assignSub(${u.id})">Assign</button></div></div>` : '<p>No subject is available. Create subjects in Subject Allocation first.</p>'}</div>
    <div class="card"><h3>Assigned Subjects</h3>${table(['Semester', 'Subject', 'Action'], mine.map(s => `<tr><td>${s.semester}</td><td>${s.name}</td><td><button class="sm red" onclick="unassignSub(${s.id},${u.id})">Remove</button></td></tr>`))}</div>`);
}
async function assignSub(uid) {
  const u = window._fac.find(x => x.id == uid);
  await api(`/subjects/${$('fsub').value}/faculty`, 'PUT', { facultyUsername: u.username, facultyName: u.name }); openFaculty(uid);
}
async function unassignSub(sid, uid) { await api(`/subjects/${sid}/faculty`, 'PUT', { facultyUsername: '', facultyName: '' }); openFaculty(uid); }

// ---- Student / Faculty: My Subjects ----
VIEWS['My Subjects'] = async () => {
  if (me.role == 'STUDENT') {
    const p = await api('/students/' + me.id), subs = (await api('/subjects?course=' + enc(p.department))).filter(s => s.semester == p.semester);
    return `<div class="card"><h3>${p.department} — ${p.semester ? 'Semester ' + p.semester : 'Semester not set'}</h3>${p.semester ? table(['Subject', 'Faculty'], subs.map(s => `<tr><td>${s.name}</td><td>${s.facultyName || '-'}</td></tr>`)) : ''}</div>`;
  }
  const subs = (await api('/subjects?course=' + enc(me.department))).filter(s => s.facultyUsername == me.username);
  return `<div class="card"><h3>Subjects assigned to me</h3>${table(['Semester', 'Subject'], subs.map(s => `<tr><td>${s.semester}</td><td>${s.name}</td></tr>`))}</div>`;
};

// ---- Faculty attendance: faculty marks, HOD verifies or rejects ----
const today = () => new Date().toISOString().slice(0, 10);
VIEWS['Mark My Attendance'] = async () => {
  const mine = (await api('/records?module=FacultyAttendance')).filter(r => r.owner == me.username).map(r => ({ ...r, d: JSON.parse(r.data || '{}') })).sort((a, b) => b.id - a.id);
  const done = mine.some(r => r.d.date == today());
  return `<div class="card"><h3>Today: ${today()}</h3>${done ? '<p>✅ Your attendance for today is already submitted.</p>' : '<button class="green" onclick="markFac()">Mark Present</button>'}<p style="font-size:13px;color:#64748b;margin-top:8px">Your HOD verifies every entry.</p></div>
    <div class="card"><h3>My Records</h3>${table(['Date', 'Time', 'Status'], mine.map(r => `<tr><td>${r.d.date}</td><td>${r.d.time || '-'}</td><td>${vb(r.status)}</td></tr>`))}</div>`;
};
async function markFac() {
  await api('/records', 'POST', { module: 'FacultyAttendance', owner: me.username, ownerName: me.name, ownerRole: me.role, data: JSON.stringify({ faculty_username: me.username, date: today(), time: new Date().toTimeString().slice(0, 5) }) });
  go(cur);
}
VIEWS['Faculty Attendance'] = async () => {
  const rs = (await api('/records?module=FacultyAttendance')).map(r => ({ ...r, d: JSON.parse(r.data || '{}') })).sort((a, b) => b.id - a.id);
  return `<div class="grid"><div class="stat"><b>${rs.filter(r => r.status == 'PENDING').length}</b><small>Waiting for verification</small></div></div><div class="card"><input placeholder="🔍 Search / Filter..." onkeyup="flt(this)">${table(['Date', 'Time', 'Faculty ID', 'Name', 'Status', 'Action'],
    rs.map(r => `<tr><td>${r.d.date}</td><td>${r.d.time || '-'}</td><td>${r.d.faculty_username}</td><td>${r.ownerName}</td><td>${vb(r.status)}</td><td>${r.status == 'PENDING' ? `<button class="sm green" onclick="facAtt(${r.id},'APPROVED')">Verify</button> <button class="sm red" onclick="facAtt(${r.id},'REJECTED')">Reject</button>` : '-'}</td></tr>`))}</div>`;
};
async function facAtt(id, s) { await api(`/records/${id}/status/${s}`, 'PUT'); go(cur); }

// ---- Hostel: opted in from the student profile; warden allots rooms; HOD and Admin see them ----
VIEWS['Hostel Management'] = async () => {
  if (me.role == 'STUDENT') {
    const p = await api('/students/' + me.id);
    return `<div class="card"><h3>My Hostel</h3><table class="dl"><tr><td>Hostel required</td><td>${p.hostelRequired ? 'Yes' : 'No'}</td></tr><tr><td>Room No</td><td>${p.roomNo || (p.hostelRequired ? 'Not allotted yet' : '-')}</td></tr></table></div>`;
  }
  const st = (await api('/users?role=STUDENT')).filter(s => s.hostelRequired);
  window._hst = st; window._hb = sortBatches([...new Set(st.map(batchOf))]);
  return `<div class="dtiles">${window._hb.map((b, i) => `<div class="tile" onclick="openHostelBatch(${i})"><span>🛏️</span>${bl(b)}<small>${st.filter(s => batchOf(s) == b).length} students</small></div>`).join('') || '<div class="card">No student has opted for the hostel yet. The admin sets this in the student profile (Edit).</div>'}</div>`;
};
function openHostelBatch(i) {
  const b = window._hb[i], w = me.role == 'WARDEN', r = window._hst.filter(s => batchOf(s) == b);
  subPage(`Hostel Management › ${bl(b)}`, "go('Hostel Management')", `<div class="card"><h3>${bl(b)} — ${r.length} Student(s)</h3><input placeholder="🔍 Search / Filter..." onkeyup="flt(this)">${table(['Student ID', 'Name', 'Course', 'Academic Session', 'Room No'],
    r.map(s => `<tr><td><b>${s.username}</b></td><td>${s.name}</td><td>${s.department}</td><td>${s.academicSession || '-'}</td><td>${w ? `<div style="display:flex;gap:6px;align-items:center"><input id="room_${s.id}" value="${s.roomNo || ''}" placeholder="Room no" style="margin:0;width:110px"><button class="sm green" onclick="saveRoom(${s.id})">Save</button><span id="rs_${s.id}"></span></div>` : (s.roomNo || '<i>Not allotted</i>')}</td></tr>`))}</div>`);
}
async function saveRoom(id) {
  const v = $('room_' + id).value.trim();
  await api('/students/' + id, 'PUT', { roomNo: v }); $('rs_' + id).textContent = '✓ Saved';
}

// ---- Student ID card: name, academic session, student ID, course ----
VIEWS['Digital Student ID Card'] = async () => {
  const p = await api('/students/' + me.id);
  const pic = p.photo ? `<img src="${p.photo}" style="width:90px;height:110px;object-fit:cover;border-radius:8px;border:3px solid #fff;display:block;margin:10px auto">` : `<div class="av">${p.name[0]}</div>`;
  const r = (l, v) => `<tr><td style="padding:3px 10px;color:#bfdbfe">${l}</td><td style="padding:3px 0">${v || '-'}</td></tr>`;
  return `<div class="idcard"><h3>🎓 Smart Campus</h3>${pic}<h2>${p.name}</h2><table style="color:#fff;font-size:14px;margin:8px auto;text-align:left">${r('Student ID', p.username)}${r('Course', p.department)}${r('Academic Session', p.academicSession)}</table></div><br><button onclick="window.print()">🖨️ Print</button>`;
};

// ---- Menus: remove Department Management from HOD/Faculty, add the new pages ----
MENU.HOD = MENU.HOD.filter(t => t != 'Department Management');
MENU.FACULTY = MENU.FACULTY.filter(t => t != 'Department Management');
if (!MENU.FACULTY.includes('Mark My Attendance')) MENU.FACULTY.splice(MENU.FACULTY.indexOf('Dashboard') + 1, 0, 'Mark My Attendance');
if (!MENU.HOD.includes('Hostel Management')) MENU.HOD.splice(MENU.HOD.indexOf('Library Management') + 1, 0, 'Hostel Management');
$('menu').innerHTML = MENU[me.role].map(t => t[0] == '#' ? `<div class="grp">${t.slice(1)}</div>` : `<a data-t="${t}" onclick="go(this.dataset.t)">${t}</a>`).join('');
document.querySelectorAll('#menu a').forEach(a => a.classList.toggle('on', a.dataset.t == cur));

// ===== Part 3 (Batch B): Fee Management + Library =====
document.head.insertAdjacentHTML('beforeend', '<style>.RETURNED{background:#e0e7ff;color:#3730a3}.OVERDUE{background:#fee2e2;color:#991b1b}</style>');
const money = v => '₹' + Math.round(+v || 0).toLocaleString('en-IN');
const paidOf = f => f.paidAmount ?? (f.paid ? f.amount : 0);
const yearOf = (f, s) => f.year || (s && s.semester ? Math.ceil(s.semester / 2) : 1);
const ord = n => n + (n == 1 ? 'st' : n == 2 ? 'nd' : n == 3 ? 'rd' : 'th');
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const sendMsg = (to, message) => api('/records', 'POST', { module: 'Msg', owner: me.username, ownerName: me.name, ownerRole: me.role, data: JSON.stringify({ to, message }) });

// ---- Fee Management: Batch > Course > Year > students (highest pending first) ----
async function loadFees() {
  const [st, fees, pays, deps] = await Promise.all([api('/users?role=STUDENT'), api('/fees'), api('/payments'), api('/departments')]);
  window._fst = st; window._fees = fees; window._pays = pays; window._fdeps = deps;
  window._fb = sortBatches([...new Set(st.map(batchOf))]);
}
VIEWS['Fee Management'] = async () => {
  await loadFees(); window._fnav = {};
  return `<div class="dtiles">${window._fb.map((b, i) => `<div class="tile" onclick="feeBatch(${i})"><span>🎓</span>${bl(b)}<small>${window._fst.filter(s => batchOf(s) == b).length} students</small></div>`).join('') || '<div class="card">No students yet</div>'}</div>`;
};
VIEWS['Student Fee Management'] = () => VIEWS['Fee Management']();
function feeSum(s, y) {
  const fs = window._fees.filter(f => f.studentUsername == s.username && yearOf(f, s) == y);
  const total = fs.reduce((t, f) => t + f.amount, 0), paid = fs.reduce((t, f) => t + paidOf(f), 0);
  const due = fs.filter(f => paidOf(f) < f.amount).map(f => f.dueDate).filter(Boolean).sort()[0] || '';
  const modes = [...new Set(window._pays.filter(p => fs.some(f => f.id == p.feeId)).map(p => p.mode))].join(', ');
  return { s, total, paid, pend: total - paid, due, modes, n: fs.length };
}
const feeBatch = i => feeBatchK(window._fb[i]);
function feeBatchK(b) {
  window._fnav = { b };
  const st = window._fst.filter(s => batchOf(s) == b);
  subPage(`Fee Management › ${bl(b)}`, "go('Fee Management')", `<div class="dtiles">${window._fdeps.map((d, c) => `<div class="tile" onclick="feeCourse(${c})"><span>🏛️</span>${d.name}<small>${st.filter(s => s.department == d.name).length} students</small></div>`).join('') || '<div class="card">No course found</div>'}</div>`);
}
const feeCourse = c => feeCourseK(window._fnav.b, window._fdeps[c].name);
function feeCourseK(b, name) {
  window._fnav = { b, c: name };
  const d = window._fdeps.find(x => x.name == name) || {}, st = window._fst.filter(s => batchOf(s) == b && s.department == name);
  const years = Math.max(1, Math.ceil((d.semesters || 2) / 2));
  subPage(`Fee Management › ${bl(b)} › ${name}`, "feeBack('batch')", `<div class="dtiles">${Array.from({ length: years }, (_, y) => y + 1).map(y => `<div class="tile" onclick="feeYear(${y})"><span>📅</span>${ord(y)} Year<small>${st.filter(s => feeSum(s, y).pend > 0).length} with pending fee</small></div>`).join('')}</div>`);
}
const feeYear = y => feeYearK(window._fnav.b, window._fnav.c, y);
function feeYearK(b, name, y) {
  window._fnav = { b, c: name, y };
  const T = today(), rows = window._fst.filter(s => batchOf(s) == b && s.department == name).map(s => feeSum(s, y)).sort((a, z) => z.pend - a.pend);
  const status = r => !r.n ? '<span class="badge">No fee</span>' : r.pend <= 0 ? '<span class="badge APPROVED">Paid</span>' : r.due && r.due < T ? '<span class="badge OVERDUE">Overdue</span>' : '<span class="badge PENDING">Pending</span>';
  subPage(`Fee Management › ${bl(b)} › ${name} › ${ord(y)} Year`, "feeBack('course')", `<div class="grid"><div class="stat"><b>${money(rows.reduce((t, r) => t + r.pend, 0))}</b><small>Total pending</small></div><div class="stat"><b>${money(rows.reduce((t, r) => t + r.paid, 0))}</b><small>Total collected</small></div><div class="stat"><b>${rows.filter(r => r.pend > 0).length}</b><small>Students with pending fee</small></div></div>
    <div class="card"><h3>${name} — ${ord(y)} Year (highest pending first)</h3><input placeholder="🔍 Search / Filter..." onkeyup="flt(this)">${table(['Student ID', 'Name', 'Total Fee', 'Paid', 'Pending', 'Due Date', 'Mode', 'Status', 'Action'],
      rows.map(r => `<tr><td><b>${r.s.username}</b></td><td><a href="#" onclick="openFeeStudent('${r.s.username}');return false">${r.s.name}</a></td><td>${money(r.total)}</td><td>${money(r.paid)}</td><td><b>${money(r.pend)}</b></td><td>${r.due || '-'}</td><td>${r.modes || '-'}</td><td>${status(r)}</td><td>${r.pend > 0 ? `<button class="sm" onclick="remindFee('${r.s.username}',${r.pend},'${r.due}',this)">🔔 Remind</button>` : '-'}</td></tr>`))}</div>`);
}
async function feeBack(l) {
  const n = window._fnav; await loadFees();
  if (l == 'batch') feeBatchK(n.b); else if (l == 'course') feeCourseK(n.b, n.c); else feeYearK(n.b, n.c, n.y);
}
async function remindFee(u, pend, due, btn) {
  await sendMsg(u, `Fee reminder: ${money(pend)} is pending${due ? ' (due by ' + due + ')' : ''}. Please pay it soon.`);
  btn.textContent = '✓ Sent'; btn.disabled = true;
}
async function openFeeStudent(u) {
  await loadFees();
  const s = window._fst.find(x => x.username == u), fs = window._fees.filter(f => f.studentUsername == u), ps = window._pays.filter(p => p.studentUsername == u).sort((a, z) => z.id - a.id);
  const canPay = ['ADMIN', 'ACCOUNTS'].includes(me.role), open = fs.filter(f => paidOf(f) < f.amount), yr = s.semester ? Math.ceil(s.semester / 2) : 1;
  subPage(`Fee Management › ${s.name}`, "feeBack('year')", `<div class="card"><h3>${s.name}</h3><p style="color:#64748b">${s.username} • ${s.department} • ${s.academicSession ? 'Session ' + s.academicSession : bl(batchOf(s))}</p></div>
    <div class="card"><h3>Fee Records</h3>${table(['Year', 'Fee', 'Amount', 'Paid', 'Pending', 'Due Date'], fs.map(f => `<tr><td>${yearOf(f, s)}</td><td>${f.title}</td><td>${money(f.amount)}</td><td>${money(paidOf(f))}</td><td>${money(f.amount - paidOf(f))}</td><td>${f.dueDate || '-'}</td></tr>`))}</div>
    <div class="card"><h3>Payments</h3>${table(['Date', 'Fee', 'Amount', 'Mode'], ps.map(p => `<tr><td>${p.date}</td><td>${p.feeTitle || '-'}</td><td>${money(p.amount)}</td><td>${p.mode}</td></tr>`))}</div>
    ${canPay ? `<div class="card"><h3>Record a Payment</h3>${open.length ? `<div class="row"><div><label>Fee</label><select id="pf">${open.map(f => `<option value="${f.id}">${f.title} — pending ${money(f.amount - paidOf(f))}</option>`).join('')}</select></div><div><label>Amount (₹)</label><input id="pa" type="number" min="1"></div><div><label>Mode</label><select id="pm">${['Cash', 'UPI', 'Cheque', 'Bank Transfer', 'Demand Draft'].map(m => `<option>${m}</option>`).join('')}</select></div><div><button class="green" onclick="recordPay('${u}')">Save</button></div></div><div class="err" id="pe"></div>` : '<p>No pending fee.</p>'}</div>
    <div class="card"><h3>Add a Fee</h3><div class="row"><div><label>Title</label><input id="af_t" placeholder="e.g. Exam Fee"></div><div><label>Year</label><input id="af_y" type="number" min="1" value="${yr}"></div><div><label>Amount (₹)</label><input id="af_a" type="number" min="1"></div><div><label>Due Date</label><input id="af_d" type="date"></div><div><button onclick="addFeeFor('${u}')">Add</button></div></div><div class="err" id="ae"></div></div>` : ''}`);
}
async function recordPay(u) {
  try { await api(`/fees/${$('pf').value}/payments`, 'POST', { amount: $('pa').value, mode: $('pm').value, receivedBy: me.name }); openFeeStudent(u); }
  catch (e) { $('pe').textContent = e.error || 'Could not save the payment'; }
}
async function addFeeFor(u) {
  const t = $('af_t').value.trim(), y = +$('af_y').value, a = +$('af_a').value, d = $('af_d').value;
  if (!t || !(y >= 1) || !(a > 0) || !d) { $('ae').textContent = 'Enter the title, year, amount and due date'; return; }
  await api('/fees', 'POST', { studentUsername: u, title: t, year: y, amount: a, dueDate: d, paidAmount: 0, paid: false }); openFeeStudent(u);
}

// ---- Student: own fees + online payment ----
VIEWS['Fee Details & Payment'] = async () => {
  const [fs, ps] = await Promise.all([api('/fees?student=' + me.username), api('/payments?student=' + me.username)]);
  const open = fs.filter(f => paidOf(f) < f.amount), T = today(), tot = fs.reduce((t, f) => t + f.amount, 0), paid = fs.reduce((t, f) => t + paidOf(f), 0);
  return `<div class="grid"><div class="stat"><b>${money(tot)}</b><small>Total fee</small></div><div class="stat"><b>${money(paid)}</b><small>Paid</small></div><div class="stat"><b>${money(tot - paid)}</b><small>Pending</small></div></div>
    <div class="card"><h3>My Fees</h3>${table(['Year', 'Fee', 'Amount', 'Paid', 'Pending', 'Pay By', 'Status'], fs.map(f => { const p = f.amount - paidOf(f); return `<tr><td>${f.year || '-'}</td><td>${f.title}</td><td>${money(f.amount)}</td><td>${money(paidOf(f))}</td><td>${money(p)}</td><td>${f.dueDate || '-'}</td><td>${p <= 0 ? '<span class="badge APPROVED">Paid</span>' : f.dueDate && f.dueDate < T ? '<span class="badge OVERDUE">Overdue</span>' : '<span class="badge PENDING">Pending</span>'}</td></tr>`; }))}</div>
    <div class="card"><h3>Pay Online</h3>${open.length ? `<p style="color:#64748b;font-size:13px;margin-bottom:10px">Demo payment. No real money is charged.</p><div class="row"><div><label>Fee</label><select id="myfee" onchange="$('myamt').value = this.selectedOptions[0].dataset.p">${open.map(f => `<option value="${f.id}" data-p="${f.amount - paidOf(f)}">${f.title} — pending ${money(f.amount - paidOf(f))}</option>`).join('')}</select></div><div><label>Amount (₹)</label><input id="myamt" type="number" min="1" value="${open[0].amount - paidOf(open[0])}"></div><div><button class="green" onclick="payOnline()">Pay Online</button></div></div><div class="err" id="mye"></div>` : '<p>You have no pending fee. 🎉</p>'}</div>
    <div class="card"><h3>My Payments</h3>${table(['Date', 'Fee', 'Amount', 'Mode'], ps.sort((a, z) => z.id - a.id).map(p => `<tr><td>${p.date}</td><td>${p.feeTitle || '-'}</td><td>${money(p.amount)}</td><td>${p.mode}</td></tr>`))}</div>`;
};
async function payOnline() {
  try { await api(`/fees/${$('myfee').value}/payments`, 'POST', { amount: $('myamt').value, mode: 'Online (Student Portal)', receivedBy: me.name }); go(cur); }
  catch (e) { $('mye').textContent = e.error || 'Payment failed'; }
}

// ---- Accounts: payment lists, due report, financial report ----
const payList = (filter, receipt) => async () => {
  const ps = (await api('/payments')).filter(filter).sort((a, b) => b.id - a.id); window._pp = ps;
  return `<div class="grid"><div class="stat"><b>${money(ps.reduce((t, p) => t + p.amount, 0))}</b><small>Total</small></div><div class="stat"><b>${ps.length}</b><small>Payments</small></div></div><div class="card"><input placeholder="🔍 Search / Filter..." onkeyup="flt(this)">${table(['Date', 'Student', 'Fee', 'Amount', 'Mode', ...(receipt ? ['Receipt'] : [])],
    ps.map(p => `<tr><td>${p.date}</td><td>${p.studentName || p.studentUsername}</td><td>${p.feeTitle || '-'}</td><td>${money(p.amount)}</td><td>${p.mode}</td>${receipt ? `<td><button class="sm" onclick="receiptPay(${p.id})">Print</button></td>` : ''}</tr>`))}</div>`;
};
VIEWS['Fee Collection Records'] = payList(() => true);
VIEWS['Online Fee Payment Records'] = payList(p => /^Online/.test(p.mode || ''));
VIEWS['Payment Receipts'] = payList(() => true, true);
function receiptPay(id) {
  const p = window._pp.find(x => x.id == id), w = window.open('', '_blank');
  w.document.write(`<div style="font-family:sans-serif;max-width:420px;margin:30px auto;border:2px solid #1e3a8a;padding:24px"><h2>🎓 Smart Campus - Payment Receipt</h2><p>Receipt No: ${p.id}</p><p>Date: ${p.date}</p><p>Student: ${p.studentName || p.studentUsername}</p><p>Fee: ${p.feeTitle || '-'}</p><p>Mode: ${p.mode}</p><h3>Amount Paid: ${money(p.amount)}</h3></div>`); w.print();
}
VIEWS['Fee Due & Pending Reports'] = async () => {
  await loadFees();
  const rows = window._fst.map(s => { const fs = window._fees.filter(f => f.studentUsername == s.username); return { s, pend: fs.reduce((t, f) => t + f.amount - paidOf(f), 0), due: fs.filter(f => paidOf(f) < f.amount).map(f => f.dueDate).filter(Boolean).sort()[0] || '' }; }).filter(r => r.pend > 0).sort((a, b) => b.pend - a.pend);
  return `<div class="grid"><div class="stat"><b>${money(rows.reduce((t, r) => t + r.pend, 0))}</b><small>Total pending</small></div><div class="stat"><b>${rows.length}</b><small>Students</small></div></div><div class="card"><input placeholder="🔍 Search / Filter..." onkeyup="flt(this)">${table(['Student ID', 'Name', 'Course', 'Pending', 'Due Date', 'Action'],
    rows.map(r => `<tr><td><b>${r.s.username}</b></td><td>${r.s.name}</td><td>${r.s.department}</td><td><b>${money(r.pend)}</b></td><td>${r.due || '-'}</td><td><button class="sm" onclick="remindFee('${r.s.username}',${r.pend},'${r.due}',this)">🔔 Remind</button></td></tr>`))}</div>`;
};
VIEWS['Financial Reports'] = VIEWS['Income & Expenditure Reports'] = async () => {
  const [f, ex, s1, s2] = await Promise.all([api('/fees'), ...['Expense', 'EmpSalary', 'FacSalary'].map(k => api('/records?module=' + k))]);
  const sum = a => a.reduce((s, r) => s + (+JSON.parse(r.data).amount || 0), 0);
  const inc = f.reduce((t, x) => t + paidOf(x), 0), due = f.reduce((t, x) => t + x.amount - paidOf(x), 0), exp = sum(ex), sal = sum(s1) + sum(s2);
  const st = (v, l) => `<div class="stat"><b>${money(v)}</b><small>${l}</small></div>`;
  return `<div class="grid">${st(inc, 'Fee Income')}${st(due, 'Fees Pending')}${st(exp, 'Expenses')}${st(sal, 'Salaries')}${st(inc - exp - sal, 'Net Balance')}</div>`;
};

// ---- Library: student requests, librarian decides (50% fee rule), HOD tracks, admin sees totals ----
const LS = { PENDING: 'Pending', APPROVED: 'Issued', REJECTED: 'Rejected', RETURNED: 'Returned' };
const lb = (s, over) => `<span class="badge ${over ? 'OVERDUE' : s}">${over ? 'Overdue' : LS[s] || s}</span>`;
const libRecs = async () => (await api('/records?module=BookRequest')).map(r => ({ ...r, d: JSON.parse(r.data || '{}') })).sort((a, b) => b.id - a.id);
VIEWS['Library Management'] = async () => {
  const rs = await libRecs();
  if (me.role == 'STUDENT') return libStudent(rs.filter(r => r.owner == me.username));
  if (me.role == 'LIBRARIAN') return libLibrarian(rs);
  if (me.role == 'HOD') return libHod(rs);
  return libAdmin(rs);
};
function libStudent(mine) {
  return `<div class="card"><h3>Request a Book</h3><div class="row"><div><label>Book Title</label><input id="lb_t"></div><div><label>Days needed</label><input id="lb_d" type="number" min="1" max="60" value="7"></div><div><button onclick="reqBook()">Send Request</button></div></div><div class="err" id="lb_e"></div></div>
    <div class="card"><h3>My Requests</h3>${table(['Requested', 'Book', 'Days', 'Status', 'Due Date', 'Note'], mine.map(r => `<tr><td>${r.d.requested}</td><td>${r.d.book}</td><td>${r.d.days}</td><td>${lb(r.status, r.status == 'APPROVED' && r.d.due < today())}</td><td>${r.d.due || '-'}</td><td>${r.d.note || '-'}</td></tr>`))}</div>`;
}
async function reqBook() {
  const t = $('lb_t').value.trim(), n = +$('lb_d').value;
  if (!t) { $('lb_e').textContent = 'Enter the book title'; return; }
  if (!(n >= 1 && n <= 60)) { $('lb_e').textContent = 'Days must be between 1 and 60'; return; }
  await api('/records', 'POST', { module: 'BookRequest', owner: me.username, ownerName: me.name, ownerRole: me.role, data: JSON.stringify({ student: me.username, book: t, days: n, course: me.department, requested: today() }) });
  go(cur);
}
async function libLibrarian(rs) {
  const [fees, users] = await Promise.all([api('/fees'), api('/users?role=STUDENT')]);
  window._lib = rs;
  const info = u => { const fs = fees.filter(f => f.studentUsername == u), total = fs.reduce((t, f) => t + f.amount, 0), paid = fs.reduce((t, f) => t + paidOf(f), 0); return { total, paid, pend: total - paid, pct: total ? Math.round(paid * 100 / total) : 100 }; };
  const nm = u => (users.find(x => x.username == u) || {}).name || u, T = today();
  const pend = rs.filter(r => r.status == 'PENDING'), out = rs.filter(r => r.status == 'APPROVED');
  return `<div class="card"><h3>Pending Requests (${pend.length})</h3><p style="color:#64748b;font-size:13px;margin-bottom:8px">A request can be accepted only when at least 50% of the student's fee is paid.</p>${table(['Student', 'Course', 'Book', 'Days', 'Fee Paid', 'Fee Pending', 'Paid %', 'Action'], pend.map(r => { const i = info(r.d.student), ok = i.pct >= 50; return `<tr><td>${nm(r.d.student)} <small>(${r.d.student})</small></td><td>${r.d.course || '-'}</td><td>${r.d.book}</td><td>${r.d.days}</td><td>${money(i.paid)} of ${money(i.total)}</td><td>${money(i.pend)}</td><td><span class="badge ${ok ? 'APPROVED' : 'REJECTED'}">${i.pct}%</span></td><td>${ok ? `<button class="sm green" onclick="libDecide(${r.id},'APPROVED',${i.pct})">Accept</button> ` : ''}<button class="sm red" onclick="libDecide(${r.id},'REJECTED',${i.pct})">Reject</button></td></tr>`; }))}</div>
    <div class="card"><h3>Issued Books (${out.length})</h3>${table(['Student', 'Book', 'Issued On', 'Due Date', 'Status', 'Action'], out.map(r => `<tr><td>${nm(r.d.student)}</td><td>${r.d.book}</td><td>${r.d.issued}</td><td>${r.d.due}</td><td>${lb(r.status, r.d.due < T)}</td><td><button class="sm" onclick="libReturn(${r.id})">Mark Returned</button></td></tr>`))}</div>
    <div class="card"><h3>History</h3>${table(['Student', 'Book', 'Status', 'Note'], rs.filter(r => r.status == 'REJECTED' || r.status == 'RETURNED').map(r => `<tr><td>${nm(r.d.student)}</td><td>${r.d.book}</td><td>${lb(r.status)}</td><td>${r.d.note || r.d.returned || '-'}</td></tr>`))}</div>`;
}
async function libDecide(id, st, pct) {
  const r = window._lib.find(x => x.id == id), d = { ...r.d };
  if (st == 'APPROVED') { d.issued = today(); d.due = addDays(d.issued, +d.days); } else d.note = pct < 50 ? 'Less than 50% of the fee is paid' : 'Rejected by the librarian';
  await api(`/records/${id}/data`, 'PUT', { data: JSON.stringify(d) });
  await api(`/records/${id}/status/${st}`, 'PUT'); go(cur);
}
async function libReturn(id) {
  const r = window._lib.find(x => x.id == id);
  await api(`/records/${id}/data`, 'PUT', { data: JSON.stringify({ ...r.d, returned: today() }) });
  await api(`/records/${id}/status/RETURNED`, 'PUT'); go(cur);
}
function libHod(rs) {
  const T = today(), taken = rs.filter(r => r.status == 'APPROVED' || r.status == 'RETURNED'), act = rs.filter(r => r.status == 'APPROVED');
  return `<div class="grid"><div class="stat"><b>${act.length}</b><small>Books with students</small></div><div class="stat"><b>${act.filter(r => r.d.due < T).length}</b><small>Overdue</small></div></div><div class="card"><h3>Books taken by ${me.department} students</h3><input placeholder="🔍 Search / Filter..." onkeyup="flt(this)">${table(['Student ID', 'Student', 'Book', 'Issued On', 'Due Date', 'Status', 'Action'],
    taken.map(r => `<tr><td>${r.d.student}</td><td>${r.ownerName}</td><td>${r.d.book}</td><td>${r.d.issued}</td><td>${r.d.due}</td><td>${lb(r.status, r.status == 'APPROVED' && r.d.due < T)}</td><td>${r.status == 'APPROVED' ? `<button class="sm" onclick="remindBook('${r.d.student}','${r.d.book.replace(/['"]/g, '')}','${r.d.due}',this)">🔔 Remind</button>` : '-'}</td></tr>`))}</div>`;
}
async function remindBook(u, book, due, btn) {
  await sendMsg(u, `Library reminder: please return "${book}" (due ${due}).`); btn.textContent = '✓ Sent'; btn.disabled = true;
}
async function libAdmin(rs) {
  const deps = await api('/departments');
  const rows = deps.map(d => { const x = rs.filter(r => r.d.course == d.name); return { n: d.name, issued: x.filter(r => r.status == 'APPROVED' || r.status == 'RETURNED').length, now: x.filter(r => r.status == 'APPROVED').length, req: x.filter(r => r.status == 'PENDING').length }; });
  const t = k => rows.reduce((s, r) => s + r[k], 0);
  return `<div class="grid"><div class="stat"><b>${t('issued')}</b><small>Total books issued</small></div><div class="stat"><b>${t('now')}</b><small>Currently with students</small></div><div class="stat"><b>${t('req')}</b><small>Pending requests</small></div></div><div class="card"><h3>Books issued, course-wise</h3>${table(['Course', 'Total books issued', 'Currently with students', 'Pending requests'], rows.map(r => `<tr><td><b>${r.n}</b></td><td>${r.issued}</td><td>${r.now}</td><td>${r.req}</td></tr>`))}</div>`;
}

// ---- Menus ----
if (!MENU.HOD.includes('Fee Management')) MENU.HOD.splice(MENU.HOD.indexOf('Student Management') + 1, 0, 'Fee Management');
$('menu').innerHTML = MENU[me.role].map(t => t[0] == '#' ? `<div class="grp">${t.slice(1)}</div>` : `<a data-t="${t}" onclick="go(this.dataset.t)">${t}</a>`).join('');
document.querySelectorAll('#menu a').forEach(a => a.classList.toggle('on', a.dataset.t == cur));

// ===== Part 4 (Batch C): marks, results, semester promotion, resumes =====
document.head.insertAdjacentHTML('beforeend', '<style>.sheet table{font-size:13px}@media print{.noprint{display:none!important}}</style>');
const COMP = { INTERNAL_THEORY: 'Internal Theory', INTERNAL_PRACTICAL: 'Internal Practical', EXTERNAL_THEORY: 'External Theory', EXTERNAL_PRACTICAL: 'External Practical' };
const CK = Object.keys(COMP);
const mcell = m => m ? `${m.marks}/${m.maxMarks}` : '-';
function sheetHtml(title, ms, showStatus) {
  const o = {}; ms.forEach(m => { (o[m.subject] = o[m.subject] || {})[m.component] = m; });
  let T = 0, M = 0;
  const rows = Object.entries(o).map(([sub, c]) => {
    const all = Object.values(c), t = all.reduce((a, m) => a + m.marks, 0), x = all.reduce((a, m) => a + m.maxMarks, 0); T += t; M += x;
    return `<tr><td><b>${sub}</b></td>${CK.map(k => `<td>${mcell(c[k])}${showStatus && c[k] && c[k].status != 'VERIFIED' ? ' <small>(' + c[k].status.toLowerCase() + ')</small>' : ''}</td>`).join('')}<td><b>${t}/${x}</b></td><td>${x ? Math.round(t * 100 / x) + '%' : '-'}</td></tr>`;
  });
  return { T, M, html: `<div class="card sheet"><h3>${title}</h3>${table(['Subject', ...Object.values(COMP), 'Total', '%'], rows)}${M ? `<p style="margin-top:10px"><b>Total: ${T} / ${M} (${Math.round(T * 100 / M)}%)</b></p>` : ''}</div>` };
}
const chip = (v, p) => `${v ? `<span class="badge APPROVED">${v} verified</span> ` : ''}${p ? `<span class="badge PENDING">${p} pending</span>` : ''}${!v && !p ? '-' : ''}`;

// ---- Faculty: enter internal theory / internal practical marks of own subjects ----
VIEWS['Marks Management'] = async () => {
  const [subs, st] = await Promise.all([api('/subjects?course=' + enc(me.department)), api('/users?role=STUDENT')]);
  const mine = subs.filter(s => s.facultyUsername == me.username);
  if (!mine.length) return '<div class="card">No subject is assigned to you yet. Ask your HOD to assign subjects in Faculty Management.</div>';
  const sems = [...new Set(mine.map(s => s.semester))].sort((a, z) => a - z), sts = st.filter(s => sems.includes(s.semester));
  window._fm = { mine, sems, sts, batches: sortBatches([...new Set(sts.map(batchOf))]) };
  return `<div class="card"><p>Enter the <b>internal theory</b> and <b>internal practical</b> marks of your subjects. Your HOD verifies them before students can see them.</p></div><div class="dtiles">${window._fm.batches.map((b, i) => `<div class="tile" onclick="fmBatch(${i})"><span>🎓</span>${bl(b)}<small>${sts.filter(s => batchOf(s) == b).length} students</small></div>`).join('') || '<div class="card">No students are in your semesters yet.</div>'}</div>`;
};
const fmBatch = i => fmBatchK(window._fm.batches[i]);
function fmBatchK(b) {
  window._fmn = { b }; const F = window._fm;
  subPage(`Marks Management › ${bl(b)}`, "go('Marks Management')", `<div class="dtiles">${F.sems.map(k => `<div class="tile" onclick="fmSem(${k})"><span>📘</span>Semester ${k}<small>${F.sts.filter(s => batchOf(s) == b && s.semester == k).length} students • ${F.mine.filter(s => s.semester == k).length} of my subjects</small></div>`).join('')}</div>`);
}
async function fmSem(k) {
  const b = window._fmn.b, subs = window._fm.mine.filter(s => s.semester == k); window._fmn = { b, k };
  subPage(`Marks Management › ${bl(b)} › Semester ${k}`, "fmBatchK(window._fmn.b)", `<div class="card"><div class="row"><div><label>Subject</label><select id="fm_sub" onchange="fmRender()">${subs.map(s => `<option>${s.name}</option>`).join('')}</select></div><div><label>Internal Theory — max marks</label><input id="fm_tm" type="number" min="1" value="30"></div><div><label>Internal Practical — max marks</label><input id="fm_pm" type="number" min="1" value="25"></div></div></div><div id="fm_tbl"></div>`);
  await fmRender();
}
async function fmRender() {
  const b = window._fmn.b, k = window._fmn.k, sub = $('fm_sub').value;
  const ms = (await api(`/marks?course=${enc(me.department)}&semester=${k}&kind=INTERNAL`)).filter(m => m.subject == sub);
  const rows = window._fm.sts.filter(s => batchOf(s) == b && s.semester == k).map(s => {
    const t = ms.find(m => m.studentUsername == s.username && m.component == 'INTERNAL_THEORY'), q = ms.find(m => m.studentUsername == s.username && m.component == 'INTERNAL_PRACTICAL');
    const inp = (id, m) => m && m.status == 'VERIFIED' ? `${m.marks}/${m.maxMarks}` : `<input id="${id}_${s.username}" type="number" min="0" step="0.5" value="${m ? m.marks : ''}" style="margin:0;width:90px">`;
    const st = [t, q].filter(Boolean).map(m => m.status);
    return `<tr><td><b>${s.username}</b></td><td>${s.name}</td><td>${inp('fm_t', t)}</td><td>${inp('fm_p', q)}</td><td>${st.length ? vb(st.includes('REJECTED') ? 'REJECTED' : st.every(x => x == 'VERIFIED') ? 'APPROVED' : 'PENDING') : '-'}</td></tr>`;
  });
  $('fm_tbl').innerHTML = `<div class="card">${table(['Student ID', 'Name', 'Internal Theory', 'Internal Practical', 'Status'], rows)}<div class="err" id="fm_err"></div><div style="margin-top:14px"><button class="green" onclick="fmSave()">Save & send to HOD</button> <span id="fm_ok"></span></div></div>`;
}
async function fmSave() {
  const k = window._fmn.k, b = window._fmn.b, sub = $('fm_sub').value, tm = +$('fm_tm').value, pm = +$('fm_pm').value, entries = [];
  for (const s of window._fm.sts.filter(x => batchOf(x) == b && x.semester == k))
    for (const [id, comp, max] of [['fm_t', 'INTERNAL_THEORY', tm], ['fm_p', 'INTERNAL_PRACTICAL', pm]]) {
      const el = $(`${id}_${s.username}`); if (!el || el.value === '') continue;
      const v = +el.value;
      if (!(v >= 0) || v > max) { $('fm_err').textContent = `${s.name}: marks must be between 0 and ${max}`; return; }
      entries.push({ student: s.username, semester: k, subject: sub, component: comp, marks: v, max });
    }
  if (!entries.length) { $('fm_err').textContent = 'Enter some marks first'; return; }
  try { await api('/marks', 'POST', { byRole: 'FACULTY', byUser: me.username, entries }); await fmRender(); $('fm_ok').textContent = '✓ Saved. Sent to your HOD for verification.'; }
  catch (e) { $('fm_err').textContent = e.error || 'Could not save'; }
}

// ---- HOD: verify internal (faculty) and external (student) marks ----
VIEWS['Marks Verification'] = VIEWS['Internal Marks Management'] = async () => {
  const ms = await api('/marks'); window._vm = ms; const groups = {};
  ms.filter(m => m.status == 'PENDING').forEach(m => { const g = [m.studentUsername, m.semester, m.component.split('_')[0]].join('|'); (groups[g] = groups[g] || []).push(m); });
  const rows = Object.entries(groups).map(([g, a]) => { const [u, k, kind] = g.split('|'); return `<tr><td><b>${u}</b></td><td>${a[0].studentName}</td><td>${k}</td><td>${kind == 'INTERNAL' ? 'Internal (by faculty)' : 'External (by student)'}</td><td>${a.length}</td><td><button class="sm" onclick="mkReview('${g}')">Review</button></td></tr>`; });
  return `<div class="grid"><div class="stat"><b>${rows.length}</b><small>Waiting for verification</small></div><div class="stat"><b>${ms.filter(m => m.status == 'VERIFIED').length}</b><small>Verified entries</small></div><div class="stat"><b>${ms.filter(m => m.status == 'REJECTED').length}</b><small>Rejected entries</small></div></div><div class="card"><h3>Pending verification</h3>${table(['Student ID', 'Name', 'Semester', 'Type', 'Entries', 'Action'], rows)}</div>`;
};
function mkReview(g) {
  const [u, k, kind] = g.split('|'), a = window._vm.filter(m => m.status == 'PENDING' && m.studentUsername == u && String(m.semester) == k && m.component.startsWith(kind));
  window._rv = a.map(m => m.id);
  subPage(`Marks Verification › ${a[0].studentName}`, "go('Marks Verification')", `<div class="card"><h3>${a[0].studentName} (${u}) — Semester ${k} — ${kind == 'INTERNAL' ? 'internal marks entered by faculty' : 'external marks uploaded by the student'}</h3>${table(['Subject', 'Type', 'Marks', 'Max', 'Entered by'], a.map(m => `<tr><td>${m.subject}</td><td>${COMP[m.component]}</td><td><b>${m.marks}</b></td><td>${m.maxMarks}</td><td>${m.enteredBy}</td></tr>`))}<p style="margin-top:12px;color:#64748b;font-size:13px">Check these marks${kind == 'EXTERNAL' ? ' against the university result' : ''}, then verify or reject.</p><div style="margin-top:14px;display:flex;gap:10px"><button class="green" onclick="mkDecide('VERIFIED')">✔ Verify all</button><button class="red" onclick="mkDecide('REJECTED')">✖ Reject all</button></div></div>`);
}
async function mkDecide(s) { await api('/marks/status', 'PUT', { ids: window._rv, status: s }); go('Marks Verification'); }

// ---- Admin / HOD: Student Management > Marks Management (Batch > Course > Semester > student) ----
const mkPage = (crumb, back, body) => subPage('Student Management › Marks Management' + (crumb ? ' › ' + crumb : ''), back, body);
async function marksBatches() {
  await loadRec(); window._mn = {};
  mkPage('', "go('Student Management')", `<div class="dtiles">${window._batches.map((b, i) => `<div class="tile" onclick="mkBatch(${i})"><span>🎓</span>${bl(b)}<small>${window._stu.filter(s => batchOf(s) == b).length} students</small></div>`).join('') || '<div class="card">No students admitted yet</div>'}</div>`);
}
const mkBatch = i => mkBatchK(window._batches[i]);
function mkBatchK(b) {
  window._mn = { b }; const st = window._stu.filter(s => batchOf(s) == b);
  mkPage(bl(b), 'marksBatches()', `<div class="dtiles">${window._depts.map((d, c) => `<div class="tile" onclick="mkCourse(${c})"><span>🏛️</span>${d}<small>${st.filter(s => s.department == d).length} students</small></div>`).join('')}</div>`);
}
const mkCourse = c => mkCourseK(window._mn.b, window._depts[c]);
function mkCourseK(b, name) {
  window._mn = { b, c: name };
  const d = window._deptObjs.find(x => x.name == name) || {}, st = window._stu.filter(s => batchOf(s) == b && s.department == name), n = d.semesters || Math.max(1, ...st.map(s => s.semester || 0));
  let h = '';
  for (let y = 0; y < Math.ceil(n / 2); y++) h += `<h3 style="margin:18px 0 10px">Year ${y + 1}</h3><div class="dtiles">${[2 * y + 1, 2 * y + 2].filter(k => k <= n).map(k => `<div class="tile" onclick="mkSem(${k})"><span>📘</span>Semester ${k}<small>${st.filter(s => (s.semester || 0) >= k).length} students</small></div>`).join('')}</div>`;
  mkPage(`${bl(b)} › ${name}`, "mkBack('batch')", h);
}
const mkSem = k => mkSemK(window._mn.b, window._mn.c, k);
async function mkSemK(b, name, k) {
  window._mn = { b, c: name, k };
  const ms = await api(`/marks?course=${enc(name)}&semester=${k}`); window._mm = ms;
  const rows = window._stu.filter(s => batchOf(s) == b && s.department == name && (s.semester || 0) >= k).map(s => {
    const my = ms.filter(m => m.studentUsername == s.username), c = (kind, st) => my.filter(m => m.component.startsWith(kind) && m.status == st).length;
    return `<tr><td><b>${s.username}</b></td><td><a href="#" onclick="mkSheet('${s.username}');return false">${s.name}</a></td><td>${chip(c('INTERNAL', 'VERIFIED'), c('INTERNAL', 'PENDING'))}</td><td>${chip(c('EXTERNAL', 'VERIFIED'), c('EXTERNAL', 'PENDING'))}</td></tr>`;
  });
  mkPage(`${bl(b)} › ${name} › Semester ${k}`, "mkBack('course')", `<div class="card"><h3>${name} — Semester ${k}</h3><input placeholder="🔍 Search / Filter..." onkeyup="flt(this)">${table(['Student ID', 'Name', 'Internal marks', 'External marks'], rows)}</div>`);
}
function mkSheet(u) {
  const n = window._mn, s = window._stu.find(x => x.username == u), hod = me.role == 'HOD';
  const ms = window._mm.filter(m => m.studentUsername == u && (hod || m.status == 'VERIFIED'));
  const sh = sheetHtml(`Semester ${n.k}`, ms, hod);
  mkPage(`${bl(n.b)} › ${n.c} › ${s.name}`, "mkBack('sem')", `<div class="card"><h2>🎓 Smart Campus — Marksheet</h2><p><b>${s.name}</b> • ${s.username} • ${s.department} • Session ${s.academicSession || '-'}</p></div>${sh.html}<button class="noprint" onclick="window.print()">🖨️ Print</button>`);
}
function mkBack(l) { const n = window._mn; if (l == 'batch') mkBatchK(n.b); else if (l == 'course') mkCourseK(n.b, n.c); else mkSemK(n.b, n.c, n.k); }

// ---- Student: upload external (university) marks, then view / print the result ----
VIEWS['Upload External Marks'] = async () => {
  const [p, mine] = await Promise.all([api('/students/' + me.id), api(`/marks?student=${me.username}&kind=EXTERNAL`)]);
  window._up = { p, mine };
  if (!p.semester) return '<div class="card">Your semester is not set yet. Please contact the admin.</div>';
  const tiles = Array.from({ length: p.semester }, (_, i) => i + 1).map(k => {
    const m = mine.filter(x => x.semester == k), st = !m.length ? 'Not uploaded' : m.every(x => x.status == 'VERIFIED') ? 'Verified' : m.some(x => x.status == 'REJECTED') ? 'Rejected - upload again' : 'Waiting for HOD';
    return `<div class="tile" onclick="upSem(${k})"><span>📤</span>Semester ${k}<small>${st}</small></div>`;
  });
  return `<div class="card"><p>Upload your <b>external (university) marks</b> from your official result. Your HOD verifies them. <b>Once submitted you cannot change them</b>, so check them carefully.</p></div><div class="dtiles">${tiles.join('')}</div>`;
};
async function upSem(k) {
  const subs = (await api('/subjects?course=' + enc(window._up.p.department))).filter(s => s.semester == k), mine = window._up.mine.filter(m => m.semester == k);
  window._upSubs = subs;
  const find = (sub, c) => mine.find(m => m.subject == sub && m.component == c);
  const rows = subs.map((s, i) => {
    const cell = (m, id) => m && m.status != 'REJECTED' ? `${m.marks}/${m.maxMarks} ${vb(m.status)}` : `<input id="${id}_${i}" type="number" min="0" step="0.5" style="margin:0;width:90px" value="${m ? m.marks : ''}">`;
    return `<tr><td><b>${s.name}</b></td><td>${cell(find(s.name, 'EXTERNAL_THEORY'), 'ex_t')}</td><td>${cell(find(s.name, 'EXTERNAL_PRACTICAL'), 'ex_p')}</td></tr>`;
  });
  subPage(`Upload External Marks › Semester ${k}`, "go('Upload External Marks')", subs.length ? `<div class="card"><div class="row"><div><label>External Theory — max marks</label><input id="ex_tm" type="number" min="1" value="70"></div><div><label>External Practical — max marks</label><input id="ex_pm" type="number" min="1" value="25"></div></div><br>${table(['Subject', 'External Theory', 'External Practical (if any)'], rows)}<div class="err" id="ex_err"></div><button class="green" style="margin-top:14px" onclick="upSave(${k})">Submit to HOD</button></div>` : '<div class="card">Your HOD has not added the subjects of this semester yet.</div>');
}
async function upSave(k) {
  const tm = +$('ex_tm').value, pm = +$('ex_pm').value, entries = [], err = m => { $('ex_err').textContent = m; };
  for (const [i, s] of window._upSubs.entries())
    for (const [id, comp, max] of [['ex_t', 'EXTERNAL_THEORY', tm], ['ex_p', 'EXTERNAL_PRACTICAL', pm]]) {
      const el = $(`${id}_${i}`); if (!el || el.value === '') continue;
      const v = +el.value;
      if (!(v >= 0) || v > max) return err(`${s.name}: marks must be between 0 and ${max}`);
      entries.push({ student: me.username, semester: k, subject: s.name, component: comp, marks: v, max });
    }
  if (!entries.length) return err('Enter at least one mark');
  if (!confirm('Submit these marks? You cannot change them after submitting.')) return;
  try { await api('/marks', 'POST', { byRole: 'STUDENT', byUser: me.username, entries }); go('Upload External Marks'); }
  catch (e) { err(e.error || 'Could not submit'); }
}
VIEWS['Results & Marksheet'] = async () => {
  const [p, ms] = await Promise.all([api('/students/' + me.id), api('/marks?student=' + me.username)]);
  const ver = ms.filter(m => m.status == 'VERIFIED'), pend = ms.filter(m => m.status == 'PENDING').length;
  window._rs = { p, ver };
  const sems = [...new Set(ver.map(m => m.semester))].sort((a, z) => a - z), years = [...new Set(sems.map(k => Math.ceil(k / 2)))];
  if (!sems.length) return `<div class="card">No verified marks yet.${pend ? ' ' + pend + ' entries are waiting for HOD verification.' : ''}</div>`;
  return `<div class="card noprint"><h3>View / Print Result</h3><div style="display:flex;gap:8px;flex-wrap:wrap">${sems.map(k => `<button class="sm" onclick="showRes('s',${k})">Semester ${k}</button>`).join('')}${years.map(y => `<button class="sm" onclick="showRes('y',${y})">Year ${y} (together)</button>`).join('')}<button class="sm green" onclick="showRes('a',0)">All semesters (total)</button></div>${pend ? `<p style="margin-top:10px;color:#64748b;font-size:13px">${pend} entries are waiting for HOD verification.</p>` : ''}</div><div id="resbox"></div>`;
};
function showRes(mode, n) {
  const R = window._rs, p = R.p;
  const ks = mode == 's' ? [n] : mode == 'y' ? [2 * n - 1, 2 * n] : [...new Set(R.ver.map(m => m.semester))].sort((a, z) => a - z);
  let T = 0, M = 0, h = '';
  ks.forEach(k => { const ms = R.ver.filter(m => m.semester == k); if (!ms.length) return; const sh = sheetHtml(`Semester ${k}`, ms); T += sh.T; M += sh.M; h += sh.html; });
  const head = `<div class="card"><h2>🎓 Smart Campus — Marksheet</h2><p><b>${p.name}</b> • ${p.username} • ${p.department} • Session ${p.academicSession || '-'}</p></div>`;
  const foot = ks.length > 1 && M ? `<div class="card"><h3>${mode == 'y' ? 'Year ' + n : 'Overall'} total: ${T} / ${M} (${Math.round(T * 100 / M)}%)</h3></div>` : '';
  $('resbox').innerHTML = head + h + foot + '<button class="noprint" onclick="window.print()">🖨️ Print</button>';
}

// ---- Admin: Semester Promotion ----
VIEWS['Semester Promotion'] = async () => {
  await loadRec(); window._pn = {};
  return `<div class="card"><p>Promote students to the next semester. A student can be promoted only when the marks of the semester are uploaded and <b>verified</b>. At the end of a year (Semester 2 → 3, 4 → 5, ...) the <b>fee must also be cleared</b> and the marks of both semesters of that year must be verified.</p></div><div class="dtiles">${window._batches.map((b, i) => `<div class="tile" onclick="promoBatch(${i})"><span>🎓</span>${bl(b)}<small>${window._stu.filter(s => batchOf(s) == b).length} students</small></div>`).join('') || '<div class="card">No students admitted yet</div>'}</div>`;
};
const promoBatch = i => promoBatchK(window._batches[i]);
function promoBatchK(b) {
  window._pn = { b };
  subPage(`Semester Promotion › ${bl(b)}`, "go('Semester Promotion')", `<div class="dtiles">${window._depts.map((d, c) => `<div class="tile" onclick="promoCourse(${c})"><span>🏛️</span>${d}<small>${window._stu.filter(s => batchOf(s) == b && s.department == d).length} students</small></div>`).join('')}</div>`);
}
const promoCourse = c => promoCourseK(window._pn.b, window._depts[c]);
function promoCourseK(b, name) {
  window._pn = { b, c: name };
  const d = window._deptObjs.find(x => x.name == name) || {}, st = window._stu.filter(s => batchOf(s) == b && s.department == name), n = d.semesters || 2;
  subPage(`Semester Promotion › ${bl(b)} › ${name}`, "promoBack()", `<div class="dtiles">${Array.from({ length: n }, (_, i) => i + 1).map(k => `<div class="tile" onclick="promoSem(${k})"><span>⬆️</span>Semester ${k}${k < n ? ' → ' + (k + 1) : ''}<small>${st.filter(s => s.semester == k).length} students${k >= n ? ' • final semester' : ''}</small></div>`).join('')}</div>`);
}
const promoSem = k => promoSemK(window._pn.b, window._pn.c, k);
async function promoSemK(b, name, k) {
  window._pn = { b, c: name, k }; await loadRec();
  const all = await api(`/promotion/preview?course=${enc(name)}&semester=${k}`);
  const rows = all.filter(r => { const s = window._stu.find(x => x.username == r.username); return s && batchOf(s) == b; }), ok = rows.filter(r => r.eligible);
  const msg = window._promoMsg || ''; window._promoMsg = '';
  subPage(`Semester Promotion › ${bl(b)} › ${name} › Semester ${k}`, "promoBack()", `<div class="card"><h3>${name} — Semester ${k} → ${k + 1} — ${rows.length} student(s), ${ok.length} eligible</h3>${ok.length ? '<button class="sm" onclick="promoAll()">Select all eligible</button>' : ''}${table(['', 'Student ID', 'Name', 'Marks verified', 'Fee', 'Status'], rows.map(r => `<tr><td>${r.eligible ? `<input type="checkbox" class="pchk" value="${r.username}" checked style="width:auto;margin:0">` : ''}</td><td><b>${r.username}</b></td><td>${r.name}</td><td>${r.marksOk ? '✅' : '❌'}</td><td>${r.yearEnd ? (r.feeClear ? '✅ Clear' : '❌ Pending') : '— (not needed)'}</td><td>${r.eligible ? '<span class="badge APPROVED">Eligible</span>' : `<span class="badge REJECTED">Not eligible</span><br><small>${r.reasons.join('; ')}</small>`}</td></tr>`))}<div style="margin-top:14px"><button class="green" onclick="promoGo(${k})">Promote selected to Semester ${k + 1}</button></div><div id="promo_msg" style="margin-top:12px">${msg}</div></div>`);
}
function promoAll() { document.querySelectorAll('.pchk').forEach(c => { c.checked = true; }); }
function promoBack() { const n = window._pn; if (n.k != null) promoCourseK(n.b, n.c); else promoBatchK(n.b); }
async function promoGo(k) {
  const sel = [...document.querySelectorAll('.pchk')].filter(c => c.checked).map(c => c.value), n = window._pn;
  if (!sel.length) { $('promo_msg').textContent = 'Select at least one student'; return; }
  if (!confirm(`Promote ${sel.length} student(s) to Semester ${k + 1}?`)) return;
  const r = await api('/promotion/promote', 'POST', { semester: k, usernames: sel });
  window._promoMsg = `<div class="card" style="background:#dcfce7"><b>✅ Promoted ${r.promoted} student(s) to Semester ${k + 1}.</b>${r.skipped.length ? '<br>Skipped: ' + r.skipped.map(x => x.username + ' (' + x.reasons.join('; ') + ')').join(', ') : ''}</div>`;
  await promoSemK(n.b, n.c, k);
}

// ---- Resume requests (HOD) and uploads (students) ----
VIEWS['Resume Management'] = async () => {
  const reqs = (await api('/records?module=ResumeRequest')).map(r => ({ ...r, d: JSON.parse(r.data || '{}') })).filter(r => r.d.course == me.department).sort((a, b) => b.id - a.id);
  window._reqs = reqs;
  return me.role == 'STUDENT' ? resStudent(reqs) : resHod(reqs);
};
async function resHod(reqs) {
  const subs = await api('/resumes'); window._subm = subs;
  return `<div class="card"><h3>Ask Students for Resumes</h3><div class="row"><div><label>Company</label><input id="rq_c"></div><div><label>Role / Position</label><input id="rq_r"></div><div><label>Last date</label><input id="rq_d" type="date"></div></div><div style="margin-top:10px"><label>Eligibility / details (who should send the resume)</label><textarea id="rq_e" rows="2"></textarea></div><div class="err" id="rq_err"></div><button style="margin-top:10px" onclick="newReq()">Send request to students</button></div>
    <div class="card"><h3>My Requests</h3>${table(['Company', 'Role', 'Last Date', 'Eligibility', 'Resumes received', 'Action'], reqs.map(r => `<tr><td><b>${r.d.company}</b></td><td>${r.d.role}</td><td>${r.d.last_date || '-'}</td><td>${r.d.eligibility || '-'}</td><td>${subs.filter(s => s.requestId == r.id).length}</td><td><button class="sm" onclick="openResumes(${r.id})">View resumes</button></td></tr>`))}</div>`;
}
async function newReq() {
  const c = $('rq_c').value.trim(), r = $('rq_r').value.trim();
  if (!c || !r) { $('rq_err').textContent = 'Enter the company and the role'; return; }
  await api('/records', 'POST', { module: 'ResumeRequest', owner: me.username, ownerName: me.name, ownerRole: me.role, data: JSON.stringify({ company: c, role: r, last_date: $('rq_d').value, eligibility: $('rq_e').value.trim(), course: me.department }) });
  go(cur);
}
function openResumes(id) {
  const r = window._reqs.find(x => x.id == id), list = window._subm.filter(s => s.requestId == id);
  subPage(`Resume Management › ${r.d.company}`, "go('Resume Management')", `<div class="card"><h3>${r.d.company} — ${r.d.role}</h3><p style="color:#64748b">${list.length} resume(s) received</p>${table(['Student ID', 'Name', 'File', 'Submitted on', 'Download'], list.map(s => `<tr><td><b>${s.studentUsername}</b></td><td>${s.studentName}</td><td>${s.fileName}</td><td>${s.submittedOn}</td><td><button class="sm" onclick="downloadResume(${s.id})">⬇ Download</button></td></tr>`))}</div>`);
}
async function downloadResume(id) {
  const r = await api(`/resumes/${id}/file`), a = document.createElement('a');
  a.href = r.content; a.download = r.fileName; document.body.appendChild(a); a.click(); a.remove();
}
async function resStudent(reqs) {
  const mine = await api('/resumes?student=' + me.username), T = today();
  const cards = reqs.map(r => {
    const s = mine.find(x => x.requestId == r.id), closed = r.d.last_date && r.d.last_date < T;
    return `<div class="card"><h3>${r.d.company} — ${r.d.role}</h3><p style="color:#64748b;font-size:13px">Last date: ${r.d.last_date || '-'}${r.d.eligibility ? '<br>Eligibility: ' + r.d.eligibility : ''}</p>${s ? `<p>✅ Submitted: <b>${s.fileName}</b> (${s.submittedOn})</p>` : ''}${closed ? '<p><span class="badge OVERDUE">Closed</span></p>' : `<div class="row"><div><label>${s ? 'Replace resume' : 'Upload resume'} (PDF or Word, max 1 MB)</label><input id="rs_file_${r.id}" type="file" accept=".pdf,.doc,.docx"></div><div><button class="green" onclick="submitResume(${r.id})">${s ? 'Replace' : 'Submit to HOD'}</button></div></div><div class="err" id="rs_err_${r.id}"></div>`}</div>`;
  });
  return cards.join('') || '<div class="card">No resume request from your HOD right now.</div>';
}
async function submitResume(id) {
  const f = $('rs_file_' + id).files[0], err = m => { $('rs_err_' + id).textContent = m; };
  if (!f) return err('Choose a file first');
  if (f.size > 1024 * 1024) return err('The file is too large (maximum 1 MB)');
  if (!/\.(pdf|doc|docx)$/i.test(f.name)) return err('Upload a PDF or Word file');
  const content = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Could not read the file')); r.readAsDataURL(f); });
  try { await api('/resumes', 'POST', { requestId: id, student: me.username, fileName: f.name, fileType: f.type, content }); go(cur); }
  catch (e) { err(e.error || 'Upload failed'); }
}

// ---- Menus ----
if (!MENU.ADMIN.includes('Semester Promotion')) MENU.ADMIN.splice(MENU.ADMIN.indexOf('Document Management') + 1, 0, 'Semester Promotion');
MENU.HOD = MENU.HOD.map(t => t == 'Internal Marks Management' ? 'Marks Verification' : t);
if (!MENU.STUDENT.includes('Upload External Marks')) MENU.STUDENT.splice(MENU.STUDENT.indexOf('Results & Marksheet') + 1, 0, 'Upload External Marks');
$('menu').innerHTML = MENU[me.role].map(t => t[0] == '#' ? `<div class="grp">${t.slice(1)}</div>` : `<a data-t="${t}" onclick="go(this.dataset.t)">${t}</a>`).join('');
document.querySelectorAll('#menu a').forEach(a => a.classList.toggle('on', a.dataset.t == cur));
