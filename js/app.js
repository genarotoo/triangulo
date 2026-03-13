/* ============ FIREBASE ============ */
var db = null;
var USE_DEMO = false;
var COL = {schools:'schools',users:'users',messages:'messages',activity:'activity',faltantes:'faltantes',presence:'presence',days:'days'};

function initFirebase() {
  try {
    if (typeof firebase==='undefined') throw new Error('SDK no cargo');
    if (!firebase.apps.length) firebase.initializeApp({
      apiKey:"AIzaSyAaoTnp2VcW5KVtg4PJzQHCOQ3KuX0EYq8",
      authDomain:"call-party-cf18d.firebaseapp.com",
      projectId:"call-party-cf18d",
      storageBucket:"call-party-cf18d.firebasestorage.app",
      messagingSenderId:"682073098919",
      appId:"1:682073098919:web:cd0d2971daf707622be982"
    });
    db = firebase.firestore();
    console.log('Firebase OK');
  } catch(e){ console.warn('Firebase error:',e.message); USE_DEMO=true; }
}

/* ============ DATA ============ */
var _d = {};
function getData(k){return _d[k]||[];}
function setData(k,v){_d[k]=v;}
function getUsers(){return getData('users');}
function getSchools(){return getData('schools');}
function getSchool(id){return getSchools().find(function(s){return s.id===id;})||null;}
function getDays(){return getData('days');}
function getDay(id){return getDays().find(function(d){return d.id===id;})||null;}

/* ============ SESSION ============ */
function getSession(){try{return JSON.parse(localStorage.getItem('tri_session'));}catch(e){return null;}}
function saveSession(u){localStorage.setItem('tri_session',JSON.stringify(u));}
function clearSession(){localStorage.removeItem('tri_session');}
function requireAuth(){var u=getSession();if(!u){window.location.href='login.html';return null;}return u;}

/* ============ DEMO DATA ============ */
var DEMO_USERS=[
  {id:'u1',name:'Admin',password:'admin123',role:'admin',active:true},
  {id:'u2',name:'Carlos',password:'972',role:'armador',active:true},
  {id:'u3',name:'Juan',password:'123',role:'armador',active:true},
  {id:'u4',name:'Pedro',password:'456',role:'repartidor',active:true},
];

function initDemoData(){
  if (getUsers().length>0) return;
  setData('users',DEMO_USERS);
  var today=new Date();
  var fmt=function(d){return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();};
  var DNAMES=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  var days=[
    {id:'day1',date:fmt(today),dayName:DNAMES[today.getDay()],active:true},
    {id:'day2',date:fmt(new Date(today-86400000*2)),dayName:'Lunes',active:false,completed:true},
  ];
  setData('days',days);
  var names=['PP26','CFI','Escuela 12','Jardín 4','EP14','EE9','CFP 401','Jardín 3','EP32','CENS 7'];
  var statuses=['sin-armar','sin-armar','armando','armando','listo','listo','listo','preparado','entregando','entregado'];
  var reps=['Pedro','Juan','Pedro','Juan','Pedro','Juan','Pedro','Juan','Pedro','Juan'];
  var allSchools=[];
  days.forEach(function(day){
    names.forEach(function(n,i){
      allSchools.push({
        id:'sc'+i+'_'+day.id,dayId:day.id,name:n,
        status:day.active?statuses[i]:'entregado',order:i,
        products:[
          {id:'p1',name:'Papa',qty:20,unit:'kg',assembled:i>=3,assembledBy:i>=3?'Carlos':null},
          {id:'p2',name:'Cebolla',qty:10,unit:'kg',assembled:i>=4,assembledBy:i>=4?'Carlos':null},
          {id:'p3',name:'Zanahoria',qty:8,unit:'kg',assembled:i>=5,assembledBy:i>=5?'Juan':null},
        ],
        comments:i===0?['No mandar cebolla hoy']:[],
        arrivalTime:i>=8?'09:30':null,departureTime:i>=9?'09:52':null,
        assignedTo:reps[i],
        ficha:{direccion:'Av. Mitre '+((i+1)*100),telefono:'2364-'+(400000+i*1000),contacto:'Director/a',horario:'8:00 a 12:00'},
      });
    });
  });
  setData('schools',allSchools);
  setData('chat',[
    {id:'m1',user:'Carlos',text:'Arrancando el armado',time:'08:15'},
    {id:'m2',user:'Juan',text:'Falta zanahoria en deposito',time:'08:32',emergency:true},
    {id:'m3',user:'Pedro',text:'Saliendo con el camion',time:'09:00'},
  ]);
  setData('faltantes',[{id:'f1',product:'Zanahoria',qty:'8 kg',reportedBy:'Juan'}]);
}

/* ============ FIRESTORE OPS ============ */
async function fsSet(col,id,data){if(!db)return;try{await db.collection(col).doc(id).set(data,{merge:true});}catch(e){console.error('fsSet:',e);}}
async function fsAdd(col,data){if(!db)return;try{return await db.collection(col).add(data);}catch(e){console.error('fsAdd:',e);}}
async function fsUpdate(col,id,data){if(!db)return;try{await db.collection(col).doc(id).update(data);}catch(e){console.error('fsUpdate:',e);}}
async function fsDel(col,id){if(!db)return;try{await db.collection(col).doc(id).delete();}catch(e){console.error('fsDel:',e);}}

async function seedFirestore(){
  if(!db)return;
  try{
    var snap=await db.collection(COL.users).limit(1).get();
    if(!snap.empty)return;
    var batch=db.batch();
    DEMO_USERS.forEach(function(u){batch.set(db.collection(COL.users).doc(u.id),u);});
    await batch.commit();
    console.log('Firestore seeded');
  }catch(e){console.warn('seed:',e);}
}

/* ============ LIVE DATA ============ */
function initLiveData(opts){
  opts=opts||{};
  if(!db)return function(){};
  var unsubs=[];
  if(opts.onSchools){unsubs.push(db.collection(COL.schools).onSnapshot(function(snap){var d=snap.docs.map(function(x){return Object.assign({id:x.id},x.data());});setData('schools',d);opts.onSchools(d);},function(e){console.error('schools:',e);}));}
  if(opts.onDays){unsubs.push(db.collection(COL.days).onSnapshot(function(snap){var d=snap.docs.map(function(x){return Object.assign({id:x.id},x.data());});setData('days',d);opts.onDays(d);},function(e){console.error('days:',e);}));}
  if(opts.onUsers){unsubs.push(db.collection(COL.users).onSnapshot(function(snap){var d=snap.docs.map(function(x){return Object.assign({id:x.id},x.data());});setData('users',d);opts.onUsers(d);},function(e){console.error('users:',e);}));}
  if(opts.onMessages){unsubs.push(db.collection(COL.messages).orderBy('ts').onSnapshot(function(snap){var d=snap.docs.map(function(x){return Object.assign({id:x.id},x.data());});setData('chat',d);opts.onMessages(d);},function(e){console.error('msgs:',e);}));}
  return function(){unsubs.forEach(function(u){u();});};
}

/* ============ SAVE SCHOOL ============ */
function saveSchool(school){
  var schools=getSchools();
  var idx=schools.findIndex(function(s){return s.id===school.id;});
  if(idx>=0)schools[idx]=school;else schools.push(school);
  setData('schools',schools);
  fsSet(COL.schools,school.id,school);
}

/* ============ AUTH ============ */
async function tryLogin(username,password){
  if(db){
    try{
      var snap=await db.collection(COL.users).where('name','==',username).get();
      var found=null;
      snap.forEach(function(doc){var u=Object.assign({id:doc.id},doc.data());if(u.password===password&&u.active!==false)found=u;});
      if(found)return found;
    }catch(e){console.warn('login firestore error, using demo');}
  }
  return DEMO_USERS.find(function(u){return u.name===username&&u.password===password&&u.active!==false;})||null;
}

/* ============ PRESENCE ============ */
function updatePresence(user){
  if(!db||!user)return;
  var ref=db.collection(COL.presence).doc(user.id);
  ref.set({userId:user.id,name:user.name,role:user.role,online:true,lastSeen:Date.now()});
  window.addEventListener('beforeunload',function(){ref.set({online:false,lastSeen:Date.now()},{merge:true});});
  setInterval(function(){ref.set({online:true,lastSeen:Date.now()},{merge:true});},30000);
}

/* ============ HELPERS ============ */
function escHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmtTime(){var n=new Date();return String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');}
function calcDuration(a,d){if(!a||!d)return null;var av=a.split(':').map(Number),dv=d.split(':').map(Number);return(dv[0]*60+dv[1])-(av[0]*60+av[1]);}
function capitalize(s){return s?s.charAt(0).toUpperCase()+s.slice(1):'';}
function logActivity(action,target,color){
  var user=getSession();
  var entry={id:'act'+Date.now(),user:user?user.name:'?',action:action,target:target||'',time:fmtTime(),color:color||'g',ts:Date.now()};
  var acts=getData('activity');acts.unshift(entry);setData('activity',acts.slice(0,100));
  fsAdd(COL.activity,entry);
}
function badgeHtml(status){
  var map={'sin-armar':'<span class="badge bsin">● SIN ARMAR</span>','armando':'<span class="badge barm">● ARMANDO</span>','listo':'<span class="badge blist">● LISTO</span>','preparado':'<span class="badge bprep">● PREPARADO</span>','entregando':'<span class="badge bent">● ENTREGANDO</span>','entregado':'<span class="badge bdone">✔ ENTREGADO</span>'};
  return map[status]||('<span class="badge">'+escHtml(status)+'</span>');
}

/* ============ UI ============ */
function showToast(msg,type){
  var box=document.getElementById('toastBox');if(!box)return;
  var el=document.createElement('div');el.className='toast t'+(type||'ok');
  el.textContent=msg;box.appendChild(el);
  setTimeout(function(){el.style.opacity='0';setTimeout(function(){el.remove();},300);},2500);
}
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
