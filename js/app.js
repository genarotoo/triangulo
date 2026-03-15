/* ═══════════════════════════════════════════
   TRIÁNGULO v5.0 — app.js
   El Triángulo Autoservicio — Junín, Bs As
═══════════════════════════════════════════ */

var db = null;
var COL = {
  schools:'schools', users:'users', messages:'messages',
  activity:'activity', presence:'presence', days:'days',
  masterProducts:'masterProducts', masterSchools:'masterSchools',
  templates:'templates'
};

/* ── FIREBASE ─────────────────────────────────────────── */
function initFirebase() {
  try {
    if (typeof firebase === 'undefined') return;
    if (!firebase.apps.length) {
      firebase.initializeApp({
        apiKey:"AIzaSyAaoTnp2VcW5KVtg4PJzQHCOQ3KuX0EYq8",
        authDomain:"call-party-cf18d.firebaseapp.com",
        projectId:"call-party-cf18d",
        storageBucket:"call-party-cf18d.firebasestorage.app",
        messagingSenderId:"682073098919",
        appId:"1:682073098919:web:cd0d2971daf707622be982"
      });
    }
    db = firebase.firestore();
  } catch(e) { console.warn('Firebase:', e.message); }
}

/* ── LOCAL STORAGE PERSISTENCE ────────────────────────── */
var _mem = {};
function getData(k) {
  if (_mem[k] !== undefined) return _mem[k];
  try { var r = localStorage.getItem('tri_' + k); if (r) { _mem[k] = JSON.parse(r); return _mem[k]; } } catch(e) {}
  return null;
}
function setData(k, v) {
  _mem[k] = v;
  try { localStorage.setItem('tri_' + k, JSON.stringify(v)); } catch(e) {}
}
function clearAllData() {
  _mem = {};
  try {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('tri_') === 0 && k !== 'tri_session') keys.push(k);
    }
    keys.forEach(function(k) { localStorage.removeItem(k); });
  } catch(e) {}
}

/* ── GETTERS ──────────────────────────────────────────── */
function getUsers()        { return getData('users')         || []; }
function getSchools()      { return getData('schools')       || []; }
function getDays()         { return getData('days')          || []; }
function getMasterProds()  { return getData('masterProducts') || DEFAULT_PRODUCTS; }
function getMasterSchools(){ return getData('masterSchools')  || []; }
function getTemplates()    { return getData('templates')      || {}; }
function getSchool(id)     { return getSchools().find(function(s){ return s.id===id; }) || null; }
function getDay(id)        { return getDays().find(function(d){ return d.id===id; }) || null; }
function getTodayDay()     { var d=getDays(); return d.find(function(x){ return x.active&&!x.completed; }) || d[0] || null; }
function getTodaySchools() { var t=getTodayDay(); return t ? getSchools().filter(function(s){ return s.dayId===t.id; }) : []; }

/* ── DEFAULT DATA ─────────────────────────────────────── */
var DEFAULT_PRODUCTS = [
  {id:'p0',name:'Papa',       unit:'kg',   active:true, order:0},
  {id:'p1',name:'Cebolla',    unit:'kg',   active:true, order:1},
  {id:'p2',name:'Zanahoria',  unit:'kg',   active:true, order:2},
  {id:'p3',name:'Lechuga',    unit:'un',   active:true, order:3},
  {id:'p4',name:'Tomate',     unit:'kg',   active:true, order:4},
  {id:'p5',name:'Verdeo',     unit:'atado',active:true, order:5},
  {id:'p6',name:'Zapallo',    unit:'kg',   active:true, order:6},
  {id:'p7',name:'Manzana',    unit:'kg',   active:true, order:7},
  {id:'p8',name:'Banana',     unit:'kg',   active:true, order:8},
  {id:'p9',name:'Naranja',    unit:'kg',   active:true, order:9},
  {id:'p10',name:'Batata',    unit:'kg',   active:true, order:10},
  {id:'p11',name:'Limón',     unit:'kg',   active:true, order:11},
  {id:'p12',name:'Ajo',       unit:'kg',   active:true, order:12},
  {id:'p13',name:'Acelga',    unit:'atado',active:true, order:13},
];

var DEMO_USERS = [
  {id:'u1',name:'Admin', password:'admin123',role:'admin',     active:true},
  {id:'u2',name:'Carlos',password:'972',     role:'armador',   active:true},
  {id:'u3',name:'Juan',  password:'123',     role:'armador',   active:true},
  {id:'u4',name:'Pedro', password:'456',     role:'repartidor',active:true},
];

var DN = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

function initDemoData() {
  // Only seed if truly empty
  if (getUsers().length > 0 && getDays().length > 0) return;
  if (getUsers().length === 0) setData('users', DEMO_USERS);
  if (!getData('masterProducts')) setData('masterProducts', DEFAULT_PRODUCTS);
  if (!getData('templates')) setData('templates', {});
  if (!getData('chat_general')) setData('chat_general', [
    {id:'m1',channel:'general',user:'Carlos',text:'Arrancando el armado del día',time:'08:15',ts:1},
    {id:'m2',channel:'general',user:'Juan',text:'Falta zanahoria en el depósito',time:'08:32',ts:2,emergency:true},
  ]);
  if (!getData('activity')) setData('activity', []);
  if (getMasterSchools().length === 0) {
    var ms = [
      {id:'ms1',name:'PP26',     address:'Av. Mitre 100',  phone:'2364-400000',notes:'',active:true,template:[]},
      {id:'ms2',name:'CFI',      address:'Barto. de Miguel 200',phone:'2364-401000',notes:'',active:true,template:[]},
      {id:'ms3',name:'Escuela 12',address:'San Martín 300',phone:'2364-402000',notes:'',active:true,template:[]},
      {id:'ms4',name:'Jardín 4', address:'Av. Rivadavia 400',phone:'2364-403000',notes:'',active:true,template:[]},
      {id:'ms5',name:'EP14',     address:'25 de Mayo 500',phone:'2364-404000',notes:'',active:true,template:[]},
    ];
    setData('masterSchools', ms);
  }
  if (getDays().length === 0) {
    var now = new Date();
    var fmt = function(d){ return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); };
    var prods = getMasterProds().slice(0,6);
    var QTYS = [[20,10,8,0,5,0],[15,12,0,4,0,8],[30,0,10,3,12,0]];
    var day1 = {id:'day1',date:fmt(now),dayName:DN[now.getDay()],active:true,completed:false};
    setData('days',[day1]);
    var scs = [];
    ['PP26','CFI','Escuela 12'].forEach(function(n,i){
      var ps = prods.map(function(p,pi){
        return {id:'pi'+pi+'_'+i,name:p.name,qty:QTYS[i][pi]||0,unit:p.unit,assembled:false,assembledBy:null};
      });
      scs.push({
        id:'sc'+i+'_day1',dayId:'day1',name:n,status:'sin-armar',order:i,products:ps,
        comments:[],deliveryNote:'',arrivalTime:null,departureTime:null,
        assemblyStart:null,assemblyEnd:null,assignedTo:null,
        ficha:{direccion:'Av. Mitre '+((i+1)*100),telefono:'2364-'+(400000+i*1000),contacto:'Director/a',horario:'8:00-12:00',nota:''},
        checklist:{revisado:false,cargado:false}
      });
    });
    setData('schools', scs);
  }
}

/* ── TEMPLATES ────────────────────────────────────────── */
function tmplKey(name){ return 'T_'+String(name||'').replace(/\s+/g,'_'); }
function getTemplate(name){ var t=getTemplates(); return t[tmplKey(name)]||null; }
function saveTemplate(name,prods){
  var t=getTemplates();
  t[tmplKey(name)]=prods.filter(function(p){ return parseFloat(p.qty)>0; }).map(function(p){ return {name:p.name,qty:parseFloat(p.qty),unit:p.unit}; });
  setData('templates',t);
  // Update master school template too
  var ms=getMasterSchools(), idx=ms.findIndex(function(s){ return s.name===name; });
  if(idx>=0){ ms[idx].template=t[tmplKey(name)]; setData('masterSchools',ms); if(db) fsSet(COL.masterSchools,ms[idx].id,ms[idx]); }
  if(db) db.collection(COL.templates).doc('all').set(t,{merge:true}).catch(function(){});
}
function buildProductsForSchool(name){
  var tmpl=getTemplate(name);
  var cat=getMasterProds().filter(function(p){ return p.active!==false; });
  return cat.sort(function(a,b){ return (a.order||0)-(b.order||0); }).map(function(p){
    var t=tmpl&&tmpl.find(function(x){ return x.name===p.name; });
    return {id:'p'+Date.now()+Math.random().toString(36).slice(2),name:p.name,qty:t?t.qty:0,unit:p.unit,assembled:false,assembledBy:null};
  });
}

/* ── SESSION ──────────────────────────────────────────── */
function getSession(){ try{ return JSON.parse(localStorage.getItem('tri_session')); }catch(e){ return null; } }
function saveSession(u){ localStorage.setItem('tri_session',JSON.stringify(u)); }
function clearSession(){ localStorage.removeItem('tri_session'); }
function requireAuth(){ var u=getSession(); if(!u||!u.name){ window.location.href='login.html'; return null; } return u; }

/* ── FIRESTORE OPS ────────────────────────────────────── */
function fsSet(col,id,data){ if(!db)return; db.collection(col).doc(id).set(data,{merge:true}).catch(function(e){console.error('fsSet:',e);}); }
function fsAdd(col,data){ if(!db)return; db.collection(col).add(data).catch(function(e){console.error('fsAdd:',e);}); }
function fsUpdate(col,id,d){ if(!db)return; db.collection(col).doc(id).update(d).catch(function(e){console.error('fsUpdate:',e);}); }
function fsDel(col,id){ if(!db)return; db.collection(col).doc(id).delete().catch(function(e){console.error('fsDel:',e);}); }

function seedFirestore(){
  if(!db)return;
  db.collection(COL.users).limit(1).get().then(function(snap){
    if(!snap.empty)return;
    DEMO_USERS.forEach(function(u){ fsSet(COL.users,u.id,u); });
  }).catch(function(){});
}

/* ── LIVE DATA ────────────────────────────────────────── */
function initLiveData(opts){
  opts=opts||{}; if(!db) return function(){};
  var unsubs=[];
  function sub(col,key,cb){
    try {
      unsubs.push(db.collection(col).onSnapshot(function(s){
        var d=s.docs.map(function(x){ return Object.assign({id:x.id},x.data()); });
        setData(key,d); if(cb)cb(d);
      },function(e){ console.error(col+':',e.code); }));
    } catch(e) { console.error('sub error:',e); }
  }
  if(opts.onSchools)  sub(COL.schools,'schools',opts.onSchools);
  if(opts.onDays)     sub(COL.days,'days',opts.onDays);
  if(opts.onUsers)    sub(COL.users,'users',opts.onUsers);
  if(opts.onMasterSchools) sub(COL.masterSchools,'masterSchools',opts.onMasterSchools);
  if(opts.onMasterProds)   sub(COL.masterProducts,'masterProducts',opts.onMasterProds);
  if(opts.onMessages){
    try {
      unsubs.push(db.collection(COL.messages).orderBy('ts').onSnapshot(function(s){
        var d=s.docs.map(function(x){ return Object.assign({id:x.id},x.data()); });
        var byC={};
        d.forEach(function(m){ var ch=m.channel||'general'; if(!byC[ch])byC[ch]=[]; byC[ch].push(m); });
        Object.keys(byC).forEach(function(ch){ setData('chat_'+ch,byC[ch]); });
        if(!byC.general) setData('chat_general',[]);
        opts.onMessages(d);
      },function(e){ console.error('msgs:',e); }));
    } catch(e) {}
  }
  return function(){ unsubs.forEach(function(u){ try{u();}catch(e){} }); };
}

/* ── SAVE SCHOOL ──────────────────────────────────────── */
function saveSchool(school){
  var all=getSchools(), i=all.findIndex(function(s){ return s.id===school.id; });
  if(i>=0) all[i]=school; else all.push(school);
  setData('schools',all);
  if(db) fsSet(COL.schools,school.id,school);
}
function deleteSchool(id){
  setData('schools',getSchools().filter(function(s){ return s.id!==id; }));
  if(db) fsDel(COL.schools,id);
}

/* ── AUTH ─────────────────────────────────────────────── */
function tryLogin(username,password){
  var fallback=function(){
    var u=getUsers().find(function(u){ return u.name===username&&u.password===password&&u.active!==false; });
    return Promise.resolve(u||null);
  };
  if(db){
    return db.collection(COL.users).where('name','==',username).get().then(function(snap){
      var found=null;
      snap.forEach(function(doc){ var u=Object.assign({id:doc.id},doc.data()); if(u.password===password&&u.active!==false)found=u; });
      return found||getUsers().find(function(u){ return u.name===username&&u.password===password&&u.active!==false; })||null;
    }).catch(fallback);
  }
  return fallback();
}

/* ── PRESENCE ─────────────────────────────────────────── */
function updatePresence(user){
  if(!db||!user)return;
  var ref=db.collection(COL.presence).doc(user.id);
  ref.set({userId:user.id,name:user.name,online:true,lastSeen:Date.now()});
  window.addEventListener('beforeunload',function(){ ref.set({online:false,lastSeen:Date.now()},{merge:true}); });
  setInterval(function(){ ref.set({online:true,lastSeen:Date.now()},{merge:true}); },30000);
}

/* ── ACTIVITY ─────────────────────────────────────────── */
function logActivity(action,target,color){
  var user=getSession();
  var entry={id:'a'+Date.now(),user:user?user.name:'Sistema',action:action,target:target||'',time:fmtTime(),color:color||'g',ts:Date.now()};
  var acts=getData('activity')||[]; acts.unshift(entry);
  setData('activity',acts.slice(0,300));
  if(db) fsAdd(COL.activity,entry);
}

/* ── BADGES ───────────────────────────────────────────── */
var STATUS_MAP = {
  'sin-armar':  {lbl:'Sin armar', cls:'bsin', dot:'#f87171'},
  'armando':    {lbl:'Armando',   cls:'barm', dot:'#fbbf24'},
  'armado':     {lbl:'Armado',    cls:'blist',dot:'#4ade80'},
  'preparando': {lbl:'Preparando',cls:'bprep',dot:'#60a5fa'},
  'en-reparto': {lbl:'En reparto',cls:'bent', dot:'#fb923c'},
  'entregado':  {lbl:'Entregado', cls:'bdone',dot:'#34d399'},
};
function badgeHtml(status){
  var cfg=STATUS_MAP[status]||{lbl:status,cls:'',dot:'#888'};
  return '<span class="badge '+cfg.cls+'">'+escHtml(cfg.lbl)+'</span>';
}
function statusDot(status){
  var cfg=STATUS_MAP[status]||{dot:'#888'};
  return '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:'+cfg.dot+';flex-shrink:0"></span>';
}

/* ── HELPERS ──────────────────────────────────────────── */
function escHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtTime(){ var n=new Date(); return String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0'); }
function fmtDate(d){ d=d||new Date(); return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); }
function calcDuration(a,b){ if(!a||!b)return null; var av=a.split(':').map(Number),bv=b.split(':').map(Number); return(bv[0]*60+bv[1])-(av[0]*60+av[1]); }

/* ── TOAST ────────────────────────────────────────────── */
function showToast(msg,type){
  var box=document.getElementById('toastBox'); if(!box)return;
  var el=document.createElement('div');
  el.className='toast '+(type==='err'?'terr':type==='warn'||type==='wrn'?'twrn':'tok');
  el.textContent=msg; box.appendChild(el);
  setTimeout(function(){ el.style.opacity='0'; setTimeout(function(){ el.remove(); },300); },2600);
}

/* ── MODALS ───────────────────────────────────────────── */
function openModal(id){ var m=document.getElementById(id); if(m){ m.classList.add('open'); } }
function closeModal(id){ var m=document.getElementById(id); if(m){ m.classList.remove('open'); } }
