(() => {
  'use strict';

  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const $ = (id) => document.getElementById(id);

  let state = { categories: [], items: [], gallery: [], max: 12 };

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

  function say(id, text, kind) {
    const node = $(id);
    node.textContent = text;
    node.className = 'status' + (kind ? ' ' + kind : '');
  }

  async function api(url, options) {
    const response = await fetch(url, options);
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && url !== '/api/login') {
      showLogin();
      throw new Error('Sua sessão expirou. Entre de novo.');
    }
    if (!response.ok) throw new Error(body.error || 'Algo deu errado. Tente novamente.');
    return body;
  }

  function showLogin() {
    $('panel-view').hidden = true;
    $('login-view').hidden = false;
    $('password').focus();
  }

  function showPanel() {
    $('login-view').hidden = true;
    $('panel-view').hidden = false;
  }

  async function load() {
    try {
      state = await api('/api/admin/menu');
      showPanel();
      render();
    } catch {
      showLogin();
    }
  }

  function render() {
    const select = $('category');
    const current = select.value;
    select.replaceChildren(...state.categories.map((name) => el('option', { value: name }, name)));
    if (state.categories.includes(current)) select.value = current;

    $('items').replaceChildren(
      ...state.items.map((item) =>
        el('tr', {},
          el('td', {}, item.name),
          el('td', {}, item.category),
          el('td', {}, brl.format(item.price)),
          el('td', {},
            el('span', { class: item.available ? 'tag' : 'tag off' }, item.available ? 'Disponível' : 'Oculto'),
            item.featured ? el('span', { class: 'tag' }, 'Hoje no fogão') : null),
          el('td', {},
            el('button', { class: 'link-btn', type: 'button', 'data-edit': item.id }, 'Editar'),
            el('button', { class: 'link-btn danger', type: 'button', 'data-delete': item.id }, 'Excluir')))
      )
    );

    $('admin-gallery').replaceChildren(
      ...state.gallery.map((photo) =>
        el('figure', {},
          el('img', { src: photo.image, alt: photo.caption || 'Foto da galeria' }),
          el('figcaption', {}, photo.caption || 'Sem legenda'),
          el('button', { class: 'link-btn danger', type: 'button', 'data-photo': photo.id }, 'Excluir foto')))
    );
  }

  function resetForm() {
    $('item-form').reset();
    $('item-id').value = '';
    $('available').checked = true;
    $('remove-image-label').hidden = true;
    $('cancel-edit').hidden = true;
    $('form-title').textContent = 'Novo item do cardápio';
  }

  function startEdit(id) {
    const item = state.items.find((i) => i.id === id);
    if (!item) return;
    $('item-id').value = item.id;
    $('name').value = item.name;
    $('category').value = item.category;
    $('price').value = item.price;
    $('description').value = item.description;
    $('featured').checked = item.featured;
    $('available').checked = item.available;
    $('image').value = '';
    $('remove-image').checked = false;
    $('remove-image-label').hidden = !item.image;
    $('cancel-edit').hidden = false;
    $('form-title').textContent = 'Editar item';
    say('item-status', '');
    $('item-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('name').focus();
  }

  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    say('login-status', '');
    try {
      await api('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: $('password').value }),
      });
      $('password').value = '';
      await load();
    } catch (error) {
      say('login-status', error.message, 'error');
    }
  });

  $('logout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    showLogin();
  });

  $('item-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = $('item-id').value;
    const data = new FormData();
    data.append('name', $('name').value);
    data.append('category', $('category').value);
    data.append('price', $('price').value);
    data.append('description', $('description').value);
    data.append('featured', String($('featured').checked));
    data.append('available', String($('available').checked));
    data.append('removeImage', String($('remove-image').checked));
    if ($('image').files[0]) data.append('image', $('image').files[0]);

    try {
      await api(id ? `/api/admin/items/${id}` : '/api/admin/items', { method: id ? 'PUT' : 'POST', body: data });
      resetForm();
      say('item-status', 'Item salvo.', 'ok');
      await load();
    } catch (error) {
      say('item-status', error.message, 'error');
    }
  });

  $('cancel-edit').addEventListener('click', () => {
    resetForm();
    say('item-status', '');
  });

  $('items').addEventListener('click', async (event) => {
    const edit = event.target.closest('[data-edit]');
    const del = event.target.closest('[data-delete]');
    if (edit) return startEdit(edit.dataset.edit);
    if (!del) return;
    const item = state.items.find((i) => i.id === del.dataset.delete);
    if (!item || !window.confirm(`Excluir "${item.name}" do cardápio?`)) return;
    try {
      await api(`/api/admin/items/${item.id}`, { method: 'DELETE' });
      say('item-status', 'Item excluído.', 'ok');
      await load();
    } catch (error) {
      say('item-status', error.message, 'error');
    }
  });

  $('gallery-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData();
    data.append('image', $('photo').files[0]);
    data.append('caption', $('caption').value);
    try {
      await api('/api/admin/gallery', { method: 'POST', body: data });
      $('gallery-form').reset();
      say('gallery-status', 'Foto adicionada.', 'ok');
      await load();
    } catch (error) {
      say('gallery-status', error.message, 'error');
    }
  });

  $('admin-gallery').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-photo]');
    if (!button || !window.confirm('Excluir esta foto da galeria?')) return;
    try {
      await api(`/api/admin/gallery/${button.dataset.photo}`, { method: 'DELETE' });
      say('gallery-status', 'Foto excluída.', 'ok');
      await load();
    } catch (error) {
      say('gallery-status', error.message, 'error');
    }
  });

  load();
})();
