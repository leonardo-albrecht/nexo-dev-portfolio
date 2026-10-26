# Caderneta: app web de organização financeira

Projeto de demonstração da Nexo Dev. Os dados de exemplo são fictícios.

App web responsivo para anotar receitas e despesas, ver para onde o dinheiro foi e quanto sobrou no mês. Funciona no celular e no computador, e pode ser instalado na tela inicial como um aplicativo (PWA).

## O que tem

- Tela inicial com a frase do mês ("Sobraram R$ 1.558,85") e uma barra com a parte da renda já usada, que fica vermelha quando os gastos passam das entradas
- Botões **Novo gasto** e **Nova entrada**, com valor, categoria, data e descrição
- Categorias de gasto: alimentação, transporte, parcela da moto, conta de luz, supermercado, lazer e outros
- Categorias de entrada: salário, renda extra, bico e comissão
- Gráficos simples: despesas por categoria e receitas contra despesas nos últimos 6 meses
- Lista de lançamentos do mês, com filtro (tudo, gastos, entradas), edição e exclusão
- Navegação entre meses, validação de valores (aceita `1.234,56` e `45,9`) e exemplo de dados em um clique
- Login com Google (quando o ID de cliente é informado) e modo demonstração sem conta
- Instalável, abre sem internet depois da primeira visita, foco visível e respeito a "reduzir movimento"

## Como usar

É uma página estática, sem instalação. Para testar localmente, sirva a pasta com qualquer servidor estático (o login com Google e a instalação exigem `http://localhost` ou HTTPS, e não funcionam abrindo o arquivo direto). Para publicar, envie a pasta para Netlify, GitHub Pages ou Vercel.

## Login com Google

1. No Google Cloud Console, crie um **ID de cliente OAuth** do tipo "Aplicativo da Web" e adicione o endereço do site em "Origens JavaScript autorizadas".
2. Coloque o ID em `config.js`, no campo `googleClientId`.

## Onde os dados ficam

Nesta demonstração, os lançamentos ficam **no navegador do aparelho** (`localStorage`), separados por usuário. Isso significa que:

- os dados não passam de um aparelho para outro;
- limpar os dados do navegador apaga os lançamentos;
- o login com Google só identifica a pessoa neste aparelho. Ele não valida nada em um servidor.

Para uso real, com dados na conta de cada usuário e sincronizados entre aparelhos, a próxima etapa é guardar os lançamentos em um banco (por exemplo Firebase ou PostgreSQL) e validar o token do Google no servidor.

## Estrutura

```
index.html            telas
styles.css            estilos
app.js                regras, gráficos e armazenamento
config.js             ajustes do cliente
manifest.webmanifest  instalação como app
sw.js                 funcionamento sem internet
icon-192.png, icon-512.png
```
