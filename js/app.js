/* ═══════════════════════════════════════════
   TRIÁNGULO — app.js v4.0
   El Triángulo Autoservicio — Junín, Bs As
   Sistema de Armado y Reparto de Pedidos
═══════════════════════════════════════════ */

var db = null;
var COL = {
  schools:'schools', users:'users', messages:'messages', activity:'activity',
  faltantes:'faltantes', presence:'presence', days:'days', products:'masterProducts',
  masterSchools:'masterSchools', templates:'templates', carga:'cargaCamion', chats:'chats'
};

/* ─── FIREBASE ─────────────────────────────────────────────── */
function initFirebase() {
  try {
    if (typeof firebase === 'undefined') { console.warn('Firebase SDK no cargó'); return; }
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
  } catch(e) { console.warn('Firebase error:', e.message); }
}

/* ─── CATÁLOGO BASE DE PRODUCTOS ────────────────────────────── */
var DEFAULT_PRODUCTS = [
  {id:'prod0', name:'Papa',      unit:'kg',    active:true, order:0},
  {id:'prod1', name:'Cebolla',   unit:'kg',    active:true, order:1},
  {id:'prod2', name:'Zanahoria', unit:'kg',    active:true, order:2},
  {id:'prod3', name:'Lechuga',   unit:'un',    active:true, order:3},
  {id:'prod4', name:'Tomate',    unit:'kg',    active:true, order:4},
  {id:'prod5', name:'Verdeo',    unit:'atado', active:true, order:5},
  {id:'prod6', name:'Zapallo',   unit:'kg',    active:true, order:6},
  {id:'prod7', name:'Manzana',   unit:'kg',    active:true, order:7},
  {id:'prod8', name:'Banana',    unit:'kg',    active:true, order:8},
  {id:'prod9', name:'Naranja',   unit:'kg',    active:true, order:9},
  {id:'prod10',name:'Pera',      unit:'kg',    active:true, order:10},
  {id:'prod11',name:'Limón',     unit:'kg',    active:true, order:11},
  {id:'prod12',name:'Ajo',       unit:'kg',    active:true, order:12},
  {id:'prod13',name:'Acelga',    unit:'atado', active:true, order:13},
  {id:'prod14',name:'Batata',    unit:'kg',    active:true, order:14},
];

var PIPELINE = [
  {k:'sin-armar',  lbl:'Sin armar',   cls:'bsin'},
  {k:'armando',    lbl:'Armando',     cls:'barm'},
  {k:'armado',     lbl:'Armado',      cls:'blist'},
  {k:'preparando', lbl:'Preparando',  cls:'bprep'},
  {k:'en-reparto', lbl:'En reparto',  cls:'bent'},
  {k:'entregado',  lbl:'Entregado',   cls:'bdone'},
];

var CHECKLIST_ITEMS = [
  {k:'bolsas',   lbl:'Bolsas cerradas'},
  {k:'etiqueta', lbl:'Etiqueta colocada'},
  {k:'revisado', lbl:'Pedido revisado'},
  {k:'cargado',  lbl:'Cargado al camión'},
];

/* ─── MEMORIA LOCAL ─────────────────────────────────────────── */
var _d = {};
function getData(k)   { return (_d[k] !== undefined) ? _d[k] : null; }
function setData(k,v) { _d[k] = v; }
function getUsers()   { return _d.users   || []; }
function getSchools() { return _d.schools || []; }
function getDays()    { return _d.days    || []; }
function getSchool(id){ return getSchools().find(function(s){return s.id===id;})||null; }
function getDay(id)   { return getDays().find(function(d){return d.id===id;})||null; }
function getMasterProducts() { return _d.masterProducts || DEFAULT_PRODUCTS; }
function getMasterSchools()  { return _d.masterSchools  || []; }
function getTemplates()      { return _d.templates      || {}; }
function getTodayDay()       { var d=getDays(); return d.find(function(x){return x.active&&!x.completed;})||d[0]||null; }
function getTodaySchools()   { var t=getTodayDay(); return t?getSchools().filter(function(s){return s.dayId===t.id;}):[]; }

/* ─── DEMO DATA ─────────────────────────────────────────────── */
var DEMO_USERS = [
  {id:'u1',name:'Admin', password:'admin123',role:'admin',     active:true},
  {id:'u2',name:'Carlos',password:'972',     role:'armador',   active:true},
  {id:'u3',name:'Juan',  password:'123',     role:'armador',   active:true},
  {id:'u4',name:'Pedro', password:'456',     role:'repartidor',active:true},
];

function initDemoData() {
  if (getUsers().length > 0) return;
  setData('users', DEMO_USERS);
  setData('masterProducts', DEFAULT_PRODUCTS);
  var DN = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  var now = new Date();
  var fmt = function(d){ return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); };
  var days = [
    {id:'day1',date:fmt(now),dayName:DN[now.getDay()],active:true,completed:false,schoolNames:['PP26','CFI','Escuela 12','Jardín 4','EP14','EE9']},
    {id:'day2',date:fmt(new Date(now-86400000*2)),dayName:'Lunes',active:false,completed:true,schoolNames:['PP26','CFI','Escuela 12','Jardín 4']},
  ];
  setData('days', days);
  var SNAMES = ['PP26','CFI','Escuela 12','Jardín 4','EP14','EE9'];
  var STATS  = ['sin-armar','armando','armado','preparando','en-reparto','entregado'];
  var ASSIGNS = ['Carlos','Juan','Carlos','Juan','Pedro','Pedro'];
  var prods = DEFAULT_PRODUCTS.slice(0,6);
  var QTYS = [[20,10,8,0,5,0],[15,12,0,4,0,8],[30,0,10,3,12,0],[0,20,15,0,8,2],[18,8,6,2,0,5],[10,10,10,2,5,3]];
  var allSchools = [];
  days.forEach(function(day){
    SNAMES.forEach(function(n,i){
      var isDone = day.completed;
      var ps = prods.map(function(p,pi){
        var qty = QTYS[i][pi]||0;
        return {id:'p'+pi+'_'+i,name:p.name,qty:qty,unit:p.unit,
          assembled:isDone||(i>=4),assembledBy:isDone||(i>=4)?ASSIGNS[i]:null,bags:[]};
      });
      allSchools.push({
        id:'sc'+i+'_'+day.id, dayId:day.id, name:n, status:isDone?'entregado':STATS[i],
        order:i, products:ps, comments:i===0?['Entrar por puerta lateral']:[],
        deliveryNote:i===1?'⚠ ENTREGAR EN COCINA':'',
        arrivalTime:i>=4?'09:30':null, departureTime:i>=5?'09:52':null,
        assemblyStart:i>=1?'08:10':null, assemblyEnd:i>=2?'08:14':null,
        assignedTo:ASSIGNS[i],
        ficha:{direccion:'Av. Mitre '+((i+1)*100),telefono:'2364-'+(400000+i*1000),
               contacto:'Director/a',horario:'8:00 a 12:00',nota:''},
        checklist:{bolsas:i>=3,etiqueta:i>=4,revisado:i>=4,cargado:i>=5},
        dayId:day.id,
      });
    });
  });
  setData('schools', allSchools);
  // Master schools
  var masterSchools = SNAMES.map(function(n,i){
    return {id:'ms'+i,name:n,address:'Av. Mitre '+((i+1)*100),
      phone:'2364-'+(400000+i*1000),notes:'',active:true,
      template:QTYS[i].map(function(q,pi){return {productId:prods[pi].id,name:prods[pi].name,qty:q,unit:prods[pi].unit};})
    };
  });
  setData('masterSchools', masterSchools);
  setData('chat_general',[
    {id:'m1',channel:'general',user:'Carlos',text:'Arrancando el armado del día',time:'08:15',ts:1},
    {id:'m2',channel:'general',user:'Juan',text:'Falta zanahoria en el depósito',time:'08:32',ts:2,emergency:true},
    {id:'m3',channel:'armadores',user:'Carlos',text:'PP26 ya está armado',time:'08:45',ts:3},
    {id:'m4',channel:'reparto',user:'Pedro',text:'Saliendo con el camión',time:'09:00',ts:4},
  ]);
  setData('faltantes',[{id:'f1',product:'Zanahoria',qty:'8 kg',reportedBy:'Juan',ts:Date.now()}]);
  setData('templates',{});
  setData('activity',[
    {id:'a1',user:'Carlos',action:'abrió pedido',target:'PP26',time:'08:10',color:'b',ts:1},
    {id:'a2',user:'Carlos',action:'marcó Papa armado',target:'PP26',time:'08:12',color:'g',ts:2},
    {id:'a3',user:'Pedro',action:'entregó pedido',target:'CFI',time:'09:45',color:'g',ts:3},
  ]);
  setData('carga',[]);
}

/* ─── TEMPLATES ──────────────────────────────────────────────── */
function tmplKey(name){ return 'tmpl_'+String(name||'').toLowerCase().replace(/\s+/g,'_'); }
function getTemplate(schoolName){
  var t = getTemplates(); return t[tmplKey(schoolName)] || null;
}
function saveTemplate(schoolName, products) {
  var t = getTemplates();
  var saved = products.filter(function(p){ return parseFloat(p.qty) > 0; })
    .map(function(p){ return {name:p.name, qty:parseFloat(p.qty)||0, unit:p.unit}; });
  t[tmplKey(schoolName)] = saved;
  setData('templates', t);
  // Also update masterSchool
  var ms = getMasterSchools(), idx = ms.findIndex(function(s){ return s.name === schoolName; });
  if (idx >= 0) {
    ms[idx].template = saved;
    setData('masterSchools', ms);
    fsSet(COL.masterSchools, ms[idx].id, ms[idx]);
  }
  if (db) db.collection(COL.templates).doc('all').set(t, {merge:true}).catch(function(){});
}
function buildProducts(schoolName) {
  var tmpl = getTemplate(schoolName);
  var catalog = getMasterProducts().filter(function(p){ return p.active !== false; });
  return catalog.map(function(p){
    var t = tmpl && tmpl.find(function(x){ return x.name === p.name; });
    return {id:'p'+Date.now()+Math.random().toString(36).slice(2),
      name:p.name, qty:t ? t.qty : 0, unit:p.unit, assembled:false, assembledBy:null, bags:[]};
  }).sort(function(a,b){ return (a.order||0)-(b.order||0); });
}

/* ─── SESSION ──────────────────────────────────────────────────*/
function getSession(){ try{return JSON.parse(localStorage.getItem('tri_session'));}catch(e){return null;} }
function saveSession(u){ localStorage.setItem('tri_session',JSON.stringify(u)); }
function clearSession(){ localStorage.removeItem('tri_session'); }
function requireAuth(){ var u=getSession(); if(!u||!u.name){window.location.href='login.html';return null;} return u; }

/* ─── FIRESTORE OPS ─────────────────────────────────────────── */
function fsSet(col,id,data){ if(!db)return; db.collection(col).doc(id).set(data,{merge:true}).catch(function(e){console.error('fsSet:',e);}); }
function fsAdd(col,data){ if(!db)return Promise.resolve(); return db.collection(col).add(data).catch(function(e){console.error('fsAdd:',e);}); }
function fsUpdate(col,id,d){ if(!db)return; db.collection(col).doc(id).update(d).catch(function(e){console.error('fsUpdate:',e);}); }
function fsDel(col,id){ if(!db)return; db.collection(col).doc(id).delete().catch(function(e){console.error('fsDel:',e);}); }

function seedFirestore(){
  if(!db)return;
  db.collection(COL.users).limit(1).get().then(function(snap){
    if(!snap.empty)return;
    var batch=db.batch();
    DEMO_USERS.forEach(function(u){ batch.set(db.collection(COL.users).doc(u.id),u); });
    return batch.commit();
  }).catch(function(e){console.warn('seed:',e);});
}

/* ─── LIVE DATA ─────────────────────────────────────────────── */
function initLiveData(opts){
  opts=opts||{}; if(!db) return function(){};
  var unsubs=[];
  function sub(col,key,cb){
    unsubs.push(db.collection(col).onSnapshot(function(s){
      var d=s.docs.map(function(x){return Object.assign({id:x.id},x.data());});
      setData(key,d); if(cb)cb(d);
    },function(e){console.error(col+':',e);}));
  }
  if(opts.onSchools)  sub(COL.schools,'schools',opts.onSchools);
  if(opts.onDays)     sub(COL.days,'days',opts.onDays);
  if(opts.onUsers)    sub(COL.users,'users',opts.onUsers);
  if(opts.onProducts) sub(COL.products,'masterProducts',opts.onProducts);
  if(opts.onMasterSchools) sub(COL.masterSchools,'masterSchools',opts.onMasterSchools);
  if(opts.onMessages){
    unsubs.push(db.collection(COL.messages).orderBy('ts').onSnapshot(function(s){
      var d=s.docs.map(function(x){return Object.assign({id:x.id},x.data());});
      // group by channel
      var byChannel={};
      d.forEach(function(m){ var ch=m.channel||'general'; if(!byChannel[ch])byChannel[ch]=[]; byChannel[ch].push(m); });
      Object.keys(byChannel).forEach(function(ch){ setData('chat_'+ch, byChannel[ch]); });
      setData('chat_general', byChannel['general']||[]);
      opts.onMessages(d);
    },function(e){console.error('msgs:',e);}));
  }
  return function(){ unsubs.forEach(function(u){u();}); };
}

/* ─── SAVE SCHOOL ─────────────────────────────────────────────*/
function saveSchool(school){
  var all=getSchools(), i=all.findIndex(function(s){return s.id===school.id;});
  if(i>=0) all[i]=school; else all.push(school);
  setData('schools',all);
  fsSet(COL.schools,school.id,school);
}

/* ─── AUTH ────────────────────────────────────────────────────*/
function tryLogin(username,password){
  var fallback=function(){ return Promise.resolve(DEMO_USERS.find(function(u){return u.name===username&&u.password===password&&u.active!==false;})||null); };
  if(db){
    return db.collection(COL.users).where('name','==',username).get().then(function(snap){
      var found=null;
      snap.forEach(function(doc){ var u=Object.assign({id:doc.id},doc.data()); if(u.password===password&&u.active!==false)found=u; });
      return found || DEMO_USERS.find(function(u){return u.name===username&&u.password===password&&u.active!==false;}) || null;
    }).catch(fallback);
  }
  return fallback();
}

/* ─── PRESENCE ───────────────────────────────────────────────*/
function updatePresence(user){
  if(!db||!user)return;
  var ref=db.collection(COL.presence).doc(user.id);
  ref.set({userId:user.id,name:user.name,role:user.role,online:true,lastSeen:Date.now()});
  window.addEventListener('beforeunload',function(){ ref.set({online:false,lastSeen:Date.now()},{merge:true}); });
  setInterval(function(){ ref.set({online:true,lastSeen:Date.now()},{merge:true}); },30000);
}

/* ─── ACTIVITY LOG ───────────────────────────────────────────*/
function logActivity(action,target,color){
  var user=getSession();
  var entry={id:'act'+Date.now(),user:user?user.name:'Sistema',action:action,target:target||'',time:fmtTime(),color:color||'g',ts:Date.now()};
  var acts=getData('activity')||[]; acts.unshift(entry);
  setData('activity',acts.slice(0,500));
  fsAdd(COL.activity,entry);
}

/* ─── HELPERS ────────────────────────────────────────────────*/
function escHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtTime(){ var n=new Date(); return String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0'); }
function fmtDate(d){ d=d||new Date(); return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); }
function calcDuration(a,dep){ if(!a||!dep)return null; var av=a.split(':').map(Number),dv=dep.split(':').map(Number); return(dv[0]*60+dv[1])-(av[0]*60+av[1]); }
function pct(done,tot){ return tot>0?Math.round(done/tot*100):0; }

/* ─── BADGES ─────────────────────────────────────────────────*/
function badgeHtml(status){
  var map={
    'sin-armar': '<span class="badge bsin">SIN ARMAR</span>',
    'armando':   '<span class="badge barm">ARMANDO</span>',
    'armado':    '<span class="badge blist">ARMADO</span>',
    'preparando':'<span class="badge bprep">PREPARANDO</span>',
    'en-reparto':'<span class="badge bent">EN REPARTO</span>',
    'entregado': '<span class="badge bdone">ENTREGADO</span>',
  };
  return map[status]||('<span class="badge">'+escHtml(status)+'</span>');
}

/* ─── TOAST ─────────────────────────────────────────────────*/
function showToast(msg,type){
  var box=document.getElementById('toastBox'); if(!box)return;
  var el=document.createElement('div');
  el.className='toast '+(type==='err'?'terr':type==='warn'||type==='wrn'?'twrn':'tok');
  el.textContent=msg; box.appendChild(el);
  setTimeout(function(){el.style.opacity='0';setTimeout(function(){el.remove();},300);},2800);
}

/* ─── MODALS ─────────────────────────────────────────────────*/
function openModal(id){ var m=document.getElementById(id); if(m)m.classList.add('open'); }
function closeModal(id){ var m=document.getElementById(id); if(m)m.classList.remove('open'); }
