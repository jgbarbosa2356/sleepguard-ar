/* CRUD local: estas funções representam POST, GET, PATCH/PUT e DELETE. */
const OccurrenceStore = (() => {
  const KEY = 'sleepguard-occurrences-v1';
  const read = () => JSON.parse(localStorage.getItem(KEY) || '[]');
  const write = records => localStorage.setItem(KEY, JSON.stringify(records));
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `occ-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function seed() {
    if (localStorage.getItem(KEY)) return;
    write([{ id: uid(), createdAt: new Date(Date.now() - 3600000).toISOString(), duration: 3.4,
      status: 'revisado', alertType: 'bip', message: 'Mantenha a atenção na direção.' }]);
  }
  function getAll() { return read().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); }
  function create(data) { const record = { id: uid(), createdAt: new Date().toISOString(), status: 'novo', ...data }; write([...read(), record]); return record; }
  function update(id, patch) { const records = read().map(x => x.id === id ? {...x, ...patch} : x); write(records); return records.find(x => x.id === id); }
  function remove(id) { write(read().filter(x => x.id !== id)); }
  return { seed, getAll, create, update, remove };
})();
