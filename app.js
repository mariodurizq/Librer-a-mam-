/* Mi librería — app estática (sin servidor).
   Datos base: data/libros.js (window.LIBROS).
   Cambios del usuario (altas, ediciones, borrados, favoritos, leídos): localStorage. */
(() => {
  'use strict';
  const KEY = 'libreria.v1';
  const PAGE = 60;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const norm = s => (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = s => (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Estado persistente ---------- */
  const blank = () => ({ added: [], edits: {}, deleted: [], fav: [], read: [], seq: 0 });
  let U = blank();
  function loadUser() {
    try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && typeof r === 'object') U = Object.assign(blank(), r); } catch (e) { U = blank(); }
  }
  function saveUser() {
    try { localStorage.setItem(KEY, JSON.stringify(U)); } catch (e) { toast('No se pudo guardar en este navegador (¿modo privado?)'); }
  }

  /* ---------- Libros ---------- */
  const BASE = (window.LIBROS || []).map(b => ({ ...b, origen: 'video' }));
  let BOOKS = [];
  function rebuild() {
    const del = new Set(U.deleted);
    const list = [];
    for (const b of BASE) {
      if (del.has(b.id)) continue;
      list.push(U.edits[b.id] ? { ...b, ...U.edits[b.id], id: b.id, origen: 'video', editado: true } : b);
    }
    for (const b of U.added) if (!del.has(b.id)) list.push({ ...b, origen: 'manual' });
    BOOKS = list.map((b, i) => ({ ...b, _i: i, _s: norm([b.titulo, b.autor, b.editorial, b.categoria, b.notas, b.tomo].join(' ')) }));
  }
  const byId = id => BOOKS.find(b => b.id === id);
  const favSet = () => new Set(U.fav), readSet = () => new Set(U.read);

  function hue(str) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; }
  const spine = b => `hsl(${hue((b.titulo || '') + (b.autor || ''))} 38% 36%)`;
  const loc = b => [b.mueble ? 'M' + b.mueble : '', b.balda ? 'B' + b.balda : '', b.posicion ? '#' + b.posicion : ''].filter(Boolean).join(' · ');

  /* ---------- Filtros ---------- */
  const F = { q: '', cat: '', mueble: '', balda: '', conf: '', origen: '', estado: '', sort: 'orden', layout: 'grid', shown: PAGE };
  function filtered() {
    const terms = norm(F.q).split(/\s+/).filter(Boolean);
    const fav = favSet(), read = readSet();
    let r = BOOKS.filter(b => {
      if (F.cat && b.categoria !== F.cat) return false;
      if (F.mueble && String(b.mueble) !== F.mueble) return false;
      if (F.balda && String(b.balda) !== F.balda) return false;
      if (F.conf && b.confianza !== F.conf) return false;
      if (F.origen && b.origen !== F.origen) return false;
      if (F.estado === 'leido' && !read.has(b.id)) return false;
      if (F.estado === 'pendiente' && read.has(b.id)) return false;
      if (F.estado === 'fav' && !fav.has(b.id)) return false;
      return terms.every(t => b._s.includes(t));
    });
    const cmp = {
      orden: (a, b) => (a.mueble || 99) - (b.mueble || 99) || (a.balda || 99) - (b.balda || 99) || (a.posicion || 0) - (b.posicion || 0) || a._i - b._i,
      titulo: (a, b) => norm(a.titulo).localeCompare(norm(b.titulo), 'es'),
      autor: (a, b) => (norm(a.autor) || '~').localeCompare(norm(b.autor) || '~', 'es') || norm(a.titulo).localeCompare(norm(b.titulo), 'es'),
      nuevos: (a, b) => (b.creado || 0) - (a.creado || 0) || b._i - a._i
    }[F.sort];
    return r.sort(cmp);
  }

  /* ---------- Render: libros ---------- */
  function cardHtml(b, fav, read) {
    const isF = fav.has(b.id), isR = read.has(b.id);
    return `<article class="card ${isR ? 'read' : ''}" data-id="${b.id}" tabindex="0" style="--sp:${spine(b)}">
      <div class="spine"></div>
      <div class="card-body">
        <h3>${esc(b.titulo)}${b.tomo ? ` <span class="muted" style="font-weight:400;font-family:var(--font);font-size:13px">· ${esc(b.tomo)}</span>` : ''}</h3>
        <div class="au">${esc(b.autor) || '<i>Autor sin identificar</i>'}</div>
        <div class="meta">
          <span class="tag">${esc(b.categoria)}</span>
          ${loc(b) ? `<span class="tag loc">${loc(b)}</span>` : ''}
          ${b.confianza && b.confianza !== 'Alta' ? `<span title="Confianza de lectura: ${b.confianza}"><span class="dot ${b.confianza}"></span></span>` : ''}
          ${b.origen === 'manual' ? '<span class="badge-new">añadido</span>' : ''}
        </div>
      </div>
      <div class="card-act">
        <button class="ic ${isF ? 'on' : ''}" data-act="fav" title="Favorito" aria-label="Favorito">❤️</button>
        <button class="ic ${isR ? 'on' : ''}" data-act="read" title="Marcar como leído" aria-label="Marcar como leído">✅</button>
      </div>
    </article>`;
  }
  function renderBooks() {
    const list = filtered();
    const fav = favSet(), read = readSet();
    const grid = $('#grid');
    grid.className = 'grid' + (F.layout === 'list' ? ' list' : '');
    grid.innerHTML = list.slice(0, F.shown).map(b => cardHtml(b, fav, read)).join('');
    $('#empty').hidden = list.length > 0;
    $('#btnMore').hidden = list.length <= F.shown;
    $('#btnMore').textContent = `Mostrar más (${list.length - F.shown} restantes)`;
    $('#resultCount').textContent = list.length === BOOKS.length ? `${list.length} libros` : `${list.length} de ${BOOKS.length} libros`;
    const active = ['mueble', 'balda', 'conf', 'origen', 'estado'].filter(k => F[k]).length + (F.sort !== 'orden' ? 1 : 0);
    const fc = $('#fCount'); fc.hidden = !active; fc.textContent = active;
    $('#qClear').hidden = !F.q;
  }
  function renderChips() {
    const counts = {}; BOOKS.forEach(b => counts[b.categoria] = (counts[b.categoria] || 0) + 1);
    const cats = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    $('#catChips').innerHTML = `<button class="chip ${F.cat ? '' : 'on'}" data-cat="">Todos <small>${BOOKS.length}</small></button>` +
      cats.map(c => `<button class="chip ${F.cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)} <small>${counts[c]}</small></button>`).join('');
  }
  function renderSelects() {
    const mu = [...new Set(BOOKS.map(b => b.mueble).filter(Boolean))].sort((a, b) => a - b);
    const ba = [...new Set(BOOKS.filter(b => !F.mueble || String(b.mueble) === F.mueble).map(b => b.balda).filter(Boolean))].sort((a, b) => a - b);
    $('#fMueble').innerHTML = '<option value="">Todos</option>' + mu.map(m => `<option ${String(m) === F.mueble ? 'selected' : ''}>${m}</option>`).join('');
    $('#fBalda').innerHTML = '<option value="">Todas</option>' + ba.map(m => `<option ${String(m) === F.balda ? 'selected' : ''}>${m}</option>`).join('');
    $('#fConf').value = F.conf; $('#fOrigen').value = F.origen; $('#fEstado').value = F.estado; $('#fSort').value = F.sort;
    const dl = (id, arr) => $(id).innerHTML = arr.map(x => `<option value="${esc(x)}">`).join('');
    dl('#dlAutores', [...new Set(BOOKS.map(b => b.autor).filter(Boolean))].sort());
    dl('#dlEditoriales', [...new Set(BOOKS.map(b => b.editorial).filter(Boolean))].sort());
    dl('#dlCategorias', [...new Set(BOOKS.map(b => b.categoria).filter(Boolean))].sort());
  }

  /* ---------- Render: estanterías ---------- */
  function renderShelves() {
    const read = readSet();
    const tree = {};
    BOOKS.forEach(b => { const m = b.mueble || 0, s = b.balda || 0; ((tree[m] ??= {})[s] ??= []).push(b); });
    let html = '';
    Object.keys(tree).sort((a, b) => a - b).forEach(m => {
      html += `<div class="shelf-block"><h2>${m == 0 ? 'Sin mueble asignado' : 'Mueble ' + m}</h2>`;
      Object.keys(tree[m]).sort((a, b) => a - b).forEach(s => {
        const bs = tree[m][s].sort((a, b) => (a.posicion || 0) - (b.posicion || 0) || a._i - b._i);
        html += `<div class="shelf"><h3><span>${s == 0 ? 'Sin balda' : 'Balda ' + s}</span><span>${bs.length} libros</span></h3>
          <div class="books">${bs.map(b => `<button class="bk ${read.has(b.id) ? 'read' : ''}" data-id="${b.id}" style="--sp:${spine(b)}" title="${esc(b.titulo)}${b.autor ? ' — ' + esc(b.autor) : ''}"><span>${esc(b.titulo)}</span></button>`).join('')}</div>
          <div class="plank"></div></div>`;
      });
      html += '</div>';
    });
    $('#view-estanterias').innerHTML = html || '<p class="empty">Aún no hay libros.</p>';
  }

  /* ---------- Render: resumen ---------- */
  function renderStats() {
    const read = readSet(), fav = favSet();
    const group = (fn) => { const o = {}; BOOKS.forEach(b => { const k = fn(b); o[k] = (o[k] || 0) + 1; }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
    const bars = (arr, key) => { const max = Math.max(1, ...arr.map(x => x[1])); return arr.map(([k, n]) => `<div class="bar" data-k="${key}" data-v="${esc(k)}"><span>${esc(k)}</span><div class="t"><i style="width:${n / max * 100}%"></i></div><span class="n">${n}</span></div>`).join(''); };
    const authors = group(b => b.autor || '').filter(x => x[0]).slice(0, 12);
    const unk = BOOKS.filter(b => !b.autor).length;
    const low = BOOKS.filter(b => b.confianza !== 'Alta').length;
    $('#view-resumen').innerHTML = `
      <div class="kpis">
        <div class="kpi"><b>${BOOKS.length}</b><span>libros catalogados</span></div>
        <div class="kpi"><b>${new Set(BOOKS.map(b => b.autor).filter(Boolean)).size}</b><span>autores distintos</span></div>
        <div class="kpi"><b>${read.size}</b><span>marcados como leídos</span></div>
        <div class="kpi"><b>${fav.size}</b><span>favoritos</span></div>
        <div class="kpi"><b>${low}</b><span>por revisar (confianza media/baja)</span></div>
        <div class="kpi"><b>${U.added.length}</b><span>añadidos a mano</span></div>
      </div>
      <div class="stats">
        <div class="panel"><h2>Por categoría</h2>${bars(group(b => b.categoria), 'cat')}</div>
        <div class="panel"><h2>Autores con más libros</h2>${bars(authors, 'autor')}<p class="muted small">${unk} libros sin autor identificado.</p></div>
        <div class="panel"><h2>Por mueble</h2>${bars(group(b => b.mueble ? 'Mueble ' + b.mueble : 'Sin mueble'), 'mueble')}</div>
        <div class="panel"><h2>Confianza de lectura</h2>${bars(group(b => b.confianza || 'Alta'), 'conf')}<p class="muted small">Media/Baja = lomo parcial o dudoso. Edita esos libros para corregirlos.</p></div>
      </div>`;
  }

  /* ---------- Detalle ---------- */
  function openDetail(id) {
    const b = byId(id); if (!b) return;
    const fav = favSet().has(id), rd = readSet().has(id);
    const q = encodeURIComponent((b.titulo + ' ' + (b.autor || '')).trim());
    const row = (k, v) => v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : '';
    $('#detail').innerHTML = `<div class="det-hero" style="--sp:${spine(b)};position:relative">
      <div class="spine"></div>
      <div class="det-body">
        <button class="x det-close" data-close aria-label="Cerrar">✕</button>
        <span class="tag">${esc(b.categoria)}</span>
        <h2 style="margin-top:8px">${esc(b.titulo)}</h2>
        <div class="au">${esc(b.autor) || '<i>Autor sin identificar</i>'}</div>
        <dl class="facts">
          ${row('Editorial / colección', b.editorial)}${row('Tomo / nº', b.tomo)}
          ${row('Ubicación', b.mueble || b.balda ? `Mueble ${b.mueble || '—'} · Balda ${b.balda || '—'} · Posición ${b.posicion || '—'}` : '')}
          <dt>Confianza</dt><dd><span class="dot ${b.confianza}"></span> ${esc(b.confianza || 'Alta')}${b.confianza && b.confianza !== 'Alta' ? ' — conviene revisar el lomo' : ''}</dd>
          ${row('Notas', b.notas)}
          ${row('Origen', b.origen === 'manual' ? 'Añadido a mano en la web' : 'Leído de ' + (b.video || 'vídeo'))}
          ${row('Referencia', b.id)}
        </dl>
      </div></div>
      <div class="det-actions">
        <button class="btn ${fav ? 'primary' : ''}" data-d="fav">❤️ ${fav ? 'En favoritos' : 'Favorito'}</button>
        <button class="btn ${rd ? 'primary' : ''}" data-d="read">✅ ${rd ? 'Leído' : 'Marcar leído'}</button>
        <button class="btn" data-d="edit">✎ Editar</button>
        <a class="btn" target="_blank" rel="noopener" href="https://www.google.com/search?q=${q}">🔎 Buscar en Google</a>
        <button class="btn danger" data-d="del">Eliminar</button>
      </div>`;
    $('#detail').dataset.id = id;
    $('#dlgDetail').showModal();
  }

  /* ---------- Formulario ---------- */
  let editingId = null;
  function openForm(id, prefill) {
    editingId = id || null;
    const f = $('#form'); f.reset();
    $('#formTitle').textContent = id ? 'Editar libro' : 'Añadir libro';
    $('#formHint').textContent = id ? '' : 'Si no indicas la posición, se pone al final de la balda.';
    const b = id ? byId(id) : { categoria: 'Narrativa', confianza: 'Alta', ...(prefill || {}) };
    for (const k of ['titulo', 'autor', 'editorial', 'categoria', 'tomo', 'mueble', 'balda', 'posicion', 'confianza', 'notas']) f.elements[k].value = b[k] ?? '';
    if (!id && !b.mueble) { const last = U.added[U.added.length - 1]; if (last) { f.elements.mueble.value = last.mueble || ''; f.elements.balda.value = last.balda || ''; } }
    $('#dlgDetail').close();
    $('#dlgForm').showModal();
    setTimeout(() => f.elements.titulo.focus(), 50);
  }
  function submitForm(e) {
    e.preventDefault();
    const f = e.target.elements, v = k => f[k].value.trim();
    const num = k => { const n = parseInt(f[k].value, 10); return Number.isFinite(n) && n > 0 ? n : null; };
    const titulo = v('titulo'); if (!titulo) { f.titulo.focus(); return; }
    const data = { titulo, autor: v('autor'), editorial: v('editorial'), categoria: v('categoria') || 'Sin categoría', tomo: v('tomo'), mueble: num('mueble'), balda: num('balda'), posicion: num('posicion'), confianza: f.confianza.value, notas: v('notas') };
    if (!data.posicion && data.mueble && data.balda) {
      data.posicion = 1 + Math.max(0, ...BOOKS.filter(b => b.mueble === data.mueble && b.balda === data.balda && b.id !== editingId).map(b => b.posicion || 0));
    }
    if (editingId) {
      const manual = U.added.findIndex(b => b.id === editingId);
      if (manual >= 0) U.added[manual] = { ...U.added[manual], ...data };
      else U.edits[editingId] = { ...(U.edits[editingId] || {}), ...data };
      toast('Cambios guardados');
    } else {
      U.seq = (U.seq || 0) + 1;
      U.added.push({ id: 'M' + String(Date.now()).slice(-7) + U.seq, ...data, video: '', creado: Date.now() });
      toast('Libro añadido');
    }
    saveUser(); refreshAll();
    $('#dlgForm').close();
  }

  /* ---------- Acciones ---------- */
  function toggle(arr, id) { const i = arr.indexOf(id); i >= 0 ? arr.splice(i, 1) : arr.push(id); return i < 0; }
  function deleteBook(id) {
    const b = byId(id); if (!b) return;
    if (!confirm(`¿Eliminar «${b.titulo}» de la librería?\n(Podrás recuperarlo restaurando una copia de seguridad.)`)) return;
    const m = U.added.findIndex(x => x.id === id);
    if (m >= 0) U.added.splice(m, 1); else U.deleted.push(id);
    U.fav = U.fav.filter(x => x !== id); U.read = U.read.filter(x => x !== id);
    saveUser(); refreshAll(); $('#dlgDetail').close(); toast('Libro eliminado');
  }
  function random() {
    const read = readSet();
    const pool = filtered().filter(b => !read.has(b.id));
    const src = pool.length ? pool : filtered();
    if (!src.length) return toast('No hay libros con esos filtros');
    openDetail(src[Math.floor(Math.random() * src.length)].id);
  }

  /* ---------- Exportar / importar ---------- */
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const clean = b => ({ id: b.id, titulo: b.titulo, autor: b.autor || '', editorial: b.editorial || '', tomo: b.tomo || '', categoria: b.categoria, video: b.video || '', mueble: b.mueble ?? null, balda: b.balda ?? null, posicion: b.posicion ?? null, confianza: b.confianza || 'Alta', notas: b.notas || '' });
  function exportJs() {
    const arr = BOOKS.slice().sort((a, b) => (a.mueble || 99) - (b.mueble || 99) || (a.balda || 99) - (b.balda || 99) || (a.posicion || 0) - (b.posicion || 0) || a._i - b._i).map(clean);
    download('libros.js', 'window.LIBROS = ' + JSON.stringify(arr, null, 0).replace(/\},\{/g, '},\n{') + ';\n', 'text/javascript');
    toast('libros.js descargado: súbelo a data/ en GitHub');
  }
  function exportCsv() {
    const cols = ['id', 'titulo', 'autor', 'editorial', 'tomo', 'categoria', 'mueble', 'balda', 'posicion', 'confianza', 'notas'];
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [cols.join(';'), ...BOOKS.map(b => cols.map(c => q(clean(b)[c])).join(';'))];
    download('libreria.csv', '﻿' + rows.join('\r\n'), 'text/csv');
  }
  function exportBackup() { download('libreria-copia.json', JSON.stringify({ app: 'libreria', v: 1, user: U }, null, 1), 'application/json'); }
  function importBackup(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (d.app !== 'libreria' || !d.user) throw 0;
        if (!confirm('Esto sustituirá tus cambios actuales por los de la copia. ¿Continuar?')) return;
        U = Object.assign(blank(), d.user); saveUser(); refreshAll(); $('#dlgMenu').close(); toast('Copia restaurada');
      } catch (e) { toast('Ese archivo no es una copia válida'); }
    };
    r.readAsText(file);
  }

  /* ---------- Util UI ---------- */
  let tt;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => t.hidden = true, 2600); }
  function refreshAll() {
    rebuild(); renderChips(); renderSelects(); renderBooks(); renderShelves(); renderStats();
    $('#subtitle').textContent = `${BOOKS.length} libros · ${new Set(BOOKS.map(b => b.mueble).filter(Boolean)).size} muebles`;
    $('#menuStats').textContent = `Cambios guardados en este navegador: ${U.added.length} añadidos, ${Object.keys(U.edits).length} editados, ${U.deleted.length} eliminados, ${U.fav.length} favoritos, ${U.read.length} leídos.`;
  }
  function setView(v) {
    $$('.tab').forEach(t => { const on = t.dataset.view === v; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); });
    $$('.view').forEach(s => s.hidden = s.id !== 'view-' + v);
    try { history.replaceState(null, '', '#' + v); } catch (e) { }
    scrollTo({ top: 0 });
  }

  /* ---------- Eventos ---------- */
  function bind() {
    let qt; $('#q').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { F.q = e.target.value; F.shown = PAGE; renderBooks(); }, 120); });
    $('#qClear').onclick = () => { $('#q').value = ''; F.q = ''; F.shown = PAGE; renderBooks(); $('#q').focus(); };
    $('#btnFilters').onclick = () => { const f = $('#filters'); f.hidden = !f.hidden; };
    $('#catChips').addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; F.cat = c.dataset.cat; F.shown = PAGE; renderChips(); renderBooks(); });
    const map = { fMueble: 'mueble', fBalda: 'balda', fConf: 'conf', fOrigen: 'origen', fEstado: 'estado', fSort: 'sort' };
    Object.entries(map).forEach(([id, k]) => $('#' + id).addEventListener('change', e => { F[k] = e.target.value; if (k === 'mueble') F.balda = ''; F.shown = PAGE; renderSelects(); renderBooks(); }));
    $('#fReset').onclick = () => { Object.assign(F, { q: '', cat: '', mueble: '', balda: '', conf: '', origen: '', estado: '', sort: 'orden', shown: PAGE }); $('#q').value = ''; renderChips(); renderSelects(); renderBooks(); };
    $('#btnMore').onclick = () => { F.shown += PAGE * 2; renderBooks(); };
    $$('.seg button').forEach(b => b.onclick = () => { F.layout = b.dataset.layout; $$('.seg button').forEach(x => x.classList.toggle('on', x === b)); try { localStorage.setItem(KEY + '.layout', F.layout); } catch (e) { } renderBooks(); });
    $$('.tab').forEach(t => t.onclick = () => setView(t.dataset.view));

    $('#grid').addEventListener('click', e => {
      const card = e.target.closest('.card'); if (!card) return;
      const id = card.dataset.id, act = e.target.closest('[data-act]');
      if (act) { const on = toggle(act.dataset.act === 'fav' ? U.fav : U.read, id); saveUser(); renderBooks(); renderStats(); renderShelves(); toast(act.dataset.act === 'fav' ? (on ? 'Añadido a favoritos' : 'Quitado de favoritos') : (on ? 'Marcado como leído' : 'Marcado como pendiente')); return; }
      openDetail(id);
    });
    $('#grid').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('card')) openDetail(e.target.dataset.id); });
    $('#view-estanterias').addEventListener('click', e => { const b = e.target.closest('.bk'); if (b) openDetail(b.dataset.id); });
    $('#view-resumen').addEventListener('click', e => {
      const bar = e.target.closest('.bar'); if (!bar) return;
      const k = bar.dataset.k, v = bar.dataset.v;
      Object.assign(F, { q: '', cat: '', mueble: '', balda: '', conf: '', origen: '', estado: '', shown: PAGE });
      if (k === 'cat') F.cat = v; else if (k === 'conf') F.conf = v; else if (k === 'mueble') F.mueble = v.replace('Mueble ', '');
      else if (k === 'autor') { F.q = v; $('#q').value = v; }
      if (k !== 'autor') $('#q').value = '';
      renderChips(); renderSelects(); renderBooks(); setView('libros');
    });

    $('#detail').addEventListener('click', e => {
      const id = $('#detail').dataset.id, d = e.target.closest('[data-d]');
      if (e.target.closest('[data-close]')) return $('#dlgDetail').close();
      if (!d) return;
      if (d.dataset.d === 'edit') return openForm(id);
      if (d.dataset.d === 'del') return deleteBook(id);
      toggle(d.dataset.d === 'fav' ? U.fav : U.read, id); saveUser(); refreshAll(); openDetail(id);
    });
    $$('dialog').forEach(dlg => {
      dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
    });
    $('#form').addEventListener('submit', submitForm);
    $('#btnAdd').onclick = () => openForm(null);
    $('#emptyAdd').onclick = () => openForm(null, { titulo: F.q });
    $('#btnRandom').onclick = random;
    $('#btnMenu').onclick = () => $('#dlgMenu').showModal();
    $('#exJs').onclick = exportJs; $('#exCsv').onclick = exportCsv; $('#exBackup').onclick = exportBackup;
    $('#imBackup').onchange = e => { if (e.target.files[0]) importBackup(e.target.files[0]); e.target.value = ''; };
    $('#exReset').onclick = () => { if (confirm('Se borrarán tus libros añadidos, ediciones, favoritos y leídos de este navegador. ¿Seguro?')) { U = blank(); saveUser(); refreshAll(); $('#dlgMenu').close(); toast('Cambios borrados'); } };
    document.addEventListener('keydown', e => { if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName) && !document.querySelector('dialog[open]')) { e.preventDefault(); setView('libros'); $('#q').focus(); } });
  }

  /* ---------- Arranque ---------- */
  loadUser();
  try { const l = localStorage.getItem(KEY + '.layout'); if (l) { F.layout = l; $$('.seg button').forEach(x => x.classList.toggle('on', x.dataset.layout === l)); } } catch (e) { }
  bind(); refreshAll();
  const h = location.hash.slice(1); if (['libros', 'estanterias', 'resumen'].includes(h)) setView(h);
})();
