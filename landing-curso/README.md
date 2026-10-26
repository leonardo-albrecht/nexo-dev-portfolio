# Marmita que Vende: landing page de curso

Projeto de demonstração da Nexo Dev. O curso, os preços e as garantias são fictícios.

Página de vendas de um curso online, pensada para quem chega pelo celular vindo de redes sociais.

## O que tem

- Abertura com uma calculadora interativa ("Quanto sobra no fim do mês?"), que mostra vendas, custo e sobra com os números do visitante, e avisa quando a conta dá prejuízo
- Para quem é e para quem não é o curso
- Módulos numerados na sequência real, kit de materiais, oferta com garantia e perguntas frequentes
- Responsiva, com navegação por teclado, foco visível e respeito a "reduzir movimento"
- Sem urgência falsa: não há contador regressivo nem vagas inventadas

## Como usar

É uma página estática, sem instalação. Abra `index.html` no navegador ou publique a pasta em qualquer hospedagem estática (Netlify, GitHub Pages, Vercel).

## Como configurar

Edite `config.js`:

| Campo | Para que serve |
|---|---|
| `checkoutUrl` | Link do checkout (Hotmart, Kiwify, Eduzz ou outro). Todos os botões de compra usam esse link |
| `metaPixelId` | ID do Pixel da Meta. Vazio, o pixel não carrega |
| `googleAnalyticsId` | ID do Google Analytics. Vazio, não carrega |

Com o pixel ligado, o clique nos botões de compra registra o evento `InitiateCheckout`. Se usar rastreamento, acrescente um aviso de cookies, como pede a LGPD.

## Estrutura

```
index.html   conteúdo da página
styles.css   estilos
app.js       calculadora, links de compra e rastreamento
config.js    ajustes do cliente
```
