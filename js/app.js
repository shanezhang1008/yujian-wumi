'use strict';
/* 遇见五迷 H5 v0.1 —— 本地数据层版（接口后续替换 CloudBase） */

/* ============ 工具 ============ */
const $ = (s, el) => (el || document).querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const Q = "'";
const fmtPhone = p => p ? p.slice(0,3) + '****' + p.slice(-4) : '';
function toast(msg){
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ============ 数据层（localStorage） ============ */
const DB_KEY = 'yjwm_db_v1';
function smallAgenda(){
  return [
    { name:'签到入场', dur:'19:15 起' },
    { name:'主理人开场', dur:'3 分钟' },
    { name:'热场自我介绍', dur:'每人 2-3 分钟' },
    { name:'自由交流', dur:'30-40 分钟' },
    { name:'合影散场', dur:'10 分钟' }
  ];
}
function seed(){
  return {
    admins: [ { phone:'13800005678', name:'Shane', role:'主管理员' } ],
    roster: [
      { id:'r1', name:'张小五', gender:'女', birth_ym:'1998-03', city:'朝阳', phone:'13800005678', mbti:'ENFP', bio:'爱看五月天现场', guarantor:'', activity_level:'活跃', note:'只周六有空', absence:1 },
      { id:'r2', name:'李阿宝', gender:'男', birth_ym:'1994-11', city:'海淀', phone:'13900001111', mbti:'ISTJ', bio:'吉他自学三年', guarantor:'张小五', activity_level:'偶尔冒泡', note:'', absence:0 },
      { id:'r3', name:'王一诺', gender:'女', birth_ym:'1996-07', city:'东城', phone:'13700002222', mbti:'INFJ', bio:'倔强单曲循环', guarantor:'', activity_level:'活跃', note:'', absence:0 },
      { id:'r4', name:'赵铁柱', gender:'男', birth_ym:'1993-01', city:'丰台', phone:'13600003333', mbti:'ESTP', bio:'', guarantor:'', activity_level:'潜水', note:'', absence:2 }
    ],
    activities: [
      { id:'a21', no:21, title:'第 21 期 · 秋天第一场见面', date:'10-31', start:'19:30', end:'21:30', venue:'五迷小馆 · 鼓楼东大街店', quotaM:5, quotaF:5, deadline:'10-30 22:00', status:'archived', agenda:smallAgenda() },
      { id:'a22', no:22, title:'第 22 期 · 周五线下见面局', date:'11-07', start:'19:30', end:'21:30', venue:'五迷小馆 · 鼓楼东大街店', quotaM:5, quotaF:5, deadline:'11-06 22:00', status:'open', agenda:smallAgenda(), voteOpen:false, settled:false }
    ],
    regs: [
      { id:'g1', actId:'a22', phone:'13800005678', name:'张小五', gender:'女', status:'ok', checkin:null, noShow:false },
      { id:'g2', actId:'a22', phone:'13900001111', name:'李阿宝', gender:'男', status:'ok', checkin:null, noShow:false },
      { id:'g3', actId:'a22', phone:'13700002222', name:'王一诺', gender:'女', status:'ok', checkin:null, noShow:false },
      { id:'g4', actId:'a21', phone:'13800005678', name:'张小五', gender:'女', status:'ok', checkin:{ time:'19:15', late:false, no:3 }, noShow:false }
    ],
    votes: [],
    session: null,
    next: null
  };
}
function loadDB(){
  try { const d = JSON.parse(localStorage.getItem(DB_KEY)); if (d && d.roster) return d; } catch(e){}
  return seed();
}
function save(){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }
let db = loadDB();

/* ============ 会话 ============ */
function me(){ return db.session; }
function isAdmin(){ const u = me(); return !!(u && db.admins.some(a => a.phone === u.phone)); }
function rosterOf(phone){ return db.roster.find(r => r.phone === phone); }
function myReg(actId){ const u = me(); return u ? db.regs.find(r => r.actId === actId && r.phone === u.phone) : null; }
function actRegs(actId){ return db.regs.filter(r => r.actId === actId); }
function actById(id){ return db.activities.find(a => a.id === id); }
function quotasOf(a){
  const rs = actRegs(a.id).filter(r => r.status === 'ok');
  return { m: rs.filter(r => r.gender === '男').length, f: rs.filter(r => r.gender === '女').length };
}
function checkedIn(actId){ return actRegs(actId).filter(r => r.checkin); }

/* ============ 路由 ============ */
const routes = {};
function go(hash){ if (location.hash === hash) render(); else location.hash = hash; }
window.addEventListener('hashchange', render);

function renderChrome(page){
  const u = me();
  $('#idname').textContent = u ? u.name + (isAdmin() ? ' · 管理' : '') : '游客';
  const tabs = [
    { k:'home', icon:'🏠', label:'活动' },
    { k:'my', icon:'🙂', label:'我的' }
  ];
  if (isAdmin()) tabs.push({ k:'workbench', icon:'🛠', label:'工作台' });
  $('#tabbar').innerHTML = tabs.map(t => {
    const on = page === t.k || (t.k === 'home' && ['detail','signup','checkin','vote'].includes(page));
    return '<button data-go="#/' + t.k + '" class="' + (on ? 'on' : '') + '"><span class="ti">' + t.icon + '</span>' + t.label + '</button>';
  }).join('');
}

function render(){
  if (typeof A !== 'undefined' && A._qrTimer) { clearInterval(A._qrTimer); A._qrTimer = null; }
  const h = (location.hash || '#/home').replace('#/', '');
  const seg = h.split('/');
  const page = seg[0] || 'home';
  const arg = seg[1];
  (routes[page] || routes.home)(arg);
  renderChrome(page);
  window.scrollTo(0, 0);
}

/* 需要登录的页面：未登录先去登录，登录后回来 */
function needLogin(nextHash){
  if (me()) return true;
  db.next = nextHash; save();
  go('#/login'); return false;
}

/* ============ 公共组件 ============ */
function faceHtml(color, kind){
  const k = kind || 'smile';
  return '<span class="face ' + k + '" style="--fc:var(--' + color + ')"><i class="l"></i><i class="r"></i>' + (k==='gl'?'<s></s>':'') + '<b></b></span>';
}
function quotaRow(label, color, used, total){
  const pct = total ? Math.round(used / total * 100) : 0;
  return '<div class="row"><span class="lb" style="color:var(--' + color + ')">' + label + '</span>' +
    '<div class="quota"><i style="width:' + pct + '%;background:var(--' + color + ')"></i></div>' +
    '<span class="sub" style="font-weight:800">' + used + '/' + total + '</span></div>';
}
function backBtn(to, label){
  return '<div class="backline"><button data-go="' + to + '">← ' + (label || '返回') + '</button></div>';
}

/* ============ 成员端：首页 ============ */
function actCard(a){
  const q = quotasOf(a);
  const st = a.status === 'open' ? '<span class="tag yl">报名中</span>'
    : a.status === 'doing' ? '<span class="tag gn">进行中</span>' : '<span class="tag">已结束</span>';
  return '<div class="card"><div class="spread">' + st + '<span class="sub">免费 · ' + esc(a.date) + '</span></div>' +
    '<div class="h1" style="margin-top:8px">' + esc(a.title) + '</div>' +
    '<div class="sub" style="margin:6px 0 2px">🗓 ' + esc(a.date) + '（' + esc(a.start) + ' 开场）</div>' +
    '<div class="sub">📍 ' + esc(a.venue) + '</div>' +
    '<div class="qb">' + quotaRow('男','bl',q.m,a.quotaM) + quotaRow('女','pk',q.f,a.quotaF) + '</div>' +
    '<div style="margin-top:14px"><button class="btn yl" data-go="#/detail/' + a.id + '">查看详情 →</button></div></div>';
}
routes.home = function(){
  const acts = db.activities.filter(a => a.status !== 'draft').sort((x,y) => y.no - x.no);
  let html = '<div class="topbar"><span class="doodle" style="top:8px;right:14px">✦</span><span class="doodle" style="bottom:10px;right:60px">♪</span>' +
    '<div class="row" style="gap:12px"><div class="fivewrap">' +
    faceHtml('yl','smile') + faceHtml('rd','flat') + faceHtml('pk','smile') + faceHtml('bl','gl') + faceHtml('gn','flat') +
    '</div><div><div class="t">遇见五迷</div><div class="sub">线下见一面，比什么都强</div></div></div></div>';
  html += acts.map(actCard).join('');
  html += '<div class="note">新朋友先看活动内容，想参加再报名。报名时才需要验证手机号，浏览全程免登录。</div>';
  $('#app').innerHTML = html;
};

/* ============ 成员端：活动详情 ============ */
routes.detail = function(id){
  const a = actById(id);
  if (!a) { go('#/home'); return; }
  const q = quotasOf(a);
  const my = myReg(id);
  let html = backBtn('#/home','活动列表');
  html += '<div class="card"><div class="spread"><span class="tag ' + (a.status==='open'?'yl':'') + '">' +
    (a.status==='open'?'报名中':a.status==='doing'?'进行中':'已结束') + '</span><span class="sub">第 ' + a.no + ' 期</span></div>' +
    '<div class="h1" style="margin-top:8px">' + esc(a.title) + '</div>' +
    '<div class="sub" style="margin-top:4px">时间：' + esc(a.date) + ' ' + esc(a.start) + ' - ' + esc(a.end) + '</div>' +
    '<div class="sub">地点：' + esc(a.venue) + '</div>' +
    '<div class="sub">截止：' + esc(a.deadline) + '</div>' +
    '<div class="qb">' + quotaRow('男','bl',q.m,a.quotaM) + quotaRow('女','pk',q.f,a.quotaF) + '</div></div>';
  html += '<div class="card"><div class="sec-t"><span class="num">1</span>今日流程（提前准备）</div>' +
    a.agenda.map((g,i) => '<div class="li"><span class="num">' + (i+1) + '</span><div><div class="nm">' + esc(g.name) + '</div><div class="meta">' + esc(g.dur) + '</div></div></div>').join('') +
    '<div class="note">自我介绍建议讲四点：<b>怎么称呼 / 做什么工作 / 平时爱好 / 想认识什么样的朋友</b></div></div>';
  html += '<div class="card"><div class="sec-t"><span class="num">2</span>报名须知</div>' +
    '<div class="sub">· 活动免费，男女名额分开计<br>· 迟到 15 分钟以上记录迟到（仅管理员可见）<br>· 有事请提前取消，爽约满 2 次暂停报名</div></div>';
  if (my && my.status === 'ok') {
    html += '<div class="card"><div class="row" style="justify-content:space-between"><b>你已报名 ✓</b><span class="sub">' +
      (my.checkin ? '已签到 · 编号 ' + my.checkin.no : '待签到') + '</span></div>' +
      '<div class="row" style="gap:10px;margin-top:12px">' +
      '<button class="btn" style="flex:1" data-go="#/checkin/' + a.id + '">扫码签到</button>' +
      '<button class="btn sm" onclick="A.cancel(' + Q + a.id + Q + ')">取消报名</button></div></div>';
  } else if (a.status === 'open') {
    const full = (me() && me().gender === '女') ? q.f >= a.quotaF : q.m >= a.quotaM;
    html += full
      ? '<button class="btn" disabled style="opacity:.5">名额已满</button>'
      : '<button class="btn yl" style="position:sticky;bottom:12px" onclick="A.toSignup(' + Q + a.id + Q + ')">我要报名</button>';
  }
  if (a.voteOpen) html += '<button class="btn" style="margin-top:12px;background:var(--pk)" data-go="#/vote/' + a.id + '">♥ 心动互选进行中 →</button>';
  $('#app').innerHTML = html;
};

/* ============ 登录（按需验证） ============ */
routes.login = function(){
  $('#app').innerHTML = backBtn('#/home','返回') +
    '<div class="card" style="text-align:center;padding:22px 16px">' +
    '<div class="row" style="justify-content:center;gap:10px;margin-bottom:10px">' + faceHtml('pk','smile') + faceHtml('bl','gl') + '</div>' +
    '<div class="h1">验证手机号</div><div class="sub" style="margin-top:4px">仅报名、签到时需要 · 首次验证后 90 天免验证</div></div>' +
    '<div class="card"><label class="f">手机号</label><input class="input" id="lgPhone" type="tel" maxlength="11" placeholder="11 位手机号">' +
    '<label class="f">验证码</label><div class="row" style="gap:8px">' +
    '<input class="input" id="lgCode" type="tel" maxlength="6" placeholder="6 位验证码（演示：任意）" style="flex:1">' +
    '<button class="btn sm yl" onclick="A.sendCode()">获取验证码</button></div>' +
    '<div style="margin-top:14px"><button class="btn gn" onclick="A.doLogin()">验证并继续</button></div></div>' +
    '<div class="note">演示账号：13800005678（管理员 Shane / 花名册张小五）<br>13900001111（李阿宝）· 任意未录入手机号 = 新朋友走待审核</div>';
};

/* ============ 报名确认 ============ */
routes.signup = function(id){
  if (!needLogin('#/signup/' + id)) return;
  const a = actById(id); if (!a) { go('#/home'); return; }
  const u = me(), ros = rosterOf(u.phone);
  const inRoster = !!ros;
  const name = inRoster ? ros.name : u.name;
  const gender = inRoster ? ros.gender : (u.gender || '');
  $('#app').innerHTML = backBtn('#/detail/' + id) +
    '<div class="card"><div class="sec-t"><span class="num">1</span>确认报名信息</div>' +
    '<div class="li"><div style="flex:1"><div class="nm">' + esc(name) + ' <span class="tag ' + (gender==='女'?'pk':'bl') + '" style="font-size:10px">' + esc(gender || '待填') + '</span></div>' +
    '<div class="meta">' + (inRoster ? '来自花名册 · 不可修改' : '新朋友 · 提交后等管理员确认') + '</div></div></div>' +
    '<div class="li"><div style="flex:1"><div class="nm">' + fmtPhone(u.phone) + '</div><div class="meta">已验证 · 你的唯一身份</div></div></div></div>' +
    '<div class="card"><div class="sec-t"><span class="num">2</span>报名承诺</div>' +
    '<label class="chk"><input type="checkbox" id="promise" checked><span>我保证准时到场，有事提前取消。<br>爽约满 2 次暂停报名，需管理员恢复。</span></label></div>' +
    '<button class="btn yl" onclick="A.signup(' + Q + id + Q + ')">确认报名</button>' +
    '<div class="note">信息仅用于本群内部活动，不外传。截止时间前可自助取消。</div>';
};

/* ============ 扫码签到 ============ */
routes.checkin = function(id){
  if (!needLogin('#/checkin/' + id)) return;
  const a = actById(id); if (!a) { go('#/home'); return; }
  const my = myReg(id);
  if (!my || my.status !== 'ok') { toast('你还没有报名本场'); go('#/detail/' + id); return; }
  if (my.checkin) {
    $('#app').innerHTML = backBtn('#/detail/' + id) +
      '<div class="card" style="text-align:center;padding:24px 16px">' +
      '<span class="face smile" style="--fc:var(--gn);width:64px;height:64px;display:inline-block"><i class="l" style="width:14px;height:18px;top:15px;left:16px"></i><i class="r" style="width:14px;height:18px;top:15px;right:16px"></i><b style="width:22px;height:10px;bottom:15px;border-width:3.5px"></b></span>' +
      '<div class="h1" style="margin-top:12px">已签到</div>' +
      '<div class="sub">到场时间 ' + my.checkin.time + (my.checkin.late ? ' · 迟到' : ' · 准时 ✓') + '</div>' +
      '<div class="row" style="justify-content:center;margin-top:14px"><span class="tag yl" style="font-size:15px;padding:7px 18px">本场编号 ' + my.checkin.no + '</span></div>' +
      '<div class="sub" style="margin-top:8px">编号即心动互选号码牌，全程匿名</div></div>' +
      (a.voteOpen ? '<button class="btn" style="background:var(--pk)" data-go="#/vote/' + id + '">♥ 心动互选进行中 →</button>' : '') +
      '<button class="btn" style="margin-top:12px" data-go="#/my">查看我的报名 →</button>';
    return;
  }
  $('#app').innerHTML = backBtn('#/detail/' + id) +
    '<div class="card" style="text-align:center;padding:24px 16px">' +
    '<div class="h1">扫码签到</div><div class="sub" style="margin-top:6px">现场扫描管理员出示的动态二维码<br>演示环境点击下方按钮模拟扫码</div></div>' +
    '<button class="btn yl" onclick="A.checkin(' + Q + id + Q + ')">模拟扫码 · 立即签到</button>' +
    '<div class="note">二维码每 30 秒刷新，截图转发无效。签到成功自动发本场编号。</div>';
};

/* ============ 心动投票 ============ */
routes.vote = function(id){
  if (!needLogin('#/vote/' + id)) return;
  const a = actById(id); if (!a) { go('#/home'); return; }
  const my = myReg(id);
  if (!my || !my.checkin) { toast('签到后才能参与心动互选'); go('#/checkin/' + id); return; }
  const myNo = my.checkin.no;
  const nums = checkedIn(id).map(r => r.checkin.no).filter(n => n !== myNo);
  const myVotes = db.votes.filter(v => v.actId === id && v.voterNo === myNo).map(v => v.targetNo);
  if (!a.voteOpen) {
    /* 展示配对结果（若有） */
    const cpWith = db.votes.filter(v => v.actId === id && v.voterNo === myNo)
      .map(v => v.targetNo).find(t => db.votes.some(w => w.actId === id && w.voterNo === t && w.targetNo === myNo));
    $('#app').innerHTML = backBtn('#/detail/' + id) +
      '<div class="card" style="text-align:center;padding:22px 16px">' + faceHtml('pk','smile') +
      '<div class="h1" style="margin-top:10px">' + (cpWith ? '恭喜，双向心动 ♥' : '本轮心动已截止') + '</div>' +
      (cpWith ? '<div class="sub" style="margin-top:6px">你和 <b style="color:var(--pk)">编号 ' + cpWith + '</b> 互选成功<br>联系方式自行交换，祝愉快</div>'
              : '<div class="sub" style="margin-top:6px">单向心动不会公开，下次现场加油</div>') + '</div>';
    return;
  }
  $('#app').innerHTML = backBtn('#/detail/' + id) +
    '<div class="card" style="text-align:center"><div class="sub">你的本场编号</div>' +
    '<div style="font-size:52px;font-weight:900;color:var(--pk);line-height:1.2">' + myNo + '</div>' +
    '<div class="sub">签到时已自动发放 · 全程匿名</div></div>' +
    '<div class="card"><div class="spread"><span class="tag gn">投票窗口开放中</span><span class="sub" id="voteCnt" style="font-weight:800">已选 ' + myVotes.length + '/3</span></div>' +
    '<div class="sec-t" style="margin-top:12px"><span class="num">1</span>点选心动编号（可取消）</div>' +
    '<div class="row" style="gap:8px;flex-wrap:wrap">' +
    nums.map(n => '<span class="tag' + (myVotes.includes(n) ? ' yl' : '') + '" style="font-size:14px;padding:8px 16px;cursor:pointer" onclick="A.toggleVote(' + Q + id + Q + ',' + n + ',this)">' + n + '</span>').join('') +
    '</div><div style="margin-top:14px"><button class="btn yl" onclick="A.submitVote(' + Q + id + Q + ')">提交心动投票</button></div></div>' +
    '<div class="note">只交换编号，不公布联系方式。双向命中各自看到对方编号；单向永不公开。截止后不可改投。</div>';
};

/* ============ 我的 ============ */
routes.my = function(){
  if (!needLogin('#/my')) return;
  const u = me(), ros = rosterOf(u.phone);
  const mine = db.regs.filter(r => r.phone === u.phone);
  const ok = mine.filter(r => r.status === 'ok');
  const arrived = ok.filter(r => r.checkin).length;
  const rate = ok.length ? Math.round(arrived / ok.length * 100) : 100;
  const absence = ros ? ros.absence : 0;
  let html = '<div class="topbar"><div class="row" style="gap:12px">' + faceHtml('pk','smile') +
    '<div><div class="t">' + esc(u.name) + '</div><div class="sub">' + esc(u.gender || '') + ' · ' + fmtPhone(u.phone) +
    (ros ? ' · 群友' : ' · 新朋友') + '</div></div></div></div>';
  html += '<div class="stats"><div class="stat"><div class="v">' + ok.length + '</div><div class="k">参加过</div></div>' +
    '<div class="stat"><div class="v" style="color:var(--gn)">' + rate + '%</div><div class="k">到场率</div></div>' +
    '<div class="stat"><div class="v" style="color:var(--rd)">' + absence + '</div><div class="k">爽约</div></div></div>';
  const upcoming = ok.filter(r => { const a = actById(r.actId); return a && a.status !== 'archived'; });
  html += '<div class="card"><div class="sec-t"><span class="num">1</span>即将参加</div>';
  html += upcoming.length ? upcoming.map(r => {
    const a = actById(r.actId);
    return '<div class="li"><div style="flex:1"><div class="nm">' + esc(a.title) + '</div><div class="meta">' + esc(a.date) + ' ' + esc(a.start) + (r.checkin ? ' · 已签到' : ' · 待签到') + '</div></div>' +
      '<button class="btn sm" data-go="#/checkin/' + a.id + '">' + (r.checkin ? '编号' + r.checkin.no : '签到') + '</button></div>';
  }).join('') : '<div class="sub">暂无，去首页看看 →</div>';
  html += '</div><div class="card"><div class="sec-t"><span class="num">2</span>历史记录</div>';
  const past = ok.filter(r => { const a = actById(r.actId); return a && a.status === 'archived'; });
  html += past.length ? past.map(r => {
    const a = actById(r.actId);
    return '<div class="li"><div style="flex:1"><div class="nm">' + esc(a.title) + '</div><div class="meta">' + esc(a.date) + (r.checkin ? ' · ' + r.checkin.time + ' 到场' : ' · 未到场') + '</div></div>' +
      (r.noShow ? '<span class="tag rd">爽约</span>' : '<span class="tag gn">已签到</span>') + '</div>';
  }).join('') : '<div class="sub">还没有历史场次</div>';
  html += '</div>';
  if (absence >= 1) html += '<div class="note">当前爽约 ' + absence + ' 次' + (absence >= 2 ? '，已暂停报名，需管理员恢复' : '，再爽约 1 次将暂停报名') + '。提前取消不计爽约。</div>';
  html += '<button class="btn" style="margin-top:6px" onclick="A.logout()">退出登录（清除本机 90 天免验证）</button>';
  $('#app').innerHTML = html;
};

/* ============ 管理端：工作台 ============ */
function guardAdmin(){
  if (isAdmin()) return true;
  $('#app').innerHTML = backBtn('#/home','返回') + '<div class="card" style="text-align:center;padding:26px 16px">' + faceHtml('rd','flat') + '<div class="h1" style="margin-top:10px">仅管理员可访问</div><div class="sub" style="margin-top:6px">用管理员手机号登录后再来</div></div>';
  return false;
}
routes.workbench = function(){
  if (!guardAdmin()) return;
  const open = db.activities.find(a => a.status === 'open');
  const pend = open ? actRegs(open.id).filter(r => r.status === 'pending').length : 0;
  const arrived = db.regs.filter(r => r.checkin).length;
  let html = '<div class="topbar"><div class="row" style="gap:12px">' + faceHtml('bl','gl') +
    '<div><div class="t">管理工作台</div><div class="sub">第 ' + (open ? open.no : '-') + ' 期进行中</div></div></div></div>';
  html += '<div class="stats"><div class="stat"><div class="v">' + db.activities.length + '</div><div class="k">总场次</div></div>' +
    '<div class="stat"><div class="v" style="color:var(--gn)">' + arrived + '</div><div class="k">累计签到</div></div>' +
    '<div class="stat"><div class="v" style="color:var(--pk)">' + db.roster.length + '</div><div class="k">花名册</div></div></div>';
  if (open) {
    const q = quotasOf(open);
    html += '<div class="card"><div class="spread"><span class="tag yl">报名中</span><span class="sub">第 ' + open.no + ' 期</span></div>' +
      '<div class="nm" style="margin:6px 0 2px;font-weight:800">' + esc(open.title) + '</div>' +
      '<div class="sub">' + esc(open.date) + ' ' + esc(open.start) + ' · ' + esc(open.venue) + '</div>' +
      '<div class="qb" style="margin-top:8px">' + quotaRow('男','bl',q.m,open.quotaM) + quotaRow('女','pk',q.f,open.quotaF) + '</div>' +
      '<div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap">' +
      '<button class="btn sm" data-go="#/signups">报名审核' + (pend ? ' (' + pend + ')' : '') + '</button>' +
      '<button class="btn sm gn" data-go="#/qrcode/' + open.id + '">扫码签到</button>' +
      '<button class="btn sm" data-go="#/settle/' + open.id + '">结算归档</button></div>' +
      '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap">' +
      (open.voteOpen
        ? '<button class="btn sm pk" style="background:var(--pk)" onclick="A.closeVote(' + Q + open.id + Q + ')">关闭互选 · 生成配对</button>'
        : '<button class="btn sm pk" style="background:var(--pk)" onclick="A.openVote(' + Q + open.id + Q + ')">开放心动互选</button>') +
      '<button class="btn sm" data-go="#/detail/' + open.id + '">预览成员端</button></div></div>';
  } else {
    html += '<div class="card" style="text-align:center;padding:20px 16px">' + faceHtml('yl','smile') +
      '<div class="sub" style="margin-top:8px">当前没有报名中的活动</div>' +
      '<button class="btn yl" style="margin-top:12px" data-go="#/create">＋ 发起下一期</button></div>';
  }
  html += '<div class="sec-t" style="margin-top:16px"><span class="num">2</span>常用功能</div>' +
    '<div class="grid">' +
    '<div class="gcell" data-go="#/create"><span class="dot" style="background:var(--yl)"></span>发起活动</div>' +
    '<div class="gcell" data-go="#/roster"><span class="dot" style="background:var(--gn)"></span>花名册</div>' +
    '<div class="gcell" data-go="#/admins"><span class="dot" style="background:var(--bl)"></span>管理员</div>' +
    '<div class="gcell" data-go="#/remind"><span class="dot" style="background:var(--pk)"></span>提醒文案</div>' +
    '</div>';
  const past = db.activities.filter(a => a.status === 'archived').sort((x,y) => y.no - x.no);
  html += '<div class="card"><div class="sec-t"><span class="num">3</span>历史场次</div>' +
    (past.length ? past.map(a => '<div class="li"><div style="flex:1"><div class="nm">' + esc(a.title) + '</div><div class="meta">' + esc(a.date) + ' · ' + checkedIn(a.id).length + ' 人到场</div></div><button class="btn sm" data-go="#/detail/' + a.id + '">详情</button></div>').join('') : '<div class="sub">还没有归档的场次</div>') + '</div>';
  $('#app').innerHTML = html;
};

/* ============ 管理端：发起活动 ============ */
routes.create = function(){
  if (!guardAdmin()) return;
  if (db.activities.some(a => a.status === 'open')) {
    $('#app').innerHTML = backBtn('#/workbench','工作台') +
      '<div class="card" style="text-align:center;padding:22px 16px">' + faceHtml('yl','flat') +
      '<div class="h1" style="margin-top:10px">已有报名中的活动</div>' +
      '<div class="sub" style="margin-top:6px">同一时间只保留一场，先归档上一期<br>避免群友报错场次</div>' +
      '<button class="btn yl" style="margin-top:14px" data-go="#/workbench">返回工作台</button></div>';
    return;
  }
  $('#app').innerHTML = backBtn('#/workbench','工作台') +
    '<div class="card"><div class="sec-t"><span class="num">1</span>活动信息</div>' +
    '<label class="f">活动标题</label><input class="input" id="cTitle" placeholder="例：第 23 期 · 周五线下见面局">' +
    '<label class="f">日期</label><input class="input" id="cDate" placeholder="例：11-14">' +
    '<div class="row" style="gap:8px"><div style="flex:1"><label class="f">开始</label><input class="input" id="cStart" placeholder="19:30"></div>' +
    '<div style="flex:1"><label class="f">结束</label><input class="input" id="cEnd" placeholder="21:30"></div></div>' +
    '<label class="f">地点</label><input class="input" id="cVenue" placeholder="例：五迷小馆 · 鼓楼东大街店"></div>' +
    '<div class="card"><div class="sec-t"><span class="num">2</span>名额与截止</div>' +
    '<div class="row" style="gap:8px"><div style="flex:1"><label class="f">男生名额</label><input class="input" id="cQm" type="number" value="5"></div>' +
    '<div style="flex:1"><label class="f">女生名额</label><input class="input" id="cQf" type="number" value="5"></div></div>' +
    '<label class="f">报名截止</label><input class="input" id="cDl" placeholder="例：11-13 22:00">' +
    '<div class="note">流程默认使用固定模板（签到入场 → 主理人开场 → 热场自我介绍 → 自由交流 → 合影散场），发布后可在成员端预览。</div></div>' +
    '<button class="btn yl" style="position:sticky;bottom:12px" onclick="A.createAct()">发布活动</button>';
};

/* ============ 管理端：报名审核 ============ */
routes.signups = function(){
  if (!guardAdmin()) return;
  const open = db.activities.find(a => a.status === 'open');
  if (!open) { $('#app').innerHTML = backBtn('#/workbench','工作台') + '<div class="note">当前没有报名中的活动</div>'; return; }
  const pend = actRegs(open.id).filter(r => r.status === 'pending');
  const okl = actRegs(open.id).filter(r => r.status === 'ok');
  let html = backBtn('#/workbench','工作台');
  html += '<div class="card"><div class="sec-t"><span class="num">1</span>待审核（新朋友）' + (pend.length ? ' ' + pend.length + ' 人' : '') + '</div>';
  html += pend.length ? pend.map(g =>
    '<div class="li"' + (g.noShow ? ' style="background:#fdeeee;border-radius:10px;padding:8px;margin:0 -8px"' : '') + '><div style="flex:1">' +
    '<div class="nm">' + esc(g.name) + ' <span class="tag ' + (g.gender === '女' ? 'pk' : 'bl') + '" style="font-size:10px">' + esc(g.gender) + '</span>' +
    (g.noShow ? ' <span class="tag rd" style="font-size:10px">历史爽约</span>' : '') + '</div>' +
    '<div class="meta">' + fmtPhone(g.phone) + ' · 非花名册成员</div></div>' +
    '<div class="row" style="gap:6px"><button class="btn sm gn" onclick="A.appr(' + Q + g.id + Q + ')">通过</button>' +
    '<button class="btn sm ghost" onclick="A.rej(' + Q + g.id + Q + ')">拒绝</button></div></div>').join('')
    : '<div class="sub">暂无待审核。花名册成员报名自动通过，新朋友报名后出现在这里。</div>';
  html += '</div><div class="card"><div class="sec-t"><span class="num">2</span>已通过 ' + okl.length + ' 人</div>';
  html += okl.length ? okl.map(g =>
    '<div class="li"><div style="flex:1"><div class="nm">' + esc(g.name) + ' <span class="tag ' + (g.gender === '女' ? 'pk' : 'bl') + '" style="font-size:10px">' + esc(g.gender) + '</span></div>' +
    '<div class="meta">' + fmtPhone(g.phone) + (g.checkin ? ' · 已签 ' + g.checkin.time : ' · 待签到') + '</div></div>' +
    (g.checkin ? '' : '<button class="btn sm" onclick="A.mcheckin(' + Q + g.id + Q + ')">代签</button>') + '</div>').join('')
    : '<div class="sub">还没有人报名</div>';
  html += '</div>';
  $('#app').innerHTML = html;
};

/* ============ 管理端：扫码签到 ============ */
routes.qrcode = function(id){
  if (!guardAdmin()) return;
  const a = id ? actById(id) : db.activities.find(x => x.status === 'open');
  if (!a) { go('#/workbench'); return; }
  let html = backBtn('#/workbench','工作台');
  html += '<div class="card" style="text-align:center;padding:22px 16px">' +
    '<div class="sub">现场出示 · 每 30 秒自动刷新 · 截图无效</div>' +
    '<div class="qrbox" style="margin-top:12px"><span>第' + a.no + '期</span></div>' +
    '<div style="margin-top:12px;font-size:34px;font-weight:900;color:var(--yl)">00:<span id="cdT">30</span></div>' +
    '<div class="sub">已签到 ' + checkedIn(a.id).length + ' / ' + actRegs(a.id).filter(r => r.status === 'ok').length + ' 人</div></div>';
  const wait = actRegs(a.id).filter(r => r.status === 'ok' && !r.checkin);
  html += '<div class="card"><div class="sec-t"><span class="num">1</span>未签到（可代签）</div>' +
    (wait.length ? wait.map(g =>
      '<div class="li"><div style="flex:1"><div class="nm">' + esc(g.name) + '</div><div class="meta">' + esc(g.gender) + ' · ' + fmtPhone(g.phone) + '</div></div>' +
      '<button class="btn sm" onclick="A.mcheckin(' + Q + g.id + Q + ')">代签</button></div>').join('')
      : '<div class="sub">全部到场 ✓</div>') + '</div>';
  const done = checkedIn(a.id);
  html += '<div class="card"><div class="sec-t"><span class="num">2</span>到场名单</div>' +
    (done.length ? done.map(g =>
      '<div class="li"><span class="num">' + g.checkin.no + '</span><div style="flex:1"><div class="nm">' + esc(g.name) + '</div>' +
      '<div class="meta">' + g.checkin.time + (g.checkin.late ? ' · 迟到' : '') + '</div></div></div>').join('')
      : '<div class="sub">还没有人签到</div>') + '</div>';
  $('#app').innerHTML = html;
  let t = 30;
  const tick = function(){
    t -= 1; if (t <= 0) t = 30;
    const el = document.querySelector('#cdT'); if (el) el.textContent = t;
  };
  A._qrTimer = setInterval(tick, 1000);
};

/* ============ 管理端：结算归档 ============ */
routes.settle = function(id){
  if (!guardAdmin()) return;
  const a = actById(id); if (!a) { go('#/workbench'); return; }
  const rs = actRegs(id).filter(r => r.status === 'ok');
  let html = backBtn('#/workbench','工作台');
  html += '<div class="card"><div class="h1">结算 · 第 ' + a.no + ' 期</div>' +
    '<div class="sub" style="margin-top:4px">' + esc(a.date) + ' ' + esc(a.start) + ' · ' + esc(a.venue) + '</div>' +
    '<div class="note">勾选「未到场」的人会计 1 次爽约并累计到花名册；满 2 次自动暂停报名。确认后本场归档，成员端「我的」可见历史记录。</div></div>';
  html += '<div class="card"><div class="sec-t"><span class="num">1</span>到场核对（' + rs.length + ' 人）</div>' +
    (rs.length ? rs.map(g =>
      '<div class="li"><div style="flex:1"><div class="nm">' + esc(g.name) + ' <span class="tag ' + (g.gender === '女' ? 'pk' : 'bl') + '" style="font-size:10px">' + esc(g.gender) + '</span></div>' +
      '<div class="meta">' + (g.checkin ? g.checkin.time + ' 到场' + (g.checkin.late ? ' · 迟到' : '') : '未签到') + '</div></div>' +
      '<label class="chk" style="margin:0"><input type="checkbox" id="cb-' + g.id + '"><span>未到场</span></label></div>').join('')
      : '<div class="sub">本场无人报名</div>') + '</div>';
  html += '<button class="btn rd" style="background:var(--rd);position:sticky;bottom:12px" onclick="A.settleDo(' + Q + id + Q + ')">确认结算并归档</button>';
  $('#app').innerHTML = html;
};

/* ============ 管理端：花名册 ============ */
function rosterListHtml(){
  const k = (A._rq || '').trim();
  let list = db.roster.slice().sort((a,b) => a.name.localeCompare(b.name, 'zh'));
  if (k) list = list.filter(r => (r.name + r.phone + (r.mbti || '') + (r.city || '')).indexOf(k) >= 0);
  if (!list.length) return '<div class="sub">没有匹配的成员</div>';
  return list.map(r =>
    '<div class="li"><div style="flex:1"><div class="nm">' + esc(r.name) + ' <span class="tag ' + (r.gender === '女' ? 'pk' : 'bl') + '" style="font-size:10px">' + esc(r.gender) + '</span>' +
    (r.absence >= 2 ? ' <span class="tag rd" style="font-size:10px">已暂停</span>' : (r.absence === 1 ? ' <span class="tag yl" style="font-size:10px">爽约1</span>' : '')) + '</div>' +
    '<div class="meta">' + fmtPhone(r.phone) + (r.mbti ? ' · ' + esc(r.mbti) : '') + (r.city ? ' · ' + esc(r.city) : '') + '</div></div>' +
    '<div class="row" style="gap:6px">' +
    (r.absence > 0 ? '<button class="btn sm gn" onclick="A.restoreAbs(' + Q + r.id + Q + ')">恢复</button>' : '') +
    '<button class="btn sm" data-go="#/member/' + r.id + '">编辑</button></div></div>').join('');
}
routes.roster = function(){
  if (!guardAdmin()) return;
  let html = backBtn('#/workbench','工作台');
  html += '<div class="card"><input class="input" id="rQ" placeholder="搜索：姓名 / 手机号 / MBTI / 城市" value="' + esc(A._rq || '') + '" oninput="A.rSearch(this.value)">' +
    '<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><span class="sub" style="font-weight:800">共 ' + db.roster.length + ' 人</span>' +
    '<span style="flex:1"></span><button class="btn sm" onclick="A.addMem()">新增</button>' +
    '<button class="btn sm ghost" onclick="A.impToggle()">批量导入</button></div>' +
    '<div id="impBox" style="display:none;margin-top:10px">' +
    '<textarea class="input" id="impT" rows="4" placeholder="每行一位：姓名,性别,出生年月,城市,手机号&#10;例：王小明,男,1995-06,朝阳,13912345678"></textarea>' +
    '<button class="btn sm gn" style="margin-top:8px" onclick="A.importMem()">开始导入</button></div></div>';
  html += '<div class="card"><div id="rList">' + rosterListHtml() + '</div></div>';
  html += '<div class="note">花名册成员报名自动通过；手机号是唯一身份，改手机号等于换了一个人。「恢复」用于解除爽约 2 次的报名限制。</div>';
  $('#app').innerHTML = html;
};

/* ============ 管理端：成员编辑 ============ */
routes.member = function(rid){
  if (!guardAdmin()) return;
  const r = db.roster.find(x => x.id === rid); if (!r) { go('#/roster'); return; }
  const sel = function(v, cur){ return v === cur ? ' selected' : ''; };
  $('#app').innerHTML = backBtn('#/roster','花名册') +
    '<div class="card"><div class="sec-t"><span class="num">1</span>基础信息</div>' +
    '<label class="f">姓名</label><input class="input" id="mName" value="' + esc(r.name) + '">' +
    '<label class="f">性别</label><select class="input" id="mGender"><option value="男"' + sel('男', r.gender) + '>男</option><option value="女"' + sel('女', r.gender) + '>女</option></select>' +
    '<label class="f">出生年月</label><input class="input" id="mBirth" placeholder="1995-06" value="' + esc(r.birth_ym || '') + '">' +
    '<label class="f">常驻区域</label><input class="input" id="mCity" placeholder="朝阳" value="' + esc(r.city || '') + '">' +
    '<label class="f">手机号（唯一身份）</label><input class="input" id="mPhone" maxlength="11" value="' + esc(r.phone) + '"></div>' +
    '<div class="card"><div class="sec-t"><span class="num">2</span>了解 Ta（管理员可见）</div>' +
    '<label class="f">MBTI</label><input class="input" id="mMbti" placeholder="ENFP" value="' + esc(r.mbti || '') + '">' +
    '<label class="f">一句话介绍</label><input class="input" id="mBio" value="' + esc(r.bio || '') + '">' +
    '<label class="f">介绍人（担保人）</label><input class="input" id="mGuar" value="' + esc(r.guarantor || '') + '">' +
    '<label class="f">活跃度</label><select class="input" id="mLvl"><option' + (r.activity_level === '活跃' ? ' selected' : '') + '>活跃</option><option' + (r.activity_level === '偶尔冒泡' ? ' selected' : '') + '>偶尔冒泡</option><option' + (r.activity_level === '潜水' ? ' selected' : '') + '>潜水</option></select>' +
    '<label class="f">备注（仅管理员可见）</label><input class="input" id="mNote" placeholder="例：只周六有空" value="' + esc(r.note || '') + '"></div>' +
    '<div class="row" style="gap:8px"><button class="btn yl" style="flex:1" onclick="A.saveMem(' + Q + rid + Q + ')">保存</button>' +
    '<button class="btn ghost" data-go="#/roster">取消</button></div>' +
    '<div class="note">当前爽约 ' + r.absence + ' 次' + (r.absence >= 2 ? ' · 已暂停报名' : '') + '。成员本人看不到这些资料。</div>';
};

/* ============ 管理端：管理员设置 ============ */
routes.admins = function(){
  if (!guardAdmin()) return;
  let html = backBtn('#/workbench','工作台');
  html += '<div class="card"><div class="sec-t"><span class="num">1</span>现有管理员</div>' +
    db.admins.map(a =>
      '<div class="li"><div style="flex:1"><div class="nm">' + esc(a.name) + ' <span class="tag yl" style="font-size:10px">' + esc(a.role || '管理员') + '</span></div>' +
      '<div class="meta">' + fmtPhone(a.phone) + '</div></div>' +
      (me().phone === a.phone ? '<span class="tag gn" style="font-size:10px">我</span>' : '<button class="btn sm ghost" onclick="A.delAdmin(' + Q + a.phone + Q + ')">移除</button>') + '</div>').join('') + '</div>';
  html += '<div class="card"><div class="sec-t"><span class="num">2</span>添加管理员</div>' +
    '<label class="f">手机号（须已在花名册）</label><input class="input" id="aPhone" maxlength="11" placeholder="11 位手机号">' +
    '<label class="f">备注名</label><input class="input" id="aName" placeholder="例：阿宝">' +
    '<label class="f">角色</label><input class="input" id="aRole" placeholder="例：主管理员 / 签到员">' +
    '<button class="btn yl" style="margin-top:12px" onclick="A.addAdmin()">添加</button></div>' +
    '<div class="note">管理员可见：花名册、待审核资料、签到迟到记录。不能移除自己和最后一名管理员。</div>';
  $('#app').innerHTML = html;
};

/* ============ 管理端：提醒文案 ============ */
routes.remind = function(){
  if (!guardAdmin()) return;
  const NL = String.fromCharCode(10);
  const t1 = '今晚 19:30 五迷小馆见！记得提前 15 分钟到，扫码签到后领号码牌。有事提前说，爽约 2 次会暂停报名哦。';
  const t2 = '今晚 22:00 报名截止！名额有限，想来的抓紧报名 →';
  const t3 = '心动互选规则：每人最多选 3 个心动编号，只交换编号不公开联系方式；互选成功各自在「我的」看到对方编号，联系方式现场自行交换。';
  const card = function(no, title, txt){
    return '<div class="card"><div class="sec-t"><span class="num">' + no + '</span>' + title + '</div>' +
      '<textarea class="input" id="cp' + no + '" rows="3" readonly>' + txt + '</textarea>' +
      '<button class="btn sm yl" style="margin-top:8px" onclick="A.copyText(' + Q + 'cp' + no + Q + ')">复制文案</button></div>';
  };
  $('#app').innerHTML = backBtn('#/workbench','工作台') + card(1, '开场提醒（活动当天下午发）', t1) +
    card(2, '报名截止提醒（截止前 2 小时发）', t2) +
    card(3, '心动互选规则说明（开场时发）', t3) +
    '<div class="note">点「复制文案」后直接粘贴到微信群。文案可先粘贴到别处改好再用。</div>';
};

/* ============ 动作 ============ */
const A = {
  _qrTimer: null,
  _rq: '',
  sendCode(){ toast('验证码已发送（演示环境：任意 6 位数字均可）'); },
  doLogin(){
    const p = ($('#lgPhone').value || '').trim();
    if (!/^1[0-9]{10}$/.test(p)) { toast('请输入 11 位手机号'); return; }
    const ros = rosterOf(p);
    const adm = db.admins.find(a => a.phone === p);
    db.session = { phone: p, name: ros ? ros.name : (adm ? adm.name : '新朋友'), gender: ros ? ros.gender : '', ts: Date.now() };
    const nx = db.next || '#/home';
    db.next = null;
    save();
    toast('登录成功，本机 90 天免验证');
    go(nx);
  },
  logout(){
    db.session = null; db.next = null; save();
    toast('已退出登录');
    go('#/home'); render();
  },
  toSignup(id){
    const a = actById(id);
    if (!a || a.status !== 'open') { toast('活动不在报名中'); return; }
    if (!me()) { go('#/signup/' + id); return; }
    const ros = rosterOf(me().phone);
    if (ros && ros.absence >= 2) { toast('爽约满 2 次已暂停报名，请联系管理员恢复'); return; }
    if (myReg(id)) { toast('你已在本场报名中'); go('#/detail/' + id); return; }
    const q = quotasOf(a);
    const isF = me().gender === '女';
    if (isF ? q.f >= a.quotaF : q.m >= a.quotaM) { toast('该性别名额已满'); return; }
    go('#/signup/' + id);
  },
  signup(id){
    const a = actById(id);
    if (!a || a.status !== 'open') { toast('活动不在报名中'); return; }
    const u = me();
    if (!u) { go('#/login'); return; }
    if (!$('#promise') || !$('#promise').checked) { toast('请先勾选报名承诺'); return; }
    if (myReg(id)) { toast('请勿重复报名'); go('#/detail/' + id); return; }
    const ros = rosterOf(u.phone);
    if (ros && ros.absence >= 2) { toast('爽约满 2 次已暂停报名'); return; }
    const g = ros ? ros.gender : u.gender;
    if (g !== '男' && g !== '女') { toast('缺少性别信息，请联系管理员录入花名册'); return; }
    const q = quotasOf(a);
    if (g === '女' ? q.f >= a.quotaF : q.m >= a.quotaM) { toast('该性别名额已满'); return; }
    db.regs.push({ id: 'g' + Date.now(), actId: id, phone: u.phone, name: ros ? ros.name : u.name, gender: g, status: ros ? 'ok' : 'pending', checkin: null, noShow: false });
    save();
    toast(ros ? '报名成功！现场扫码签到领编号' : '已提交，等管理员确认后即可参加');
    go('#/detail/' + id);
  },
  cancel(id){
    const r = myReg(id); if (!r) return;
    const a = actById(id);
    if (a && a.status === 'archived') { toast('活动已结束'); return; }
    if (r.checkin) { toast('已签到，无法取消'); return; }
    db.regs = db.regs.filter(x => x.id !== r.id);
    save();
    toast('已取消，下次早点来');
    render();
  },
  checkin(id){
    const r = myReg(id); if (!r) return;
    if (r.status !== 'ok') { toast('报名还未通过审核'); return; }
    if (r.checkin) { toast('你已签到'); return; }
    const a = actById(id);
    const now = new Date();
    const hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    r.checkin = { time: hm, late: a ? hm > a.start : false, no: checkedIn(id).length + 1 };
    save();
    toast('签到成功！你的编号是 ' + r.checkin.no);
    render();
  },
  toggleVote(id, n, el){
    const my = myReg(id); if (!my || !my.checkin) return;
    const a = actById(id);
    if (!a || !a.voteOpen) { toast('投票已截止'); return; }
    const myNo = my.checkin.no;
    const ex = db.votes.find(v => v.actId === id && v.voterNo === myNo && v.targetNo === n);
    if (ex) { db.votes = db.votes.filter(v => v !== ex); el.classList.remove('yl'); }
    else {
      if (db.votes.filter(v => v.actId === id && v.voterNo === myNo).length >= 3) { toast('最多选 3 个心动编号'); return; }
      db.votes.push({ actId: id, voterNo: myNo, targetNo: n });
      el.classList.add('yl');
    }
    save();
    const cnt = document.querySelector('#voteCnt');
    if (cnt) cnt.textContent = '已选 ' + db.votes.filter(v => v.actId === id && v.voterNo === myNo).length + '/3';
  },
  submitVote(id){
    const my = myReg(id); if (!my) return;
    const n = db.votes.filter(v => v.actId === id && v.voterNo === my.checkin.no).length;
    if (!n) { toast('至少选 1 个心动编号'); return; }
    toast('已提交 ' + n + ' 票，截止前可修改');
    go('#/detail/' + id);
  },
  appr(gid){
    const g = db.regs.find(x => x.id === gid); if (!g) return;
    const a = actById(g.actId);
    const q = quotasOf(g.actId);
    if (g.gender === '女' ? q.f >= a.quotaF : q.m >= a.quotaM) { toast('名额已满，先拒绝一位或扩容'); return; }
    g.status = 'ok'; save();
    toast('已通过：' + g.name);
    render();
  },
  rej(gid){
    const g = db.regs.find(x => x.id === gid); if (!g) return;
    db.regs = db.regs.filter(x => x.id !== gid);
    save();
    toast('已拒绝并移除报名');
    render();
  },
  mcheckin(gid){
    const g = db.regs.find(x => x.id === gid);
    if (!g || g.checkin) return;
    const now = new Date();
    const hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const a = actById(g.actId);
    g.checkin = { time: hm, late: a ? hm > a.start : false, no: checkedIn(g.actId).length + 1 };
    save();
    toast('已代签：' + g.name + '（' + g.checkin.no + ' 号）');
    render();
  },
  openVote(id){
    const a = actById(id); if (!a) return;
    if (checkedIn(id).length < 2) { toast('至少 2 人签到后再开放'); return; }
    a.voteOpen = true; save();
    toast('心动互选已开放，通知大家扫码投票');
    render();
  },
  closeVote(id){
    const a = actById(id); if (!a) return;
    a.voteOpen = false; a.settled = true;
    const vs = db.votes.filter(v => v.actId === id);
    db.pairs = (db.pairs || []).filter(p => p.actId !== id);
    vs.forEach(v => {
      const mut = vs.some(w => w.voterNo === v.targetNo && w.targetNo === v.voterNo);
      if (mut && v.voterNo < v.targetNo) db.pairs.push({ actId: id, a: v.voterNo, b: v.targetNo });
    });
    save();
    toast('已截止，双向配对 ' + db.pairs.filter(p => p.actId === id).length + ' 对已生成');
    render();
  },
  settleDo(id){
    const a = actById(id); if (!a) return;
    let n = 0;
    actRegs(id).filter(r => r.status === 'ok').forEach(r => {
      const cb = document.querySelector('#cb-' + r.id);
      if (cb && cb.checked) {
        r.noShow = true; n += 1;
        if (!r.checkin) { const ros = rosterOf(r.phone); if (ros) ros.absence = (ros.absence || 0) + 1; }
      }
    });
    a.status = 'archived'; a.voteOpen = false;
    save();
    toast('已归档' + (n ? '，标记爽约 ' + n + ' 人' : ''));
    go('#/workbench');
  },
  restoreAbs(rid){
    const r = db.roster.find(x => x.id === rid); if (!r) return;
    r.absence = 0; save();
    toast('已恢复 ' + r.name + ' 的报名资格');
    render();
  },
  rSearch(k){ A._rq = k; const box = document.querySelector('#rList'); if (box) box.innerHTML = rosterListHtml(); },
  impToggle(){
    const b = document.querySelector('#impBox');
    if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
  },
  saveMem(rid){
    const r = db.roster.find(x => x.id === rid); if (!r) return;
    const name = ($('#mName').value || '').trim();
    const phone = ($('#mPhone').value || '').trim();
    if (!name) { toast('姓名必填'); return; }
    if (!/^1[0-9]{10}$/.test(phone)) { toast('手机号需 11 位'); return; }
    if (db.roster.some(x => x.phone === phone && x.id !== rid)) { toast('该手机号已被其他成员使用'); return; }
    r.name = name; r.gender = $('#mGender').value;
    r.birth_ym = ($('#mBirth').value || '').trim();
    r.city = ($('#mCity').value || '').trim();
    r.phone = phone;
    r.mbti = ($('#mMbti').value || '').trim();
    r.bio = ($('#mBio').value || '').trim();
    r.guarantor = ($('#mGuar').value || '').trim();
    r.activity_level = $('#mLvl').value;
    r.note = ($('#mNote').value || '').trim();
    if (db.session && db.session.phone === phone) db.session.name = name;
    save();
    toast('已保存');
    go('#/roster');
  },
  addMem(){
    const nid = 'r' + Date.now();
    db.roster.push({ id: nid, name: '新成员', gender: '男', birth_ym: '', city: '', phone: '', mbti: '', bio: '', guarantor: '', activity_level: '偶尔冒泡', note: '', absence: 0 });
    save();
    toast('已新增，请完善资料并填手机号');
    go('#/member/' + nid);
  },
  importMem(){
    const NL = String.fromCharCode(10);
    const raw = ($('#impT').value || '').trim();
    if (!raw) { toast('请先粘贴名单'); return; }
    let okN = 0, skipN = 0;
    raw.split(NL).forEach(line => {
      const parts = line.split(/[,，]/).map(s => s.trim());
      if (!parts[0]) { skipN += 1; return; }
      const phone = parts.find(p => /^1[0-9]{10}$/.test(p));
      if (!phone) { skipN += 1; return; }
      if (db.roster.some(r => r.phone === phone)) { skipN += 1; return; }
      const gender = parts.find(p => p === '男' || p === '女') || '男';
      const birth = parts.find(p => /^[0-9]{4}-[0-9]{2}$/.test(p)) || '';
      const city = parts.filter(p => p && p !== phone && p !== gender && p !== birth && p !== parts[0]).join('');
      db.roster.push({ id: 'r' + Date.now() + Math.floor(Math.random() * 90), name: parts[0], gender: gender, birth_ym: birth, city: city, phone: phone, mbti: '', bio: '', guarantor: '', activity_level: '偶尔冒泡', note: '', absence: 0 });
      okN += 1;
    });
    save();
    toast('成功导入 ' + okN + ' 人' + (skipN ? '，跳过 ' + skipN + ' 条无效/重复' : ''));
    render();
  },
  addAdmin(){
    const p = ($('#aPhone').value || '').trim();
    if (!/^1[0-9]{10}$/.test(p)) { toast('手机号需 11 位'); return; }
    if (!rosterOf(p)) { toast('该手机号不在花名册，请先在花名册中添加'); return; }
    if (db.admins.some(a => a.phone === p)) { toast('Ta 已经是管理员'); return; }
    const ros = rosterOf(p);
    db.admins.push({ phone: p, name: ($('#aName').value || '').trim() || ros.name, role: ($('#aRole').value || '').trim() || '管理员' });
    save();
    toast('已添加管理员');
    render();
  },
  delAdmin(p){
    if (db.admins.length <= 1) { toast('至少保留一名管理员'); return; }
    if (me() && me().phone === p) { toast('不能移除自己'); return; }
    db.admins = db.admins.filter(a => a.phone !== p);
    save();
    toast('已移除');
    render();
  },
  copyText(id){
    const t = document.querySelector('#' + id); if (!t) return;
    t.focus(); t.select();
    let done = false;
    try { done = document.execCommand('copy'); } catch (e) { done = false; }
    toast(done ? '已复制，去微信粘贴' : '请长按文本手动复制');
  },
  createAct(){
    const title = ($('#cTitle').value || '').trim();
    const date = ($('#cDate').value || '').trim();
    const start = ($('#cStart').value || '').trim() || '19:30';
    const end = ($('#cEnd').value || '').trim() || '21:30';
    const venue = ($('#cVenue').value || '').trim();
    const qm = parseInt($('#cQm').value, 10) || 5;
    const qf = parseInt($('#cQf').value, 10) || 5;
    const dl = ($('#cDl').value || '').trim();
    if (!title || !date || !venue) { toast('标题、日期、地点为必填'); return; }
    if (qm < 1 || qm > 20 || qf < 1 || qf > 20) { toast('名额限 1-20 人'); return; }
    if (db.activities.some(a => a.status === 'open')) { toast('已有报名中的活动，请先归档'); return; }
    const no = db.activities.reduce((m, a) => Math.max(m, a.no), 0) + 1;
    const id = 'a' + Date.now();
    db.activities.push({ id: id, no: no, title: title, date: date, start: start, end: end, venue: venue, quotaM: qm, quotaF: qf, deadline: dl, status: 'open', agenda: smallAgenda(), voteOpen: false, settled: false });
    save();
    toast('第 ' + no + ' 期已发布！');
    go('#/detail/' + id);
  }
};
window.A = A;

/* ============ 启动 ============ */
document.body.addEventListener('click', function(e){
  const b = e.target.closest('[data-go]');
  if (b) go(b.getAttribute('data-go'));
  const s = e.target.closest('[data-act="switchId"]');
  if (s) A.logout();
});
render();
