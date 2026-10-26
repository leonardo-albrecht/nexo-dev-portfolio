(() => {
  'use strict';

  const CATEGORIES = {
    gasto: ['Alimentação', 'Transporte', 'Parcela da moto', 'Conta de luz', 'Supermercado', 'Lazer', 'Outros'],
    entrada: ['Salário', 'Renda extra', 'Bico', 'Comissão'],
  };
  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const money = (cents) => brl.format(cents / 100);
  const $ = (id) => document.getElementById(id);

  const config = window.APP_CONFIG || {};
  const state = { user: null, tx: [], month: currentMonth(), filter: 'tudo', editing: null, kind: 'gasto' };

  // ---------- utilidades ----------
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === 'class') node.className = value;
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat()) {
      if (child != null) node.append(child);
    }
    return node;
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function currentMonth() { return today().slice(0, 7); }

  function shiftMonth(key, delta) {
    const [year, month] = key.split('-').map(Number);
    const d = new Date(year, month - 1 + delta, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }

  function monthName(key) {
    const [year, month] = key.split('-').map(Number);
    return `${MONTHS[month - 1]} de ${year}`;
  }

  // "1.234,56" ou "12,5" ou "12.5" viram centavos inteiros
  function parseMoney(text) {
    let value = String(text).trim().replace(/\s/g, '').replace(/^R\$/i, '');
    if (!value) return NaN;
    if (value.includes(',')) value = value.replace(/\./g, '').replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(value)) return NaN;
    return Math.round(Number(value) * 100);
  }

  function formatDay(date) {
    const [, month, day] = date.split('-');
    return `${day}/${month}`;
  }

  // ---------- armazenamento (neste aparelho) ----------
  function readStore(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeStore(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      toast('Não foi possível salvar neste aparelho. Libere o armazenamento do navegador.');
    }
  }

  const txKey = () => `caderneta:tx:${state.user.id}`;
  const saveTx = () => writeStore(txKey(), state.tx);

  // ---------- login ----------
  function decodeJwt(token) {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(json);
  }

  function signIn(user) {
    state.user = user;
    writeStore('caderneta:user', user);
    state.tx = readStore(txKey(), []);
    state.month = currentMonth();
    state.filter = 'tudo';
    $('login').hidden = true;
    $('app').hidden = false;
    $('user-name').textContent = user.name;
    render();
  }

  function signOut() {
    state.user = null;
    try { localStorage.removeItem('caderneta:user'); } catch { /* sem armazenamento */ }
    $('app').hidden = true;
    $('login').hidden = false;
  }

  function setupGoogle() {
    if (!config.googleClientId) return;
    $('google-note').hidden = true;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: (response) => {
          try {
            const data = decodeJwt(response.credential);
            signIn({ id: 'g-' + data.sub, name: data.name || data.email });
          } catch {
            toast('Não foi possível entrar com o Google. Tente de novo.');
          }
        },
      });
      window.google.accounts.id.renderButton($('google-btn'), { theme: 'outline', size: 'large', text: 'signin_with', locale: 'pt-BR' });
    };
    document.head.append(script);
  }

  // ---------- resumo e gráficos ----------
  function monthTx(key) {
    return state.tx.filter((t) => t.data.startsWith(key));
  }

  function totals(list) {
    let entrada = 0;
    let gasto = 0;
    for (const t of list) {
      if (t.tipo === 'entrada') entrada += t.valor;
      else gasto += t.valor;
    }
    return { entrada, gasto };
  }

  function renderSummary(list) {
    const { entrada, gasto } = totals(list);
    const saldo = entrada - gasto;
    const name = monthName(state.month);

    $('tot-in').textContent = money(entrada);
    $('tot-out').textContent = money(gasto);

    const saldoEl = $('saldo');
    saldoEl.className = 'saldo';
    if (!list.length) {
      saldoEl.textContent = `Nada lançado em ${name}.`;
    } else if (saldo >= 0) {
      saldoEl.replaceChildren('Sobraram ', el('strong', { class: 'in' }, money(saldo)));
    } else {
      saldoEl.replaceChildren('Faltaram ', el('strong', { class: 'out' }, money(-saldo)));
    }

    let pct = 0;
    let text = 'Os lançamentos do mês aparecem aqui.';
    if (entrada > 0) {
      pct = (gasto / entrada) * 100;
      text = gasto > entrada
        ? `Você gastou mais do que entrou: ${Math.round(pct)}% da renda do mês.`
        : `Você já usou ${Math.round(pct)}% da renda do mês.`;
    } else if (gasto > 0) {
      pct = 100;
      text = 'Há gastos neste mês e nenhuma entrada lançada.';
    }
    const fill = $('renda-fill');
    fill.style.width = `${Math.min(pct, 100)}%`;
    fill.classList.toggle('over', gasto > entrada);
    $('renda-bar').setAttribute('aria-label', text);
    $('renda-text').textContent = text;
  }

  function renderCategories(list) {
    const spent = list.filter((t) => t.tipo === 'gasto');
    const total = spent.reduce((sum, t) => sum + t.valor, 0);
    const byCat = new Map();
    for (const t of spent) byCat.set(t.categoria, (byCat.get(t.categoria) || 0) + t.valor);

    if (!total) {
      $('cat-bars').replaceChildren(el('p', { class: 'muted' }, 'Sem gastos neste mês.'));
      return;
    }
    const rows = [...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([cat, value]) => {
      const share = (value / total) * 100;
      return el('div', { class: 'cat-row' },
        el('div', { class: 'cat-head' },
          el('span', {}, cat),
          el('span', { class: 'num' }, `${money(value)} (${Math.round(share)}%)`)),
        el('div', { class: 'cat-track' }, el('div', { class: 'cat-fill', style: `width:${share}%` })));
    });
    $('cat-bars').replaceChildren(...rows);
  }

  function svg(tag, attrs = {}, ...children) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    for (const child of children) node.append(child);
    return node;
  }

  function renderHistory() {
    const keys = [];
    for (let i = 5; i >= 0; i -= 1) keys.push(shiftMonth(state.month, -i));
    const data = keys.map((key) => ({ key, ...totals(monthTx(key)) }));
    const max = Math.max(1, ...data.map((d) => Math.max(d.entrada, d.gasto)));

    const width = 360;
    const height = 170;
    const base = 138;
    const top = 12;
    const slot = width / data.length;
    const bar = 18;

    const chart = svg('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': 'Receitas e despesas dos últimos seis meses' });
    data.forEach((d, i) => {
      const x = slot * i + slot / 2;
      const hIn = ((d.entrada / max) * (base - top));
      const hOut = ((d.gasto / max) * (base - top));
      const group = svg('g', {});
      group.append(svg('title', {}, document.createTextNode(`${monthName(d.key)}: receitas ${money(d.entrada)}, despesas ${money(d.gasto)}`)));
      group.append(svg('rect', { x: x - bar - 2, y: base - hIn, width: bar, height: hIn, rx: 3, class: 'b-in' }));
      group.append(svg('rect', { x: x + 2, y: base - hOut, width: bar, height: hOut, rx: 3, class: 'b-out' }));
      const label = svg('text', { x, y: height - 14, 'text-anchor': 'middle', class: d.key === state.month ? 'axis current' : 'axis' });
      label.append(document.createTextNode(MONTHS_SHORT[Number(d.key.slice(5)) - 1]));
      group.append(label);
      chart.append(group);
    });
    chart.append(svg('line', { x1: 0, x2: width, y1: base, y2: base, class: 'baseline' }));
    $('hist').replaceChildren(chart);
  }

  // ---------- lançamentos ----------
  function renderRows(list) {
    const shown = list
      .filter((t) => state.filter === 'tudo' || t.tipo === state.filter)
      .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.criado - a.criado));

    $('rows').replaceChildren(...shown.map((t) =>
      el('div', { class: 'row', role: 'listitem' },
        el('span', { class: 'day' }, formatDay(t.data)),
        el('span', { class: 'what' },
          el('strong', {}, t.descricao || t.categoria),
          t.descricao ? el('small', {}, t.categoria) : null),
        el('span', { class: 'amount ' + (t.tipo === 'entrada' ? 'in' : 'out') },
          (t.tipo === 'entrada' ? '+ ' : '- ') + money(t.valor)),
        el('span', { class: 'row-actions' },
          el('button', { class: 'link', type: 'button', 'data-edit': t.id, 'aria-label': `Editar ${t.descricao || t.categoria}` }, 'Editar'),
          el('button', { class: 'link danger', type: 'button', 'data-delete': t.id, 'aria-label': `Excluir ${t.descricao || t.categoria}` }, 'Excluir')))
    ));

    const empty = shown.length === 0;
    $('empty').hidden = !empty;
    if (empty) {
      $('empty-text').textContent = list.length
        ? 'Nenhum lançamento neste filtro.'
        : `Nenhum lançamento em ${monthName(state.month)}. Toque em Novo gasto ou Nova entrada para começar.`;
      $('sample').hidden = state.tx.length > 0;
    }
  }

  function render() {
    const list = monthTx(state.month);
    $('month-title').textContent = monthName(state.month);
    renderSummary(list);
    renderCategories(list);
    renderHistory();
    renderRows(list);
    for (const button of document.querySelectorAll('.seg button')) {
      button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter));
    }
  }

  let toastTimer;
  function toast(message) {
    const node = $('toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 3200);
  }

  // ---------- formulário ----------
  function openForm(kind, tx) {
    state.kind = kind;
    state.editing = tx ? tx.id : null;
    $('dlg-title').textContent = tx ? 'Editar lançamento' : kind === 'gasto' ? 'Novo gasto' : 'Nova entrada';
    $('f-cat').replaceChildren(...CATEGORIES[kind].map((name) => el('option', { value: name }, name)));
    $('f-valor').value = tx ? (tx.valor / 100).toFixed(2).replace('.', ',') : '';
    $('f-cat').value = tx ? tx.categoria : CATEGORIES[kind][0];
    $('f-data').value = tx ? tx.data : (state.month === currentMonth() ? today() : `${state.month}-01`);
    $('f-desc').value = tx ? tx.descricao : '';
    $('form-error').textContent = '';
    $('dlg').showModal();
    $('f-valor').focus();
  }

  function submitForm(event) {
    event.preventDefault();
    const valor = parseMoney($('f-valor').value);
    const data = $('f-data').value;
    const categoria = $('f-cat').value;
    const descricao = $('f-desc').value.trim().slice(0, 60);

    let error = '';
    if (!Number.isFinite(valor) || valor <= 0) error = 'Informe um valor maior que zero, como 45,90.';
    else if (valor > 100000000) error = 'O valor é grande demais. Confira os zeros.';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) error = 'Escolha a data do lançamento.';
    else if (!CATEGORIES[state.kind].includes(categoria)) error = 'Escolha uma categoria.';
    if (error) {
      $('form-error').textContent = error;
      return;
    }

    if (state.editing) {
      const tx = state.tx.find((t) => t.id === state.editing);
      if (tx) Object.assign(tx, { valor, data, categoria, descricao });
    } else {
      state.tx.push({ id: crypto.randomUUID(), tipo: state.kind, valor, data, categoria, descricao, criado: Date.now() });
    }
    saveTx();
    state.month = data.slice(0, 7);
    $('dlg').close();
    render();
    toast(state.editing ? 'Lançamento atualizado.' : state.kind === 'gasto' ? 'Gasto salvo.' : 'Entrada salva.');
  }

  function loadSample() {
    const make = (offset, day, tipo, categoria, descricao, reais) => ({
      id: crypto.randomUUID(),
      tipo, categoria, descricao,
      valor: Math.round(reais * 100),
      data: `${shiftMonth(currentMonth(), offset)}-${pad(day)}`,
      criado: Date.now() + day,
    });
    const sample = [];
    for (const offset of [0, -1, -2]) {
      sample.push(
        make(offset, 5, 'entrada', 'Salário', 'Salário', 3200),
        make(offset, 18, 'entrada', 'Bico', 'Bico de fim de semana', 350 + offset * -40),
        make(offset, 7, 'gasto', 'Parcela da moto', 'Parcela da moto', 489.9),
        make(offset, 9, 'gasto', 'Conta de luz', '', 142.35 + offset * 6),
        make(offset, 12, 'gasto', 'Supermercado', 'Compra do mês', 720.4 - offset * 35),
        make(offset, 14, 'gasto', 'Transporte', 'Gasolina', 260),
        make(offset, 20, 'gasto', 'Alimentação', 'Almoços', 310.5),
        make(offset, 24, 'gasto', 'Lazer', 'Cinema', 68)
      );
    }
    state.tx.push(...sample);
    saveTx();
    render();
    toast('Exemplo carregado. Apague quando quiser.');
  }

  // ---------- eventos ----------
  $('demo-btn').addEventListener('click', () => signIn({ id: 'demo', name: 'Modo demonstração' }));
  $('logout').addEventListener('click', signOut);
  $('prev').addEventListener('click', () => { state.month = shiftMonth(state.month, -1); render(); });
  $('next').addEventListener('click', () => { state.month = shiftMonth(state.month, 1); render(); });
  $('novo-gasto').addEventListener('click', () => openForm('gasto'));
  $('nova-entrada').addEventListener('click', () => openForm('entrada'));
  $('form').addEventListener('submit', submitForm);
  $('cancel').addEventListener('click', () => $('dlg').close());
  $('sample').addEventListener('click', loadSample);

  document.querySelector('.seg').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    state.filter = button.dataset.filter;
    render();
  });

  $('rows').addEventListener('click', (event) => {
    const edit = event.target.closest('[data-edit]');
    const del = event.target.closest('[data-delete]');
    if (edit) {
      const tx = state.tx.find((t) => t.id === edit.dataset.edit);
      if (tx) openForm(tx.tipo, tx);
    } else if (del) {
      const tx = state.tx.find((t) => t.id === del.dataset.delete);
      if (tx && window.confirm(`Excluir "${tx.descricao || tx.categoria}" de ${money(tx.valor)}?`)) {
        state.tx = state.tx.filter((t) => t.id !== tx.id);
        saveTx();
        render();
        toast('Lançamento excluído.');
      }
    }
  });

  // ---------- início ----------
  setupGoogle();
  const saved = readStore('caderneta:user', null);
  if (saved && saved.id) signIn(saved);
  else $('login').hidden = false;

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
