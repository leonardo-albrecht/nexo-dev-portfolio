(() => {
  'use strict';

  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const $ = (id) => document.getElementById(id);

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

  function renderToday(items) {
    const featured = items.filter((item) => item.featured);
    $('board').hidden = featured.length === 0;
    $('today').replaceChildren(
      ...featured.map((item) =>
        el('li', {},
          el('span', {}, item.name),
          el('span', { class: 'leader', 'aria-hidden': 'true' }),
          el('span', { class: 'price' }, brl.format(item.price)))
      )
    );
  }

  function menuItem(item) {
    const body = el('div', { class: 'item-body' },
      el('div', { class: 'item-head' },
        el('h3', {}, item.name),
        el('span', { class: 'leader', 'aria-hidden': 'true' }),
        el('span', { class: 'price' }, brl.format(item.price))),
      item.description ? el('p', {}, item.description) : null);

    if (!item.image) return el('article', { class: 'item' }, body);
    return el('article', { class: 'item has-img' },
      el('img', { src: item.image, alt: '', loading: 'lazy', width: 72, height: 72 }),
      body);
  }

  function renderMenu(data) {
    let active = data.categories.find((name) => data.items.some((i) => i.category === name));

    const draw = () => {
      const items = data.items.filter((i) => i.category === active);
      $('menu').replaceChildren(
        ...(items.length ? items.map(menuItem) : [el('p', { class: 'empty' }, 'Nenhum item nesta categoria.')])
      );
      for (const button of $('tabs').children) {
        button.setAttribute('aria-pressed', String(button.dataset.category === active));
      }
    };

    $('tabs').replaceChildren(
      ...data.categories
        .filter((name) => data.items.some((i) => i.category === name))
        .map((name) =>
          el('button', { type: 'button', 'data-category': name, 'aria-pressed': 'false' }, name))
    );
    $('tabs').addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      active = button.dataset.category;
      draw();
    });
    draw();
  }

  function renderGallery(photos) {
    if (!photos.length) {
      $('gallery').replaceChildren(
        el('p', { class: 'empty-box' }, 'Em breve, fotos da casa e dos pratos.')
      );
      return;
    }
    $('gallery').replaceChildren(
      ...photos.map((photo) =>
        el('figure', {},
          el('img', { src: photo.image, alt: photo.caption || 'Foto do restaurante', loading: 'lazy' }),
          photo.caption ? el('figcaption', {}, photo.caption) : null))
    );
  }

  function renderContact(restaurant) {
    $('address').textContent = restaurant.address;
    $('hours').replaceChildren(
      ...restaurant.hours.flatMap((row) => [el('dt', {}, row.days), el('dd', {}, row.time)])
    );

    const message = encodeURIComponent('Olá! Gostaria de reservar uma mesa.');
    for (const link of document.querySelectorAll('[data-whatsapp]')) {
      link.href = `https://wa.me/${restaurant.whatsapp}?text=${message}`;
      link.target = '_blank';
      link.rel = 'noopener';
    }
    $('instagram').href = `https://instagram.com/${restaurant.instagram}`;
  }

  async function init() {
    try {
      const response = await fetch('/api/menu');
      if (!response.ok) throw new Error('falha ao carregar');
      const data = await response.json();
      renderToday(data.items);
      renderMenu(data);
      renderGallery(data.gallery);
      renderContact(data.restaurant);
    } catch {
      $('menu').replaceChildren(
        el('p', { class: 'empty' }, 'Não foi possível carregar o cardápio agora. Atualize a página em instantes.')
      );
    }
  }

  init();
})();
