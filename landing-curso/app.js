(() => {
  'use strict';

  const config = window.LANDING_CONFIG || {};
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const $ = (id) => document.getElementById(id);

  const DEFAULT_NOTE =
    'Simulação com os seus números. Não inclui gás, entrega, impostos nem o seu tempo, e não é promessa de resultado.';
  const LOSS_NOTE =
    'Com esses números cada marmita dá prejuízo. Aumente o preço ou reduza o custo para fechar a conta.';

  // ---------- calculadora ----------
  function calculate() {
    const qtd = Number($('qtd').value);
    const preco = Number($('preco').value);
    const custo = Number($('custo').value);
    const dias = Number($('dias').value);

    const vendas = qtd * preco * dias;
    const gastos = qtd * custo * dias;
    const sobra = vendas - gastos;

    $('qtd-out').textContent = qtd;
    $('preco-out').textContent = brl.format(preco);
    $('custo-out').textContent = brl.format(custo);
    $('dias-out').textContent = dias;

    $('r-fat').textContent = brl.format(vendas);
    $('r-custo').textContent = brl.format(gastos);
    $('r-lucro').textContent = brl.format(sobra);
    $('r-unit').textContent = brl.format(preco - custo);

    const loss = sobra < 0;
    $('r-lucro').parentElement.classList.toggle('loss', loss);
    $('r-aviso').textContent = loss ? LOSS_NOTE : DEFAULT_NOTE;
  }

  $('calc').addEventListener('input', calculate);
  $('calc').addEventListener('submit', (event) => event.preventDefault());
  calculate();

  // ---------- links de compra ----------
  for (const link of document.querySelectorAll('[data-checkout]')) {
    link.href = config.checkoutUrl || '#oferta';
    link.addEventListener('click', () => {
      if (typeof window.fbq === 'function') window.fbq('track', 'InitiateCheckout');
      if (typeof window.gtag === 'function') window.gtag('event', 'begin_checkout');
    });
  }

  // ---------- rastreamento (só carrega se houver ID configurado) ----------
  function loadScript(src) {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    document.head.append(script);
  }

  if (config.metaPixelId) {
    const f = window;
    if (!f.fbq) {
      const n = (f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      });
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      loadScript('https://connect.facebook.net/en_US/fbevents.js');
    }
    f.fbq('init', config.metaPixelId);
    f.fbq('track', 'PageView');
  }

  if (config.googleAnalyticsId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', config.googleAnalyticsId);
    loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(config.googleAnalyticsId));
  }
})();
