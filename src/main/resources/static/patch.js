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
document.head.insertAdjacentHTML('beforeend', '<style>.tiles{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}.dtiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px}.tile{background:#fff;border-radius:12px;padding:24px;min-height:170px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:6px;cursor:pointer;font-size:18px;font-weight:600;box-shadow:0 1px 3px #0001;border:2px solid transparent}.tile span{font-size:34px}.tile small{color:#64748b;font-weight:400;font-size:13px}.tile:hover{border-color:#2563eb;background:#eff6ff}td a{color:#2563eb;font-weight:600;text-decoration:none}td a:hover{text-decoration:underline}.dl td:first-child{width:230px;color:#64748b}@media(max-width:760px){.tiles{grid-template-columns:1fr!important}}</style>');
const fmtYears = y => `${y} ${y == 1 ? 'Year' : 'Years'}`;
const bl = b => b == 'Unassigned' ? 'No Batch' : 'Batch ' + b;
const batchOf = s => s.academicSession ? s.academicSession.slice(0, 4) : (s.admissionDate ? s.admissionDate.slice(0, 4) : 'Unassigned');
const page = (crumb, back, body) => {
  $('title').textContent = 'Student Management › ' + crumb;
  $('view').innerHTML = `<button class="sm" style="margin-bottom:16px" onclick="${back}">← Back</button><div id="tilebody">${body}</div>`;
};
VIEWS['Student Management'] = async () => {
  const st = await api('/users?role=STUDENT'), adm = me.role == 'ADMIN';
  return `<div class="tiles" ${adm ? '' : 'style="grid-template-columns:1fr"'}>
    ${adm ? '<div class="tile" id="t_new" onclick="openTile(\'new\')"><span>➕</span>New Admission</div>' : ''}
    <div class="tile" id="t_rec" onclick="openTile('rec')"><span>📂</span>Student Record<small>${st.length} students</small></div>
  </div>`;
};

// ---- New Admission ----
async function openTile(w) {
  window._nav = null;
  if (w == 'new') { page('New Admission', "go('Student Management')", await newAdmissionForm()); courseChanged(); }
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
    $('ucred').innerHTML = `<div class="card" style="background:#dcfce7;margin-top:12px"><b>✅ User created!</b><br>User ID: <b>${r.username}</b><br>Temporary Password: <b>${r.password}</b>${body.academicSession ? '<br>Academic Session: <b>' + body.academicSession + '</b>' : ''}<br><small>Share these details with the user. They must change the password at first login. This will not be shown again.</small></div>`;
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
    <h3 style="margin-top:20px">Personal Details</h3><table class="dl">${row('Father Name', p.fatherName)}${row('Mother Name', p.motherName)}${row('Student Mobile No', p.mobile)}${row('Email ID', p.email)}${row('Guardian Name', p.guardianName)}${row('Parents Mobile No', p.parentsMobile)}${row('Correspondence Address', p.addressCorrespondence)}${row('Permanent Address', p.addressPermanent)}</table>
    <div style="margin-top:24px;display:flex;gap:10px;flex-wrap:wrap"><button onclick="window.print()">🖨️ Print</button>${adm ? `<button class="green" onclick="editStudent()">✏️ Edit</button><button class="red" onclick="deleteStudent(${p.id})">🗑️ Delete</button>` : ''}</div></div>`);
}
function editStudent() {
  const p = window._prof, q = v => (v || '').replace(/"/g, '&quot;');
  const f = (id, label, val, type) => `<div><label>${label}</label><input id="${id}" type="${type || 'text'}" value="${q(val)}"></div>`;
  $('tilebody').innerHTML = `<div class="card"><h3>Complete Student Details — ${p.name}</h3><div class="row">
    ${f('pf_father', 'Father Name', p.fatherName)}${f('pf_mother', 'Mother Name', p.motherName)}${f('pf_mobile', 'Student Mobile No', p.mobile, 'tel')}${f('pf_email', 'Email ID', p.email, 'email')}
    ${f('pf_guardian', 'Guardian Name (optional)', p.guardianName)}${f('pf_pmobile', 'Parents Mobile No', p.parentsMobile, 'tel')}</div>
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
  const b = { fatherName: v('pf_father'), motherName: v('pf_mother'), mobile: v('pf_mobile'), email: v('pf_email'), guardianName: v('pf_guardian'), parentsMobile: v('pf_pmobile'), addressCorrespondence: v('pf_caddr'), addressPermanent: v('pf_paddr') };
  const err = m => { $('pf_err').textContent = m; };
  if (!b.fatherName || !b.motherName) return err("Father's name and mother's name are required");
  if (!/^\d{10}$/.test(b.mobile) || !/^\d{10}$/.test(b.parentsMobile)) return err('Mobile numbers must be 10 digits');
  if (!/^\S+@\S+\.\S+$/.test(b.email)) return err('Enter a valid email ID');
  if (!b.addressCorrespondence || !b.addressPermanent) return err('Both addresses are required');
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
    <div><button onclick="addDept()">Add</button></div></div><div class="err" id="de"></div></div>` : '';
  return form + `<div class="card">${table(['ID', 'Department / Course', 'Duration', 'Total Semesters', ...(adm ? ['Action'] : [])],
    d.map(x => `<tr><td>${x.id}</td><td>${x.name}</td><td id="dd_${x.id}">${x.durationYears ? fmtYears(x.durationYears) : '-'}</td><td id="ds_${x.id}">${x.semesters ?? '-'}</td>${adm ? `<td id="da_${x.id}"><button class="sm" onclick="editDept(${x.id})">Edit</button> <button class="sm red" onclick="delDept(${x.id})">Delete</button></td>` : ''}</tr>`))}</div>`;
};
async function addDept() {
  const n = $('dn').value.trim(), y = +$('ddur').value, s = +$('dsem').value;
  if (!n) { $('de').textContent = 'Enter the department / course name'; return; }
  if (!(y > 0) || !(s > 0)) { $('de').textContent = 'Enter the duration and total semesters'; return; }
  await api('/departments', 'POST', { name: n, durationYears: y, semesters: s });
  go(cur);
}
function editDept(id) {
  const d = window._deptList.find(x => x.id == id);
  $('dd_' + id).innerHTML = `<input id="ey_${id}" type="number" min="0.5" step="0.5" value="${d.durationYears ?? ''}" style="width:90px;margin:0" oninput="$('es_${id}').value = Math.round(this.value * 2) || ''">`;
  $('ds_' + id).innerHTML = `<input id="es_${id}" type="number" min="1" value="${d.semesters ?? ''}" style="width:90px;margin:0">`;
  $('da_' + id).innerHTML = `<button class="sm green" onclick="saveDept(${id})">Save</button> <button class="sm" onclick="go(cur)">Cancel</button>`;
}
async function saveDept(id) {
  const d = window._deptList.find(x => x.id == id), y = +$('ey_' + id).value, s = +$('es_' + id).value;
  if (!(y > 0) || !(s > 0)) return alert('Enter valid duration and semesters');
  await api('/departments', 'POST', { id: d.id, name: d.name, durationYears: y, semesters: s });
  go(cur);
}
async function delDept(id) {
  if (!confirm('Delete this department?')) return;
  await api('/departments/' + id, 'DELETE'); go(cur);
}
