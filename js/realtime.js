/* Comunicação leve e opcional: sem firebase-config.js o restante do projeto continua funcional. */
const Realtime = (() => {
  let db = null, sessionId = null, connectedCallback = null, mobileSettings = { alertType: 'bip', message: '' };
  const enabled = () => window.SLEEP_GUARD_FIREBASE_CONFIG && !String(window.SLEEP_GUARD_FIREBASE_CONFIG.apiKey).includes('COLE_');
  function init() {
    if (!enabled() || !window.firebase) return false;
    if (!firebase.apps.length) firebase.initializeApp(window.SLEEP_GUARD_FIREBASE_CONFIG);
    db = firebase.database(); return true;
  }
  function startSession(id, onConnected) {
    sessionId = id; connectedCallback = onConnected;
    if (!db) return;
    const ref = db.ref(`sleepguard/${id}/mobile`);
    ref.on('value', snap => { mobileSettings = { ...mobileSettings, ...(snap.val() || {}) }; onConnected?.(!!snap.val()?.connected); });
    db.ref(`sleepguard/${id}`).update({ createdAt: firebase.database.ServerValue.TIMESTAMP });
  }
  function connectMobile(id, settings) { sessionId = id; if (!db) return false; db.ref(`sleepguard/${id}/mobile`).set({connected:true, ...settings, updatedAt: firebase.database.ServerValue.TIMESTAMP}); return true; }
  function saveSettings(settings) { if (db && sessionId) return db.ref(`sleepguard/${sessionId}/mobile`).update(settings); }
  function sendAlert(payload) { if (db && sessionId) return db.ref(`sleepguard/${sessionId}/alert`).set({ ...payload, timestamp: firebase.database.ServerValue.TIMESTAMP }); }
  function watchAlerts(id, fn) { if (db) db.ref(`sleepguard/${id}/alert`).on('value', s => { if (s.val()) fn(s.val()); }); }
  return { init, startSession, connectMobile, saveSettings, sendAlert, watchAlerts, getMobileSettings: () => mobileSettings, enabled: () => !!db };
})();
