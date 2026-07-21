# 🟩 RetroMaker

Ferramenta web de **retrospectivas de Scrum** colaborativas, em tempo real e **temáticas** — no estilo EasyRetro, porém com quadro livre (tipo Miro/Excalidraw), cursores ao vivo, timer sincronizado e uma dinâmica rápida pra descontrair o time.

**Cada board ganha um tema e uma dinâmica novos, gerados por IA** 🤖 (com fallback local se não houver internet). O tema fica salvo junto do board — abrir uma retro antiga mostra tudo exatamente como foi gerado.

---

## ✨ O que já tem (MVP)

- **Login simples**: só nome + cor. A cor te representa em tudo (cursor, cards, balões).
- **Vários boards / retros**: cada retro é um board com título, salvos para histórico. Tela de navegação entre eles.
- **3 colunas padrão tipadas**: 💚 O que foi bom · 🛠️ O que pode melhorar · ⚡ Ações.
- **Cards privados na fase de preenchimento**: durante a escrita, só o autor vê o conteúdo do próprio card; os demais veem um card "virado" 🔒.
- **"Terminei" + revelação pelo líder**: cada pessoa sinaliza que acabou; o líder (👑) revela todos os cards de uma vez.
- **Flag "exibir quem escreveu"**: some/aparece o autor — **só depois** da revelação, controlada pelo líder.
- **Arrastar cards livremente** pelo quadro; ao soltar, o card é reclassificado pela coluna mais próxima.
- **Reações com emoji** em cada card.
- **Quadro livre estilo Miro**: pan (arrastar o fundo), zoom (scroll), criar **textos** e adicionar **imagens/GIFs** em qualquer lugar, redimensionar.
- **Imagens por upload, colar ou arrastar**: envie arquivo pelo botão 🖼️, **cole com Ctrl+V** (print/imagem da área de transferência) ou **arraste** o arquivo pro board. Imagens grandes são redimensionadas automaticamente.
- **Timer regressivo sincronizado** ⏱️: presets de 5/10/15 min (ou custom), controlado pelo líder e igual para todos — perfeito pra cronometrar a dinâmica.
- **Cursores ao vivo**: mouse de cada pessoa em tempo real, com nome e cor.
- **Multi-sessão ao vivo**: várias pessoas no mesmo board simultaneamente.
- **Temas e dinâmicas por IA** 🤖: ao criar a retro, você digita um tema (ou deixa a IA escolher algo em alta). A IA gera cores, rótulos das colunas, tagline, **ilustrações do tema** (banner + stickers no quadro) e uma **dinâmica elaborada** (objetivo + passo a passo, 5–10 min) — sempre seguindo um contrato fixo pra nunca quebrar. Suporta 3 formatos: **duas verdades e uma mentira**, **pergunta temática** e **classifique-se numa escala**. O gerador recebe a lista de temas já usados e **evita repetir** — cada retro é uma ideia nova.
- **Regenerar tema** 🎲: o líder pode trocar o tema/dinâmica do board a qualquer momento (botão 🎲 no topo) — a IA gera um novo e todos veem a mudança em tempo real.
- **Dashboard de métricas**: total de cards por tipo, com filtros — **todas** as retros, um **intervalo** (Retro 1 → 12) ou **seleção específica** (Retro 1 + Retro 15).

---

## 🚀 Como rodar

Pré-requisito: **Node.js 18+**.

### Windows (recomendado) — 1 clique

Dê um duplo clique em **`setup.bat`** (ou rode no terminal). Ele apaga as `node_modules` corrompidas que possam ter sobrado, resolve o erro de permissão (EPERM) com `takeown`/`icacls` e instala tudo (raiz + server + client). Depois:

```bat
npm run dev
```

> Se o `setup.bat` acusar erro de permissão, feche editores/terminais que estejam usando a pasta e rode o `setup.bat` **como Administrador**.

### Manual (qualquer SO)

```bash
# na raiz do projeto
# 1) apague node_modules antigas se existirem:
#    Windows:  rmdir /s /q client\node_modules & rmdir /s /q server\node_modules
#    Linux/Mac: rm -rf client/node_modules server/node_modules
npm run setup        # instala raiz + server + client
npm run dev          # sobe server (porta 4000) e client (porta 5173) juntos
```

Abra **http://localhost:5173**.

> ⚠️ **Importante:** as pastas `client/node_modules` e `server/node_modules` que vieram no projeto estão incompletas/corrompidas (foram geradas durante a verificação do build num ambiente sandbox). **Apague as duas antes do primeiro install** — é exatamente o que o `setup.bat` faz automaticamente.

> Para testar o tempo real, abra a mesma URL de board em **duas abas/janelas** (ou dois navegadores) com nomes diferentes. A primeira pessoa a entrar vira o **líder** 👑 (dá pra transferir com "Assumir líder").

### Rodar separado (opcional)

```bash
npm --prefix server run dev     # backend em http://localhost:4000
npm --prefix client run dev     # frontend em http://localhost:5173
```

### Build de produção (local)

```bash
npm run build                   # instala deps do client, gera client/dist e instala o server
npm start                       # sobe o server em http://localhost:4000 servindo o client
```

Em produção **um único serviço** serve o client buildado + a API + o WebSocket, na mesma origem.

---

## ☁️ Deploy no Render (recomendado)

O RetroMaker usa **WebSocket persistente** (Socket.io), então precisa de um servidor que fique de pé — por isso **Render** (e não Vercel, que é serverless). Já vem um `render.yaml` pronto.

**Passo a passo:**

1. Suba este repositório para o GitHub (ou GitLab/Bitbucket).
2. Em https://render.com → **New +** → **Blueprint** → conecte o repositório. O Render lê o `render.yaml` automaticamente e cria um **Web Service**:
   - Build: `npm run build`
   - Start: `npm start`
   - Health check: `/api/health`
3. Clique em **Apply**. Em alguns minutos sai a URL pública (ex.: `https://retromaker.onrender.com`). Pronto — abra e compartilhe com o squad.

> Alternativa sem Blueprint: **New + → Web Service**, aponte pro repo, e use Build `npm run build` e Start `npm start`.

**IA em produção:** por padrão usa Pollinations (grátis, sem chave). Para Gemini/Groq/OpenRouter, adicione as variáveis no painel do Render (**Environment**) conforme `server/.env.example`.

**Persistência dos boards:** no **plano free** o disco é efêmero — os boards (`server/data/boards.json`) são apagados a cada deploy/reinício, e o serviço hiberna após inatividade. Para manter o histórico entre deploys, use um plano pago e **descomente o bloco `disk:`** no `render.yaml`.

---

## 🤖 Temas & dinâmicas por IA

A cada board criado, o servidor pede pra uma IA gerar um `BoardSpec` (tema + dinâmica) seguindo um **contrato fixo** — assim o app renderiza qualquer tema sem erro. O resultado é salvo dentro do board (histórico imutável).

- **Contrato (constituição):** [`docs/BOARD_SPEC_CONSTITUTION.md`](docs/BOARD_SPEC_CONSTITUTION.md) — inclui um **prompt pronto** pra você gerar temas em qualquer IA e colar no board.
- **Schema de validação:** [`docs/board-spec.schema.json`](docs/board-spec.schema.json)
- **Como tudo se conecta:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

**IA usada:** por padrão **Pollinations** (grátis, sem chave), mas ela é fraca pra gerar tema/dinâmica bons. **Recomendado: Gemini** — usa *structured output* (a resposta é obrigada a seguir o schema), então os temas saem muito melhores.

Para ativar o Gemini, crie um `server/.env` (baseado em `server/.env.example`) com:

```
AI_PROVIDER=gemini
GEMINI_API_KEY=sua_chave_aqui
# opcional: AI_MODEL=gemini-2.5-flash  (ou gemini-2.5-pro pra máxima qualidade)
```

Gere a chave em https://aistudio.google.com/apikey. Também dá pra usar Groq/OpenRouter. Sem internet ou com erro, cai num **banco de temas local** — nunca quebra.

> **Testar a chave:** com o servidor rodando, acesse `http://localhost:4000/api/ai/health`. Ele faz uma chamada de teste e retorna `{ ok: true, provider, model, sample }` se estiver tudo certo, ou a mensagem de erro caso contrário.

As **ilustrações** dos temas são geradas pelo [Pollinations Image](https://pollinations.ai) direto no navegador (grátis, sem chave) a partir dos prompts do campo `images` do spec.

> Também dá pra colar um tema manual: gere o JSON numa IA usando o prompt da constituição e envie no corpo do `POST /api/boards` como `{ "spec": { ... } }`.

## 🧱 Arquitetura

```
retroMaker/
├─ server/          Node + Express + Socket.io
│  ├─ src/index.js   REST (/api) + eventos realtime + regra de privacidade dos cards
│  ├─ src/store.js   persistência simples em JSON (server/data/boards.json)
│  └─ data/          boards salvos aqui (histórico)
└─ client/          React + Vite + TypeScript
   └─ src/
      ├─ pages/      Login · BoardList · BoardView (quadro) · Dashboard
      ├─ components/ RetroCard · FreeItemView · Cursors · MusicBubble · GameModal
      └─ lib/        socket · session · theme
```

- **Privacidade dos cards**: garantida **no servidor** — durante a fase de preenchimento, cada cliente recebe um estado filtrado onde os cards dos outros vêm sem conteúdo e sem autor. Nada sensível trafega para quem não deveria ver.
- **Imagens**: coladas/enviadas/arrastadas são redimensionadas no navegador (máx. ~1000px) e trafegam como data URL, sincronizando pra todos. O buffer do WebSocket foi ampliado no servidor para suportar isso.
- **Persistência**: boards ficam em `server/data/boards.json` (fácil de inspecionar/versionar). Presença e cursores são efêmeros.
- Em dev, o Vite faz proxy de `/api` e do WebSocket para o servidor na porta 4000.

---

## 📝 Notas e limitações do MVP

- Imagens são armazenadas como data URL dentro do board (após redimensionamento). Ótimo para squad/uso interno; para volume grande, o próximo passo é subir os arquivos para um storage (S3/disco) e guardar só a URL.
- Persistência em JSON é ótima para squad/uso interno; para escala maior, trocar por um banco (Postgres/SQLite) é direto por conta do `store.js` isolado.
- Papel de líder é baseado em confiança (ferramenta interna de time), com botão "Assumir líder".

## 💡 Ideias de próximos passos

- Busca de GIF integrada (Giphy) e storage de imagens em disco/S3.
- Mais jogos temáticos e sons/efeitos ao encerrar o timer.
- Exportar retro (PDF/markdown) e enviar ações para Jira/Trello.
- Autenticação leve e temas trocáveis por board.
```
