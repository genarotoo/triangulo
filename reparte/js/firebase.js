/* =============================================
   firebase.js — Auto-inicializa Firebase
   ============================================= */

var db = null;
var USE_DEMO = false;

var COL = {
  schools:   'schools',
  users:     'users',
  messages:  'messages',
  activity:  'activity',
  faltantes: 'faltantes',
  presence:  'presence',
  templates: 'templates',
  schoolHistory: 'schoolHistory',
  dayHistory: 'dayHistory',
};

// Se llama desde cada página
function initFirebase() {
  var config = {
    apiKey:            "AIzaSyAaoTnp2VcW5KVtg4PJzQHCOQ3KuX0EYq8",
    authDomain:        "call-party-cf18d.firebaseapp.com",
    projectId:         "call-party-cf18d",
    storageBucket:     "call-party-cf18d.firebasestorage.app",
    messagingSenderId: "682073098919",
    appId:             "1:682073098919:web:cd0d2971daf707622be982",
  };
  try {
    if (typeof firebase === 'undefined') throw new Error('SDK de Firebase no cargó');
    if (!firebase.apps.length) firebase.initializeApp(config);
    db = firebase.firestore();
    USE_DEMO = false;
    console.log('✅ Firebase conectado al proyecto:', config.projectId);
  } catch(e) {
    console.error('❌ Error Firebase:', e.message);
    USE_DEMO = true;
  }
}

async function saveDoc(col, id, data) {
  if (!db) return false;
  try {
    if (id) await db.collection(col).doc(id).set(data, { merge: true });
    else    await db.collection(col).add(data);
    return true;
  } catch(e) { console.error('saveDoc:', e); return false; }
}

async function updateDoc(col, id, data) {
  if (!db) return false;
  try { await db.collection(col).doc(id).update(data); return true; }
  catch(e) { console.error('updateDoc:', e); return false; }
}

async function deleteDoc(col, id) {
  if (!db) return false;
  try { await db.collection(col).doc(id).delete(); return true; }
  catch(e) { console.error('deleteDoc:', e); return false; }
}
