# Fogão da Lia: site de restaurante com cardápio digital

Projeto de demonstração da Nexo Dev. O restaurante, os pratos e os contatos são fictícios.

Site de restaurante responsivo com cardápio por categorias, "Hoje no fogão" (prato do dia), galeria, contato com WhatsApp e mapa, e um painel para o dono atualizar tudo sozinho.

## O que tem

**Site (público)**
- Página inicial com a placa "Hoje no fogão", alimentada pelos pratos marcados como prato do dia
- Cardápio por categorias, com preço, descrição e foto opcional
- Galeria de fotos, história da casa e contato (WhatsApp, Instagram, horários e mapa)
- Layout responsivo, navegação por teclado e respeito a "reduzir movimento"

**Painel do restaurante (`/admin.html`)**
- Login com senha, sessão por cookie assinado (HttpOnly) e bloqueio após 5 tentativas erradas
- Adicionar, editar e excluir itens, com preço, categoria, foto e disponibilidade
- Marcar pratos em "Hoje no fogão"
- Galeria: enviar e excluir fotos (JPG, PNG ou WebP, até 3 MB)

## Como rodar

Requer Node.js 18 ou superior.

```bash
npm install
npm start
```

Abra http://localhost:3000. O painel fica em http://localhost:3000/admin.html.

| Variável | Para que serve | Padrão |
|---|---|---|
| `PORT` | Porta do servidor | `3000` |
| `ADMIN_PASSWORD` | Senha do painel | `demo123` (só para demonstração) |
| `SESSION_SECRET` | Chave que assina o cookie de login | gerada a cada início |

Em uso real, defina `ADMIN_PASSWORD` e `SESSION_SECRET`.

## Tecnologias

Node.js e Express no servidor, `multer` para envio de imagens, HTML, CSS e JavaScript puros no navegador. Os dados ficam em `data/db.json` e as fotos em `public/uploads/`.

## Para publicar

Hospedagens gratuitas costumam apagar arquivos a cada reinício. Em produção, use um disco persistente para `data/` e `public/uploads/`, ou troque o arquivo JSON por um banco de dados (PostgreSQL, por exemplo).

## Estrutura

```
server.js          API, login e upload
data/db.json       cardápio, galeria e dados do restaurante
public/index.html  site
public/admin.html  painel
public/app.js      lógica do site
public/admin.js    lógica do painel
public/styles.css  estilos do site e do painel
```
