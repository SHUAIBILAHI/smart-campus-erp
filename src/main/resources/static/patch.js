// ===== Auto User ID + Temporary Password feature =====
function usersView2(roles, canAdd0) {
  return async () => {
    const canAdd = canAdd0 && me.role == 'ADMIN';
    const d = await api('/departments');
    let all = [];
    for (const r of roles) all = all.concat(await api('/users?role=' + r));
    const form = canAdd ? `<div class="card"><h3>Naya User Add Karein</h3>
      <p style="font-size:13px;color:#64748b;margin-bottom:10px">User ID automatic banegi. Temporary password neeche daalein (khaali chhodoge toh automatic banega). User ko pehle login par password badalna zaruri hoga.</p>
      <div class="row">
        <div><label>Full Name</label><input id="un"></div>
        <div><label>Temporary Password</label><input id="up" placeholder="Khaali = automatic"></div>
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
    $('ucred').innerHTML = `<div class="card" style="background:#dcfce7;margin-top:12px"><b>✅ User ban gaya!</b><br>User ID: <b>${r.username}</b><br>Temporary Password: <b>${r.password}</b><br><small>Ye details user ko de dein. Pehle login par usse password badalna padega. Ye dobara nahi dikhengi.</small></div>`;
  } catch (e) { $('ue').textContent = e.error || 'Error'; }
}
async function resetPw() {
  if (!$('sp').value) return;
  await api(`/users/${$('su').value}/reset-password`, 'PUT', { password: $('sp').value });
  alert('Password reset ho gaya. User ko agle login par naya password set karna hoga.');
}
async function chPw() {
  if (!$('np').value) return;
  try { await api(`/users/${me.id}/change-password`, 'PUT', { password: $('np').value }); alert('Password update ho gaya'); $('np').value = ''; }
  catch (e) { alert(e.error || 'Error'); }
}

// ===== Pehle login par password change zaruri =====
async function forceChange() {
  const a = $('fp1').value, b = $('fp2').value;
  if (a.length < 6) { $('fe').textContent = 'Kam se kam 6 characters daalein'; return; }
  if (a !== b) { $('fe').textContent = 'Dono password same nahi hain'; return; }
  try {
    await api(`/users/${me.id}/change-password`, 'PUT', { password: a });
    me.mustChange = false; sessionStorage.setItem('u', JSON.stringify(me)); location.reload();
  } catch (e) { $('fe').textContent = e.error || 'Error'; }
}
if (me.mustChange) {
  const o = document.createElement('div');
  o.style.cssText = 'position:fixed;inset:0;z-index:9999;background:linear-gradient(135deg,#1e3a8a,#2563eb);display:grid;place-items:center;padding:16px';
  o.innerHTML = `<div class="login-box"><h1>🔒 Password Change Karein</h1><p>Ye aapka temporary password hai. Aage badhne se pehle naya password set karna zaruri hai.</p><input id="fp1" type="password" placeholder="Naya password (min 6 characters)"><input id="fp2" type="password" placeholder="Naya password dobara"><button class="full" onclick="forceChange()">Password Set Karein</button><div class="err" id="fe"></div><p style="margin-top:12px;font-size:13px"><a href="#" onclick="logout()">Logout</a></p></div>`;
  document.body.appendChild(o);
}



// ===== Student Management: New Admission + Student Record boxes =====
document.head.insertAdjacentHTML('beforeend', '<style>.tiles{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}.tile{background:#fff;border-radius:12px;padding:24px;min-height:170px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:6px;cursor:pointer;font-size:18px;font-weight:600;box-shadow:0 1px 3px #0001;border:2px solid transparent}.tile span{font-size:34px}.tile small{color:#64748b;font-weight:400;font-size:13px}.tile:hover{border-color:#2563eb;background:#eff6ff}@media(max-width:760px){.tiles{grid-template-columns:1fr!important}}</style>');
const _sm = usersView2(['STUDENT'], true);
VIEWS['Student Management'] = async () => {
  const st = await api('/users?role=STUDENT'), adm = me.role == 'ADMIN';
  return `<div class="tiles" ${adm ? '' : 'style="grid-template-columns:1fr"'}>
    ${adm ? '<div class="tile" id="t_new" onclick="openTile(\'new\')"><span>➕</span>New Admission</div>' : ''}
    <div class="tile" id="t_rec" onclick="openTile('rec')"><span>📂</span>Student Record<small>${st.length} students</small></div>
  </div>`;
};
async function openTile(w) {
  $('title').textContent = 'Student Management › ' + (w == 'new' ? 'New Admission' : 'Student Record');
  $('view').innerHTML = '<button class="sm" style="margin-bottom:16px" onclick="go(\'Student Management\')">← Back</button><div id="tilebody"></div>';
  $('tilebody').innerHTML = w == 'new' ? await newAdmissionForm() : await recordBody();
}
async function newAdmissionForm() { const h = await _sm(); return h.slice(0, h.indexOf('<div class="card"><input')); }
function stuTable(dept) {
  const r = window._stu.filter(s => !dept || s.department == dept), adm = me.role == 'ADMIN';
  return `<div class="card"><h3>${dept || 'All Departments'} — ${r.length} Student(s)</h3><input placeholder="🔍 Search / Filter..." onkeyup="flt(this)">${table(['User ID', 'Name', 'Department', ...(adm ? ['Action'] : [])],
    r.map(u => `<tr><td><b>${u.username}</b></td><td>${u.name}</td><td>${u.department}</td>${adm ? `<td><button class="sm red" onclick="delUser(${u.id})">Delete</button></td>` : ''}</tr>`))}</div>`;
}
function showDept() { $('rt').innerHTML = stuTable($('rd').value); }
async function recordBody() {
  const [d, st] = await Promise.all([api('/departments'), api('/users?role=STUDENT')]);
  window._stu = st;
  const first = me.role == 'HOD' && d.find(x => x.name == me.department) ? me.department : '';
  return `<div class="grid">${d.map(x => `<div class="stat"><b>${st.filter(s => s.department == x.name).length}</b><small>${x.name}</small></div>`).join('')}</div>
  <div class="card"><div class="row"><div><label>Department chuniye</label><select id="rd" onchange="showDept()"><option value="">All Departments</option>${d.map(x => `<option ${x.name == first ? 'selected' : ''}>${x.name}</option>`).join('')}</select></div></div></div>
  <div id="rt">${stuTable(first)}</div>`;
}
async function delUser(id) {
  if (!confirm('Is user ko delete karein?')) return;
  await api('/users/' + id, 'DELETE');
  if ($('tilebody')) openTile('rec'); else go(cur);
}
async function addUser() {
  try {
    const r = await api('/users/create', 'POST', { name: $('un').value, password: $('up').value, role: $('ur').value, department: $('ud').value });
    if ($('tilebody')) { $('un').value = ''; $('up').value = ''; } else await go(cur);
    $('ucred').innerHTML = `<div class="card" style="background:#dcfce7;margin-top:12px"><b>✅ User ban gaya!</b><br>User ID: <b>${r.username}</b><br>Temporary Password: <b>${r.password}</b><br><small>Ye details user ko de dein. Pehle login par usse password badalna padega. Ye dobara nahi dikhengi.</small></div>`;
  } catch (e) { $('ue').textContent = e.error || 'Error'; }
}
